import React, { useState } from 'react';
import { FiX, FiDownload, FiFileText, FiImage, FiCheckCircle, FiLoader, FiPrinter, FiLayout } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ExportDashboardModal = ({ isOpen, onClose, targetId = 'grey-structure-dashboard-container', theme, showToast }) => {
  const [orientation, setOrientation] = useState('landscape'); // 'portrait' | 'landscape'
  const [fileFormat, setFileFormat] = useState('pdf'); // 'pdf' | 'png'
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      showToast('Dashboard element not found for export', 'error');
      return;
    }

    setIsExporting(true);
    setProgressMsg('Applying high-contrast report layout...');

    // Apply high-contrast print mode to body for html2canvas
    document.body.classList.add('is-exporting-mode');

    try {
      // Small delay to ensure styles and Chart.js re-render in high-contrast mode
      await new Promise(r => setTimeout(r, 400));

      setProgressMsg('Rendering high-resolution 300 DPI canvas...');

      const canvas = await html2canvas(targetElement, {
        scale: 2.5, // 2.5x Ultra HD resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff', // Solid white background for official report
        logging: false,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Bestway_Tower_Grey_Structure_Dashboard_A4_${orientation.toUpperCase()}_${dateStr}`;

      if (fileFormat === 'png') {
        setProgressMsg('Generating crisp PNG image...');
        const imageUri = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = imageUri;
        link.click();
        showToast('High-resolution PNG Dashboard downloaded successfully!', 'success');
      } else {
        setProgressMsg('Building A4 PDF report document...');

        const isLandscape = orientation === 'landscape';
        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pdfWidth = isLandscape ? 297 : 210;
        const pdfHeight = isLandscape ? 210 : 297;
        const marginX = 8;
        const marginY = 8;
        const printWidth = pdfWidth - (marginX * 2);
        const printHeight = pdfHeight - (marginY * 2);

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Total scaled height of dashboard in mm
        const totalScaledHeight = (imgHeight * printWidth) / imgWidth;
        const imgData = canvas.toDataURL('image/png', 1.0);

        if (totalScaledHeight <= printHeight) {
          // Fits on single page
          pdf.addImage(imgData, 'PNG', marginX, marginY, printWidth, totalScaledHeight, undefined, 'FAST');
        } else {
          // Multi-page A4 document
          let heightLeft = totalScaledHeight;
          let positionY = marginY;

          // Page 1
          pdf.addImage(imgData, 'PNG', marginX, positionY, printWidth, totalScaledHeight, undefined, 'FAST');
          heightLeft -= printHeight;

          // Additional Pages
          while (heightLeft > 0) {
            positionY = positionY - printHeight;
            pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
            pdf.addImage(imgData, 'PNG', marginX, positionY, printWidth, totalScaledHeight, undefined, 'FAST');
            heightLeft -= printHeight;
          }
        }

        pdf.save(`${filename}.pdf`);
        showToast('High-quality A4 PDF Dashboard report downloaded successfully!', 'success');
      }
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Failed to generate dashboard download', 'error');
    } finally {
      document.body.classList.remove('is-exporting-mode');
      setIsExporting(false);
      setProgressMsg('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="section-icon-badge cyan" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
              <FiPrinter />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Download Dashboard</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>High-Resolution A4 Report Export</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isExporting}>
            <FiX />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
          {/* 1. Orientation Selection */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              1. Choose Page Orientation (A4 Format)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                className={`export-option-card ${orientation === 'landscape' ? 'selected' : ''}`}
                onClick={() => setOrientation('landscape')}
                disabled={isExporting}
              >
                <div className="option-icon"><FiLayout style={{ transform: 'rotate(90deg)' }} /></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="option-title">A4 - Landscape</div>
                  <div className="option-sub">297mm x 210mm (Recommended)</div>
                </div>
              </button>

              <button
                type="button"
                className={`export-option-card ${orientation === 'portrait' ? 'selected' : ''}`}
                onClick={() => setOrientation('portrait')}
                disabled={isExporting}
              >
                <div className="option-icon"><FiLayout /></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="option-title">A4 - Portrait</div>
                  <div className="option-sub">210mm x 297mm Standard</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Format Selection */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              2. Choose File Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                className={`export-option-card ${fileFormat === 'pdf' ? 'selected' : ''}`}
                onClick={() => setFileFormat('pdf')}
                disabled={isExporting}
              >
                <div className="option-icon"><FiFileText /></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="option-title">PDF Document</div>
                  <div className="option-sub">Multi-page A4 PDF Report</div>
                </div>
              </button>

              <button
                type="button"
                className={`export-option-card ${fileFormat === 'png' ? 'selected' : ''}`}
                onClick={() => setFileFormat('png')}
                disabled={isExporting}
              >
                <div className="option-icon"><FiImage /></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="option-title">PNG Image</div>
                  <div className="option-sub">High-Res 300 DPI Graphics</div>
                </div>
              </button>
            </div>
          </div>

          {/* Features note */}
          <div style={{
            background: 'rgba(46, 196, 182, 0.08)',
            border: '1px solid rgba(46, 196, 182, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FiCheckCircle size={18} style={{ color: '#2EC4B6', flexShrink: 0 }} />
            <span>
              Report automatically applies <strong>High-Contrast Crisp Print Mode</strong> so text, values, and charts remain bold & crystal-clear.
            </span>
          </div>

          {/* Progress loader */}
          {isExporting && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <FiLoader className="spinner" size={24} style={{ color: '#2EC4B6', marginBottom: '6px' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{progressMsg}</div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-cancel" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <FiLoader className="spinner" size={16} /> : <FiDownload />}
            {isExporting ? 'Exporting...' : `Download ${fileFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDashboardModal;
