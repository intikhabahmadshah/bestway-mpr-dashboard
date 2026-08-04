import React from 'react';
import { FiFileText, FiArrowLeft, FiUploadCloud, FiFolder, FiCheckCircle, FiClock, FiShield, FiBarChart2 } from 'react-icons/fi';

const BillsDataPage = ({ onNavigate, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div className="bills-page-container">
      {/* Top Breadcrumb Bar */}
      <div className="page-navigation-bar">
        <button className="btn-back" onClick={() => onNavigate('home')}>
          <FiArrowLeft /> Back to Home
        </button>
        <button className="btn-shortcut" onClick={() => onNavigate('grey_structure')}>
          <FiBarChart2 /> Grey Structure Dashboard
        </button>
      </div>

      {/* Main Header */}
      <div className="bills-header-card">
        <div className="bills-icon-container">
          <FiFileText size={36} />
        </div>
        <div>
          <span className="bills-badge">Module Placeholder</span>
          <h1 className="bills-title">Bills Data & Log Files Repository</h1>
          <p className="bills-subtitle">
            Centralized document storage for contractor invoices, site log files, and verification records.
          </p>
        </div>
      </div>

      {/* Under Development Feature Cards */}
      <div className="bills-content-grid">
        <div className="bills-feature-card">
          <div className="feature-icon-wrapper cyan">
            <FiUploadCloud size={24} />
          </div>
          <h3>Contractor Bills Upload</h3>
          <p>
            Upload IPCs, contractor invoices, measurement sheets, and billing vouchers directly to cloud storage.
          </p>
          <div className="feature-status pending-tag">Coming Soon</div>
        </div>

        <div className="bills-feature-card">
          <div className="feature-icon-wrapper amber">
            <FiFolder size={24} />
          </div>
          <h3>Log Files Archive</h3>
          <p>
            Comprehensive daily site logs, inspection reports, material test records, and QA/QC verification files.
          </p>
          <div className="feature-status pending-tag">Coming Soon</div>
        </div>

        <div className="bills-feature-card">
          <div className="feature-icon-wrapper purple">
            <FiShield size={24} />
          </div>
          <h3>Audit & Verification Log</h3>
          <p>
            Automated verification tracking between billed quantities and Primavera P6 / MS Project MPR schedule data.
          </p>
          <div className="feature-status pending-tag">Coming Soon</div>
        </div>
      </div>

      {/* Action Footer Callout */}
      <div className="bills-footer-callout">
        <FiClock size={20} style={{ color: '#FFD166' }} />
        <span>This section will be fully developed for log file management in the next phase.</span>
        <button className="btn-confirm" onClick={() => onNavigate('home')} style={{ marginLeft: 'auto' }}>
          Return to Portal Home
        </button>
      </div>
    </div>
  );
};

export default BillsDataPage;
