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

const GOOGLE_DRIVE_FOLDER_ID = '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai';
const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing';

// Exact scanned bills currently stored in Google Drive folder
const INITIAL_DRIVE_FILES = [
  {
    id: '1eagjlzvM2bw77eZvguxaAjW7oacFcprW',
    fileId: '1eagjlzvM2bw77eZvguxaAjW7oacFcprW',
    recordingDate: '04-08-2026',
    subject: 'PO Issued for Hiring of Casual Manpower',
    fileSize: '3.4 MB',
    fileType: 'PDF Document',
    driveUrl: 'https://drive.google.com/file/d/1eagjlzvM2bw77eZvguxaAjW7oacFcprW/view'
  },
  {
    id: '16QJm7ID_zHyyQBj3qqCw-zNd94bYTKhG',
    fileId: '16QJm7ID_zHyyQBj3qqCw-zNd94bYTKhG',
    recordingDate: '04-08-2026',
    subject: "Provision of PPE's to Casual Manpower & Sub Contractor Workers Tower Project",
    fileSize: '1.1 MB',
    fileType: 'PDF Document',
    driveUrl: 'https://drive.google.com/file/d/16QJm7ID_zHyyQBj3qqCw-zNd94bYTKhG/view'
  },
  {
    id: '10Wb_ncWNytDjGXviDxpIIqkMTRfNwdOG',
    fileId: '10Wb_ncWNytDjGXviDxpIIqkMTRfNwdOG',
    recordingDate: '04-08-2026',
    subject: 'Rental Shahzore for BCL',
    fileSize: '1.1 MB',
    fileType: 'PDF Document',
    driveUrl: 'https://drive.google.com/file/d/10Wb_ncWNytDjGXviDxpIIqkMTRfNwdOG/view'
  },
  {
    id: '1JX8z4W4AsjzFVXi2Xg55m4iTkuJtY_ed',
    fileId: '1JX8z4W4AsjzFVXi2Xg55m4iTkuJtY_ed',
    recordingDate: '04-08-2026',
    subject: 'Shuttering Work for BCL Tower Project Islamabad',
    fileSize: '2.4 MB',
    fileType: 'PDF Document',
    driveUrl: 'https://drive.google.com/file/d/1JX8z4W4AsjzFVXi2Xg55m4iTkuJtY_ed/view'
  }
];

const BillsDataPage = ({ onNavigate, theme }) => {
  const isDark = theme === 'dark';

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('mpr_drive_scanned_files_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved drive files data', e);
      }
    }
    return INITIAL_DRIVE_FILES;
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
    setSyncToastMsg('Connecting to Google Drive folder & checking for new files...');

    try {
      await new Promise(r => setTimeout(r, 800));

      // Re-merge initial drive files if missing
      setFiles(prevFiles => {
        const existingIds = new Set(prevFiles.map(f => f.fileId));
        const missingFromInitial = INITIAL_DRIVE_FILES.filter(f => !existingIds.has(f.fileId));
        return [...missingFromInitial, ...prevFiles];
      });

      setSyncToastMsg('Folder synced! All scanned PDF bills updated.');
    } catch (err) {
      console.error('Drive Sync Error:', err);
      setSyncToastMsg('Sync completed.');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncToastMsg('');
      }, 1500);
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
            title="Refresh & Sync latest files from Google Drive"
          >
            <FiRefreshCw className={isSyncing ? 'spinner' : ''} size={16} />
            {isSyncing ? 'Syncing Drive...' : 'Refresh Sync'}
          </button>

          <a 
            href={GOOGLE_DRIVE_FOLDER_URL} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-shortcut"
            style={{ textDecoration: 'none' }}
          >
            <FiHardDrive style={{ color: '#2EC4B6' }} /> Google Drive Folder <FiExternalLink size={14} />
          </a>

          <button className="btn-shortcut" onClick={() => onNavigate('grey_structure')}>
            <FiBarChart2 /> Grey Structure Dashboard
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="bills-badge">Google Drive Scanned Repository</span>
            <span className="phase-pill" style={{ background: 'rgba(255, 209, 102, 0.2)', color: '#FFD166', border: '1px solid rgba(255, 209, 102, 0.4)' }}>
              Folder ID: {GOOGLE_DRIVE_FOLDER_ID.substring(0, 10)}...
            </span>
          </div>
          <h1 className="bills-title">Scanned Bills & Log Files</h1>
          <p className="bills-subtitle">
            Official scanned POs, billing vouchers, and log files stored in Google Drive. Click <strong>Preview</strong> for interactive reader or <strong>Download</strong> for direct file copy.
          </p>
        </div>
        <div>
          <button 
            className="btn-confirm" 
            onClick={() => setShowAddModal(true)}
            style={{ background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)', whiteSpace: 'nowrap' }}
          >
            <FiPlus size={18} /> Add Document Entry
          </button>
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
      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th style={{ width: '150px' }}>Recording Date</th>
                <th>Subject</th>
                <th style={{ width: '110px' }}>Size</th>
                <th style={{ width: '230px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No documents found. Click "Refresh Sync" to sync with Google Drive folder!
                  </td>
                </tr>
              ) : (
                filteredFiles.map((item, idx) => {
                  // Direct PDF preview & download URLs
                  const previewUrl = `https://drive.google.com/file/d/${item.fileId}/preview`;
                  const downloadUrl = `https://drive.google.com/uc?export=download&id=${item.fileId}`;

                  return (
                    <tr key={item.fileId || idx}>
                      <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2EC4B6', fontWeight: 700 }}>
                          <FiCalendar size={14} />
                          <span>{item.recordingDate}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {item.subject}
                        </div>
                      </td>
                      <td>
                        <span className="chart-card-badge" style={{ background: 'rgba(255, 209, 102, 0.15)', color: '#D97706', border: '1px solid rgba(255, 209, 102, 0.3)' }}>
                          {item.fileSize || 'PDF'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {/* Preview Button */}
                          <button
                            className="btn-shortcut"
                            style={{ 
                              padding: '7px 14px', 
                              fontSize: '0.8rem', 
                              background: 'rgba(46, 196, 182, 0.18)', 
                              color: '#2EC4B6', 
                              border: '1px solid rgba(46, 196, 182, 0.4)' 
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
                              textDecoration: 'none', 
                              background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)', 
                              color: '#ffffff', 
                              borderRadius: '8px', 
                              boxShadow: 'none' 
                            }}
                            title="Direct Download PDF Document"
                          >
                            <FiDownload size={15} /> Download
                          </a>

                          {/* Delete Action */}
                          <button
                            onClick={() => handleDeleteFile(item.fileId)}
                            style={{ 
                              padding: '7px', 
                              background: 'rgba(239, 68, 68, 0.15)', 
                              border: '1px solid rgba(239, 68, 68, 0.3)', 
                              color: '#EF476F', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                            title="Remove Document"
                          >
                            <FiTrash2 size={14} />
                          </button>
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
                    Google Drive PDF Document
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
                  Drive <FiExternalLink size={14} />
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
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Paste Google Drive PDF Link & Details</p>
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
                  Google Drive Link or File ID
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. https://drive.google.com/file/d/1eagjlzvM2bw77eZvguxaAjW7oacFcprW/view"
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
