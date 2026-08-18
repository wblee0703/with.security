import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ShieldCheck,
  LockKeyhole,
  Building2,
  Settings,
  UserCheck,
  ClipboardList,
  FileSpreadsheet,
  RefreshCw,
  ArrowDown
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import TrainingHeaderNotice from '../common/TrainingHeaderNotice';

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
  const [currentUser, setCurrentUser] = useState(null);

  // Pull to Refresh State
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    async function loadUser() {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
    }
    loadUser();
    window.addEventListener('with_security_data_changed', loadUser);
    return () => window.removeEventListener('with_security_data_changed', loadUser);
  }, [activeTab]);

  const isAdmin = ['개발자', '관리자'].includes(currentUser?.role) || currentUser?.username === 'admin';
  const isDeveloper = currentUser?.role === '개발자' || currentUser?.username === 'admin';
  const isNative = Capacitor.isNativePlatform();
  const showSecurityChecklistTab = isNative || isDeveloper;

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

  const handleNavClick = (targetTabId) => {
    if (!currentUser) {
      setActiveTab('userProfile');
      return;
    }
    setActiveTab(targetTabId);
  };

  // --- Pull to Refresh Touch Handlers ---
  const handleTouchStart = (e) => {
    if (!contentRef.current || isRefreshing) return;
    if (contentRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPullingRef.current || isRefreshing || !contentRef.current) return;
    if (contentRef.current.scrollTop <= 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > 0) {
        const pull = Math.min(diff * 0.45, 80);
        setPullDistance(pull);
      } else {
        setPullDistance(0);
        isPullingRef.current = false;
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);

      try {
        // Trigger global data refresh & server sync
        window.dispatchEvent(new CustomEvent('with_security_data_changed'));
        const serverUrl = dbService.getServerUrl();
        if (serverUrl) {
          await dbService.syncAllWithServer(serverUrl);
        }
      } catch (err) {
        console.warn('Pull-to-refresh error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 600);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div className="mobile-shell-wrapper">

      {/* Clean Mobile App Top Header with Status Bar Safe Area Padding */}
      <div style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)',
        paddingBottom: '8px',
        paddingLeft: '14px',
        paddingRight: '14px',
        minHeight: 'calc(48px + env(safe-area-inset-top, 0px))',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 60,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="./LOGO+WITHTECH.png"
            alt="WITHTECH"
            style={{
              height: '22px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#64748b',
            letterSpacing: '-0.2px',
            paddingTop: '2px'
          }}>
            WITH Sharing
          </span>
        </div>

        {/* Top Right: User Profile Widget & Training Notice Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {currentUser ? (
            <>
              <div
                onClick={() => setActiveTab('userProfile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  transition: 'background 0.2s ease'
                }}
                title="사용자 프로필 관리로 이동"
              >
                <div style={{
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: currentUser.role === '개발자' ? '#fff1f2' : (currentUser.role === '관리자' ? '#fffbeb' : '#eff6ff'),
                  color: currentUser.role === '개발자' ? '#e11d48' : (currentUser.role === '관리자' ? '#d97706' : '#1e3a8a'),
                  fontWeight: '800',
                  fontSize: '10px',
                  border: `1.5px solid ${currentUser.role === '개발자' ? '#fda4af' : (currentUser.role === '관리자' ? '#fde68a' : '#cbd5e1')}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  letterSpacing: '-0.2px'
                }}>
                  {currentUser.role || '일반'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                    {currentUser.name} {currentUser.rank || ''}
                  </span>
                  <span style={{ fontSize: '9px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px', fontWeight: '500' }}>
                    {currentUser.team || currentUser.department || '위드텍'}
                  </span>
                </div>
              </div>

              {/* Education Expiry Notification Icon Button */}
              <TrainingHeaderNotice
                currentUser={currentUser}
                onNavigateToUserProfile={(tab) => setActiveTab(tab || 'userProfile')}
                compact={true}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('userProfile')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#eff6ff',
                border: '1.5px solid #cbd5e1',
                color: '#1e3a8a',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              로그인
            </button>
          )}
        </div>
      </div>

      {/* Pull to Refresh Animated Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div style={{
          height: `${pullDistance}px`,
          maxHeight: '60px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(30, 58, 138, 0.08)',
          borderBottom: '1px solid rgba(30, 58, 138, 0.2)',
          transition: isPullingRef.current ? 'none' : 'all 0.3s ease',
          gap: '8px',
          color: '#1e3a8a',
          fontSize: '12px',
          fontWeight: '800'
        }}>
          <RefreshCw
            size={16}
            style={{
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
              transform: `rotate(${pullDistance * 4}deg)`,
              transition: isPullingRef.current ? 'none' : 'transform 0.3s ease'
            }}
          />
          <span>{isRefreshing ? '데이터 새로고침 중...' : (pullDistance >= 50 ? '손을 놓으면 새로고침' : '아래로 당겨서 새로고침')}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div
        ref={contentRef}
        className="app-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Bottom Mobile Navigation Bar */}
      <nav className="bottom-nav">
        {showSecurityChecklistTab && (
          <button
            onClick={() => handleNavClick('entryCheck')}
            className={`nav-item ${activeTab === 'entryCheck' ? 'active' : ''}`}
          >
            <ShieldCheck size={18} />
            <span>보안 서약</span>
          </button>
        )}

        <button
          onClick={() => handleNavClick('workLog')}
          className={`nav-item ${activeTab === 'workLog' ? 'active' : ''}`}
        >
          <ClipboardList size={18} />
          <span>업무 일지</span>
        </button>

        <button
          onClick={() => handleNavClick('workSummary')}
          className={`nav-item ${activeTab === 'workSummary' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={18} />
          <span>업무 정리</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => handleNavClick('admin')}
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
          >
            <Building2 size={18} />
            <span>사업장</span>
          </button>
        )}

        <button
          onClick={() => handleNavClick('userProfile')}
          className={`nav-item ${activeTab === 'userProfile' ? 'active' : ''}`}
        >
          <UserCheck size={18} />
          <span>사용자</span>
        </button>
      </nav>

    </div>
  );
}
