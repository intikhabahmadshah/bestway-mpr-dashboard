const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const os = require('os');
const { 
    initDatabase, 
    getAllMPRData, 
    insertMPRData, 
    clearMPRData,
    getProjectSchedule,
    saveProjectSchedule 
} = require('./dal/database');
const { parseMspdiXml } = require('./utils/mppParser');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer config for memory and disk upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadDir = path.join(os.tmpdir(), 'mpp_uploads');
if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
}
const diskUpload = multer({ dest: uploadDir });

// Initialize database
initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
});

// Helper function to parse float and handle empty strings
const parseSafeFloat = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
};

const syncDriveHandler = require('../api/sync-drive');

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/sync-drive', (req, res) => syncDriveHandler(req, res));

app.get('/api/mpr', async (req, res) => {
    try {
        const data = await getAllMPRData();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching MPR data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch MPR data' });
    }
});

app.post('/api/mpr/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const results = [];
    const readable = Readable.from(req.file.buffer.toString());

    readable
        .pipe(csv())
        .on('data', (data) => {
            results.push({
                month: data['Month'] || null,
                month_ending: data['Month Ending'] || null,
                duration: parseInt(data['Duration']) || 0,
                monthly_planned: parseSafeFloat(data['Monthly Planned %']),
                monthly_actual: parseSafeFloat(data['Monthly Actual %']),
                accumulative_planned: parseSafeFloat(data['Accumulative Planned %']),
                accumulative_actual: parseSafeFloat(data['Accumulative Actual %'])
            });
        })
        .on('end', async () => {
            try {
                const rowCount = await insertMPRData(results);
                res.json({ success: true, message: 'Data uploaded successfully', rowCount });
            } catch (error) {
                console.error('Error inserting uploaded data:', error);
                res.status(500).json({ success: false, error: 'Failed to process uploaded data' });
            }
        })
        .on('error', (error) => {
            console.error('Error parsing CSV:', error);
            res.status(500).json({ success: false, error: 'Failed to parse CSV file' });
        });
});

app.post('/api/mpr/seed', async (req, res) => {
    const csvFilePath = path.join(__dirname, '../MPR - Data.csv');
    if (!fs.existsSync(csvFilePath)) {
        return res.status(404).json({ success: false, error: 'Seed file not found' });
    }

    const results = [];
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
            results.push({
                month: data['Month'] || null,
                month_ending: data['Month Ending'] || null,
                duration: parseInt(data['Duration']) || 0,
                monthly_planned: parseSafeFloat(data['Monthly Planned %']),
                monthly_actual: parseSafeFloat(data['Monthly Actual %']),
                accumulative_planned: parseSafeFloat(data['Accumulative Planned %']),
                accumulative_actual: parseSafeFloat(data['Accumulative Actual %'])
            });
        })
        .on('end', async () => {
            try {
                const rowCount = await insertMPRData(results);
                res.json({ success: true, message: 'Data seeded successfully', rowCount });
            } catch (error) {
                console.error('Error seeding data:', error);
                res.status(500).json({ success: false, error: 'Failed to seed data' });
            }
        })
        .on('error', (error) => {
            console.error('Error reading seed CSV:', error);
            res.status(500).json({ success: false, error: 'Failed to read seed CSV file' });
        });
});

app.delete('/api/mpr', async (req, res) => {
    try {
        await clearMPRData();
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing MPR data:', error);
        res.status(500).json({ success: false, error: 'Failed to clear MPR data' });
    }
});

// Schedule endpoints
app.get('/api/schedule', async (req, res) => {
    try {
        const dbSchedule = await getProjectSchedule();
        if (dbSchedule && dbSchedule.data && Array.isArray(dbSchedule.data.tasks) && dbSchedule.data.tasks.length > 0) {
            return res.json({
                success: true,
                source: 'aiven_database',
                updated_at: dbSchedule.updated_at,
                file_name: dbSchedule.file_name,
                data: dbSchedule.data
            });
        }
        
        // Fallback to local JSON file
        const jsonPath = path.join(__dirname, '../frontend/src/data/schedule_tasks.json');
        if (fs.existsSync(jsonPath)) {
            const fallbackData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            return res.json({
                success: true,
                source: 'bundled_fallback',
                data: fallbackData
            });
        }
        res.status(404).json({ success: false, error: 'Schedule data not found' });
    } catch (error) {
        console.error('Error fetching schedule data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch schedule data' });
    }
});

