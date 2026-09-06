import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiShield, FiUserPlus, FiUsers, FiLock, FiKey, FiUser, FiCheck, FiTrash2, 
  FiArrowLeft, FiRefreshCw, FiAlertTriangle, FiEye, FiEyeOff, FiBriefcase, FiFileText 
} from 'react-icons/fi';

const AuthRegistryPage = ({ onNavigate, theme, showToast }) => {
  const MASTER_KEY_DEFAULT = 'bestway#2026';

  const [masterKey, setMasterKey] = useState(() => {
    return sessionStorage.getItem('mpr_master_auth_key') || '';
  });
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('mpr_master_auth_key') === MASTER_KEY_DEFAULT;
  });

  const [inputMasterKey, setInputMasterKey] = useState('');
  const [masterKeyError, setMasterKeyError] = useState('');

  // Form states for registering new authorized person
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Authorized Official');
  const [submitting, setSubmitting] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');
  const [registerErrorMsg, setRegisterErrorMsg] = useState('');

  // Registered users list
  const [usersList, setUsersList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Unlock with Master Key
  const handleUnlockMaster = (e) => {
    e.preventDefault();
    if (inputMasterKey.trim() === MASTER_KEY_DEFAULT) {
      sessionStorage.setItem('mpr_master_auth_key', MASTER_KEY_DEFAULT);
      setMasterKey(MASTER_KEY_DEFAULT);
      setIsUnlocked(true);
      setMasterKeyError('');
      if (showToast) showToast('Master Security Access Granted!', 'success');
    } else {
      setMasterKeyError('Invalid Master Security Key! Access denied.');
    }
  };

  const handleLockMaster = () => {
    sessionStorage.removeItem('mpr_master_auth_key');
    setMasterKey('');
    setIsUnlocked(false);
    setInputMasterKey('');
  };

  // Fetch authorized persons from backend
  const fetchUsers = async () => {
    if (!isUnlocked) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`/api/auth?action=list&masterKey=${encodeURIComponent(MASTER_KEY_DEFAULT)}`);
      if (res.data && res.data.success) {
        setUsersList(res.data.users || []);
      }
    } catch (err) {
      console.warn('Could not fetch authorized users list:', err);
      // Fallback default
      setUsersList([
        {
          id: 1,
          person_name: 'Project Administrator',
          username: 'admin',
          role: 'Project Administrator',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchUsers();
    }
  }, [isUnlocked]);

  // Handle register submission
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setRegisterErrorMsg('All fields (Full Name, Username, and Password) are required.');
      return;
    }

    setSubmitting(true);
    setRegisterErrorMsg('');
    setRegisterSuccessMsg('');

    try {
      const res = await axios.post('/api/auth?action=register', {
        masterKey: MASTER_KEY_DEFAULT,
        person_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        role: role.trim()
      });

      if (res.data && res.data.success) {
        setRegisterSuccessMsg(res.data.message || 'Authorized Person registered successfully!');
        if (showToast) showToast(`"${fullName}" registered successfully!`, 'success');
        setFullName('');
        setUsername('');
        setPassword('');
        fetchUsers();
      } else {
        setRegisterErrorMsg(res.data?.error || 'Registration failed.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const sErr = err.response?.data?.error;
      setRegisterErrorMsg(sErr || 'Database query failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete/revoke user
  const handleDeleteUser = async (userObj) => {
    if (userObj.username === 'admin') {
      alert('The primary administrator (admin) cannot be deleted.');
      return;
    }

    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke access for "${userObj.person_name}" (${userObj.username})?`
    );
    if (!confirmRevoke) return;

    try {
      const res = await axios.post('/api/auth?action=delete', {
        masterKey: MASTER_KEY_DEFAULT,
        id: userObj.id,
        username: userObj.username
      });

      if (res.data && res.data.success) {
        if (showToast) showToast(`Access revoked for "${userObj.person_name}"`, 'info');
        fetchUsers();
      } else {
        alert(res.data?.error || 'Unable to revoke access.');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Delete request failed.');
    }
  };

  // 1. MASTER KEY LOCKED STATE
  if (!isUnlocked) {
    return (
      <div className="auth-gate-page">
        <div className="auth-gate-card registry-master-card">
          <div className="auth-gate-top">
            <button 
              type="button" 
              className="auth-back-btn"
              onClick={() => onNavigate('home')}
            >
              <FiArrowLeft /> Return to Portal
            </button>
            <span className="auth-confidential-tag master-tag">
              <FiKey /> MASTER ACCESS ONLY
            </span>
          </div>

          <div className="auth-header-section">
            <div className="auth-icon-pulse master-pulse">
              <FiShield size={38} />
            </div>
            <h2 className="auth-title">Authorized Personnel Registry</h2>
            <p className="auth-subtitle">
              This section is restricted for security credentials management. 
              Please enter the Master Administrator Security Key to register and manage authorized personnel.
            </p>
          </div>

          {masterKeyError && (
            <div className="auth-error-banner">
              <FiAlertTriangle size={18} />
              <span>{masterKeyError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockMaster} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label">Master Administrator Security Key</label>
              <div className="auth-input-wrap">
                <FiKey className="auth-field-icon" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Enter Master Security Key (e.g. bestway#2026)"
                  value={inputMasterKey}
                  onChange={(e) => setInputMasterKey(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn master-submit-btn">
              <FiLock size={17} /> Unlock Management Registry
            </button>
          </form>

          <div className="auth-footer-help">
            <button 
              className="btn-link-inline" 
              onClick={() => onNavigate('bills_data')}
            >
              <FiFileText /> Go to Bills Data Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNLOCKED REGISTRY MANAGEMENT VIEW
  return (
    <div className="registry-management-page">
      {/* Top Header Toolbar */}
      <div className="registry-top-bar">
        <div className="registry-bar-left">
          <button className="btn-confirm" onClick={() => onNavigate('home')}>
            <FiArrowLeft /> Return to Portal
          </button>
          <button className="btn-confirm" onClick={() => onNavigate('bills_data')} style={{ background: '#FFD166', color: '#073B4C' }}>
            <FiFileText /> Go to Bills Data
          </button>
        </div>
        <div className="registry-bar-right">
          <span className="master-active-pill">
            <FiShield size={14} /> Master Session Active
          </span>
          <button className="btn-lock-session" onClick={handleLockMaster} title="Lock registry session">
            <FiLock size={14} /> Lock Registry
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="registry-content-container">
        <div className="registry-hero">
          <div className="registry-hero-badge">
            <FiShield size={16} /> Bestway Tower Security Hub
          </div>
          <h1>Authorized Personnel Database Registry</h1>
          <p>
            Register and manage personnel authorized to view sensitive Bills Data, contractor payment logs, and verified PO vouchers.
            All records are securely synchronized with the Cloud Database (MySQL).
          </p>
        </div>

        <div className="registry-grid-layout">
          {/* LEFT: REGISTER NEW USER FORM */}
          <div className="registry-card form-card">
            <div className="registry-card-header">
              <div className="card-header-icon green">
                <FiUserPlus size={20} />
              </div>
              <div>
                <h3>Register New Authorized Person</h3>
                <p>Add official credentials to Cloud Database</p>
              </div>
            </div>

            {registerSuccessMsg && (
              <div className="registry-alert success">
                <FiCheck size={18} />
                <span>{registerSuccessMsg}</span>
              </div>
            )}

            {registerErrorMsg && (
              <div className="registry-alert error">
                <FiAlertTriangle size={18} />
                <span>{registerErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="registry-form">
              <div className="reg-form-group">
                <label>Authorized Person Full Name *</label>
                <div className="reg-input-wrap">
                  <FiUser className="reg-icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. Project Administrator or Official Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="reg-form-group">
                <label>Username / Login ID *</label>
                <div className="reg-input-wrap">
                  <FiUser className="reg-icon" />
                  <input 
                    type="text" 
                    placeholder="e.g. intikhab or qs_officer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <small className="field-hint">This username or full name will be used on the Bills Data login screen.</small>
              </div>

              <div className="reg-form-group">
                <label>Confidential Password *</label>
                <div className="reg-input-wrap">
                  <FiKey className="reg-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Set secret password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="reg-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              <div className="reg-form-group">
                <label>Designation / Official Role</label>
                <div className="reg-input-wrap">
                  <FiBriefcase className="reg-icon" />
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="reg-select"
                  >
                    <option value="Project Administrator">Project Administrator</option>
                    <option value="Senior Quantity Surveyor">Senior Quantity Surveyor</option>
                    <option value="Quantity Surveyor">Quantity Surveyor</option>
                    <option value="Audit &amp; Finance Official">Audit &amp; Finance Official</option>
                    <option value="Site Project Manager">Site Project Manager</option>
                    <option value="Contractor Representative">Contractor Representative</option>
                    <option value="Authorized Official">Authorized Official</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-register-submit" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-small"></span> Saving in Database...
                  </>
                ) : (
                  <>
                    <FiUserPlus size={18} /> Register Authorized Person
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: REGISTERED ROSTER */}
          <div className="registry-card roster-card">
            <div className="registry-card-header">
              <div className="card-header-icon blue">
                <FiUsers size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3>Active Authorized Personnel</h3>
                <p>Personnel permitted to unlock and inspect Bills Data</p>
              </div>
              <button 
                className="btn-refresh-roster" 
                onClick={fetchUsers} 
                disabled={loadingList}
                title="Refresh Roster from Database"
              >
                <FiRefreshCw className={loadingList ? 'spin' : ''} size={15} />
              </button>
            </div>

            {loadingList ? (
              <div className="roster-loading">
                <div className="spinner"></div>
                <span>Loading authorized roster from Cloud DB...</span>
              </div>
            ) : usersList.length === 0 ? (
              <div className="roster-empty">
                <FiAlertTriangle size={32} />
                <p>No authorized persons registered yet.</p>
              </div>
            ) : (
              <div className="roster-list-wrap">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Authorized Person</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u, idx) => (
                      <tr key={u.id || idx}>
                        <td className="col-idx">{idx + 1}</td>
                        <td className="col-person">
                          <strong>{u.person_name}</strong>
                        </td>
                        <td className="col-user">
                          <code>{u.username}</code>
                        </td>
                        <td className="col-role">
                          <span className="role-pill">{u.role || 'Authorized'}</span>
                        </td>
                        <td className="col-status">
                          <span className="status-pill-active">Active</span>
                        </td>
                        <td className="col-action" style={{ textAlign: 'center' }}>
                          {u.username === 'admin' ? (
                            <span className="primary-admin-pill" title="Primary Administrator cannot be deleted">
                              Primary
                            </span>
                          ) : (
                            <button
                              className="btn-revoke-user"
                              onClick={() => handleDeleteUser(u)}
                              title={`Revoke access for ${u.person_name}`}
                            >
                              <FiTrash2 size={14} /> Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="roster-instructions">
              <p>
                <strong>Security Policy:</strong> Only listed authorized personnel are permitted to access Bills Data. 
                Once registered, personnel can immediately authenticate and view records on the Bills Data page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthRegistryPage;
