import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { XMLParser } from 'fast-xml-parser';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false }
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });
  }
  return pool;
}

function parseDurationDays(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/PT(?:([0-9.]+)H)?(?:([0-9.]+)M)?(?:([0-9.]+)S)?/);
  if (match) {
    const hours = parseFloat(match[1] || 0);
    const minutes = parseFloat(match[2] || 0);
    return Math.round(((hours + (minutes / 60)) / 8) * 10) / 10;
  }
  const num = parseFloat(durationStr);
  return isNaN(num) ? 0 : num;
}

function parseMspdiXml(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Invalid XML string provided');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true
  });

  const jsonObj = parser.parse(xmlString);
  const proj = jsonObj.Project || jsonObj['ns:Project'] || jsonObj;

  if (!proj || !proj.Tasks) {
    throw new Error('Invalid MS Project XML: <Tasks> element not found.');
  }

  const rawTasks = Array.isArray(proj.Tasks.Task) 
    ? proj.Tasks.Task 
    : (proj.Tasks.Task ? [proj.Tasks.Task] : []);

  const validTasks = rawTasks.filter(t => {
    const id = parseInt(t.ID || 0, 10);
    const uid = parseInt(t.UID || 0, 10);
    return id > 0 || (uid > 0 && t.Name);
  });

  const tasks = validTasks.map((t, idx) => {
    const preds = [];
    if (t.PredecessorLink) {
      const pLinks = Array.isArray(t.PredecessorLink) ? t.PredecessorLink : [t.PredecessorLink];
      pLinks.forEach(pl => {
        if (pl && pl.PredecessorUID !== undefined) {
          preds.push(parseInt(pl.PredecessorUID, 10));
        }
      });
    }

    const durationDays = parseDurationDays(t.Duration);
    const isMilestone = t.Milestone === 1 || t.Milestone === '1' || t.Milestone === true || durationDays === 0;
    const isSummary = t.Summary === 1 || t.Summary === '1' || t.Summary === true;
    const isCritical = t.Critical === 1 || t.Critical === '1' || t.Critical === true;

    return {
      id: parseInt(t.ID || idx + 1, 10),
      unique_id: parseInt(t.UID || t.ID || idx + 1, 10),
      name: String(t.Name || 'Untitled Task').trim(),
      wbs: String(t.WBS || t.OutlineNumber || t.ID || idx + 1),
      outline_level: parseInt(t.OutlineLevel || 1, 10),
      outline_number: String(t.OutlineNumber || t.WBS || ''),
      summary: isSummary,
      milestone: isMilestone,
      critical: isCritical,
      duration_days: durationDays,
      start: t.Start ? String(t.Start).split('T')[0] : null,
      finish: t.Finish ? String(t.Finish).split('T')[0] : null,
      actual_start: t.ActualStart ? String(t.ActualStart).split('T')[0] : null,
      actual_finish: t.ActualFinish ? String(t.ActualFinish).split('T')[0] : null,
      percent_complete: parseInt(t.PercentComplete || 0, 10),
      predecessors: preds,
      resource_names: String(t.ResourceNames || '')
    };
  });

  // Calculate project boundary dates
  let projectStart = proj.StartDate ? String(proj.StartDate).split('T')[0] : null;
  let projectFinish = proj.FinishDate ? String(proj.FinishDate).split('T')[0] : null;

  // Filter out overall Project Timeline root task from activities list
  const filteredTasks = [];
  tasks.forEach(t => {
    const tName = (t.name || '').trim().toLowerCase();
    const isTimelineRoot = tName === 'project time line' || tName === 'project timeline' || (t.wbs === '1' && tName.includes('project time line'));
    if (isTimelineRoot) {
      if (!projectStart && t.start) projectStart = t.start;
      if (!projectFinish && t.finish) projectFinish = t.finish;
    } else {
      filteredTasks.push(t);
    }
  });

  if (!projectStart) projectStart = filteredTasks[0]?.start || '2026-01-01';
  if (!projectFinish) projectFinish = filteredTasks[filteredTasks.length - 1]?.finish || '2028-09-16';

  return {
    project_name: proj.Title || proj.Name || 'Bestway Tower Project',
    project_start: projectStart,
    project_finish: projectFinish,
    total_tasks: filteredTasks.length,
    tasks: filteredTasks
  };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const p = getPool();

    // Ensure ProjectSchedule table exists in Aiven MySQL
    await p.query(`
      CREATE TABLE IF NOT EXISTS ProjectSchedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_name VARCHAR(255) DEFAULT 'Bestway Tower Project',
        project_start VARCHAR(50),
        project_finish VARCHAR(50),
        total_tasks INT DEFAULT 0,
        schedule_json LONGTEXT,
        file_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    if (req.method === 'GET') {
      const [rows] = await p.query('SELECT * FROM ProjectSchedule ORDER BY id DESC LIMIT 1');
      if (rows && rows.length > 0) {
        const row = rows[0];
        try {
          const parsed = typeof row.schedule_json === 'string' ? JSON.parse(row.schedule_json) : row.schedule_json;
          if (parsed && Array.isArray(parsed.tasks)) {
            parsed.tasks = parsed.tasks.filter(t => {
              const name = (t.name || '').trim().toLowerCase();
              return name !== 'project time line' && name !== 'project timeline' && !(t.wbs === '1' && name.includes('project time line'));
            });
            parsed.total_tasks = parsed.tasks.length;
          }
          return res.status(200).json({
            success: true,
            source: 'database',
            updated_at: row.updated_at,
            file_name: row.file_name,
            data: parsed
          });
        } catch (e) {
          console.error('Failed to parse schedule JSON from DB:', e);
        }
      }

      // Fallback
      let fallbackData = null;
      try {
        const candidates = [
          path.resolve(process.cwd(), 'src/data/schedule_tasks.json'),
          path.resolve(process.cwd(), 'frontend/src/data/schedule_tasks.json')
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            fallbackData = JSON.parse(fs.readFileSync(c, 'utf8'));
            if (fallbackData && Array.isArray(fallbackData.tasks)) {
              fallbackData.tasks = fallbackData.tasks.filter(t => {
                const name = (t.name || '').trim().toLowerCase();
                return name !== 'project time line' && name !== 'project timeline' && !(t.wbs === '1' && name.includes('project time line'));
              });
              fallbackData.total_tasks = fallbackData.tasks.length;
            }
            break;
          }
        }
      } catch (e) {}

      if (fallbackData) {
        return res.status(200).json({
          success: true,
          source: 'bundled_fallback',
          data: fallbackData
        });
      }

      return res.status(404).json({ success: false, error: 'Schedule data not found' });
    }

    if (req.method === 'POST') {
      let scheduleData = null;
      let originalName = 'Uploaded_Schedule.mpp';

      const { fileBase64, fileName, scheduleData: directSchedule } = req.body || {};

      if (fileName) {
        originalName = fileName;
      }

      // Direct JSON schedule provided
      if (directSchedule && directSchedule.tasks && Array.isArray(directSchedule.tasks)) {
        scheduleData = {
          ...directSchedule,
          tasks: directSchedule.tasks.filter(t => {
            const name = (t.name || '').trim().toLowerCase();
            return name !== 'project time line' && name !== 'project timeline' && !(t.wbs === '1' && name.includes('project time line'));
          })
        };
        scheduleData.total_tasks = scheduleData.tasks.length;
      } 
      // Base64 file provided (either .mpp or .xml)
      else if (fileBase64) {
        const ext = path.extname(originalName).toLowerCase();
        const buffer = Buffer.from(fileBase64, 'base64');

        if (ext === '.xml') {
          const xmlContent = buffer.toString('utf8');
          scheduleData = parseMspdiXml(xmlContent);
        } else if (ext === '.mpp') {
          // Attempt conversion using native mppjs
          const tempMpp = path.join(os.tmpdir(), `temp_${Date.now()}.mpp`);
          const tempXml = path.join(os.tmpdir(), `temp_${Date.now()}.xml`);
          try {
            fs.writeFileSync(tempMpp, buffer);
            const mppjs = await import('@byteink/mppjs');
            await mppjs.convert(tempMpp, tempXml);
            const xmlContent = fs.readFileSync(tempXml, 'utf8');
            scheduleData = parseMspdiXml(xmlContent);
          } catch (convErr) {
            console.error('MPP conversion error in serverless environment:', convErr);
            return res.status(400).json({
              success: false,
              error: `Direct .mpp conversion failed: ${convErr.message}. For guaranteed instant sync, in Microsoft Project please click File -> Save As -> 'XML Format (*.xml)' and upload that file.`
            });
          } finally {
            try { if (fs.existsSync(tempMpp)) fs.unlinkSync(tempMpp); } catch (e) {}
            try { if (fs.existsSync(tempXml)) fs.unlinkSync(tempXml); } catch (e) {}
          }
        } else if (ext === '.json') {
          const parsedJson = JSON.parse(buffer.toString('utf8'));
          if (parsedJson && Array.isArray(parsedJson.tasks)) {
            parsedJson.tasks = parsedJson.tasks.filter(t => {
              const name = (t.name || '').trim().toLowerCase();
              return name !== 'project time line' && name !== 'project timeline' && !(t.wbs === '1' && name.includes('project time line'));
            });
            parsedJson.total_tasks = parsedJson.tasks.length;
          }
          scheduleData = parsedJson;
        }
      }

      if (!scheduleData || !scheduleData.tasks || !Array.isArray(scheduleData.tasks)) {
        return res.status(400).json({ 
          success: false, 
          error: 'No valid schedule data or file provided. Please choose a .mpp or .xml file.' 
        });
      }

      // Ensure filtered
      scheduleData.tasks = scheduleData.tasks.filter(t => {
        const name = (t.name || '').trim().toLowerCase();
        return name !== 'project time line' && name !== 'project timeline' && !(t.wbs === '1' && name.includes('project time line'));
      });
      const totalTasks = scheduleData.tasks.length;
      scheduleData.total_tasks = totalTasks;

      const connection = await p.getConnection();
      try {
        await connection.beginTransaction();
        const query = `
          INSERT INTO ProjectSchedule (
            project_name, project_start, project_finish, total_tasks, schedule_json, file_name
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(query, [
          scheduleData.project_name || 'Bestway Tower Project',
          scheduleData.project_start || '2026-01-01',
          scheduleData.project_finish || '2028-09-16',
          totalTasks,
          JSON.stringify(scheduleData),
          originalName
        ]);
        await connection.commit();

        return res.status(200).json({
          success: true,
          count: totalTasks,
          fileName: originalName,
          message: `Successfully synchronized ${totalTasks} activities to Project Database & Portal!`,
          data: scheduleData
        });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Aiven Schedule Database Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
