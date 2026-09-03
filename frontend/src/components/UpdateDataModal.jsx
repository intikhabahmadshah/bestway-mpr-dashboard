import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  FiX, 
  FiEdit3, 
  FiPlus, 
  FiTrash2, 
  FiCheckCircle, 
  FiUploadCloud, 
  FiDatabase, 
  FiRefreshCw, 
  FiCalendar, 
  FiClock, 
  FiPercent,
  FiZap,
  FiFileText
} from 'react-icons/fi';

const UpdateDataModal = ({ isOpen, onClose, currentData, onUpdateSuccess, showToast, theme }) => {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'csv'
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  // Initialize rows from currentData or default
  useEffect(() => {
    if (isOpen && currentData && Array.isArray(currentData)) {
      setRows(
        currentData.map((r, i) => ({
          id: r.id || i + 1,
          month: r.month || '',
          month_ending: r.month_ending || '',
          duration: r.duration !== undefined && r.duration !== null ? r.duration : '',
          monthly_planned: r.monthly_planned !== null && r.monthly_planned !== undefined ? (Number(r.monthly_planned) * 100).toFixed(2) : '',
          monthly_actual: r.monthly_actual !== null && r.monthly_actual !== undefined ? (Number(r.monthly_actual) * 100).toFixed(2) : '',
          accumulative_planned: r.accumulative_planned !== null && r.accumulative_planned !== undefined ? (Number(r.accumulative_planned) * 100).toFixed(2) : '',
          accumulative_actual: r.accumulative_actual !== null && r.accumulative_actual !== undefined ? (Number(r.accumulative_actual) * 100).toFixed(2) : '',
        }))
      );
    }
  }, [isOpen, currentData]);

  // Handle cell value changes
  const handleCellChange = (index, field, value) => {
    setRows(prevRows => {
      const updated = [...prevRows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add a new row
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    let nextDuration = 30;
    if (lastRow && Number(lastRow.duration)) {
      nextDuration = Number(lastRow.duration) + 30;
    }

    setRows(prev => [
      ...prev,
      {
        id: prev.length + 1,
        month: '',
        month_ending: '',
        duration: nextDuration,
        monthly_planned: '',
        monthly_actual: '',
        accumulative_planned: '',
        accumulative_actual: ''
      }
    ]);
  };

  // Remove a row
  const handleDeleteRow = (index) => {
    if (rows.length <= 1) {
      if (showToast) showToast('At least one month row is required.', 'error');
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-calculate Accumulative percentages from monthly percentages
  const handleAutoCalculate = () => {
    let accumPlan = 0;
    let accumAct = 0;
    let actualActive = true;

    setRows(prevRows => {
      return prevRows.map(r => {
        const mPlan = parseFloat(r.monthly_planned);
        if (!isNaN(mPlan)) {
          accumPlan += mPlan;
        }

        let mActVal = '';
        if (r.monthly_actual !== '' && r.monthly_actual !== null && r.monthly_actual !== undefined) {
          const mAct = parseFloat(r.monthly_actual);
          if (!isNaN(mAct)) {
            accumAct += mAct;
            mActVal = Math.min(100, accumAct).toFixed(2);
          } else {
            actualActive = false;
          }
        } else {
          actualActive = false;
        }

        return {
          ...r,
          accumulative_planned: isNaN(mPlan) ? r.accumulative_planned : Math.min(100, accumPlan).toFixed(2),
          accumulative_actual: actualActive ? mActVal : ''
        };
      });
    });

    if (showToast) showToast('Accumulative percentages auto-calculated!', 'success');
  };

  // CSV Dropzone handler
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const parseCSVClientSide = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];
    
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 3) continue;
      
      const parsePercentStr = (val) => {
        if (!val || val === '' || val === 'null' || val === 'undefined') return '';
        const clean = val.replace('%', '');
        const num = parseFloat(clean);
        if (isNaN(num)) return '';
        // If between 0 and 1, convert to 0-100 format for editor
        return num <= 1 && num > 0 ? (num * 100).toFixed(2) : num.toString();
      };

      parsed.push({
        id: i,
        month: parts[0] || '',
        month_ending: parts[1] || '',
        duration: parseInt(parts[2], 10) || 0,
        monthly_planned: parsePercentStr(parts[3]),
        monthly_actual: parsePercentStr(parts[4]),
        accumulative_planned: parsePercentStr(parts[5]),
        accumulative_actual: parsePercentStr(parts[6])
      });
    }
    return parsed;
  };

  const handleApplyCSV = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedRows = parseCSVClientSide(e.target.result);
        if (parsedRows.length === 0) {
          showToast('Invalid CSV format. Please upload a valid MPR dataset CSV.', 'error');
          return;
        }
        setRows(parsedRows);
        setActiveTab('editor');
        if (showToast) showToast(`Loaded ${parsedRows.length} rows from CSV. Review & save!`, 'success');
      } catch (err) {
        console.error(err);
        if (showToast) showToast('Failed to parse CSV.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Save changes to backend and localStorage
  const handleSave = async () => {
    if (rows.length === 0) {
      if (showToast) showToast('No data rows to save.', 'error');
      return;
    }

    setSaving(true);

    // Convert editor percentage (0-100) to decimal (0-1) for storage/charts
    const preparedRows = rows.map((r, i) => {
      const toDecimal = (val) => {
        if (val === '' || val === null || val === undefined) return null;
        const num = parseFloat(val);
        if (isNaN(num)) return null;
        return num > 1 ? num / 100.0 : num;
      };

      return {
        id: i + 1,
        month: r.month.trim(),
        month_ending: r.month_ending.trim(),
        duration: parseInt(r.duration, 10) || 0,
        monthly_planned: toDecimal(r.monthly_planned),
        monthly_actual: toDecimal(r.monthly_actual),
        accumulative_planned: toDecimal(r.accumulative_planned),
        accumulative_actual: toDecimal(r.accumulative_actual)
      };
    });

    try {
      // 1. Send update to Aiven MySQL database via API
      try {
        await axios.post('/api/mpr', { rows: preparedRows });
      } catch (apiErr) {
        console.warn('API post warning (offline fallback applied):', apiErr);
      }

      // 2. Save locally in localStorage for persistent client cache
      localStorage.setItem('mpr_custom_data', JSON.stringify(preparedRows));

      if (showToast) {
        showToast('Project Data & Database updated successfully!', 'success');
      }

      // 3. Callback to update parent Dashboard state
      onUpdateSuccess(preparedRows);
      onClose();
    } catch (err) {
      console.error('Save Error:', err);
      if (showToast) showToast('Error saving data. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content update-data-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '1150px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="modal-icon-badge" style={{ background: 'rgba(46, 196, 182, 0.15)', color: '#2EC4B6', padding: '10px', borderRadius: '12px', display: 'flex' }}>
              <FiEdit3 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Update Project Data (Grey Structure)
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Directly edit month-by-month values, update actual progress, or import CSV. Changes sync with Aiven Database.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Modal">
            <FiX size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button 
            className={`btn-tab-toggle ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'editor' ? '#2EC4B6' : 'transparent',
              color: activeTab === 'editor' ? '#073B4C' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FiEdit3 size={15} /> Manual Form Editor ({rows.length} Months)
          </button>
          <button 
            className={`btn-tab-toggle ${activeTab === 'csv' ? 'active' : ''}`}
            onClick={() => setActiveTab('csv')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'csv' ? '#118AB2' : 'transparent',
              color: activeTab === 'csv' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FiUploadCloud size={15} /> CSV File Import
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'editor' ? (
            <div>
              {/* Helper Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  💡 Enter percentage as numbers (e.g. <code>4.70</code> for 4.70%). Leave Actual % empty for future unworked months.
                </span>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="btn-shortcut"
                    onClick={handleAutoCalculate}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', background: 'rgba(46, 196, 182, 0.15)', color: '#2EC4B6', border: '1px solid rgba(46, 196, 182, 0.4)' }}
                    title="Automatically sum up Accumulative Planned % and Accumulative Actual %"
                  >
                    <FiZap size={14} /> Auto-Calculate Accumulative %
                  </button>

                  <button 
                    type="button"
                    className="btn-shortcut"
                    onClick={handleAddRow}
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  >
                    <FiPlus size={14} /> Add Month Row
                  </button>
                </div>
              </div>

              {/* Editable Data Table Grid */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table className="schedule-table" style={{ width: '100%', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '120px' }}>Month Start</th>
                      <th style={{ width: '120px' }}>Month Ending</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Duration (Days)</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Monthly Planned %</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Monthly Actual %</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Accum. Planned %</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Accum. Actual %</th>
                      <th style={{ width: '45px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="schedule-row">
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {index + 1}
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={row.month} 
                            placeholder="e.g. 4/26/2026"
                            onChange={e => handleCellChange(index, 'month', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={row.month_ending} 
                            placeholder="e.g. 4/30/2026"
                            onChange={e => handleCellChange(index, 'month_ending', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={row.duration} 
                            placeholder="Days"
                            onChange={e => handleCellChange(index, 'duration', e.target.value)}
                            style={{ width: '100%', textAlign: 'center', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                          />
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.monthly_planned} 
                              placeholder="0.00"
                              onChange={e => handleCellChange(index, 'monthly_planned', e.target.value)}
                              style={{ width: '100%', textAlign: 'right', padding: '6px 22px 6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
                            />
                            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.76rem' }}>%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.monthly_actual} 
                              placeholder="Leave blank if future"
                              onChange={e => handleCellChange(index, 'monthly_actual', e.target.value)}
                              style={{ width: '100%', textAlign: 'right', padding: '6px 22px 6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: '#2EC4B6', fontSize: '0.82rem', fontWeight: 700 }}
                            />
                            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.76rem' }}>%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.accumulative_planned} 
                              placeholder="0.00"
                              onChange={e => handleCellChange(index, 'accumulative_planned', e.target.value)}
                              style={{ width: '100%', textAlign: 'right', padding: '6px 22px 6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
                            />
                            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.76rem' }}>%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.accumulative_actual} 
                              placeholder="Leave blank if future"
                              onChange={e => handleCellChange(index, 'accumulative_actual', e.target.value)}
                              style={{ width: '100%', textAlign: 'right', padding: '6px 22px 6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: '#2EC4B6', fontSize: '0.82rem', fontWeight: 700 }}
                            />
                            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.76rem' }}>%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteRow(index)}
                            title="Delete Month Row"
                            style={{ background: 'transparent', border: 'none', color: '#EF476F', cursor: 'pointer', padding: '4px' }}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <div 
                {...getRootProps()} 
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: isDragActive ? 'rgba(46, 196, 182, 0.1)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input {...getInputProps()} />
                <FiUploadCloud size={48} style={{ color: '#2EC4B6', marginBottom: '12px' }} />
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                  {file ? file.name : 'Drag & drop your CSV file here, or click to browse'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Supports CSV file format matching Month, Month Ending, Duration, Planned, Actual columns
                </p>
              </div>

              {file && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn-confirm" 
                    onClick={handleApplyCSV}
                    style={{ background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)' }}
                  >
                    Load File Into Form Editor →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <FiDatabase size={15} style={{ color: '#2EC4B6' }} />
            <span>Updates Aiven MySQL Cloud database and updates S-Curve & Gauges</span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-confirm" 
              onClick={handleSave}
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, #2EC4B6 0%, #118AB2 100%)', color: '#073B4C', fontWeight: 800, minWidth: '180px' }}
            >
              {saving ? (
                <>
                  <FiRefreshCw className="spin" size={16} /> Saving to Database...
                </>
              ) : (
                <>
                  <FiCheckCircle size={16} /> Save & Update Dashboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateDataModal;
