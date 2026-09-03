import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiUploadCloud, FiCheck, FiInfo, FiAlertCircle, FiFilter, FiXCircle, FiLayers, FiArrowLeft, FiHome, FiDownload, FiPrinter, FiCalendar, FiPlayCircle, FiCheckSquare, FiAward, FiCode, FiEdit3 } from 'react-icons/fi';
import './App.css';
import Header from './components/Header';
import HomePage from './components/HomePage';
import BillsDataPage from './components/BillsDataPage';
import SchedulePage from './components/SchedulePage';
import ExportDashboardModal from './components/ExportDashboardModal';
import KPICards from './components/KPICards';
import ProgressChart from './components/ProgressChart';
import MonthlyBarChart from './components/MonthlyBarChart';
import VarianceChart from './components/VarianceChart';
import GaugeChart from './components/GaugeChart';
import DataTable from './components/DataTable';
import UpdateDataModal from './components/UpdateDataModal';

const FALLBACK_DATA = [
  { month: '3/26/2026', month_ending: '3/31/2026', duration: 6, monthly_planned: 0, monthly_actual: 0, accumulative_planned: 0, accumulative_actual: 0 },
  { month: '4/26/2026', month_ending: '4/30/2026', duration: 36, monthly_planned: 0.04112, monthly_actual: 0.02832, accumulative_planned: 0.04112, accumulative_actual: 0.02832 },
  { month: '5/26/2026', month_ending: '5/31/2026', duration: 67, monthly_planned: 0.02096, monthly_actual: 0.0328, accumulative_planned: 0.06208, accumulative_actual: 0.06112 },
  { month: '6/26/2026', month_ending: '6/30/2026', duration: 97, monthly_planned: 0.07312, monthly_actual: 0.07988, accumulative_planned: 0.1352, accumulative_actual: 0.141 },
  { month: '7/26/2026', month_ending: '7/31/2026', duration: 128, monthly_planned: 0.0528, monthly_actual: 0.053, accumulative_planned: 0.188, accumulative_actual: 0.194 },
  { month: '8/26/2026', month_ending: '8/31/2026', duration: 159, monthly_planned: 0.067161905, monthly_actual: null, accumulative_planned: 0.255161905, accumulative_actual: null },
  { month: '9/26/2026', month_ending: '9/30/2026', duration: 189, monthly_planned: 0.053714286, monthly_actual: null, accumulative_planned: 0.30887619, accumulative_actual: null },
  { month: '10/26/2026', month_ending: '10/31/2026', duration: 220, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.364380952, accumulative_actual: null },
  { month: '11/26/2026', month_ending: '11/30/2026', duration: 250, monthly_planned: 0.053714286, monthly_actual: null, accumulative_planned: 0.418095238, accumulative_actual: null },
  { month: '12/26/2026', month_ending: '12/31/2026', duration: 281, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.4736, accumulative_actual: null },
  { month: '1/27/2026', month_ending: '1/31/2027', duration: 312, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.529104762, accumulative_actual: null },
  { month: '2/27/2026', month_ending: '2/28/2027', duration: 340, monthly_planned: 0.050133333, monthly_actual: null, accumulative_planned: 0.579238095, accumulative_actual: null },
  { month: '3/27/2026', month_ending: '3/31/2027', duration: 371, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.634742857, accumulative_actual: null },
  { month: '4/27/2026', month_ending: '4/30/2027', duration: 401, monthly_planned: 0.053714286, monthly_actual: null, accumulative_planned: 0.688457143, accumulative_actual: null },
  { month: '5/27/2026', month_ending: '5/31/2027', duration: 432, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.743961905, accumulative_actual: null },
  { month: '6/27/2026', month_ending: '6/30/2027', duration: 462, monthly_planned: 0.053714286, monthly_actual: null, accumulative_planned: 0.79767619, accumulative_actual: null },
  { month: '7/27/2026', month_ending: '7/31/2027', duration: 493, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.853180952, accumulative_actual: null },
  { month: '8/27/2026', month_ending: '8/31/2027', duration: 524, monthly_planned: 0.055504762, monthly_actual: null, accumulative_planned: 0.908685714, accumulative_actual: null },
  { month: '9/27/2026', month_ending: '9/30/2027', duration: 554, monthly_planned: 0.053714286, monthly_actual: null, accumulative_planned: 0.9624, accumulative_actual: null },
  { month: '10/27/2026', month_ending: '10/31/2027', duration: 585, monthly_planned: 0.0376, monthly_actual: null, accumulative_planned: 1, accumulative_actual: null }
];

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mpr-theme') || 'light';
  });

  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (['home', 'grey_structure', 'bills_data', 'schedule'].includes(hash)) return hash;
    return 'home';
  });

  const navigateTo = (viewName) => {
    setCurrentView(viewName);
    window.location.hash = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'grey_structure', 'bills_data', 'schedule'].includes(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mpr-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    // Replace previous toast so they don't stack up
    setToasts([{ id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000); // Auto-hide after 2 seconds
  }, []);

  const normalizeData = (rows) => {
    // Sort chronologically by duration or date
    const sorted = [...rows].sort((a, b) => (Number(a.duration) || 0) - (Number(b.duration) || 0));
    return sorted.map((row, idx) => ({
      ...row,
      id: idx + 1,
      duration: Number(row.duration) || 0,
      monthly_planned: row.monthly_planned !== null && row.monthly_planned !== undefined ? parseFloat(row.monthly_planned) : null,
      monthly_actual: row.monthly_actual !== null && row.monthly_actual !== undefined ? parseFloat(row.monthly_actual) : null,
      accumulative_planned: row.accumulative_planned !== null && row.accumulative_planned !== undefined ? parseFloat(row.accumulative_planned) : null,
      accumulative_actual: row.accumulative_actual !== null && row.accumulative_actual !== undefined ? parseFloat(row.accumulative_actual) : null,
    }));
  };

  const loadLocalStorageOrFallback = () => {
    const saved = localStorage.getItem('mpr_custom_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(normalizeData(parsed));
          showToast('Loaded custom uploaded dataset', 'success');
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved dataset', e);
      }
    }
    setData(normalizeData(FALLBACK_DATA));
    showToast('Loaded default project dataset', 'info');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/mpr');
      const apiData = response.data.data || response.data;
      if (Array.isArray(apiData) && apiData.length > 0) {
        setData(normalizeData(apiData));
        showToast('Data loaded from database', 'success');
      } else {
        loadLocalStorageOrFallback();
      }
    } catch (error) {
      console.warn('Backend API not reachable. Loading client-side dataset...', error);
      loadLocalStorageOrFallback();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadSuccess = (newRows) => {
    setShowUploadModal(false);
    setSelectedMonth(null);
    if (newRows && Array.isArray(newRows)) {
      setData(normalizeData(newRows));
    } else {
      fetchData();
    }
  };

  const resetToDefaultDataset = () => {
    localStorage.removeItem('mpr_custom_data');
    setSelectedMonth(null);
    setData(normalizeData(FALLBACK_DATA));
    showToast('Reset to original dataset', 'info');
  };

  const handleSelectMonth = (row) => {
    setSelectedMonth(row);
    const monthStr = new Date(row.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' });
    const valStr = row.accumulative_actual !== null ? `${(row.accumulative_actual * 100).toFixed(2)}%` : 'Pending';
    showToast(`Inspecting ${monthStr} (Accum Actual: ${valStr})`, 'info');
  };

  return (
    <>
      <Header theme={theme} toggleTheme={toggleTheme} currentView={currentView} onNavigate={navigateTo} />
      
      <div className="toast-container">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`toast ${toast.type}`}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            style={{ cursor: 'pointer' }}
            title="Click to close notification"
          >
            {toast.type === 'success' && <FiCheck />}
            {toast.type === 'error' && <FiAlertCircle />}
            {toast.type === 'info' && <FiInfo />}
            <span style={{ flex: 1 }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {currentView === 'home' && (
        <HomePage onNavigate={navigateTo} theme={theme} />
      )}

      {currentView === 'bills_data' && (
        <BillsDataPage onNavigate={navigateTo} theme={theme} />
      )}

      {currentView === 'schedule' && (
        <SchedulePage onNavigate={navigateTo} theme={theme} showToast={showToast} />
      )}

      {currentView === 'grey_structure' && (
        <main className="dashboard" id="grey-structure-dashboard-container">
          <div className="dashboard-toolbar">
            <div className="dashboard-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2>Project Overview</h2>
                <span className="phase-pill">Grey Structure Phase</span>
              </div>
              <p>Performance metrics and schedule tracking for Grey Structure Construction</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-confirm" onClick={() => navigateTo('home')} title="Return to Portal Homepage">
                Return to Portal
              </button>
              <button className="btn-confirm" onClick={() => setShowExportModal(true)} style={{ background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)' }} title="Export high-res A4 PDF or PNG formatted for reports">
                <FiDownload size={18} /> Download this Dashboard
              </button>
              {localStorage.getItem('mpr_custom_data') && (
                <button className="btn-cancel" onClick={resetToDefaultDataset} title="Restore original project CSV dataset">
                  Reset to Original Data
                </button>
              )}
              <button className="btn-upload" onClick={() => setShowUploadModal(true)} title="Open form to update monthly planned & actual data">
                <FiEdit3 size={18} />
                Update Data
              </button>
            </div>
          </div>

        {selectedMonth && (
          <div className="active-filter-bar">
            <div className="filter-bar-info">
              <FiFilter className="filter-icon" />
              <span>
                <strong>Interactive Inspection Mode:</strong> Viewing metrics for{' '}
                <mark>{new Date(selectedMonth.month_ending).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</mark>{' '}
                (Accum. Planned: <strong>{(selectedMonth.accumulative_planned * 100).toFixed(2)}%</strong>
                {selectedMonth.accumulative_actual !== null && `, Accum. Actual: `}
                {selectedMonth.accumulative_actual !== null && <strong>{(selectedMonth.accumulative_actual * 100).toFixed(2)}%</strong>})
              </span>
            </div>
            <button className="btn-clear-filter" onClick={() => setSelectedMonth(null)}>
              <FiXCircle size={16} />
              Reset View
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <div className="loading-text">Loading dashboard data...</div>
          </div>
        ) : (
          <>
            {/* Project Key Dates Bar */}
            <div className="project-dates-bar">
              <div className="date-item">
                <div className="date-icon blue"><FiCalendar /></div>
                <div className="date-content">
                  <span className="date-label">Today Date</span>
                  <span className="date-value">{new Date().toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="date-divider"></div>

              <div className="date-item">
                <div className="date-icon green"><FiPlayCircle /></div>
                <div className="date-content">
                  <span className="date-label">Grey Structure Start Date</span>
                  <span className="date-value">
                    {data && data.length > 0 && data[0].month
                      ? new Date(data[0].month).toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '26 Mar 2026'}
                  </span>
                </div>
              </div>

              <div className="date-divider"></div>

              <div className="date-item">
                <div className="date-icon amber"><FiCheckSquare /></div>
                <div className="date-content">
                  <span className="date-label">Grey Structure Finish Date</span>
                  <span className="date-value">
                    {data && data.length > 0 && data[data.length - 1].month_ending
                      ? new Date(data[data.length - 1].month_ending).toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '31 Oct 2027'}
                  </span>
                </div>
              </div>
            </div>

            <KPICards data={data} selectedMonth={selectedMonth} />
            
            <div className="charts-grid">
              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">S-Curve: Cumulative Progress</h3>
                  <span className="chart-card-badge" style={{ cursor: 'pointer' }} title="Click any data label or point on chart to inspect">
                    <FiLayers style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Interactive Click Enabled
                  </span>
                </div>
                <ProgressChart 
                  data={data} 
                  theme={theme} 
                  selectedMonth={selectedMonth}
                  onSelectMonth={handleSelectMonth}
                />
              </div>
              
              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">Overall Completion & Target Status</h3>
                  <span className="chart-card-badge">
                    {selectedMonth ? new Date(selectedMonth.month_ending).toLocaleDateString('default', { month: 'short', year: 'numeric' }) : 'Status'}
                  </span>
                </div>
                <GaugeChart data={data} theme={theme} selectedMonth={selectedMonth} />
              </div>

              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">Monthly Progress Comparison</h3>
                  <span className="chart-card-badge">Monthly</span>
                </div>
                <MonthlyBarChart data={data} theme={theme} />
              </div>

              <div className="chart-card full-width">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">Schedule Variance Analysis</h3>
                  <span className="chart-card-badge">Variance</span>
                </div>
                <VarianceChart data={data} theme={theme} />
              </div>
            </div>

            <DataTable 
              data={data} 
              selectedMonth={selectedMonth}
              onSelectMonth={handleSelectMonth}
            />
          </>
        )}
      </main>
      )}

      <footer className="footer">
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span>2026 | &copy; &amp; Developed by</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <FiAward style={{ color: '#2EC4B6' }} size={15} /> Engineer. Intikhab Ahmad Shah
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', borderRadius: '12px', background: 'rgba(17, 138, 178, 0.15)', color: '#118AB2', fontSize: '0.8rem', fontWeight: 600 }}>
            <FiCode size={13} /> (Data Analyst &amp; Software Engineer)
          </span>
        </p>
      </footer>

      {showUploadModal && (
        <UpdateDataModal 
          isOpen={showUploadModal} 
          onClose={() => setShowUploadModal(false)}
          currentData={data}
          onUpdateSuccess={handleUploadSuccess}
          showToast={showToast}
          theme={theme}
        />
      )}

      {showExportModal && (
        <ExportDashboardModal 
          isOpen={showExportModal} 
          onClose={() => setShowExportModal(false)}
          targetId="grey-structure-dashboard-container"
          theme={theme}
          showToast={showToast}
        />
      )}
    </>
  );
}

export default App;
