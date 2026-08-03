const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { initDatabase, getAllMPRData, insertMPRData, clearMPRData } = require('./dal/database');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer config for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

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

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
