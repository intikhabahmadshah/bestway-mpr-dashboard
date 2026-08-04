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

async function initDatabase() {
    // Create pool with Aiven database selected directly
    pool = mysql.createPool({
        ...dbConfig,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

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
    await pool.query(createTableQuery);
    console.log('Database connection established and MPR table initialized successfully.');
}

async function getAllMPRData() {
    const [rows] = await pool.query('SELECT * FROM MPR ORDER BY duration ASC');
    return rows;
}

async function insertMPRData(rows) {
    if (!rows || rows.length === 0) return 0;
    
    const connection = await pool.getConnection();
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
    await pool.query('TRUNCATE TABLE MPR');
}

function getPool() {
    return pool;
}

module.exports = {
    initDatabase,
    getAllMPRData,
    insertMPRData,
    clearMPRData,
    getPool
};
