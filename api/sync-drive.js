const https = require('https');

const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Request timed out')));
  });
}

function parseFilesFromHtml(html) {
  if (!html) return [];

  // Match ds:4 callback data
  const match = html.match(/AF_initDataCallback\(\{key:\s*'ds:4'[\s\S]*?data:([\s\S]*?)\}\);<\/script>/);
  let dataStr = '';
  if (match && match[1]) {
    dataStr = match[1]
      .replace(/\\u0026/g, '&')
      .replace(/\\u003d/g, '=')
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>');
  } else {
    dataStr = html;
  }

  // Regex pattern matching Google Drive items: [null, "fileId"] ... ["DD-MM-YYYY -- Title.pdf"] ... ["Size: X.X MB"]
  const regex = /\[null,"([a-zA-Z0-9_-]{28,})"\][\s\S]*?\[\[\["([0-9]{2}-[0-9]{2}-[0-9]{4}\s*--\s*[^"\n\\]+?\.pdf)"[\s\S]*?\[\[\["Size:\s*([^"\n\\]+)/g;

  const uniqueFiles = new Map();
  let m;
  while ((m = regex.exec(dataStr)) !== null) {
    const fid = m[1];
    const fname = m[2];
    const fsize = (m[3] || 'PDF Document').trim();

    if (!uniqueFiles.has(fid)) {
      const cleanName = fname.replace(/\.pdf$/i, '');
      const parts = cleanName.split('--');
      const recordingDate = parts[0].trim();
      const subject = parts.slice(1).join('--').trim();

      uniqueFiles.set(fid, {
        id: fid,
        fileId: fid,
        recordingDate,
        subject,
        fileSize: fsize,
        fileType: 'PDF Document',
        driveUrl: `https://drive.google.com/file/d/${fid}/view`
      });
    }
  }

  const list = Array.from(uniqueFiles.values());

  // Sort by date descending (DD-MM-YYYY)
  list.sort((a, b) => {
    const parseD = (str) => {
      if (!str) return 0;
      const [d, m, y] = str.split('-').map(Number);
      return new Date(y || 2026, (m || 1) - 1, d || 1).getTime();
    };
    return parseD(b.recordingDate) - parseD(a.recordingDate);
  });

  return list;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const html = await fetchUrl(GOOGLE_DRIVE_FOLDER_URL);
    const files = parseFilesFromHtml(html);

    if (files.length > 0) {
      return res.status(200).json({
        success: true,
        count: files.length,
        source: 'google_drive_live',
        updatedAt: new Date().toISOString(),
        files
      });
    } else {
      // Fallback: return static dataset if drive html format changed
      const fallbackFiles = require('../frontend/src/data/scanned_bills.json');
      return res.status(200).json({
        success: true,
        count: fallbackFiles.length,
        source: 'cached_fallback',
        files: fallbackFiles
      });
    }
  } catch (err) {
    console.error('Error fetching Google Drive folder:', err);
    try {
      const fallbackFiles = require('../frontend/src/data/scanned_bills.json');
      return res.status(200).json({
        success: true,
        count: fallbackFiles.length,
        source: 'cached_fallback_on_error',
        error: err.message,
        files: fallbackFiles
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
};
