import React, { useState, useEffect } from 'react';
import { 
  FiFileText, 
  FiPlus, 
  FiEye, 
  FiDownload, 
  FiExternalLink, 
  FiTrash2, 
  FiSearch, 
  FiRefreshCw, 
  FiX, 
  FiBarChart2, 
  FiHardDrive,
  FiCheckCircle,
  FiCalendar
} from 'react-icons/fi';

import scannedBillsMaster from '../data/scanned_bills.json';

const GOOGLE_DRIVE_FOLDER_ID = '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai';
const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing';

// HTML parser function for Google Drive folder
const parseDriveFolderHtml = (html) => {
  if (!html || typeof html !== 'string') return [];

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

  list.sort((a, b) => {
    const parseD = (str) => {
      if (!str) return 0;
      const [d, m, y] = str.split('-').map(Number);
      return new Date(y || 2026, (m || 1) - 1, d || 1).getTime();
    };
    return parseD(b.recordingDate) - parseD(a.recordingDate);
  });

  return list;
};

// Fetch live Google Drive files with multi-tier fallback
const fetchLiveGoogleDriveFiles = async () => {
  // Tier 1: Try internal /api/sync-drive (Vercel Serverless Function & local Express server)
  try {
    const res = await fetch('/api/sync-drive', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.files) && json.files.length > 0) {
        return { files: json.files, source: 'serverless_api' };
      }
    }
  } catch (e) {
    console.warn('API /api/sync-drive not reachable, trying public proxy...', e);
  }

  // Tier 2: Try CORS proxies to fetch the public Google Drive folder HTML
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(GOOGLE_DRIVE_FOLDER_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(GOOGLE_DRIVE_FOLDER_URL)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const proxyRes = await fetch(proxyUrl, { cache: 'no-store' });
      if (proxyRes.ok) {
        const html = await proxyRes.text();
        const parsedFiles = parseDriveFolderHtml(html);
        if (parsedFiles && parsedFiles.length > 0) {
          return { files: parsedFiles, source: 'live_proxy' };
        }
      }
    } catch (err) {
      console.warn(`Proxy ${proxyUrl} failed:`, err);
    }
  }

  // Tier 3: Return bundled master files
  return { files: scannedBillsMaster, source: 'bundled_master' };
};

const INITIAL_DRIVE_FILES = scannedBillsMaster;

