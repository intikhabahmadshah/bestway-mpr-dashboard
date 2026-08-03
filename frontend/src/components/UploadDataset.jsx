import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { FiX, FiUploadCloud, FiFile, FiCheckCircle } from 'react-icons/fi';

const UploadDataset = ({ isOpen, onClose, onUploadSuccess, showToast }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const parseCSVClientSide = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return [];
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 3) continue;
      
      const parseNum = (val) => {
        if (!val || val === '' || val === 'null' || val === 'undefined') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      rows.push({
        id: i,
        month: parts[0],
        month_ending: parts[1],
        duration: parseInt(parts[2], 10) || 0,
        monthly_planned: parseNum(parts[3]),
        monthly_actual: parseNum(parts[4]),
        accumulative_planned: parseNum(parts[5]),
        accumulative_actual: parseNum(parts[6])
      });
    }
    return rows;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(30);

    const formData = new FormData();
    formData.append('file', file);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev >= 90 ? 90 : prev + 15));
    }, 100);

    try {
      await axios.post('/api/mpr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      showToast('Dataset updated in database successfully', 'success');
      
      setTimeout(() => {
        onUploadSuccess();
      }, 1200);
      
    } catch (error) {
      console.warn('Backend server not reachable online, processing CSV client-side fallback...', error);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        clearInterval(progressInterval);
        try {
          const csvText = e.target.result;
          const parsedRows = parseCSVClientSide(csvText);
          
          if (parsedRows.length > 0) {
            localStorage.setItem('mpr_custom_data', JSON.stringify(parsedRows));
            setProgress(100);
            setSuccess(true);
            showToast('Dataset updated successfully!', 'success');
            
            setTimeout(() => {
              onUploadSuccess(parsedRows);
            }, 1200);
          } else {
            showToast('Invalid CSV format. Please upload a valid MPR CSV file.', 'error');
            setUploading(false);
          }
        } catch (err) {
          console.error('CSV Parse Error:', err);
          showToast('Failed to parse CSV file.', 'error');
          setUploading(false);
        }
      };
      reader.onerror = () => {
        clearInterval(progressInterval);
        showToast('Failed to read file.', 'error');
        setUploading(false);
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Upload New Dataset</h3>
          <button className="modal-close" onClick={onClose} disabled={uploading && !success}>
            <FiX />
          </button>
        </div>

        {!success ? (
          <>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
              <input {...getInputProps()} />
              <FiUploadCloud className="dropzone-icon" />
              <div className="dropzone-text">
                {isDragActive ? 'Drop the CSV file here' : 'Drag & drop your MPR CSV file here'}
              </div>
              <div className="dropzone-hint">or click to browse from your computer (CSV only)</div>
            </div>

            {file && (
              <div className="file-info">
                <FiFile className="file-info-icon" />
                <div>
                  <div className="file-info-name">{file.name}</div>
                  <div className="file-info-size">{(file.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
            )}

            {uploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">Uploading & Processing... {progress}%</div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose} disabled={uploading}>
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleUpload} 
                disabled={!file || uploading}
              >
                {uploading ? 'Processing...' : 'Upload Data'}
              </button>
            </div>
          </>
        ) : (
          <div className="upload-success">
            <FiCheckCircle className="success-icon" />
            <div className="success-text">Upload Complete!</div>
            <div className="success-detail">The dashboard will now refresh with the new data.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDataset;