app.post('/api/schedule/upload-mpp', diskUpload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const uploadedPath = req.file.path;
    const originalName = req.file.originalname || 'Project_Schedule.mpp';
    const ext = path.extname(originalName).toLowerCase();
    let xmlContent = '';
    let tempXmlPath = null;

    try {
        if (ext === '.mpp') {
            // Convert MPP to XML via mppjs
            const mppjs = await import('@byteink/mppjs');
            tempXmlPath = path.join(uploadDir, `converted_${Date.now()}.xml`);
            await mppjs.convert(uploadedPath, tempXmlPath);
            xmlContent = fs.readFileSync(tempXmlPath, 'utf8');
        } else if (ext === '.xml') {
            xmlContent = fs.readFileSync(uploadedPath, 'utf8');
        } else if (ext === '.json') {
            const rawJson = fs.readFileSync(uploadedPath, 'utf8');
            const parsedSchedule = JSON.parse(rawJson);
            await saveProjectSchedule(parsedSchedule, originalName);
            const jsonPath = path.join(__dirname, '../frontend/src/data/schedule_tasks.json');
            try { fs.writeFileSync(jsonPath, JSON.stringify(parsedSchedule, null, 2), 'utf8'); } catch (e) {}
            return res.json({
                success: true,
                count: parsedSchedule.tasks ? parsedSchedule.tasks.length : 0,
                message: 'Schedule JSON saved to database and portal successfully!',
                data: parsedSchedule
            });
        } else {
            return res.status(400).json({ success: false, error: 'Unsupported file format. Please upload a .mpp or .xml file.' });
        }

        // Parse XML
        const scheduleData = parseMspdiXml(xmlContent);

        // Save to Database
        await saveProjectSchedule(scheduleData, originalName);

        // Update local JSON file in frontend/src/data
        const jsonPath = path.join(__dirname, '../frontend/src/data/schedule_tasks.json');
        try {
            fs.writeFileSync(jsonPath, JSON.stringify(scheduleData, null, 2), 'utf8');
        } catch (e) {
            console.warn('Could not overwrite frontend schedule_tasks.json:', e.message);
        }

        return res.json({
            success: true,
            count: scheduleData.tasks.length,
            fileName: originalName,
            message: `Successfully parsed ${scheduleData.tasks.length} activities from ${originalName} and updated Aiven Database & Portal!`,
            data: scheduleData
        });

    } catch (error) {
        console.error('Error processing MPP/XML file:', error);
        return res.status(500).json({ 
            success: false, 
            error: `Failed to process schedule file: ${error.message}` 
        });
    } finally {
        try { if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath); } catch (e) {}
        try { if (tempXmlPath && fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath); } catch (e) {}
    }
});

app.post('/api/schedule', async (req, res) => {
    try {
        let { scheduleData, fileName, fileBase64 } = req.body || {};
        let originalName = fileName || 'Project_Schedule.mpp';

        if (!scheduleData && fileBase64) {
            const ext = path.extname(originalName).toLowerCase();
            const buffer = Buffer.from(fileBase64, 'base64');

            if (ext === '.xml') {
                const xmlContent = buffer.toString('utf8');
                scheduleData = parseMspdiXml(xmlContent);
            } else if (ext === '.mpp') {
                const tempMpp = path.join(uploadDir, `temp_${Date.now()}.mpp`);
                const tempXml = path.join(uploadDir, `temp_${Date.now()}.xml`);
                try {
                    fs.writeFileSync(tempMpp, buffer);
                    const mppjs = await import('@byteink/mppjs');
                    await mppjs.convert(tempMpp, tempXml);
                    const xmlContent = fs.readFileSync(tempXml, 'utf8');
                    scheduleData = parseMspdiXml(xmlContent);
                } finally {
                    try { if (fs.existsSync(tempMpp)) fs.unlinkSync(tempMpp); } catch (e) {}
                    try { if (fs.existsSync(tempXml)) fs.unlinkSync(tempXml); } catch (e) {}
                }
            } else if (ext === '.json') {
                scheduleData = JSON.parse(buffer.toString('utf8'));
            }
        }

        if (!scheduleData || !scheduleData.tasks || !Array.isArray(scheduleData.tasks)) {
            return res.status(400).json({ success: false, error: 'Invalid schedule data format or file' });
        }

        await saveProjectSchedule(scheduleData, originalName);

        // Update local JSON file
        const jsonPath = path.join(__dirname, '../frontend/src/data/schedule_tasks.json');
        try {
            fs.writeFileSync(jsonPath, JSON.stringify(scheduleData, null, 2), 'utf8');
        } catch (e) {}

        return res.json({
            success: true,
            count: scheduleData.tasks.length,
            fileName: originalName,
            message: `Successfully synchronized ${scheduleData.tasks.length} activities to Database & Portal!`,
            data: scheduleData
        });
    } catch (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
