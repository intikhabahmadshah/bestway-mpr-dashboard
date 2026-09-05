import React, { useState, useRef } from 'react';
import { 
  FiUploadCloud, 
  FiFileText, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiX, 
  FiClock, 
  FiLayers,
  FiDatabase,
  FiRefreshCw
} from 'react-icons/fi';
import { parseMspdiXml } from '../utils/mppParser';

const UploadMppModal = ({ isOpen, onClose, onScheduleUpdated, showToast }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file) => {
    if (!file) return;
    setErrorMsg('');
    setParsedPreview(null);

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.mpp' && ext !== '.xml' && ext !== '.json') {
      setErrorMsg('Invalid file format. Please choose a Microsoft Project (.mpp or .xml) file.');
      return;
    }

    setSelectedFile(file);

    // If XML or JSON, provide instant client-side preview
    if (ext === '.xml') {
      try {
        const text = await file.text();
        const parsed = parseMspdiXml(text);
        setParsedPreview(parsed);
      } catch (e) {
        console.warn('Could not pre-parse XML:', e.message);
      }
    } else if (ext === '.json') {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed && parsed.tasks) {
          setParsedPreview(parsed);
        }
      } catch (e) {}
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUploadAndSync = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg('');
    setProcessingStep('Reading Microsoft Project file...');

    try {
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

      // Case 1: XML file (can be parsed in-browser and posted directly to database API)
      if (ext === '.xml') {
        setProcessingStep('Parsing XML task breakdown & WBS...');
        const xmlText = await selectedFile.text();
        const scheduleData = parseMspdiXml(xmlText);

        setProcessingStep('Syncing activities with Cloud Database...');
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleData,
            fileName: selectedFile.name
          })
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update schedule in database');
        }

        // Success
        localStorage.setItem('mpr_project_schedule_cache_v1', JSON.stringify(scheduleData));
        if (onScheduleUpdated) onScheduleUpdated(scheduleData);
        if (showToast) showToast(`Synced ${scheduleData.tasks.length} activities from ${selectedFile.name} to Database!`, 'success');
        onClose();
        return;
      }

      // Case 2: JSON file
      if (ext === '.json') {
        setProcessingStep('Parsing JSON schedule...');
        const jsonText = await selectedFile.text();
        const scheduleData = JSON.parse(jsonText);

        setProcessingStep('Saving to Database...');
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleData,
            fileName: selectedFile.name
          })
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update schedule in database');
        }

        localStorage.setItem('mpr_project_schedule_cache_v1', JSON.stringify(scheduleData));
        if (onScheduleUpdated) onScheduleUpdated(scheduleData);
        if (showToast) showToast(`Successfully updated schedule from ${selectedFile.name}!`, 'success');
        onClose();
        return;
      }

      // Case 3: Binary .MPP file
      setProcessingStep('Uploading .MPP to converter engine...');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/schedule/upload-mpp', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Server error while processing .mpp file');
      }

      setProcessingStep('Database updated successfully!');
      localStorage.setItem('mpr_project_schedule_cache_v1', JSON.stringify(json.data));
      if (onScheduleUpdated) onScheduleUpdated(json.data);
      if (showToast) showToast(json.message || `Synchronized ${json.count} activities from ${selectedFile.name}!`, 'success');
      onClose();

    } catch (err) {
      console.error('Upload schedule error:', err);
      setErrorMsg(err.message || 'Failed to process file. Please ensure it is a valid MS Project file.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div 
        className="modal-content animate-scale-in" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '620px', width: '92%', padding: '28px', borderRadius: '16px' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(46, 196, 182, 0.15)',
              color: '#2EC4B6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiUploadCloud size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Upload MS Project (.MPP)
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Update Activity Schedule &amp; Cloud Database in real-time
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#2EC4B6' : 'var(--border-color)'}`,
            borderRadius: '14px',
            padding: '30px 20px',
            textAlign: 'center',
            background: isDragging ? 'rgba(46, 196, 182, 0.08)' : 'var(--bg-main)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '20px'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            accept=".mpp,.xml,.json"
            style={{ display: 'none' }}
          />

          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(17, 138, 178, 0.12)',
            color: '#118AB2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <FiFileText size={26} />
          </div>

          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            {selectedFile ? selectedFile.name : 'Click to browse or drop .MPP file here'}
          </p>
          <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: 0 }}>
            Supports Microsoft Project <strong>.MPP</strong> and <strong>.XML</strong> files
          </p>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCheckCircle style={{ color: '#2EC4B6' }} size={18} />
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedFile.name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.78rem' }}>
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
            {parsedPreview && (
              <span style={{
                background: 'rgba(46, 196, 182, 0.15)',
                color: '#2EC4B6',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}>
                {parsedPreview.total_tasks || parsedPreview.tasks?.length} Activities
              </span>
            )}
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div style={{
            background: 'rgba(46, 196, 182, 0.12)',
            border: '1px solid rgba(46, 196, 182, 0.3)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#2EC4B6',
            fontSize: '0.86rem',
            fontWeight: 600
          }}>
            <FiRefreshCw className="spinner" size={18} />
            <span>{processingStep}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 71, 111, 0.12)',
            border: '1px solid rgba(239, 71, 111, 0.35)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#EF476F',
            fontSize: '0.84rem'
          }}>
            <FiAlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Informational Callout */}
        <div style={{
          background: 'var(--bg-main)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '24px',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '10px'
        }}>
          <FiDatabase size={16} style={{ flexShrink: 0, color: '#118AB2', marginTop: '2px' }} />
          <span>
            Upon upload, tasks, outline levels, critical path flags, and Gantt milestone dates will be automatically updated in <strong>Aiven Cloud MySQL</strong> and reflected instantly in the portal.
          </span>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-shortcut"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: '9px 18px', fontSize: '0.86rem' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn-confirm"
            onClick={handleUploadAndSync}
            disabled={!selectedFile || isProcessing}
            style={{
              padding: '9px 22px',
              fontSize: '0.86rem',
              background: 'linear-gradient(135deg, #2EC4B6 0%, #118AB2 100%)',
              opacity: (!selectedFile || isProcessing) ? 0.6 : 1,
              cursor: (!selectedFile || isProcessing) ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessing ? 'Processing & Syncing...' : 'Upload & Sync Database'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadMppModal;
