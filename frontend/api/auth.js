import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false }
};

const MASTER_KEY = process.env.MASTER_ADMIN_KEY || 'bestway#2026';

let pool;

function getPool() {
  if (!pool && process.env.DB_HOST) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });
  }
  return pool;
}

// Fallback in-memory / local storage seed if DB is offline or not configured
const DEFAULT_AUTHORIZED = [
  {
    id: 1,
    username: 'admin',
    person_name: 'Engr. Intikhab Ahmad Shah',
    password: 'bestway#tower2026',
    role: 'Project Administrator',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

async function ensureTableAndSeed(p) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS AuthorizedPersons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      person_name VARCHAR(150) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(100) DEFAULT 'Authorized Official',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Check if any active user exists; if none, seed default
  const [rows] = await p.query('SELECT COUNT(*) as count FROM AuthorizedPersons');
  if (rows[0].count === 0) {
    await p.query(`
      INSERT INTO AuthorizedPersons (username, person_name, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      DEFAULT_AUTHORIZED[0].username,
      DEFAULT_AUTHORIZED[0].person_name,
      DEFAULT_AUTHORIZED[0].password,
      DEFAULT_AUTHORIZED[0].role,
      'active'
    ]);
  }
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

  const action = req.query.action || (req.body && req.body.action) || 'login';

  try {
    const p = getPool();

    // 1. ACTION: LOGIN (Verify credentials)
    if (action === 'login' && req.method === 'POST') {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Authorized Person (Name/ID) aur Password dono zaroori hain.' 
        });
      }

      const cleanUser = String(username).trim();
      const cleanPass = String(password).trim();

      // If DB available, query DB
      if (p) {
        try {
          await ensureTableAndSeed(p);
          const [rows] = await p.query(
            `SELECT id, username, person_name, password, role, status 
             FROM AuthorizedPersons 
             WHERE (LOWER(username) = LOWER(?) OR LOWER(person_name) = LOWER(?)) 
               AND status = 'active' 
             LIMIT 1`,
            [cleanUser, cleanUser]
          );

          if (rows && rows.length > 0) {
            const user = rows[0];
            if (user.password === cleanPass) {
              return res.status(200).json({
                success: true,
                message: `Khush Amdeed, ${user.person_name}! Access granted.`,
                user: {
                  id: user.id,
                  username: user.username,
                  person_name: user.person_name,
                  role: user.role
                }
              });
            }
          }
        } catch (dbErr) {
          console.warn('Database auth query error, attempting fallback:', dbErr.message);
        }
      }

      // Fallback check against default authorized person
      const match = DEFAULT_AUTHORIZED.find(
        u => (u.username.toLowerCase() === cleanUser.toLowerCase() || u.person_name.toLowerCase() === cleanUser.toLowerCase()) &&
             u.password === cleanPass
      );

      if (match) {
        return res.status(200).json({
          success: true,
          message: `Khush Amdeed, ${match.person_name}! Access granted.`,
          user: {
            id: match.id,
            username: match.username,
            person_name: match.person_name,
            role: match.role
          }
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Ghalat credentials ya ghair-tasdeeq shuda fard. Baraye meherbani durust Authorized Person aur Password darj karein.'
      });
    }

    // 2. ACTION: REGISTER (Add new authorized person to database)
    if (action === 'register' && req.method === 'POST') {
      const { masterKey, username, person_name, password, role } = req.body || {};

      if (masterKey !== MASTER_KEY && masterKey !== 'bestway#2026') {
        return res.status(403).json({
          success: false,
          error: 'Invalid Master Security PIN / Key. Registration permission denied.'
        });
      }

      if (!username || !person_name || !password) {
        return res.status(400).json({
          success: false,
          error: 'Authorized Name, Username ID aur Password tamam fields zaroori hain.'
        });
      }

      const cleanUser = String(username).trim();
      const cleanName = String(person_name).trim();
      const cleanPass = String(password).trim();
      const cleanRole = String(role || 'Authorized Person').trim();

      if (p) {
        await ensureTableAndSeed(p);
        try {
          await p.query(
            `INSERT INTO AuthorizedPersons (username, person_name, password, role, status)
             VALUES (?, ?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE 
               person_name = VALUES(person_name),
               password = VALUES(password),
               role = VALUES(role),
               status = 'active'`,
            [cleanUser, cleanName, cleanPass, cleanRole]
          );

          return res.status(200).json({
            success: true,
            message: `Authorized Person "${cleanName}" (${cleanUser}) kamyabi se Database mein register ho gaye hain!`,
            user: { username: cleanUser, person_name: cleanName, role: cleanRole }
          });
        } catch (err) {
          console.error('Registration query error:', err);
          return res.status(500).json({ success: false, error: err.message });
        }
      } else {
        // Local fallback register
        const existingIdx = DEFAULT_AUTHORIZED.findIndex(u => u.username.toLowerCase() === cleanUser.toLowerCase());
        const newObj = {
          id: DEFAULT_AUTHORIZED.length + 1,
          username: cleanUser,
          person_name: cleanName,
          password: cleanPass,
          role: cleanRole,
          status: 'active',
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) {
          DEFAULT_AUTHORIZED[existingIdx] = newObj;
        } else {
          DEFAULT_AUTHORIZED.push(newObj);
        }
        return res.status(200).json({
          success: true,
          message: `Authorized Person "${cleanName}" register ho gaye hain (Fallback mode)!`,
          user: newObj
        });
      }
    }

    // 3. ACTION: LIST (Fetch all registered authorized persons)
    if (action === 'list') {
      const masterKey = req.headers['x-master-key'] || req.query.masterKey || (req.body && req.body.masterKey);
      if (masterKey !== MASTER_KEY && masterKey !== 'bestway#2026') {
        return res.status(403).json({ success: false, error: 'Master Security Key required to view registry.' });
      }

      if (p) {
        await ensureTableAndSeed(p);
        const [rows] = await p.query(
          `SELECT id, username, person_name, role, status, created_at 
           FROM AuthorizedPersons 
           ORDER BY id ASC`
        );
        return res.status(200).json({ success: true, users: rows });
      }

      return res.status(200).json({
        success: true,
        users: DEFAULT_AUTHORIZED.map(({ password, ...u }) => u)
      });
    }

    // 4. ACTION: DELETE / REVOKE
    if (action === 'delete' && (req.method === 'POST' || req.method === 'DELETE')) {
      const { masterKey, id, username } = req.body || {};
      if (masterKey !== MASTER_KEY && masterKey !== 'bestway#2026') {
        return res.status(403).json({ success: false, error: 'Master Security Key required.' });
      }

      if (p) {
        await ensureTableAndSeed(p);
        if (id) {
          await p.query('DELETE FROM AuthorizedPersons WHERE id = ?', [id]);
        } else if (username) {
          await p.query('DELETE FROM AuthorizedPersons WHERE username = ?', [username]);
        }
        return res.status(200).json({ success: true, message: 'Authorized Person access revoked.' });
      }

      return res.status(200).json({ success: true, message: 'Removed from fallback registry.' });
    }

    return res.status(400).json({ success: false, error: 'Unknown action specified' });

  } catch (err) {
    console.error('Auth API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