const BillsDataPage = ({ onNavigate, theme }) => {
  const isDark = theme === 'dark';

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('mpr_drive_scanned_files_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= scannedBillsMaster.length) return parsed;
      } catch (e) {
        console.error('Failed to parse saved drive files data', e);
      }
    }
    return scannedBillsMaster;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToastMsg, setSyncToastMsg] = useState('');
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for manual entry if needed
  const [newRecordingDate, setNewRecordingDate] = useState('04-08-2026');
  const [newSubject, setNewSubject] = useState('');
  const [newDriveLink, setNewDriveLink] = useState('');

  // Auto-sync on component mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const result = await fetchLiveGoogleDriveFiles();
        if (isMounted && result.files && result.files.length > 0) {
          setFiles(result.files);
          localStorage.setItem('mpr_drive_scanned_files_v2', JSON.stringify(result.files));
        }
      } catch (e) {
        console.warn('Auto-sync on load error:', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('mpr_drive_scanned_files_v2', JSON.stringify(files));
  }, [files]);

  // Helper to extract File ID from Google Drive URL
  const extractDriveId = (urlStr) => {
    if (!urlStr) return GOOGLE_DRIVE_FOLDER_ID;
    const fileMatch = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    const idMatch = urlStr.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    const folderMatch = urlStr.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    return urlStr.trim() || GOOGLE_DRIVE_FOLDER_ID;
  };

  // Refresh & Sync from Drive Function
  const handleRefreshSync = async () => {
    setIsSyncing(true);
    setSyncToastMsg('Connecting to Document Archive & fetching latest records...');

    try {
      const result = await fetchLiveGoogleDriveFiles();
      if (result.files && result.files.length > 0) {
        setFiles(result.files);
        localStorage.setItem('mpr_drive_scanned_files_v2', JSON.stringify(result.files));
        setSyncToastMsg(`Synchronized! All ${result.files.length} documents up to date.`);
      } else {
        setSyncToastMsg(`Document Archive synchronized (${files.length} documents).`);
      }
    } catch (err) {
      console.error('Refresh sync error:', err);
      setSyncToastMsg('Sync completed with cached records.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToastMsg(''), 4500);
    }
  };

  // Handle Add New Entry
  const handleAddFile = (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    // Check if user pasted full title like "04-08-2026 -- Subject"
    let parsedDate = newRecordingDate;
    let parsedSub = newSubject.trim();

    if (parsedSub.includes('--')) {
      const parts = parsedSub.split('--');
      if (parts.length >= 2) {
        parsedDate = parts[0].trim();
        parsedSub = parts.slice(1).join('--').trim().replace(/\.pdf$/i, '');
      }
    }

    const extractedId = extractDriveId(newDriveLink);
    const driveUrl = newDriveLink.includes('http') ? newDriveLink.trim() : `https://drive.google.com/file/d/${extractedId}/view`;

    const newEntry = {
      id: extractedId || `custom-${Date.now()}`,
      fileId: extractedId,
      recordingDate: parsedDate,
      subject: parsedSub,
      fileSize: 'PDF Document',
      fileType: 'PDF Document',
      driveUrl: driveUrl
    };

    setFiles([newEntry, ...files]);
    setShowAddModal(false);
    setNewSubject('');
    setNewDriveLink('');
  };

  // Delete file entry
  const handleDeleteFile = (fileId) => {
    if (window.confirm('Are you sure you want to remove this document from the list?')) {
      setFiles(files.filter(f => f.fileId !== fileId && f.id !== fileId));
    }
  };

  // Filtered files by search term
  const filteredFiles = files.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.subject.toLowerCase().includes(term) ||
      item.recordingDate.toLowerCase().includes(term)
    );
  });

  // Calculate the latest recording date timestamp among all documents to mark latest uploads
  const parseDateToTime = (dStr) => {
    if (!dStr) return 0;
    const parts = dStr.split('-').map(Number);
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    return 0;
  };

  const maxTimestamp = files.length > 0
    ? Math.max(...files.map(f => parseDateToTime(f.recordingDate)))
    : 0;

  return (
    <div className="bills-page-container">
      {/* Top Navigation & Action Bar */}
      <div className="page-navigation-bar">
        <button className="btn-confirm" onClick={() => onNavigate('home')}>
          Return to Portal
        </button>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="btn-confirm"
            onClick={handleRefreshSync}
            disabled={isSyncing}
            style={{ background: 'linear-gradient(135deg, #2EC4B6 0%, #118AB2 100%)' }}
            title="Refresh & Sync latest files from Document Archive"
          >
            <FiRefreshCw className={isSyncing ? 'spinner' : ''} size={16} />
            {isSyncing ? 'Syncing...' : 'Refresh Sync'}
          </button>
        </div>
      </div>

      {/* Sync Toast Banner */}
      {syncToastMsg && (
        <div style={{
          background: 'rgba(46, 196, 182, 0.15)',
          border: '1px solid rgba(46, 196, 182, 0.4)',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '20px',
          color: '#2EC4B6',
          fontWeight: 600,
          fontSize: '0.86rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <FiCheckCircle size={18} />
          <span>{syncToastMsg}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bills-header-card">
        <div className="bills-icon-container">
          <FiFileText size={38} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="bills-title">Scanned Bills &amp; Log Files</h1>
          <p className="bills-subtitle">
            Official scanned POs, billing vouchers, and log files stored in cloud document archive. Click <strong>Preview</strong> for interactive reader or <strong>Download</strong> for direct file copy.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search by subject or recording date (e.g. 04-08-2026 or PO Issued)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 44px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              fontFamily: 'Poppins, sans-serif'
            }}
          />
        </div>

        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Total Documents: <strong style={{ color: '#2EC4B6' }}>{filteredFiles.length}</strong>
        </div>
      </div>

      {/* Files Repository Data Table */}
      <div className="table-card bills-table-card">
        <div className="table-wrapper">
          <table className="data-table bills-data-table">
            <thead>
              <tr>
                <th className="col-index">#</th>
                <th className="col-date">Recording Date</th>
                <th className="col-subject">Subject</th>
                <th className="col-size">Size</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No documents found matching your search.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((item, idx) => {
                  // Direct PDF preview & download URLs
                  const previewUrl = `https://drive.google.com/file/d/${item.fileId}/preview`;
                  const downloadUrl = `https://drive.google.com/uc?export=download&id=${item.fileId}`;
                  const fileTimestamp = parseDateToTime(item.recordingDate);
                  const isLatest = maxTimestamp > 0 && fileTimestamp === maxTimestamp;

                  return (
                    <tr key={item.fileId || idx} className={isLatest ? 'row-latest-bill' : ''}>
                      <td className="col-index" style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td className="col-date">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2EC4B6', fontWeight: 700 }}>
                            <FiCalendar size={14} />
                            <span>{item.recordingDate}</span>
                          </div>
                          {isLatest && (
                            <span className="bill-new-badge" title="Latest Uploaded Document">
                              <span className="bill-new-beacon">
                                <span className="bill-new-beacon-wave"></span>
                                <span className="bill-new-beacon-dot"></span>
                              </span>
                              <span className="bill-new-text">NEW</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="col-subject">
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {item.subject}
                        </div>
                      </td>
                      <td className="col-size">
                        <span className="chart-card-badge" style={{ background: 'rgba(46, 196, 182, 0.15)', color: '#118AB2', border: '1px solid rgba(46, 196, 182, 0.35)' }}>
                          {item.fileSize || 'PDF'}
                        </span>
                      </td>
                      <td className="col-actions">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Preview Button */}
                          <button
                            className="btn-shortcut"
                            style={{ 
                              padding: '7px 14px', 
                              fontSize: '0.8rem', 
                              fontWeight: 600,
                              background: 'rgba(46, 196, 182, 0.18)', 
                              color: '#2EC4B6', 
                              border: '1px solid rgba(46, 196, 182, 0.4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer'
                            }}
                            onClick={() => setPreviewModalFile({ ...item, previewUrl })}
                            title="Preview PDF Document in Portal Reader"
                          >
                            <FiEye size={15} /> Preview
                          </button>

                          {/* Direct Download Button */}
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-confirm"
                            style={{ 
                              padding: '7px 14px', 
                              fontSize: '0.8rem', 
                              fontWeight: 600,
                              textDecoration: 'none', 
                              background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)', 
                              color: '#ffffff', 
                              borderRadius: '8px', 
                              boxShadow: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap'
                            }}
                            title="Direct Download PDF Document"
                          >
                            <FiDownload size={15} /> Download
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. PDF INTERACTIVE PREVIEW MODAL */}
      {previewModalFile && (
        <div className="modal-overlay" onClick={() => setPreviewModalFile(null)}>
          <div 
            className="modal-content animate-scale-in" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '1050px', width: '94%', height: '88vh', display: 'flex', flexDirection: 'column', padding: '20px' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="bills-badge" style={{ background: 'rgba(46, 196, 182, 0.2)', color: '#2EC4B6', border: '1px solid rgba(46, 196, 182, 0.4)' }}>
                    Recording Date: {previewModalFile.recordingDate}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    PDF Document Archive
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {previewModalFile.subject}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${previewModalFile.fileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-confirm"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', textDecoration: 'none' }}
                >
                  <FiDownload size={14} /> Download PDF
                </a>
                <a
                  href={previewModalFile.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-shortcut"
                  style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.8rem' }}
                >
                  View File <FiExternalLink size={14} />
                </a>
                <button className="modal-close" onClick={() => setPreviewModalFile(null)}>
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Embedded Iframe Previewer */}
            <div style={{ flex: 1, width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: isDark ? '#0f172a' : '#f8fafc' }}>
              <iframe
                src={previewModalFile.previewUrl}
                title={previewModalFile.subject}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                allow="autoplay"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD DOCUMENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-icon-badge cyan" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                  <FiPlus />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Add Scanned Document Entry</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Paste PDF Document Link &amp; Details</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Recording Date (DD-MM-YYYY)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 04-08-2026"
                  value={newRecordingDate}
                  onChange={e => setNewRecordingDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'Poppins, sans-serif',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Subject / Document Title
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. PO Issued for Hiring of Casual Manpower"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'Poppins, sans-serif',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Document Cloud Link or File ID
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Paste cloud document link or File ID"
                  value={newDriveLink}
                  onChange={e => setNewDriveLink(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'Poppins, sans-serif',
                    outline: 'none'
                  }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  <FiPlus size={16} /> Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillsDataPage;
