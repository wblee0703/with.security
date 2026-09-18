import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Sparkles, RefreshCw, X, Check, Calendar, User, ChevronRight, AlertCircle, Radio } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { useModalBack } from '../../services/modalBackHandler';

export default function AppNoticeModal({ isOpen, onClose, initialNotice = null, onReload = null }) {
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useModalBack(isOpen, onClose, 'app-notice-modal');

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const list = await dbService.getAppNotices();
        const activeList = list.filter(n => n.is_active !== false);
        setNotices(activeList);

        if (initialNotice) {
          setSelectedNotice(initialNotice);
          dbService.markNoticeAsRead(initialNotice.id);
        } else if (activeList.length > 0) {
          setSelectedNotice(activeList[0]);
          dbService.markNoticeAsRead(activeList[0].id);
        }
      } catch (err) {
        console.warn('Failed to load notices for modal:', err);
      }
    };

    loadData();
  }, [isOpen, initialNotice]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSelectNotice = (item) => {
    setSelectedNotice(item);
    dbService.markNoticeAsRead(item.id);
  };

  const handleClose = () => {
    if (dontShowToday && selectedNotice) {
      dbService.dismissNoticeToday(selectedNotice.id);
    }
    onClose();
  };

  const handlePerformReload = async () => {
    setIsReloading(true);
    // 새로고침 실행 시 현재 공지를 '업데이트 적용 완료'로 영구 등록하여 재노출 원천 방지
    if (selectedNotice) {
      dbService.markNoticeAsApplied(selectedNotice.id);
    }
    if (Array.isArray(notices)) {
      notices.forEach(n => {
        if (n && n.id) dbService.markNoticeAsApplied(n.id);
      });
    }

    if (onReload) {
      onReload();
    } else {
      await dbService.reloadAppWithoutCache();
    }
  };

  return createPortal(
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1.5px solid #f1f5f9',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', letterSpacing: '-0.3px', color: '#ffffff' }}>
                  시스템 업데이트 공지
                </h3>
                {selectedNotice?.version && (
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(96, 165, 250, 0.25)',
                    border: '1px solid #60a5fa',
                    color: '#93c5fd'
                  }}>
                    {selectedNotice.version}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                최신 보안 패치 및 신규 기능 안내
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection if multiple notices */}
        {notices.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto'
          }}>
            {notices.map((item) => {
              const isSelected = selectedNotice?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNotice(item)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid #1e3a8a' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#1e3a8a' : '#64748b',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{item.version || '공지'}</span>
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {selectedNotice ? (
            <>
              {/* Notice Title & Meta */}
              <div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '17px',
                  fontWeight: '900',
                  color: '#0f172a',
                  lineHeight: 1.35
                }}>
                  {selectedNotice.title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} color="#94a3b8" />
                    {selectedNotice.created_at ? selectedNotice.created_at.substring(0, 10) : '최근'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} color="#94a3b8" />
                    {selectedNotice.author_name || '관리자'} ({selectedNotice.version || '최신'})
                  </span>
                </div>
              </div>

              {/* Notice Text Content */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 18px',
                fontSize: '13.5px',
                lineHeight: '1.65',
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '260px',
                overflowY: 'auto'
              }}>
                {selectedNotice.content}
              </div>

              {/* Action Recommendation Banner */}
              <div style={{
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <Sparkles size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: 1.45 }}>
                  <strong>배포된 최신 기능을 즉시 사용하시려면?</strong>
                  <div style={{ marginTop: '2px', color: '#3b82f6' }}>
                    아래 <strong>[최신 버전으로 즉시 새로고침]</strong> 버튼을 누르시면 캐시를 초기화하고 최신 화면을 불러옵니다.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <AlertCircle size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '700' }}>등록된 업데이트 공지사항이 없습니다.</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1.5px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {selectedNotice && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#64748b',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#1e3a8a' }}
                />
                오늘 하루 이 공지 다시 보지 않기
              </label>

              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePerformReload}
              disabled={isReloading}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: isReloading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
                opacity: isReloading ? 0.7 : 1
              }}
            >
              <RefreshCw size={16} className={isReloading ? 'spin' : ''} />
              {isReloading ? '최신 버전 불러오는 중...' : '🚀 지금 최신 버전으로 새로고침'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
