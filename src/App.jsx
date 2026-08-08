import React, { useState, useEffect } from 'react';
import MobileContainer from './components/layout/MobileContainer';
import WebDesktopLayout from './components/layout/WebDesktopLayout';
import PinLockModal from './components/layout/PinLockModal';
import AccessPassTab from './components/tabs/AccessPassTab';
import OtpAuthenticatorTab from './components/tabs/OtpAuthenticatorTab';
import EncryptedVaultTab from './components/tabs/EncryptedVaultTab';
import IncidentReportTab from './components/tabs/IncidentReportTab';
import SiteSecurityChecklistTab from './components/tabs/SiteSecurityChecklistTab';
import { Bell, Monitor, Smartphone } from 'lucide-react';

export default function App() {
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('entryCheck');
  const [platform, setPlatform] = useState('ios');
  const [toastMessage, setToastMessage] = useState(null);

  // View mode: 'web' or 'mobile'. Default based on screen width.
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth > 768 ? 'web' : 'mobile';
  });

  useEffect(() => {
    const handleResize = () => {
      // Optional auto adjust
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', background: '#03060d' }}>
      
      {/* Toast Floating Alert Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 242, 254, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          fontWeight: '600',
          animation: 'float 0.3s ease-out'
        }}>
          <Bell size={16} color="#00f2fe" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mode Switcher Floating Badge (When in Mobile Shell mode on Desktop Web Browser) */}
      {viewMode === 'mobile' && window.innerWidth > 768 && (
        <button
          onClick={() => setViewMode('web')}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'rgba(0, 242, 254, 0.15)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            color: '#00f2fe',
            padding: '8px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0, 242, 254, 0.2)'
          }}
        >
          <Monitor size={16} /> 데스크톱 웹 브라우저 뷰 전환
        </button>
      )}

      {/* Render Mode: Web Browser Portal vs Mobile App Shell */}
      {viewMode === 'web' ? (
        <WebDesktopLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLockApp={() => setIsLocked(true)}
          onTriggerToast={showToast}
          platform={platform}
          onToggleViewMode={setViewMode}
          viewMode={viewMode}
        />
      ) : (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <MobileContainer
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            platform={platform}
            setPlatform={setPlatform}
            isLocked={isLocked}
            setIsLocked={setIsLocked}
          >
            {activeTab === 'entryCheck' && <SiteSecurityChecklistTab onTriggerToast={showToast} />}
            {activeTab === 'access' && <AccessPassTab onTriggerToast={showToast} />}
            {activeTab === 'otp' && <OtpAuthenticatorTab onTriggerToast={showToast} />}
            {activeTab === 'admin' && <EncryptedVaultTab onTriggerToast={showToast} />}
            {activeTab === 'incident' && <IncidentReportTab onTriggerToast={showToast} />}
          </MobileContainer>
        </div>
      )}

      {/* PIN & Biometric Lock Screen Modal Overlay */}
      <PinLockModal
        isLocked={isLocked}
        onUnlock={() => {
          setIsLocked(false);
          showToast('보안 인증 성공: 단말기 및 웹 세션 잠금이 해제되었습니다.');
        }}
      />
    </div>
  );
}
