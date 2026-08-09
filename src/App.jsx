import React, { useState, useEffect } from 'react';
import MobileContainer from './components/layout/MobileContainer';
import WebDesktopLayout from './components/layout/WebDesktopLayout';
import PinLockModal from './components/layout/PinLockModal';
import EncryptedVaultTab from './components/tabs/EncryptedVaultTab';
import IncidentReportTab from './components/tabs/IncidentReportTab';
import SiteSecurityChecklistTab from './components/tabs/SiteSecurityChecklistTab';
import UserProfileTab from './components/tabs/UserProfileTab';
import { Bell, Monitor, Smartphone, Globe, Server, CheckCircle2, RefreshCw } from 'lucide-react';
import { dbService } from './services/dbService';

export default function App() {
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState('entryCheck');
  const [platform, setPlatform] = useState('ios');
  const [toastMessage, setToastMessage] = useState(null);

  // First-Time Initial Server URL Guard State
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [initialServerUrl, setInitialServerUrl] = useState('');
  const [isTestingInitialServer, setIsTestingInitialServer] = useState(false);

  // Check if server URL is registered on first app launch
  useEffect(() => {
    const savedUrl = dbService.getServerUrl();
    if (!savedUrl || !savedUrl.trim()) {
      setIsServerModalOpen(true);
    } else {
      setInitialServerUrl(savedUrl);
    }
  }, []);

  const handleSaveInitialServer = async () => {
    if (!initialServerUrl.trim()) {
      showToast('사용하실 서버 URL을 입력해 주세요.');
      return;
    }
    setIsTestingInitialServer(true);
    const res = await dbService.testServerConnection(initialServerUrl);
    setIsTestingInitialServer(false);

    dbService.setServerUrl(initialServerUrl);
    setIsServerModalOpen(false);
    showToast(`서버 연동 완료: ${dbService.getServerUrl()}`);
  };

  // View mode: 'web' or 'mobile'. Default based on screen width.
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth > 768 ? 'web' : 'mobile';
  });

  // Admin Tab Route Access Control Guard
  useEffect(() => {
    async function checkAdminAccess() {
      if (activeTab === 'admin') {
        const u = await dbService.getUserProfile();
        const isAdmin = ['개발자', '관리자'].includes(u?.role) || u?.username === 'admin';
        if (!isAdmin) {
          setActiveTab('entryCheck');
          showToast('Admin 메뉴는 개발자/관리자 계정만 접근 가능합니다.');
        }
      }
    }
    checkAdminAccess();
  }, [activeTab]);

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
            {activeTab === 'admin' && <EncryptedVaultTab onTriggerToast={showToast} />}
            {activeTab === 'userProfile' && <UserProfileTab onTriggerToast={showToast} />}
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

      {/* First-Time Server URL Mandatory Setup Modal */}
      {isServerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          background: 'rgba(3, 6, 13, 0.95)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            borderRadius: '24px',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            background: 'rgba(10, 15, 26, 0.95)',
            boxShadow: '0 20px 60px rgba(0, 242, 254, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#050b14',
                boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
              }}>
                <Globe size={26} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                  초기 백엔드 서버 URL 설정
                </div>
                <div style={{ fontSize: '12px', color: '#00f2fe', fontWeight: '600', marginTop: '2px' }}>
                  WithSecurity 통합 관제 연동
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
              앱을 처음 실행하셨습니다. 실시간 사업장 출입 데이터 및 사용자 정보를 연동할 <strong>호스팅 백엔드 서버 URL</strong>을 먼저 등록해 주세요.
            </p>

            {/* Input Field */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                서버 URL (API Base URL) *
              </label>
              <div style={{ position: 'relative' }}>
                <Server size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#00f2fe' }} />
                <input
                  type="text"
                  placeholder="예: https://wblee0703.github.io/with.security 또는 http://192.168.0.15:4000"
                  value={initialServerUrl}
                  onChange={(e) => setInitialServerUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '14px',
                    background: '#04070e',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    boxShadow: '0 0 10px rgba(0, 242, 254, 0.1)'
                  }}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>빠른 선택:</span>
              <button
                type="button"
                onClick={() => setInitialServerUrl('https://wblee0703.github.io/with.security')}
                style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', color: '#00f2fe', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                🌐 GitHub Pages 배포 서버
              </button>
              <button
                type="button"
                onClick={() => setInitialServerUrl('http://localhost:3000')}
                style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}
              >
                💻 로컬 (3000번)
              </button>
              <button
                type="button"
                onClick={() => setInitialServerUrl('http://localhost:4000')}
                style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}
              >
                🖥️ Express (4000번)
              </button>
            </div>

            {/* Action Submit Button */}
            <button
              type="button"
              onClick={handleSaveInitialServer}
              disabled={isTestingInitialServer}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                border: 'none',
                color: '#050b14',
                fontSize: '14px',
                fontWeight: '900',
                cursor: isTestingInitialServer ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(0, 242, 254, 0.35)',
                marginTop: '6px'
              }}
            >
              {isTestingInitialServer ? <RefreshCw size={18} className="spin" /> : <CheckCircle2 size={18} />}
              {isTestingInitialServer ? '서버 연결 검증 중...' : '서버 연결 및 앱 시작하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
