import React, { useState, useEffect } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { dbService } from '../../services/dbService';
import AppNoticeModal from './AppNoticeModal';

export default function AppNoticeHeaderBtn({ compact = false }) {
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkNotices = async () => {
    try {
      const list = await dbService.getAppNotices();
      const activeList = list.filter(n => n.is_active !== false);
      setNotices(activeList);

      const unread = activeList.filter(n => !dbService.isNoticeRead(n.id)).length;
      setUnreadCount(unread);
    } catch (e) {
      console.warn('Failed to check notices:', e);
    }
  };

  useEffect(() => {
    checkNotices();

    const handleDataChanged = () => {
      checkNotices();
    };

    window.addEventListener('with_security_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('with_security_data_changed', handleDataChanged);
    };
  }, []);

  // 활성화된 공지가 하나도 없으면 헤더 버튼을 표시하지 않음
  if (notices.length === 0) {
    return null;
  }

  const hasUnread = unreadCount > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title="시스템 업데이트 공지사항 확인"
        style={{
          position: 'relative',
          padding: compact ? '5px 7px' : '6px 10px',
          borderRadius: '8px',
          background: hasUnread ? '#eff6ff' : '#f8fafc',
          border: hasUnread ? '1.5px solid #93c5fd' : '1.5px solid #cbd5e1',
          color: hasUnread ? '#1d4ed8' : '#475569',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s ease',
          fontSize: '11px',
          fontWeight: '800'
        }}
      >
        <Bell size={compact ? 16 : 17} color={hasUnread ? '#2563eb' : '#64748b'} />
        {!compact && <span>업데이트 공지</span>}

        {/* Unread Badge */}
        {hasUnread && (
          <span style={{
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '10px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '9.5px',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isModalOpen && (
        <AppNoticeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            checkNotices();
          }}
          initialNotice={notices[0]}
        />
      )}
    </>
  );
}
