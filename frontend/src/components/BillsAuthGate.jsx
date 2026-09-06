import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiLock, FiUnlock, FiUser, FiKey, FiEye, FiEyeOff, FiShield, FiAlertTriangle, FiArrowLeft, FiLogOut, FiSettings, FiCheckCircle } from 'react-icons/fi';

const BillsAuthGate = ({ children, onNavigate, theme }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mpr_bills_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter Designation / Official Role and Password.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await axios.post('/api/auth?action=login', {
        username: username.trim(),
        password: password.trim()
      });

      if (res.data && res.data.success) {
        const authUser = res.data.user;
        sessionStorage.setItem('mpr_bills_auth_user', JSON.stringify(authUser));
        setUser(authUser);
        setErrorMsg('');
      } else {
        setErrorMsg(res.data?.error || 'Invalid credentials. Access denied.');
      }
    } catch (err) {
      console.error('Auth login error:', err);
      const serverErr = err.response?.data?.error;
      setErrorMsg(serverErr || 'Authentication failed: Unable to connect to server or invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mpr_bills_auth_user');
    setUser(null);
    setUsername('');
    setPassword('');
    setErrorMsg('');
  };

  // If user is already authorized, render the top security banner and children
  if (user) {
    return (
      <div className="bills-auth-wrapper">
        <div className="bills-security-ribbon">
          <div className="ribbon-left">
            <span className="security-badge-live">
              <FiShield className="shield-icon" /> CONFIDENTIAL ACCESS
            </span>
            <span className="user-welcome">
              Authorized Role: <strong>{user.role || user.person_name}</strong>
            </span>
          </div>
          <div className="ribbon-right">
            <button 
              className="btn-registry-link"
              onClick={() => onNavigate('auth_registry')}
              title="Manage Authorized Persons Registry"
            >
              <FiSettings size={14} /> Security Registry
            </button>
            <button 
              className="btn-lock-session"
              onClick={handleLogout}
              title="Lock Bills Data and sign out"
            >
              <FiLock size={14} /> Lock / Exit
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // If not authenticated, render confidential gate lock screen
  return (
    <div className="auth-gate-page">
      <div className="auth-gate-card">
        <div className="auth-gate-top">
          <button 
            type="button" 
            className="auth-back-btn"
            onClick={() => onNavigate('home')}
            title="Return to Portal"
          >
            <FiArrowLeft /> Return to Portal
          </button>
          <span className="auth-confidential-tag">
            <FiShield /> STRICTLY CONFIDENTIAL
          </span>
        </div>

        <div className="auth-header-section">
          <div className="auth-icon-pulse">
            <FiLock size={36} />
          </div>
          <h2 className="auth-title">Bills Data &amp; Financial Archives</h2>
          <p className="auth-subtitle">
            Contractor billing records, verified interim payment certificates (IPCs), and voucher files are restricted to authorized personnel only.
          </p>
        </div>

        {errorMsg && (
          <div className="auth-error-banner">
            <FiAlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field-group">
            <label className="auth-label">Designation / Official Role</label>
            <div className="auth-input-wrap">
              <FiUser className="auth-field-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="Designation / Official Role"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label">Security Password</label>
            <div className="auth-input-wrap">
              <FiKey className="auth-field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter confidential password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn" 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-small"></span> Verifying Authorization...
              </>
            ) : (
              <>
                <FiUnlock size={17} /> Authenticate &amp; Access Bills Data
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-help">
          <p>
            To register new credentials or manage authorized personnel, please visit the{' '}
            <a 
              href="#auth_registry" 
              onClick={(e) => {
                e.preventDefault();
                onNavigate('auth_registry');
              }}
              className="auth-registry-link"
            >
              Authorized Persons Registry Page
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillsAuthGate;
