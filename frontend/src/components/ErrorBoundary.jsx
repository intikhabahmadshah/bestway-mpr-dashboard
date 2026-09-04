import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          margin: '30px auto',
          maxWidth: '700px',
          background: 'rgba(239, 71, 111, 0.08)',
          border: '1.5px solid #EF476F',
          borderRadius: '16px',
          textAlign: 'center',
          fontFamily: 'Poppins, sans-serif',
          color: '#f8fafc'
        }}>
          <FiAlertTriangle size={48} style={{ color: '#EF476F', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF476F', marginBottom: '8px' }}>
            Component Display Error
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '20px' }}>
            {this.state.error ? this.state.error.toString() : 'An unexpected error occurred while rendering this section.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 22px',
              background: '#2EC4B6',
              color: '#073B4C',
              fontWeight: 700,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            <FiRefreshCw /> Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
