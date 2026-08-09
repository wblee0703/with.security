import React, { useState, useEffect } from 'react';
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
import EncryptedVaultTab from '../tabs/EncryptedVaultTab';
import IncidentReportTab from '../tabs/IncidentReportTab';
import SiteSecurityChecklistTab from '../tabs/SiteSecurityChecklistTab';
import UserProfileTab from '../tabs/UserProfileTab';
import { dbService } from '../../services/dbService';

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
  }, [activeTab]);

  const isAdmin = ['개발자', '관리자'].includes(activeUser?.role) || activeUser?.username === 'admin';

  const navItems = [
    { id: 'entryCheck', label: '사업장 출입 보안 서약', icon: Building2, badge: 'HOT' },
    ...(isAdmin ? [{ id: 'admin', label: '사업장 관리 (Admin)', icon: Settings, badge: 'Admin' }] : []),
    { id: 'userProfile', label: '사용자 정보 (Profile)', icon: User, badge: 'User' },
    { id: 'incident', label: '보안관제(SOC) 위협신고', icon: AlertOctagon, badge: '신규' }
  ];

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: '#04070f',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Top Desktop Web Navbar */}
      <header style={{
        height: '64px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Brand Logo & View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
            }}>
              <ShieldCheck size={22} color="#050b14" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                WithSecurity <span style={{ fontSize: '11px', color: '#00f2fe', fontWeight: '600', marginLeft: '4px' }}>Web & Mobile Portal</span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>회사 통합 웹/모바일 보안 통제 시스템</div>
            </div>
          </div>

          {/* Device View Mode Switcher (Web Desktop vs Mobile Frame) */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '3px'
          }}>
            <button
              onClick={() => onToggleViewMode('web')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'web' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: viewMode === 'web' ? '#00f2fe' : '#94a3b8',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Monitor size={14} /> 데스크톱 웹 모드
            </button>
            <button
              onClick={() => onToggleViewMode('mobile')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'mobile' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: viewMode === 'mobile' ? '#00f2fe' : '#94a3b8',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Smartphone size={14} /> 모바일 앱 프레임 모드
            </button>
          </div>
        </div>

        {/* Search Bar & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 14px',
            borderRadius: '20px',
            width: '240px'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="보안 항목, 토큰 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
              color: '#050b14',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeUser ? (activeUser.name ? activeUser.name.slice(0, 2) : 'US') : 'GUEST'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {activeUser ? `${activeUser.name} ${activeUser.rank || ''}` : '미로그인 사용자'}
                {activeUser && (
                  <span style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: activeUser.role === '관리자' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 242, 254, 0.15)',
                    color: activeUser.role === '관리자' ? '#f59e0b' : '#00f2fe'
                  }}>
                    {activeUser.role || '일반'}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {activeUser ? `${activeUser.division || ''} • ${activeUser.team || ''}` : '로그인 필요'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body (Sidebar + Content Canvas) */}
      <div style={{ flex: 1, display: 'flex', width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        
        {/* Left Web Sidebar Navigation */}
        <aside style={{
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '24px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>
            Main Security Menu
          </div>

          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                  color: isActive ? '#00f2fe' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IconComp size={18} color={isActive ? '#00f2fe' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isActive ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#00f2fe' : '#64748b'
                }}>
                  {item.badge}
                </span>
              </button>
            );
          })}

          {/* Web Desktop Live Security Status Card */}
          <div className="glass-panel" style={{ marginTop: 'auto', padding: '16px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Activity size={16} color="#10b981" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>웹 세션 통합 보안</span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4', marginBottom: '10px' }}>
              Chrome / Edge W3C WebAuthn 기반 인메모리 암호화 보호 중입니다.
            </p>
            <div className="badge-secure" style={{ fontSize: '10px', padding: '2px 8px' }}>
              Web TLS 1.3 Strict
            </div>
          </div>
        </aside>

        {/* Right Main Web Content Panel */}
        <main style={{ flex: 1, paddingLeft: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {activeTab === 'entryCheck' && <SiteSecurityChecklistTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'admin' && <EncryptedVaultTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'userProfile' && <UserProfileTab onTriggerToast={onTriggerToast} />}
            {activeTab === 'incident' && <IncidentReportTab onTriggerToast={onTriggerToast} />}
          </div>
        </main>

      </div>
    </div>
  );
}
