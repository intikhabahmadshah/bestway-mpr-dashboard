import React, { useState } from 'react';
import { 
  FiX, 
  FiDownload, 
  FiFileText, 
  FiImage, 
  FiCheckCircle, 
  FiPrinter, 
  FiLayout, 
  FiLayers, 
  FiBarChart2, 
  FiPieChart, 
  FiTrendingUp,
  FiZap,
  FiGrid
} from 'react-icons/fi';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const INDIVIDUAL_GRAPHS = [
  {
    id: 'chart-card-scurve',
    index: 1,
    title: 'S-Curve: Cumulative Progress',
    filename: '1_S_Curve_Cumulative_Progress',
    icon: <FiTrendingUp style={{ color: '#2EC4B6' }} />
  },
  {
    id: 'chart-card-gauges',
    index: 2,
    title: 'Overall Completion & Target Gauges',
    filename: '2_Overall_Completion_Target_Gauges',
    icon: <FiPieChart style={{ color: '#118AB2' }} />
  },
  {
    id: 'chart-card-monthly',
    index: 3,
    title: 'Monthly Progress Comparison',
    filename: '3_Monthly_Progress_Comparison',
    icon: <FiBarChart2 style={{ color: '#FFD166' }} />
  },
  {
    id: 'chart-card-variance',
    index: 4,
    title: 'Schedule Variance Analysis',
    filename: '4_Schedule_Variance_Analysis',
    icon: <FiLayers style={{ color: '#EF476F' }} />
  }
];

