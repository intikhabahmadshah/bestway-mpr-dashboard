import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

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

    // Ensure ProjectSchedule table exists
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
          return res.status(200).json({
            success: true,
            source: 'aiven_database',
            updated_at: row.updated_at,
            file_name: row.file_name,
            data: parsed
          });
        } catch (e) {
          console.error('Failed to parse schedule JSON from DB:', e);
        }
      }

      // Fallback to local JSON
      let fallbackData = null;
      try {
        const candidates = [
          path.resolve(process.cwd(), 'src/data/schedule_tasks.json'),
          path.resolve(process.cwd(), 'frontend/src/data/schedule_tasks.json')
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            fallbackData = JSON.parse(fs.readFileSync(c, 'utf8'));
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
      const { scheduleData, fileName } = req.body || {};
      if (!scheduleData || !scheduleData.tasks || !Array.isArray(scheduleData.tasks)) {
        return res.status(400).json({ success: false, error: 'Invalid schedule data format' });
      }

      const totalTasks = scheduleData.tasks.length;
      const connection = await p.getConnection();
      try {
        await connection.beginTransaction();
        const query = `
          INSERT INTO ProjectSchedule (
            project_name, project_start, project_finish, total_tasks, schedule_json, file_name
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
          scheduleData.project_name || 'Bestway Tower Project',
          scheduleData.project_start || '2026-01-01',
          scheduleData.project_finish || '2028-09-16',
          totalTasks,
          JSON.stringify(scheduleData),
          fileName || 'Uploaded_Schedule.mpp'
        ]);
        await connection.commit();

        return res.status(200).json({
          success: true,
          count: totalTasks,
          message: 'Project Activity Schedule updated successfully in Aiven Database!'
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
