import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Building2, UserCheck, Settings } from 'lucide-react';
import SiteSettingTab from './SiteSettingTab';
import UserSettingTab from './UserSettingTab';
import { dbService } from '../../services/dbService';

/**
 * Admin 통합 메뉴
 * - 사업장(SiteSettingTab) / 사용자 정보(UserSettingTab)를 상단 전환 버튼으로 구분 표시
 * - activeTab 'admin' → 사업장, 'userProfile' → 사용자 정보 (기존 탭 ID 유지로 로그인 가드/헤더 이동 호환)
 */
export default function AdminTab({ activeTab, setActiveTab, onTriggerToast }) {
  const view = activeTab === 'userProfile' ? 'user' : 'site';
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isNative = Capacitor.isNativePlatform();
  // 업무정리 탭과 동일한 모바일 판별 기준 (데스크톱 웹 모드에서는 제목과 버튼을 한 줄로 배치)
  const isMobile = isNative || (containerWidth > 0 ? containerWidth < 760 : (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const u = await dbService.getUserProfile();
      setIsLoggedIn(!!(u && u.username));
    };
    loadUser();
    window.addEventListener('with_security_data_changed', loadUser);
    return () => window.removeEventListener('with_security_data_changed', loadUser);
  }, [activeTab]);

  const buttons = [
    { id: 'user', tab: 'userProfile', label: '사용자 정보', icon: UserCheck },
    { id: 'site', tab: 'admin', label: '사업장', icon: Building2 }
  ];

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Admin 상단 타이틀 카드 + 사업장 / 사용자 정보 전환 버튼 — 로그인 시에만 표시 */}
      {isLoggedIn && (
        <div className="glass-panel" style={{
          padding: isMobile ? '12px 14px' : '14px 18px',
          borderRadius: '6px',
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '12px' : '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
              border: '1.5px solid #1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.25)',
              flexShrink: 0
            }}>
              <Settings size={isMobile ? 20 : 22} />
            </div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
              Admin
            </div>
          </div>

        <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
          {buttons.map(({ id, tab, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: isMobile ? 1 : '0 0 auto',
                  padding: isMobile ? '11px 14px' : '9px 18px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: active ? '800' : '600',
                  background: active ? '#1e3a8a' : '#f8fafc',
                  color: active ? '#ffffff' : '#475569',
                  border: active ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 2px 6px rgba(30, 58, 138, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <Icon size={17} color={active ? '#ffffff' : '#64748b'} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        </div>
      )}

      {view === 'site'
        ? <SiteSettingTab onTriggerToast={onTriggerToast} />
        : <UserSettingTab onTriggerToast={onTriggerToast} setActiveTab={setActiveTab} />}
    </div>
  );
}
