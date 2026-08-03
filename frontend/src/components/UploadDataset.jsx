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

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress since local uploads are too fast
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await axios.post('/api/mpr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      showToast('Dataset updated successfully', 'success');
      
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
      
    } catch (error) {
      console.error('Upload failed', error);
      showToast('Failed to upload dataset. Is the server running?', 'error');
      setUploading(false);
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
                <div className="progress-text">Uploading... {progress}%</div>
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
