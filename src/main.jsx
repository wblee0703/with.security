import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical App Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleResetCache = () => {
    try {
      const gUrl = localStorage.getItem('with_security_google_sheets_url');
      const sUrl = localStorage.getItem('with_security_server_url');
      localStorage.clear();
      sessionStorage.clear();
      if (gUrl) localStorage.setItem('with_security_google_sheets_url', gUrl);
      if (sUrl) localStorage.setItem('with_security_server_url', sUrl);
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#070a12',
          color: '#fff',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
          <h2 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '20px' }}>WITH Sharing 앱 오류 감지</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', maxWidth: '340px', lineHeight: '1.5' }}>
            앱 실행 중 오류가 발생했습니다.<br />아래 버튼을 눌러 다시 시작하거나 캐시를 초기화해 주세요.
          </p>

          {this.state.error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '12px',
              marginBottom: '16px',
              maxWidth: '360px',
              wordBreak: 'break-all',
              textAlign: 'left'
            }}>
              <strong>오류 내용:</strong> {this.state.error.toString()}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                background: '#1e3a8a',
                border: 'none',
                color: '#ffffff',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 다시 시작하기
            </button>
            <button
              onClick={this.handleResetCache}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🧹 캐시 초기화 후 재시작
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
