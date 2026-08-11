import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LockKeyhole,
  Building2,
  Settings,
  UserCheck,
  ClipboardList
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
  }, [activeTab]);

  const isAdmin = ['개발자', '관리자'].includes(currentUser?.role) || currentUser?.username === 'admin';

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
      
      {/* Clean Mobile App Top Header (Supports Safe Area Inset for Notches) */}
      <div style={{
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: '12px',
        paddingLeft: '16px',
        paddingRight: '16px',
        background: '#04070e',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 60
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#050b14',
            boxShadow: '0 0 12px rgba(0, 242, 254, 0.3)'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', letterSpacing: '0.3px', lineHeight: 1.2 }}>
              WithSecurity
            </div>
            <div style={{ fontSize: '10px', color: '#00f2fe', fontWeight: '700' }}>
              통합 보안 관제
            </div>
          </div>
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
          onClick={() => setActiveTab('workLog')}
          className={`nav-item ${activeTab === 'workLog' ? 'active' : ''}`}
        >
          <ClipboardList size={18} />
          <span>업무 일지</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>Admin</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('userProfile')}
          className={`nav-item ${activeTab === 'userProfile' ? 'active' : ''}`}
        >
          <UserCheck size={18} />
          <span>사용자</span>
        </button>
      </nav>

    </div>
  );
}
