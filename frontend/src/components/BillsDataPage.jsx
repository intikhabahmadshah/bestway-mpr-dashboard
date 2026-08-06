import React, { useState, useEffect } from 'react';
import { 
  FiFileText, 
  FiPlus, 
  FiEye, 
  FiDownload, 
  FiExternalLink, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiFolder, 
  FiCheckCircle, 
  FiClock, 
  FiX, 
  FiBarChart2, 
  FiLayers,
  FiHardDrive
} from 'react-icons/fi';

const GOOGLE_DRIVE_FOLDER_ID = '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai';
const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing';

const DEFAULT_BILLS = [
  {
    id: 1,
    date: '2026-03-31',
    subject: 'IPC-01 Scanned Bill: Excavation & Earthwork Measurement Sheet',
    category: 'Contractor Bill (IPC-01)',
    fileId: '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai',
    driveUrl: 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing',
    status: 'Verified'
  },
  {
    id: 2,
    date: '2026-04-30',
    subject: 'IPC-02 Scanned Bill: Raft Concrete & Steel Reinforcement Voucher',
    category: 'Contractor Bill (IPC-02)',
    fileId: '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai',
    driveUrl: 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing',
    status: 'Verified'
  },
  {
    id: 3,
    date: '2026-05-31',
    subject: 'IPC-03 Scanned Bill: Retaining Wall & Basement Column Concreting',
    category: 'Contractor Bill (IPC-03)',
    fileId: '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai',
    driveUrl: 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing',
    status: 'Verified'
  },
  {
    id: 4,
    date: '2026-06-30',
    subject: 'IPC-04 Scanned Bill: Ground Floor Slab & Beams Structural Bill',
    category: 'Contractor Bill (IPC-04)',
    fileId: '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai',
    driveUrl: 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing',
    status: 'Verified'
  },
  {
    id: 5,
    date: '2026-07-31',
    subject: 'IPC-05 Scanned Bill: 1st & 2nd Floor Framing & Quality Inspection Log',
    category: 'Contractor Bill (IPC-05)',
    fileId: '1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai',
    driveUrl: 'https://drive.google.com/drive/folders/1RdXy53jKQHQmtqJdAORLHqSoB_Ssf1ai?usp=sharing',
    status: 'Processed'
  }
];

