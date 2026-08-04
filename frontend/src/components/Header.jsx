import React from 'react';
import { FiSun, FiMoon, FiLayers, FiHome } from 'react-icons/fi';

const Header = ({ theme, toggleTheme, currentView, onNavigate }) => {
  return (
    <header className="header">
      <div className="header-left">
        <img 
          src="/bcl_logo_final.png" 
          alt="Bestway Logo" 
          className="header-logo logo-left" 
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('home')}
          title="Go to Homepage"
        />
      </div>
      <div className="header-center" style={{ cursor: 'pointer' }} onClick={() => onNavigate('home')}>
        <h1 className="header-title">Construction of Bestway Tower at F-9/G-9, Islamabad</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="header-subtitle">
            {currentView === 'home' ? 'Project Management Portal' : (currentView === 'bills_data' ? 'Bills Data & Log Files' : 'Monthly Progress Report Dashboard')}
          </span>
          {currentView === 'grey_structure' && (
            <span className="header-phase-badge">
              <FiLayers size={12} /> Phase: Grey Structure
            </span>
          )}
        </div>
      </div>
      <div className="header-right">
        <img src="/logo.webp" alt="Timeline Consultants Logo" className="header-logo logo-right" />
        
        {currentView !== 'home' && (
          <button className="btn-confirm" onClick={() => onNavigate('home')} title="Return to Portal Homepage">
            Return to Portal Home
          </button>
        )}

        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
      </div>
    </header>
  );
};

export default Header;
