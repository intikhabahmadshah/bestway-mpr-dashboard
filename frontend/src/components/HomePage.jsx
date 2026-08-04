import React from 'react';
import { FiBarChart2, FiFileText, FiArrowRight, FiLayers, FiCheckCircle, FiClock, FiGrid, FiDatabase } from 'react-icons/fi';

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
                <span><FiDatabase style={{ color: '#118AB2' }} /> Aiven Cloud Sync</span>
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
                <span className="status-tag upcoming">Module Setup</span>
              </div>
              <h3 className="card-title">Bills Data</h3>
              <p className="card-description">
                Contractor billing records, log files, expense summaries, and verification 
                documentation archive.
              </p>
              <div className="card-meta">
                <span><FiClock style={{ color: '#FFD166' }} /> Logging Module</span>
                <span><FiFileText style={{ color: '#EF476F' }} /> Verification Records</span>
              </div>
              <button className="btn-portal-action amber">
                Open Bills Data <FiArrowRight />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
