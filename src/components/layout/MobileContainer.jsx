import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  QrCode, 
  KeyRound, 
  Lock, 
  AlertOctagon, 
  Smartphone, 
  Wifi, 
  Battery, 
  Signal, 
  LockKeyhole,
  Building2,
  Settings
} from 'lucide-react';

export default function MobileContainer({ 
  children, 
  activeTab, 
  setActiveTab, 
  platform, 
  setPlatform, 
  isLocked, 
  setIsLocked 
}) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hrs}:${mins}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mobile-shell-wrapper">
      
      {/* Top OS Platform Selector Header (For Web / Desktop Previewing) */}
      <div style={{
        padding: '8px 16px',
        background: '#04070e',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 60
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="#00f2fe" />
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff', letterSpacing: '0.5px' }}>
            WithSecurity <span style={{ color: '#00f2fe', fontSize: '10px' }}>v1.0</span>
          </span>
        </div>

        {/* Platform Switcher & Lock Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '2px'
          }}>
            <button
              onClick={() => setPlatform('ios')}
              style={{
                padding: '4px 8px',
                borderRadius: '10px',
                border: 'none',
                background: platform === 'ios' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: platform === 'ios' ? '#00f2fe' : '#64748b',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              iOS
            </button>
            <button
              onClick={() => setPlatform('android')}
              style={{
                padding: '4px 8px',
                borderRadius: '10px',
                border: 'none',
                background: platform === 'android' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: platform === 'android' ? '#10b981' : '#64748b',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Android
            </button>
          </div>

          <button
            onClick={() => setIsLocked(true)}
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              padding: '4px 8px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <LockKeyhole size={12} /> 잠그기
          </button>
        </div>
      </div>

      {/* Mobile Status Bar (iOS Dynamic Island or Android Camera Notch) */}
      <div className="status-bar">
        <span className="mono-font" style={{ fontSize: '13px' }}>{time || '15:38'}</span>
        
        {platform === 'ios' ? (
          <div className="dynamic-island">
            <ShieldCheck size={12} color="#00f2fe" />
            <span style={{ fontSize: '9px', color: '#00f2fe', fontWeight: '700' }}>VPN ACTIVE</span>
          </div>
        ) : (
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
          <Signal size={14} />
          <Wifi size={14} color="#00f2fe" />
          <Battery size={16} />
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="app-content">
        {children}
      </div>

      {/* Bottom Mobile Navigation Bar */}
      <nav className="bottom-nav">
        <button
          onClick={() => setActiveTab('entryCheck')}
          className={`nav-item ${activeTab === 'entryCheck' ? 'active' : ''}`}
        >
          <Building2 size={18} />
          <span>보안 서약</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`nav-item ${activeTab === 'access' ? 'active' : ''}`}
        >
          <QrCode size={18} />
          <span>출입 QR</span>
        </button>

        <button
          onClick={() => setActiveTab('otp')}
          className={`nav-item ${activeTab === 'otp' ? 'active' : ''}`}
        >
          <KeyRound size={18} />
          <span>OTP</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Admin</span>
        </button>
      </nav>

    </div>
  );
}
