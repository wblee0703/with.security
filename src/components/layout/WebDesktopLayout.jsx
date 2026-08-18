import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ShieldCheck,
  QrCode,
  KeyRound,
  Lock,
  AlertOctagon,
  Monitor,
  Smartphone,
  Bell,
  User,
  Search,
  Activity,
  LogOut,
  ExternalLink,
  ChevronRight,
  Shield,
  CheckCircle2,
  Building2,
  LockKeyhole,
  Settings
} from 'lucide-react';
import SiteSettingTab from '../tabs/SiteSettingTab';
import SecurityChecklistTab from '../tabs/SecurityChecklistTab';
import UserSettingTab from '../tabs/UserSettingTab';
import WorkLogTab from '../tabs/WorkLogTab';
import WorkSummaryTab from '../tabs/WorkSummaryTab';
import { dbService } from '../../services/dbService';
import { ClipboardList, FileSpreadsheet } from 'lucide-react';
import TrainingHeaderNotice from '../common/TrainingHeaderNotice';

export default function WebDesktopLayout({
  activeTab,
  setActiveTab,
  onLockApp,
  onTriggerToast,
  platform,
  onToggleViewMode,
  viewMode
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const u = await dbService.getUserProfile();
      setActiveUser(u);
    }
    fetchUser();
    window.addEventListener('with_security_data_changed', fetchUser);
    return () => window.removeEventListener('with_security_data_changed', fetchUser);
  }, [activeTab]);
  const handleLogout = async () => {
    localStorage.removeItem('with_security_active_user');
    setActiveUser(null);
    setActiveTab('userProfile');
    if (onTriggerToast) onTriggerToast('로그아웃 되었습니다. 다시 로그인해 주세요.', 'info');
    window.dispatchEvent(new Event('with_security_data_changed'));
  };

  const handleNavClick = (targetTabId) => {
    if (!activeUser) {
      setActiveTab('userProfile');
      if (onTriggerToast) onTriggerToast('❌ 로그인이 필요합니다. 먼저 로그인해 주세요.', 'warning');
      return;
    }
    setActiveTab(targetTabId);
  };

  const navItems = [
    { id: 'entryCheck', label: '보안 서약', icon: ShieldCheck },
    { id: 'workLog', label: '업무 일지', icon: ClipboardList },
    { id: 'workSummary', label: '업무 정리', icon: FileSpreadsheet },
    { id: 'admin', label: '사업장', icon: Building2 },
    { id: 'userProfile', label: '사용자 정보', icon: User }
  ];

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Top Desktop Web Navbar */}
      <header style={{
        height: '64px',
        borderBottom: '1.5px solid #cbd5e1',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Brand Logo & View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="./LOGO+WITHTECH.png"
              alt="WITHTECH"
              style={{
                height: '28px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
            <div style={{ borderLeft: '1.5px solid #cbd5e1', paddingLeft: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                WITH Sharing <span style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: '700' }}>Portal</span>
              </div>
            </div>
          </div>

          {/* Device View Mode Switcher (Web Desktop vs Mobile Frame) */}
          <div style={{
            display: 'flex',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            padding: '3px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <button
              onClick={() => onToggleViewMode('web')}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                border: viewMode === 'web' ? '1.5px solid #1e3a8a' : '1.5px solid transparent',
                background: viewMode === 'web' ? 'rgba(30, 58, 138, 0.08)' : 'transparent',
                color: viewMode === 'web' ? '#1e3a8a' : '#64748b',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Monitor size={14} /> 웹 모드
            </button>
            <button
              onClick={() => onToggleViewMode('mobile')}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                border: viewMode === 'mobile' ? '1.5px solid #1e3a8a' : '1.5px solid transparent',
                background: viewMode === 'mobile' ? 'rgba(30, 58, 138, 0.08)' : 'transparent',
                color: viewMode === 'mobile' ? '#1e3a8a' : '#64748b',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Smartphone size={14} /> 모바일 모드
            </button>
          </div>
        </div>

        {/* User Profile & Education Notice & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onClick={() => setActiveTab('userProfile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '8px',
              transition: 'background 0.15s ease'
            }}
            title="사용자 정보로 이동"
          >
            {activeUser ? (
              <div style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: activeUser.role === '개발자' ? '#fff1f2' : (activeUser.role === '관리자' ? '#fffbeb' : '#eff6ff'),
                color: activeUser.role === '개발자' ? '#e11d48' : (activeUser.role === '관리자' ? '#d97706' : '#1e3a8a'),
                fontWeight: '800',
                fontSize: '11.5px',
                border: `1.5px solid ${activeUser.role === '개발자' ? '#fda4af' : (activeUser.role === '관리자' ? '#fde68a' : '#cbd5e1')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                letterSpacing: '-0.2px'
              }}>
                {activeUser.role || '일반'}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                {activeUser ? `${activeUser.name} ${activeUser.rank || ''}` : '미로그인 사용자'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {activeUser ? `${activeUser.division || ''} • ${activeUser.team || ''}` : '로그인 필요'}
              </span>
            </div>
          </div>

          {/* Education Expiry Notification Header Notice */}
          {activeUser && (
            <TrainingHeaderNotice
              currentUser={activeUser}
              onNavigateToUserProfile={(tab) => setActiveTab(tab || 'userProfile')}
              compact={false}
            />
          )}

          {/* Logout Button */}
          {activeUser && (
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#fff1f2',
                border: '1.5px solid #fda4af',
                color: '#e11d48',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginLeft: '4px'
              }}
            >
              <LogOut size={14} /> 로그아웃
            </button>
          )}
        </div>
      </header>

      {/* Main Body (Sidebar + Content Canvas) */}
      <div style={{ flex: 1, display: 'flex', width: '100%', padding: '24px' }}>

        {/* Left Web Sidebar Navigation */}
        <aside style={{
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '24px',
          borderRight: '1.5px solid #cbd5e1'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>
            Main Menu
          </div>

          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: isActive ? '1.5px solid #cbd5e1' : '1.5px solid transparent',
                  background: isActive ? 'rgba(30, 58, 138, 0.08)' : 'transparent',
                  color: isActive ? '#1e3a8a' : '#475569',
                  fontSize: '13px',
                  fontWeight: isActive ? '800' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconComp size={18} color={isActive ? '#1e3a8a' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Main Web Content Panel */}
        <main style={{ flex: 1, paddingLeft: '24px', overflowY: 'auto' }}>
          <div style={{ width: '100%' }}>
            {activeTab === 'entryCheck' && <SecurityChecklistTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'workLog' && <WorkLogTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'workSummary' && <WorkSummaryTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'admin' && <SiteSettingTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'userProfile' && <UserSettingTab onTriggerToast={onTriggerToast} setActiveTab={setActiveTab} />}
          </div>
        </main>

      </div>
    </div>
  );
}
