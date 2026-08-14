import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ShieldCheck,
  LockKeyhole,
  Building2,
  Settings,
  UserCheck,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react';
import { dbService } from '../../services/dbService';

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

  return (
    <div className="mobile-shell-wrapper">

      {/* Clean Mobile App Top Header (Supports Safe Area Inset for Notches) */}
      <div style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: '2px',
        paddingLeft: '12px',
        paddingRight: '12px',
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

        {/* Top Right: User Profile Widget */}
        {currentUser ? (
          <div
            onClick={() => setActiveTab('userProfile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: '10px',
              transition: 'background 0.2s ease'
            }}
            title="사용자 프로필 관리로 이동"
          >
            <div style={{
              padding: '2px 6px',
              borderRadius: '6px',
              background: currentUser.role === '개발자' ? '#fff1f2' : (currentUser.role === '관리자' ? '#fffbeb' : '#f0f9ff'),
              color: currentUser.role === '개발자' ? '#e11d48' : (currentUser.role === '관리자' ? '#d97706' : '#0284c7'),
              fontWeight: '800',
              fontSize: '10px',
              border: `1.5px solid ${currentUser.role === '개발자' ? '#fda4af' : (currentUser.role === '관리자' ? '#fde68a' : '#bae6fd')}`,
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
              <span style={{ fontSize: '9px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', fontWeight: '500' }}>
                {currentUser.team || currentUser.department || '위드텍'}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('userProfile')}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              background: '#f0f9ff',
              border: '1.5px solid #7dd3fc',
              color: '#0284c7',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            로그인
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="app-content">
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
