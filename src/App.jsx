import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import MobileContainer from './components/layout/MobileContainer';
import WebDesktopLayout from './components/layout/WebDesktopLayout';
import PinLockModal from './components/layout/PinLockModal';
import SiteSettingTab from './components/tabs/SiteSettingTab';
import SecurityChecklistTab from './components/tabs/SecurityChecklistTab';
import UserSettingTab from './components/tabs/UserSettingTab';
import WorkLogTab from './components/tabs/WorkLogTab';
import WorkSummaryTab from './components/tabs/WorkSummaryTab';
import TrainingExpiryModal from './components/common/TrainingExpiryModal';
import ExitConfirmModal from './components/common/ExitConfirmModal';
import { Bell, Monitor, Smartphone, Globe, Server, CheckCircle2, RefreshCw } from 'lucide-react';
import { dbService } from './services/dbService';

export default function App() {
  const [isLocked, setIsLocked] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Helper to determine initial default tab based on platform/device mode
  const getDefaultTab = () => {
    const isMobileMode = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth <= 768);
    return isMobileMode ? 'entryCheck' : 'workLog';
  };

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = typeof localStorage !== 'undefined' ? localStorage.getItem('with_security_active_tab') : null;
    const validTabs = ['entryCheck', 'workLog', 'workSummary', 'admin', 'userProfile'];
    if (savedTab && validTabs.includes(savedTab) && savedTab !== 'userProfile') {
      return savedTab;
    }
    return getDefaultTab();
  });

  // Intercept tab switching when unsaved changes exist in WorkSummaryTab & persist active tab
  const handleSafeTabChange = (newTab) => {
    if (activeTab === 'workSummary' && newTab !== 'workSummary' && typeof window !== 'undefined' && window.__WITH_SECURITY_UNSAVED_CHANGES__) {
      window.dispatchEvent(new CustomEvent('with_security_prompt_unsaved_tab', {
        detail: {
          targetTab: newTab,
          performTabSwitch: () => {
            setActiveTab(newTab);
            if (newTab && newTab !== 'userProfile') {
              localStorage.setItem('with_security_active_tab', newTab);
            }
          }
        }
      }));
      return;
    }
    setActiveTab(newTab);
    if (newTab && newTab !== 'userProfile') {
      localStorage.setItem('with_security_active_tab', newTab);
    }
  };
  const [platform, setPlatform] = useState('ios');
  const [toastMessage, setToastMessage] = useState(null);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

  // Training Expiry Alert Modal State
  const [isTrainingAlertOpen, setIsTrainingAlertOpen] = useState(false);
  const [trainingAlertUser, setTrainingAlertUser] = useState(null);

  // Network Offline / Online live detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('🌐 인터넷이 다시 연결되었습니다. 실시간 동기화를 시작합니다.');
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // First-Time Initial Server URL Guard State
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [initialServerUrl, setInitialServerUrl] = useState('');
  const [isTestingInitialServer, setIsTestingInitialServer] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Check if server URL / hosted app URL is registered on first app launch
  useEffect(() => {
    // If running inside Capacitor Native Mobile App, bypass web location redirects
    if (isNative) {
      console.log('📱 Native Mobile APK detected. Running local native application bundle.');
      return;
    }

    // 1. Reset Host URL parameter check (e.g. ?reset_server=true)
    if (window.location.search.includes('reset_server=true')) {
      localStorage.removeItem('with_security_hosted_app_url');
      localStorage.removeItem('with_security_server_url');
      localStorage.removeItem('with_security_server_init_completed');
      dbService.setServerUrl('');
      setIsServerModalOpen(true);
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    const isCompleted = localStorage.getItem('with_security_server_init_completed');
    const savedUrl = dbService.getServerUrl();
    const hostedUrl = localStorage.getItem('with_security_hosted_app_url');

    // 2. Automatically load remote live hosted application URL if configured (Browser Web only)
    if (hostedUrl && (hostedUrl.startsWith('http://') || hostedUrl.startsWith('https://'))) {
      const currentOrigin = window.location.origin.replace(/\/+$/, '');
      const targetOrigin = hostedUrl.replace(/\/+$/, '');
      if (!currentOrigin.includes(targetOrigin) && !targetOrigin.includes(currentOrigin)) {
        console.log('🌐 Loading Live Remote Hosted Web Application:', hostedUrl);
        window.location.replace(hostedUrl);
        return;
      }
    }

    if (!isCompleted && !savedUrl && !hostedUrl) {
      setIsServerModalOpen(true);
    } else {
      if (savedUrl) setInitialServerUrl(savedUrl);
      else if (hostedUrl) setInitialServerUrl(hostedUrl);
    }
  }, []);

  // Real-Time Background Data Sync between Mobile App & Web DB Server (With Concurrency Guard)
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    async function triggerAutoSync(force = false) {
      const now = Date.now();
      if (!force && now - lastSyncTimeRef.current < 5000) return; // 5초 이내 중복 동기화 방지
      if (isSyncingRef.current) return; // 이미 동기화 진행 중이면 스킵

      const serverUrl = dbService.getServerUrl();
      if (!serverUrl) return;

      isSyncingRef.current = true;
      lastSyncTimeRef.current = now;
      try {
        await dbService.syncAllWithServer(serverUrl);
      } catch (e) {
        console.warn('Auto sync error:', e);
      } finally {
        isSyncingRef.current = false;
      }
    }

    triggerAutoSync(true);

    // Auto sync every 30 seconds
    const interval = setInterval(() => triggerAutoSync(false), 30000);

    // Auto sync on app focus (throttled)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        triggerAutoSync(false);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Listen to Back Button Exit Request (웹 브라우저 모바일 모드에서만 종료 확인 팝업창 노출)
  useEffect(() => {
    const handleRequestExit = () => {
      const isNative = Capacitor.isNativePlatform();
      if (!isNative) {
        setIsExitModalOpen(true);
      }
    };
    window.addEventListener('with_security_request_exit', handleRequestExit);
    return () => window.removeEventListener('with_security_request_exit', handleRequestExit);
  }, []);

  // Check Education / Training Expiry Alert on App Launch & Data Change
  useEffect(() => {
    async function evaluateTrainingAlert() {
      try {
        const user = await dbService.getUserProfile();
        if (!user) return;

        let allTrainings = Array.isArray(user.trainings) ? user.trainings : [];
        if (allTrainings.length === 0 && (user.educationExpiryDate || user.educationDate)) {
          allTrainings = [{
            id: 'legacy-1',
            category: '법정',
            title: user.educationName || '사내 정기 정보보안 및 안전 교육',
            completionDate: user.educationDate || '',
            expiryDate: user.educationExpiryDate || ''
          }];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasExpiring = allTrainings.some(t => {
          if (!t.expiryDate) return false;
          const exp = new Date(t.expiryDate);
          exp.setHours(0, 0, 0, 0);
          if (isNaN(exp.getTime())) return false;
          const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
          return diffDays <= 30; // Expired (< 0) or expiring within 30 days
        });

        if (hasExpiring) {
          const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const uid = user.username || user.name || 'default';
          const dismissedDate = localStorage.getItem(`with_security_training_alert_dismissed_${uid}`);
          if (dismissedDate !== todayIso) {
            setTrainingAlertUser(user);
            setIsTrainingAlertOpen(true);
          }
        }
      } catch (err) {
        console.warn('Training alert evaluation error:', err);
      }
    }

    evaluateTrainingAlert();

    window.addEventListener('with_security_data_changed', evaluateTrainingAlert);
    return () => {
      window.removeEventListener('with_security_data_changed', evaluateTrainingAlert);
    };
  }, []);

  const handleSaveInitialServer = async () => {
    localStorage.setItem('with_security_server_init_completed', 'true');
    if (!initialServerUrl.trim()) {
      dbService.setServerUrl('');
      setIsServerModalOpen(false);
      showToast('통합 데이터베이스 모드로 앱을 시작합니다. (웹/모바일 100% 동일 동기화)');
      return;
    }

    setIsTestingInitialServer(true);
    let targetUrl = initialServerUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    targetUrl = targetUrl.replace(/\/+$/, '');

    dbService.setServerUrl(targetUrl);
    localStorage.setItem('with_security_hosted_app_url', targetUrl);

    // Trigger full backend data sync
    const syncRes = await dbService.syncAllWithServer(targetUrl);
    setIsTestingInitialServer(false);
    setIsServerModalOpen(false);

    // Redirect to live host URL if different origin (Browser Web only)
    if (!isNative && targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      const currentOrigin = window.location.origin.replace(/\/+$/, '');
      if (!currentOrigin.includes(targetUrl) && !targetUrl.includes(currentOrigin)) {
        window.location.replace(targetUrl);
        return;
      }
    }

    showToast(syncRes.message || `웹 & 모바일 호스팅 서버 실시간 연동 완료: ${targetUrl}`);
  };

  const handleSkipServerSetup = async () => {
    localStorage.setItem('with_security_server_init_completed', 'true');
    dbService.setServerUrl('');
    setIsServerModalOpen(false);
    await dbService.syncAllWithServer('');
    showToast('로컬 전용 모드로 앱을 시작합니다. (모바일/웹 데이터 실시간 동기화)');
  };

  // View mode: 'web' or 'mobile'. Default based on screen width or native platform.
  const [viewMode, setViewMode] = useState(() => {
    if (Capacitor.isNativePlatform()) return 'mobile';
    return window.innerWidth > 768 ? 'web' : 'mobile';
  });

  const [currentUser, setCurrentUser] = useState(null);

  // Monitor active user profile & enforce Web Mode on desktop web browser for non-developers
  useEffect(() => {
    async function evaluateUserMode() {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
      // 데스크톱 웹 브라우저 환경에서 개발자 계정이 아니면 웹 모드로 강제 고정
      if (!Capacitor.isNativePlatform() && window.innerWidth > 768) {
        if (!u || u.role !== '개발자') {
          setViewMode('web');
        }
      }
    }
    evaluateUserMode();
    window.addEventListener('with_security_data_changed', evaluateUserMode);
    return () => window.removeEventListener('with_security_data_changed', evaluateUserMode);
  }, []);

  const handleToggleViewMode = (newMode) => {
    if (!Capacitor.isNativePlatform() && window.innerWidth > 768) {
      if (currentUser?.role !== '개발자' && newMode === 'mobile') {
        showToast('🔒 모바일 모드 전환은 개발자 계정에서만 지원됩니다.');
        return;
      }
    }
    setViewMode(newMode);
  };

  // Default login guard: if not logged in, force userProfile (Login screen)
  useEffect(() => {
    async function enforceLoginGuard() {
      const u = await dbService.getUserProfile();
      if (!u || !u.username) {
        if (activeTab !== 'userProfile') {
          setActiveTab('userProfile');
        }
      }
    }
    enforceLoginGuard();
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

  // Global event listener for custom toast events (e.g. from native double-back exit warning)
  const [exitPromptMessage, setExitPromptMessage] = useState(null);

  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e?.detail?.message) {
        showToast(e.detail.message);
      }
    };

    let exitTimer = null;
    const handleExitPrompt = (e) => {
      const msg = e?.detail?.message || '취소(뒤로가기) 버튼을 한 번 더 누르면 앱이 종료됩니다.';
      setExitPromptMessage(msg);
      if (exitTimer) clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        setExitPromptMessage(null);
      }, 3000);
    };

    window.addEventListener('with_security_toast', handleCustomToast);
    window.addEventListener('with_security_exit_prompt', handleExitPrompt);

    return () => {
      window.removeEventListener('with_security_toast', handleCustomToast);
      window.removeEventListener('with_security_exit_prompt', handleExitPrompt);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* Offline Internet Connection Required Floating Banner */}
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '12px 16px',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
          paddingTop: 'max(env(safe-area-inset-top), 12px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: '700' }}>
            <span style={{ fontSize: '16px' }}>📶</span>
            <span>인터넷 연결이 필요합니다. 실시간 동기화를 위해 Wi-Fi 또는 모바일 데이터를 켜주세요.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (navigator.onLine) {
                setIsOffline(false);
                window.location.reload();
              } else {
                showToast('❌ 아직 인터넷에 연결되지 않았습니다. 네트워크 설정을 확인해 주세요.');
              }
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: 'none',
              color: '#b91c1c',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Toast Floating Alert Banner (Bottom-Center) */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 20px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '800',
          maxWidth: '90vw',
          animation: 'staticFadeIn 0.18s ease-in-out forwards'
        }}>
          <Bell size={16} color="#60a5fa" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bottom-Center App Exit Prompt Popup on Back Button Press (In-Place Fade Appearance) */}
      {exitPromptMessage && (
        <div
          className="static-fade-in"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 85px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(255, 255, 255, 0.18)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '6px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 20px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            fontSize: '13px',
            fontWeight: '800',
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap',
            maxWidth: '90vw',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '15px' }}>🚪</span>
          <span>{exitPromptMessage}</span>
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
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(30, 58, 138, 0.4)',
            color: '#1e3a8a',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
          }}
        >
          <Monitor size={16} /> 데스크톱 웹 브라우저 뷰 전환
        </button>
      )}

      {/* Safe Tab Switch Handler: intercepts tab change if unsaved workSummary changes exist */}
      {(() => null)()}
      {/* Render Mode: Web Browser Portal vs Mobile App Shell */}
      {viewMode === 'web' ? (
        <WebDesktopLayout
          activeTab={activeTab}
          setActiveTab={handleSafeTabChange}
          onLockApp={() => setIsLocked(true)}
          onTriggerToast={showToast}
          platform={platform}
          onToggleViewMode={handleToggleViewMode}
          viewMode={viewMode}
        />
      ) : (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <MobileContainer
            activeTab={activeTab}
            setActiveTab={handleSafeTabChange}
            platform={platform}
            setPlatform={setPlatform}
            isLocked={isLocked}
            setIsLocked={setIsLocked}
          >
            {activeTab === 'entryCheck' && <SecurityChecklistTab onTriggerToast={showToast} />}
            {activeTab === 'workLog' && <WorkLogTab onTriggerToast={showToast} />}
            {activeTab === 'workSummary' && <WorkSummaryTab onTriggerToast={showToast} />}
            {activeTab === 'admin' && <SiteSettingTab onTriggerToast={showToast} />}
            {activeTab === 'userProfile' && <UserSettingTab onTriggerToast={showToast} setActiveTab={handleSafeTabChange} />}
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

      {/* Education / Training Expiry Alert Modal */}
      <TrainingExpiryModal
        isOpen={isTrainingAlertOpen}
        onClose={() => setIsTrainingAlertOpen(false)}
        onGoToSettings={() => {
          setActiveTab('userSetting');
          setIsTrainingAlertOpen(false);
        }}
        currentUser={trainingAlertUser}
      />

      {/* First-Time Server URL Mandatory Setup Modal */}
      {isServerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            borderRadius: '10px',
            border: '1px solid rgba(30, 58, 138, 0.3)',
            background: '#ffffff',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)'
              }}>
                <Globe size={26} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                  호스팅 서버 및 실시간 앱 업데이트 설정
                </div>
                <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: '700', marginTop: '2px' }}>
                  WithSecurity 웹 & 모바일 자동 동기화
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
              앱 실행 시 연결할 <strong>호스팅 서버 주소(웹/API URL)</strong>를 등록해 주세요. 등록하면 모바일 앱이 호스팅 서버와 실시간으로 연동되며, <strong>호스팅 서버가 업데이트될 때 모바일 앱도 실시간으로 최신 버전이 자동 반영</strong>됩니다.
            </p>

            {/* Input Field */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px' }}>
                서버 URL (API Base URL) *
              </label>
              <div style={{ position: 'relative' }}>
                <Server size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#1e3a8a' }} />
                <input
                  type="text"
                  placeholder="예: https://wblee0703.github.io/with.security 또는 http://192.168.0.15:4000"
                  value={initialServerUrl}
                  onChange={(e) => setInitialServerUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none'
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
                style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(30, 58, 138, 0.08)', border: '1px solid rgba(30, 58, 138, 0.3)', color: '#1e3a8a', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                🌐 GitHub Pages (wblee0703)
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleSaveInitialServer}
                disabled={isTestingInitialServer}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '6px',
                  background: '#1e3a8a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '900',
                  cursor: isTestingInitialServer ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)'
                }}
              >
                {isTestingInitialServer ? <RefreshCw size={18} className="spin" /> : <CheckCircle2 size={18} />}
                {isTestingInitialServer ? '서버 연결 검증 중...' : '서버 연결 및 앱 시작하기'}
              </button>

              <button
                type="button"
                onClick={handleSkipServerSetup}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                서버 연결 없이 로컬 모드로 계속하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Mobile Back-Button Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
      />
    </div>
  );
}
