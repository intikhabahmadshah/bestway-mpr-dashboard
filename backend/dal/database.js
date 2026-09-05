const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isCloud = (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com')) || process.env.DB_PORT !== '3306';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined
};

const dbName = process.env.DB_NAME || 'defaultdb';

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

async function initDatabase() {
    const p = getPool();

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS MPR (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month VARCHAR(20),
            month_ending VARCHAR(20),
            duration INT,
            monthly_planned DECIMAL(10,8),
            monthly_actual DECIMAL(10,8),
            accumulative_planned DECIMAL(10,8),
            accumulative_actual DECIMAL(10,8),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `;
    await p.query(createTableQuery);

    const createScheduleTableQuery = `
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
    `;
    await p.query(createScheduleTableQuery);
    console.log('Database connection established: MPR and ProjectSchedule tables initialized successfully.');
}

async function getAllMPRData() {
    const [rows] = await getPool().query('SELECT * FROM MPR ORDER BY duration ASC');
    return rows;
}

async function insertMPRData(rows) {
    if (!rows || rows.length === 0) return 0;
    
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('TRUNCATE TABLE MPR');
        
        const values = rows.map(row => [
            row.month,
            row.month_ending,
            row.duration,
            row.monthly_planned,
            row.monthly_actual,
            row.accumulative_planned,
            row.accumulative_actual
        ]);
        
        const query = `
            INSERT INTO MPR (
                month, month_ending, duration, monthly_planned, monthly_actual, accumulative_planned, accumulative_actual
            ) VALUES ?
        `;
        
        const [result] = await connection.query(query, [values]);
        await connection.commit();
        return result.affectedRows;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function clearMPRData() {
    await getPool().query('TRUNCATE TABLE MPR');
}

async function getProjectSchedule() {
    const [rows] = await getPool().query('SELECT * FROM ProjectSchedule ORDER BY id DESC LIMIT 1');
    if (rows && rows.length > 0) {
        const row = rows[0];
        try {
            const parsedData = typeof row.schedule_json === 'string' ? JSON.parse(row.schedule_json) : row.schedule_json;
            return {
                id: row.id,
                project_name: row.project_name,
                project_start: row.project_start,
                project_finish: row.project_finish,
                total_tasks: row.total_tasks,
                file_name: row.file_name,
                updated_at: row.updated_at,
                data: parsedData
            };
        } catch (e) {
            console.error('Error parsing schedule_json from database:', e);
        }
    }
    return null;
}

async function saveProjectSchedule(scheduleData, fileName = 'Uploaded_Schedule.mpp') {
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const query = `
            INSERT INTO ProjectSchedule (
                project_name, project_start, project_finish, total_tasks, schedule_json, file_name
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        const totalTasks = scheduleData.tasks ? scheduleData.tasks.length : (scheduleData.total_tasks || 0);
        const [result] = await connection.query(query, [
            scheduleData.project_name || 'Bestway Tower Project',
            scheduleData.project_start || '2026-01-01',
            scheduleData.project_finish || '2028-09-16',
            totalTasks,
            JSON.stringify(scheduleData),
            fileName
        ]);
        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    initDatabase,
    getAllMPRData,
    insertMPRData,
    clearMPRData,
    getProjectSchedule,
    saveProjectSchedule,
    getPool
};

