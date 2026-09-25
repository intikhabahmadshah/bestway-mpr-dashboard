import React from 'react';
import { FiBarChart2, FiFileText, FiArrowRight, FiLayers, FiCheckCircle, FiGrid, FiDatabase, FiCalendar, FiLock, FiShield } from 'react-icons/fi';

const HomePage = ({ onNavigate, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div className="homepage-container">
      {/* Hero Welcome Banner */}
      <div className="hero-banner">
        <div className="hero-badge">
          <FiLayers size={14} /> Project Management Portal
        </div>
        <h1 className="hero-title">Construction of Bestway Tower</h1>
        <p className="hero-location">F-9 / G-9, Islamabad</p>
        <p className="hero-subtitle">
          Centralized Analytics, Monthly Progress Dashboards & Project Documentation Hub
        </p>
      </div>

      <div className="sections-grid">
        {/* SECTION 1: DASHBOARDS */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-icon-badge cyan">
              <FiGrid />
            </div>
            <div>
              <h2 className="section-title">Dashboards</h2>
              <p className="section-desc">Interactive progress tracking & S-Curve analytics</p>
            </div>
          </div>

          <div className="portal-cards-grid">
            <div 
              className="portal-card primary-card"
              onClick={() => onNavigate('grey_structure')}
            >
              <div className="portal-card-header">
                <div className="card-icon cyan">
                  <FiBarChart2 />
                </div>
                <span className="status-tag active">Active & Live</span>
              </div>
              <h3 className="card-title">Grey Structure</h3>
              <p className="card-description">
                Monthly Progress Report Dashboard featuring S-Curve, Dual Completion Gauges, 
                Schedule Variance, and Interactive Month-by-Month Data Table.
              </p>
              <div className="card-meta">
                <span><FiCheckCircle style={{ color: '#2EC4B6' }} /> 19 Months Tracking</span>
                <span><FiDatabase style={{ color: '#118AB2' }} /> Live Database Sync</span>
              </div>
              <button className="btn-portal-action cyan">
                Open Dashboard <FiArrowRight />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: LOG FILES */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-icon-badge amber">
              <FiFileText />
            </div>
            <div>
              <h2 className="section-title">Log Files</h2>
              <p className="section-desc">Document repository, bills & site records</p>
            </div>
          </div>

          <div className="portal-cards-grid">
            <div 
              className="portal-card secondary-card"
              onClick={() => onNavigate('bills_data')}
            >
              <div className="portal-card-header">
                <div className="card-icon amber">
                  <FiFileText />
                </div>
                <span className="status-tag restricted" style={{ background: 'rgba(239, 71, 111, 0.15)', color: '#EF476F', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <FiLock size={12} /> Confidential Access
                </span>
              </div>
              <h3 className="card-title">Bills Data</h3>
              <p className="card-description">
                Confidential contractor billing records, IPC payment logs, scanned PO vouchers, and cloud document archive. Access requires authorized credentials.
              </p>
              <div className="card-meta">
                <span><FiShield style={{ color: '#EF476F' }} /> Password Protected</span>
                <span><FiCheckCircle style={{ color: '#FFD166' }} /> Cloud Document Archive</span>
              </div>
              <button className="btn-portal-action amber">
                Access Bills Data <FiArrowRight />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: PROJECT SCHEDULE */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-icon-badge blue">
              <FiCalendar />
            </div>
            <div>
              <h2 className="section-title">Project Schedule</h2>
              <p className="section-desc">MS Project WBS hierarchy & interactive Gantt timeline</p>
            </div>
          </div>

          <div className="portal-cards-grid">
            <div 
              className="portal-card primary-card"
              onClick={() => onNavigate('schedule')}
              style={{ borderTop: '3px solid #118AB2' }}
            >
              <div className="portal-card-header">
                <div className="card-icon blue">
                  <FiCalendar />
                </div>
                <span className="status-tag active" style={{ background: 'rgba(17, 138, 178, 0.18)', color: '#118AB2' }}>
                  Live Schedule
                </span>
              </div>
              <h3 className="card-title">MS Project Schedule</h3>
              <p className="card-description">
                Complete construction activity breakdown with WBS hierarchy, critical path tracking, and 
                interactive Gantt timeline covering all 265 tasks (2026 – 2028).
              </p>
              <div className="card-meta">
                <span><FiCheckCircle style={{ color: '#2EC4B6' }} /> 265 Activities</span>
                <span><FiDatabase style={{ color: '#118AB2' }} /> Database Synchronized</span>
              </div>
              <button className="btn-portal-action cyan" style={{ background: 'linear-gradient(135deg, #118AB2 0%, #073B4C 100%)' }}>
                Open Schedule <FiArrowRight />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
