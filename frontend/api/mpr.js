import mysql from 'mysql2/promise';

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
    res.status(200).end();
    return;
  }

  try {
    const p = getPool();

    // Ensure MPR table exists
    await p.query(`
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
    `);

    if (req.method === 'GET') {
      const [rows] = await p.query('SELECT * FROM MPR ORDER BY duration ASC');
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'POST') {
      const { rows } = req.body || {};
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No data rows provided' });
      }

      const connection = await p.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query('TRUNCATE TABLE MPR');

        const values = rows.map((row) => [
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
        return res.status(200).json({ success: true, count: result.affectedRows, message: 'Aiven Cloud MySQL updated successfully!' });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Aiven Database Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
