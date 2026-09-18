import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, Radio, Edit3, ShieldAlert } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { useModalBack } from '../../services/modalBackHandler';

export default function AppNoticeAdminModal({ isOpen, onClose, currentUser, onTriggerToast }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    version: 'v1.2.4',
    content: '',
    is_active: true
  });

  useModalBack(isOpen, onClose, 'app-notice-admin-modal');

  const loadNotices = async () => {
    setLoading(true);
    try {
      const list = await dbService.getAppNotices(true);
      setNotices(list);
    } catch (err) {
      console.warn('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotices();
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('공지 제목을 입력해 주세요.');
      return;
    }
    if (!form.content.trim()) {
      alert('공지 상세 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await dbService.saveAppNotice({
        title: form.title.trim(),
        version: form.version.trim(),
        content: form.content.trim(),
        author_name: currentUser?.name || '개발자',
        author_username: currentUser?.username || 'admin',
        is_active: form.is_active
      });

      if (onTriggerToast) {
        onTriggerToast('📢 업데이트 공지가 성공적으로 등록/배포되었습니다!');
      }

      setForm({
        title: '',
        version: form.version,
        content: '',
        is_active: true
      });

      await loadNotices();
    } catch (err) {
      alert('공지 등록 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (notice) => {
    try {
      await dbService.saveAppNotice({
        ...notice,
        is_active: !notice.is_active
      });
      await loadNotices();
    } catch (err) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!window.confirm('이 공지사항을 정말 삭제하시겠습니까?')) return;
    try {
      await dbService.deleteAppNotice(noticeId);
      if (onTriggerToast) {
        onTriggerToast('공지사항이 삭제되었습니다.');
      }
      await loadNotices();
    } catch (err) {
      alert('공지 삭제 실패: ' + err.message);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
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
          maxWidth: '600px',
          maxHeight: '92vh',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 22px',
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Megaphone size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#ffffff' }}>
                  시스템 업데이트 공지 배포 & 관리
                </h3>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5'
                }}>
                  개발자 전용
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                공지 등록 시 모든 사용자 화면에 알림이 표시되고 최신 버전을 안내합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* New Notice Form */}
          <form onSubmit={handleSubmit} style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> 신규 업데이트 공지 작성
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  공지 제목 *
                </label>
                <input
                  type="text"
                  placeholder="예: v1.2.4 보안 패치 및 최신 기능 업데이트 안내"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  배포 버전 *
                </label>
                <input
                  type="text"
                  placeholder="예: v1.2.4"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                공지 상세 내용 (사용자에게 안내할 변경 사항) *
              </label>
              <textarea
                rows={4}
                placeholder="예: 1. 보안 서약서 서명 누락 방지 강화&#10;2. 업무 일지 공유 기능 개선&#10;3. 설정 메뉴에서 [최신 버전 새로고침]을 진행해 주세요."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  outline: 'none',
                  background: '#ffffff',
                  resize: 'vertical',
                  lineHeight: '1.5'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ cursor: 'pointer', accentColor: '#1e3a8a' }}
                />
                즉시 활성화하여 사용자에게 알림 표시
              </label>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                <Megaphone size={15} />
                {submitting ? '배포 등록 중...' : '📢 공지 배포하기'}
              </button>
            </div>
          </form>

          {/* Existing Notices List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                등록된 공지사항 목록 ({notices.length})
              </span>
              <button
                type="button"
                onClick={loadNotices}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1e3a8a',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} /> 새로고침
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>
                공지 목록을 불러오는 중...
              </div>
            ) : notices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '12px' }}>
                등록된 공지사항이 없습니다. 위 폼을 통해 첫 공지를 등록해 보세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notices.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      background: n.is_active ? '#ffffff' : '#f8fafc',
                      border: n.is_active ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          background: n.is_active ? '#ecfdf5' : '#f1f5f9',
                          border: n.is_active ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                          color: n.is_active ? '#047857' : '#64748b'
                        }}>
                          {n.is_active ? '공개 중' : '비활성'}
                        </span>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8'
                        }}>
                          {n.version || 'v1.0.0'}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{n.title}</strong>
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: '#475569',
                        whiteSpace: 'pre-wrap',
                        marginBottom: '6px',
                        lineHeight: 1.4,
                        maxHeight: '60px',
                        overflow: 'hidden'
                      }}>
                        {n.content}
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        작성자: {n.author_name} • {n.created_at ? n.created_at.substring(0, 16) : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(n)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: n.is_active ? '#d97706' : '#059669',
                          cursor: 'pointer'
                        }}
                      >
                        {n.is_active ? '비활성화' : '활성화'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          background: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1.5px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