const BillsDataPage = ({ onNavigate, theme }) => {
  const isDark = theme === 'dark';

  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem('mpr_scanned_bills_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved bills data', e);
      }
    }
    return DEFAULT_BILLS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Add New Bill
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Contractor Bill');
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    localStorage.setItem('mpr_scanned_bills_data', JSON.stringify(bills));
  }, [bills]);

  // Extract File/Folder ID from Google Drive URL
  const extractDriveId = (urlStr) => {
    if (!urlStr) return GOOGLE_DRIVE_FOLDER_ID;
    const folderMatch = urlStr.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    const fileMatch = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    const idMatch = urlStr.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    return urlStr.trim() || GOOGLE_DRIVE_FOLDER_ID;
  };

  const handleAddBill = (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const extractedId = extractDriveId(newLink);
    const driveUrl = newLink.includes('http') ? newLink.trim() : `https://drive.google.com/file/d/${extractedId}/view`;

    const newEntry = {
      id: Date.now(),
      date: newDate,
      subject: newSubject.trim(),
      category: newCategory,
      fileId: extractedId,
      driveUrl: driveUrl,
      status: 'Verified'
    };

    setBills([newEntry, ...bills]);
    setShowAddModal(false);
    setNewSubject('');
    setNewLink('');
  };

  const handleDeleteBill = (id) => {
    if (window.confirm('Are you sure you want to remove this bill entry?')) {
      setBills(bills.filter(b => b.id !== id));
    }
  };

  // Filter bills
  const filteredBills = bills.filter(item => {
    const matchesSearch = item.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoriesList = ['ALL', ...new Set(bills.map(b => b.category))];

  return (
    <div className="bills-page-container">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="page-navigation-bar">
        <button className="btn-confirm" onClick={() => onNavigate('home')}>
          Return to Portal
        </button>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href={GOOGLE_DRIVE_FOLDER_URL} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-shortcut"
            style={{ textDecoration: 'none' }}
          >
            <FiHardDrive style={{ color: '#2EC4B6' }} /> Open Google Drive Folder <FiExternalLink size={14} />
          </a>
          <button className="btn-shortcut" onClick={() => onNavigate('grey_structure')}>
            <FiBarChart2 /> Grey Structure Dashboard
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bills-header-card">
        <div className="bills-icon-container">
          <FiFileText size={38} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="bills-badge">Google Drive Storage Active</span>
            <span className="phase-pill" style={{ background: 'rgba(255, 209, 102, 0.2)', color: '#FFD166', border: '1px solid rgba(255, 209, 102, 0.4)' }}>
              15 GB Free Capacity
            </span>
          </div>
          <h1 className="bills-title">Scanned Bills & Log Files Repository</h1>
          <p className="bills-subtitle">
            Contractor billing vouchers, IPC scanned documents, and site log files stored on Cloud Storage with instant Preview & Download.
          </p>
        </div>
        <div>
          <button 
            className="btn-confirm" 
            onClick={() => setShowAddModal(true)}
            style={{ background: 'linear-gradient(135deg, #2EC4B6 0%, #118AB2 100%)', whiteSpace: 'nowrap' }}
          >
            <FiPlus size={18} /> Add New Bill File
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="table-search-bar" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search bills by date, subject, or IPC number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiFilter style={{ color: '#2EC4B6' }} />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              outline: 'none'
            }}
          >
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bills Data Table */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th style={{ width: '130px' }}>Date</th>
                <th>Subject / Description</th>
                <th style={{ width: '200px' }}>Category</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '220px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No scanned bills found matching your search. Click "Add New Bill File" to add entries!
                  </td>
                </tr>
              ) : (
                filteredBills.map((item, idx) => {
                  const formattedDate = new Date(item.date).toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' });
                  
                  // Construct preview & download links
                  const isFolder = item.fileId === GOOGLE_DRIVE_FOLDER_ID || item.driveUrl.includes('folders');
                  const embedPreviewUrl = isFolder 
                    ? `https://drive.google.com/embeddedfolderview?id=${item.fileId}#list`
                    : `https://drive.google.com/file/d/${item.fileId}/preview`;
                  
                  const downloadUrl = isFolder
                    ? item.driveUrl
                    : `https://drive.google.com/uc?export=download&id=${item.fileId}`;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formattedDate}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {item.subject}
                        </div>
                      </td>
                      <td>
                        <span className="chart-card-badge" style={{ background: 'rgba(17, 138, 178, 0.15)', color: '#118AB2', border: '1px solid rgba(17, 138, 178, 0.3)' }}>
                          {item.category}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${item.status === 'Verified' ? 'ahead' : 'on-track'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {/* Preview Button */}
                          <button
                            className="btn-shortcut"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'rgba(46, 196, 182, 0.18)', color: '#2EC4B6', border: '1px solid rgba(46, 196, 182, 0.4)' }}
                            onClick={() => setPreviewModalFile({ ...item, embedPreviewUrl })}
                            title="Preview PDF Document in Portal"
                          >
                            <FiEye size={14} /> Preview
                          </button>

                          {/* Direct Download Button */}
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-confirm"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)', color: '#ffffff', borderRadius: '8px', boxShadow: 'none' }}
                            title="Direct Download Scanned Bill PDF"
                          >
                            <FiDownload size={14} /> Download
                          </a>

                          {/* Delete Entry */}
                          <button
                            onClick={() => handleDeleteBill(item.id)}
                            style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF476F', borderRadius: '8px', cursor: 'pointer' }}
                            title="Delete Entry"
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

      {/* 1. PDF & FOLDER PREVIEW MODAL */}
      {previewModalFile && (
        <div className="modal-overlay" onClick={() => setPreviewModalFile(null)}>
          <div 
            className="modal-content animate-scale-in" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '1000px', width: '92%', height: '85vh', display: 'flex', flexDirection: 'column', padding: '20px' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="bills-badge" style={{ background: 'rgba(46, 196, 182, 0.2)', color: '#2EC4B6', border: '1px solid rgba(46, 196, 182, 0.4)' }}>
                    {previewModalFile.category}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Date: {new Date(previewModalFile.date).toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {previewModalFile.subject}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={previewModalFile.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-shortcut"
                  style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.8rem' }}
                >
                  Open in Google Drive <FiExternalLink size={14} />
                </a>
                <button className="modal-close" onClick={() => setPreviewModalFile(null)}>
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Embedded Iframe Previewer */}
            <div style={{ flex: 1, width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: isDark ? '#0f172a' : '#f8fafc' }}>
              <iframe
                src={previewModalFile.embedPreviewUrl}
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

      {/* 2. ADD NEW BILL MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="section-icon-badge cyan" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                  <FiPlus />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Add New Bill / File Entry</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Link Google Drive PDF or Folder</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddBill} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Bill Date
                </label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
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
                  Subject / Description
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. IPC-06 Scanned Bill: 3rd Floor Slab Concrete Work"
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
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
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
                >
                  <option value="Contractor Bill (IPC-01)">Contractor Bill (IPC-01)</option>
                  <option value="Contractor Bill (IPC-02)">Contractor Bill (IPC-02)</option>
                  <option value="Contractor Bill (IPC-03)">Contractor Bill (IPC-03)</option>
                  <option value="Contractor Bill (IPC-04)">Contractor Bill (IPC-04)</option>
                  <option value="Contractor Bill (IPC-05)">Contractor Bill (IPC-05)</option>
                  <option value="Contractor Bill (IPC-06)">Contractor Bill (IPC-06)</option>
                  <option value="Site Inspection Log">Site Inspection Log</option>
                  <option value="Quality Audit Voucher">Quality Audit Voucher</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Google Drive PDF Link or File ID
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. https://drive.google.com/file/d/1.../view or folder link"
                  value={newLink}
                  onChange={e => setNewLink(e.target.value)}
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
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Paste Google Drive file view link or leave blank to link to default project folder.
                </span>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  <FiPlus size={16} /> Save Bill Entry
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
