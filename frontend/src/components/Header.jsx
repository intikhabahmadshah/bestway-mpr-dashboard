import React from 'react';
import { FiSun, FiMoon, FiLayers } from 'react-icons/fi';

const Header = ({ theme, toggleTheme }) => {
  return (
    <header className="header">
      <div className="header-left">
        <img src="/bcl_logo_final.png" alt="Bestway Logo" className="header-logo logo-left" />
      </div>
      <div className="header-center">
        <h1 className="header-title">Construction of Bestway Tower at F-9/G-9, Islamabad</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="header-subtitle">Monthly Progress Report Dashboard</span>
          <span className="header-phase-badge">
            <FiLayers size={12} /> Phase: Grey Structure
          </span>
        </div>
      </div>
      <div className="header-right">
        <img src="/logo.webp" alt="Timeline Consultants Logo" className="header-logo logo-right" />
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
      </div>
    </header>
  );
};

export default Header;