const ExportDashboardModal = ({ isOpen, onClose, targetId = 'grey-structure-dashboard-container', theme, showToast }) => {
  const [exportMode, setExportMode] = useState('separate_graphs'); // 'separate_graphs' | 'full_dashboard'
  const [fileFormat, setFileFormat] = useState('png'); // 'png' | 'pdf'
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait' (for full dashboard)
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [activeExportingId, setActiveExportingId] = useState(null);

  if (!isOpen) return null;

  // Helper to capture a single element to Canvas
  const captureElementToCanvas = async (element) => {
    return await html2canvas(element, {
      scale: 3.0, // 3.0x Ultra HD resolution (crisp 300 DPI for Word insertion)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff', // 100% Solid white background
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
  };

  // Helper to trigger file download
  const triggerDownload = (uri, filename) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export a single graph
  const exportSingleGraph = async (graph) => {
    const element = document.getElementById(graph.id);
    if (!element) {
      if (showToast) showToast(`Element not found for ${graph.title}`, 'error');
      return;
    }

    setIsExporting(true);
    setActiveExportingId(graph.id);
    setProgressMsg(`Capturing ${graph.title}...`);

    document.body.classList.add('is-exporting-mode');

    try {
      await new Promise(r => setTimeout(r, 300));
      const canvas = await captureElementToCanvas(element);
      const dateStr = new Date().toISOString().split('T')[0];

      if (fileFormat === 'png') {
        const imageUri = canvas.toDataURL('image/png', 1.0);
        triggerDownload(imageUri, `${graph.filename}_${dateStr}.png`);
        if (showToast) showToast(`${graph.title} (PNG) downloaded!`, 'success');
      } else {
        // PDF format
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const printWidth = 277; // 297 - 20mm margin
        const totalScaledHeight = (canvas.height * printWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png', 1.0);

        pdf.addImage(imgData, 'PNG', 10, 15, printWidth, totalScaledHeight, undefined, 'FAST');
        pdf.save(`${graph.filename}_${dateStr}.pdf`);
        if (showToast) showToast(`${graph.title} (PDF) downloaded!`, 'success');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast(`Failed to export ${graph.title}`, 'error');
    } finally {
      document.body.classList.remove('is-exporting-mode');
      setIsExporting(false);
      setActiveExportingId(null);
      setProgressMsg('');
    }
  };

  // Export all 4 graphs as 4 separate files in sequence
  const exportAll4Graphs = async () => {
    setIsExporting(true);
    document.body.classList.add('is-exporting-mode');

    try {
      await new Promise(r => setTimeout(r, 400));
      const dateStr = new Date().toISOString().split('T')[0];

      for (let i = 0; i < INDIVIDUAL_GRAPHS.length; i++) {
        const graph = INDIVIDUAL_GRAPHS[i];
        const element = document.getElementById(graph.id);
        if (!element) continue;

        setActiveExportingId(graph.id);
        setProgressMsg(`Capturing Graph ${i + 1} of 4: ${graph.title}...`);

        const canvas = await captureElementToCanvas(element);

        if (fileFormat === 'png') {
          const imageUri = canvas.toDataURL('image/png', 1.0);
          triggerDownload(imageUri, `${graph.filename}_${dateStr}.png`);
        } else {
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true
          });
          const printWidth = 277;
          const totalScaledHeight = (canvas.height * printWidth) / canvas.width;
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', 10, 15, printWidth, totalScaledHeight, undefined, 'FAST');
          pdf.save(`${graph.filename}_${dateStr}.pdf`);
        }

        // Small delay between file downloads to ensure browser triggers all 4 downloads smoothly
        await new Promise(r => setTimeout(r, 600));
      }

      if (showToast) showToast('All 4 graphs downloaded separately! Ready for MS Word.', 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error downloading individual graphs', 'error');
    } finally {
      document.body.classList.remove('is-exporting-mode');
      setIsExporting(false);
      setActiveExportingId(null);
      setProgressMsg('');
      onClose();
    }
  };

  // Export full combined dashboard
  const exportFullDashboard = async () => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    setIsExporting(true);
    setProgressMsg('Rendering full dashboard...');
    document.body.classList.add('is-exporting-mode');

    try {
      await new Promise(r => setTimeout(r, 400));
      const canvas = await captureElementToCanvas(targetElement);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Bestway_Tower_Full_Dashboard_${orientation.toUpperCase()}_${dateStr}`;

      if (fileFormat === 'png') {
        const imageUri = canvas.toDataURL('image/png', 1.0);
        triggerDownload(imageUri, `${filename}.png`);
        if (showToast) showToast('Full Dashboard PNG downloaded!', 'success');
      } else {
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

        const totalScaledHeight = (canvas.height * printWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png', 1.0);

        if (totalScaledHeight <= printHeight) {
          pdf.addImage(imgData, 'PNG', marginX, marginY, printWidth, totalScaledHeight, undefined, 'FAST');
        } else {
          let heightLeft = totalScaledHeight;
          let positionY = marginY;

          pdf.addImage(imgData, 'PNG', marginX, positionY, printWidth, totalScaledHeight, undefined, 'FAST');
          heightLeft -= printHeight;

          while (heightLeft > 0) {
            positionY = positionY - printHeight;
            pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
            pdf.addImage(imgData, 'PNG', marginX, positionY, printWidth, totalScaledHeight, undefined, 'FAST');
            heightLeft -= printHeight;
          }
        }
        pdf.save(`${filename}.pdf`);
        if (showToast) showToast('Full Dashboard PDF downloaded!', 'success');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Export failed', 'error');
    } finally {
      document.body.classList.remove('is-exporting-mode');
      setIsExporting(false);
      setProgressMsg('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', width: '95vw' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="section-icon-badge cyan" style={{ width: '42px', height: '42px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiDownload />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Download Graphs & Dashboard
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Export separate high-res images tailored for MS Word picture replacement, or full report.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Modal">
            <FiX size={20} />
          </button>
        </div>

        {/* Export Mode Switcher */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={`btn-tab-toggle ${exportMode === 'separate_graphs' ? 'active' : ''}`}
            onClick={() => setExportMode('separate_graphs')}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '8px',
              border: 'none',
              background: exportMode === 'separate_graphs' ? '#2EC4B6' : 'transparent',
              color: exportMode === 'separate_graphs' ? '#073B4C' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FiImage size={16} /> 4 Separate Graphs (For MS Word)
          </button>

          <button
            type="button"
            className={`btn-tab-toggle ${exportMode === 'full_dashboard' ? 'active' : ''}`}
            onClick={() => setExportMode('full_dashboard')}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '8px',
              border: 'none',
              background: exportMode === 'full_dashboard' ? '#118AB2' : 'transparent',
              color: exportMode === 'full_dashboard' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FiLayout size={16} /> Full Dashboard Page
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Format Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Select Output Format:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div 
                className={`export-option-card ${fileFormat === 'png' ? 'active' : ''}`}
                onClick={() => setFileFormat('png')}
                style={{ padding: '12px 14px', cursor: 'pointer', borderRadius: '10px', border: fileFormat === 'png' ? '2px solid #2EC4B6' : '1px solid var(--border-color)', background: fileFormat === 'png' ? 'rgba(46, 196, 182, 0.08)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <FiImage size={22} style={{ color: '#2EC4B6' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>PNG Picture</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Best for MS Word Change Picture</div>
                </div>
              </div>

              <div 
                className={`export-option-card ${fileFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setFileFormat('pdf')}
                style={{ padding: '12px 14px', cursor: 'pointer', borderRadius: '10px', border: fileFormat === 'pdf' ? '2px solid #2EC4B6' : '1px solid var(--border-color)', background: fileFormat === 'pdf' ? 'rgba(46, 196, 182, 0.08)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <FiFileText size={22} style={{ color: '#118AB2' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>PDF Document</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Vector Quality Printable PDF</div>
                </div>
              </div>
            </div>
          </div>

          {exportMode === 'separate_graphs' ? (
            <div>
              {/* 4 Individual Graphs List */}
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                4 Standard Individual Graphs:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {INDIVIDUAL_GRAPHS.map((graph) => {
                  const isThisExporting = activeExportingId === graph.id;
                  return (
                    <div 
                      key={graph.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{graph.icon}</span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {graph.index}. {graph.title}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            File: <code>{graph.filename}.{fileFormat}</code> (Standard Word Width)
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-shortcut"
                        onClick={() => exportSingleGraph(graph)}
                        disabled={isExporting}
                        style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title={`Download ${graph.title} individually`}
                      >
                        <FiDownload size={13} /> {isThisExporting ? 'Exporting...' : 'Download'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Download All 4 Primary Action */}
              <button
                type="button"
                className="btn-confirm"
                onClick={exportAll4Graphs}
                disabled={isExporting}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2EC4B6 0%, #118AB2 100%)',
                  color: '#073B4C',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isExporting ? (
                  <span>{progressMsg || 'Processing downloads...'}</span>
                ) : (
                  <>
                    <FiZap size={18} /> Download All 4 Graphs Separately (1-Click Package)
                  </>
                )}
              </button>
              <p style={{ margin: '8px 0 0 0', textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                💡 Downloads 4 separate files formatted to drop directly into MS Word without cropping.
              </p>
            </div>
          ) : (
            <div>
              {/* Orientation Selection for Full Dashboard */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  A4 Page Orientation:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div 
                    className={`export-option-card ${orientation === 'landscape' ? 'active' : ''}`}
                    onClick={() => setOrientation('landscape')}
                    style={{ padding: '12px 14px', cursor: 'pointer', borderRadius: '10px', border: orientation === 'landscape' ? '2px solid #2EC4B6' : '1px solid var(--border-color)', background: orientation === 'landscape' ? 'rgba(46, 196, 182, 0.08)' : 'var(--bg-card)' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>A4 Landscape</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>297 x 210 mm (Wide View)</div>
                  </div>

                  <div 
                    className={`export-option-card ${orientation === 'portrait' ? 'active' : ''}`}
                    onClick={() => setOrientation('portrait')}
                    style={{ padding: '12px 14px', cursor: 'pointer', borderRadius: '10px', border: orientation === 'portrait' ? '2px solid #2EC4B6' : '1px solid var(--border-color)', background: orientation === 'portrait' ? 'rgba(46, 196, 182, 0.08)' : 'var(--bg-card)' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>A4 Portrait</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>210 x 297 mm (Vertical)</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-confirm"
                onClick={exportFullDashboard}
                disabled={isExporting}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isExporting ? (
                  <span>{progressMsg || 'Generating document...'}</span>
                ) : (
                  <>
                    <FiDownload size={18} /> Download Full Dashboard ({fileFormat.toUpperCase()})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportDashboardModal;
