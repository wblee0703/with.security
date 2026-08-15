import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical App Error caught by ErrorBoundary:", error, errorInfo);
  }

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
          <h2 style={{ color: '#1e3a8a', marginBottom: '12px', fontSize: '20px' }}>WithSecurity 모바일 앱 초기화</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px', maxWidth: '320px' }}>
            앱 초기화 중 오류가 발생했습니다. 아래 버튼을 눌러 다시 시작해 주세요.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              background: '#1e3a8a',
              border: 'none',
              color: '#ffffff',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            🔄 앱 다시 시작하기
          </button>
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
