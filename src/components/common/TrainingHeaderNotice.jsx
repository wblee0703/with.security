import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GraduationCap, Clock, Calendar, AlertTriangle, ShieldAlert, ArrowRight, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useModalBack } from '../../services/modalBackHandler';

const getCategoryBadgeStyle = (category) => {
  const cat = String(category || '').trim();
  if (cat === 'SKHynix') {
    return { bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed', label: 'SKHynix' };
  } else if (cat === 'Samsung') {
    return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Samsung' };
  } else if (cat === 'LGD') {
    return { bg: '#fdf2f8', border: '#fbcfe8', color: '#db2777', label: 'LGD' };
  } else if (cat === '법정') {
    return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', label: '법정' };
  } else {
    return { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', label: cat || '기타' };
  }
};

const getTrainingStatus = (expiryStr) => {
  if (!expiryStr) return { text: '미등록', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', diffDays: 999 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryStr);
  exp.setHours(0, 0, 0, 0);
  if (isNaN(exp.getTime())) return { text: '날짜 오류', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', diffDays: 999 };
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { text: `만료됨 (D+${Math.abs(diffDays)}일)`, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', isExpired: true, diffDays };
  } else if (diffDays === 0) {
    return { text: 'D-Day (오늘)', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', isUrgent: true, diffDays };
  } else if (diffDays <= 7) {
    return { text: `D-${diffDays}일 [긴급]`, color: '#ef4444', bg: '#fef2f2', border: '#fecaca', isUrgent: true, diffDays };
  } else if (diffDays <= 30) {
    return { text: `D-${diffDays}일 [임박]`, color: '#d97706', bg: '#fffbeb', border: '#fde68a', isWarning: true, diffDays };
  } else {
    return { text: `D-${diffDays}일`, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', diffDays };
  }
};

export default function TrainingHeaderNotice({ currentUser, onNavigateToUserProfile, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  useModalBack(isOpen, () => setIsOpen(false), 'training-header-notice-modal');

  // Extract all trainings (multi-item support - only user-registered items)
  let allTrainings = Array.isArray(currentUser?.trainings) ? currentUser.trainings : [];
  allTrainings = allTrainings.filter(t => 
    !String(t.id || t.eduId || '').startsWith('EDU-INIT-') && 
    !String(t.id || t.eduId || '').startsWith('EDU-LEGACY-') &&
    (t.title || '').trim() !== '사내 정기 정보보안 및 안전 교육'
  );

  // Calculate statuses and sort by closest expiry date first
  const evaluatedTrainings = allTrainings.map(item => ({
    ...item,
    status: getTrainingStatus(item.expiryDate)
  })).sort((a, b) => (a.status.diffDays || 999) - (b.status.diffDays || 999));

  const expiredCount = evaluatedTrainings.filter(t => t.status.isExpired).length;
  const urgentCount = evaluatedTrainings.filter(t => t.status.isUrgent).length;
  const warningCount = evaluatedTrainings.filter(t => t.status.isWarning).length;
  const attentionCount = expiredCount + urgentCount + warningCount;

  // 만료 30일 이내(만료됨, 7일 이내 긴급, 30일 이내 만료예정) 항목이 없으면 헤더 아이콘 숨김
  if (attentionCount === 0) {
    return null;
  }

  // Header button style determination
  let btnBg = '#fffbeb';
  let btnBorder = '#fde68a';
  let btnColor = '#d97706';
  let badgeColor = '#d97706';

  if (expiredCount > 0) {
    btnBg = '#fef2f2';
    btnBorder = '#fecaca';
    btnColor = '#dc2626';
    badgeColor = '#dc2626';
  } else if (urgentCount > 0) {
    btnBg = '#fef2f2';
    btnBorder = '#fecaca';
    btnColor = '#ef4444';
    badgeColor = '#ef4444';
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Header Notification Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="교육 수료 및 만료 일정 확인"
        style={{
          position: 'relative',
          padding: compact ? '5px 7px' : '6px 10px',
          borderRadius: '8px',
          background: btnBg,
          border: `1.5px solid ${btnBorder}`,
          color: btnColor,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s ease',
          fontSize: '11px',
          fontWeight: '800'
        }}
      >
        <GraduationCap size={compact ? 16 : 17} />
        {!compact && <span>교육 현황</span>}

        {/* Attention Badge Dot or Count */}
        {badgeColor ? (
          <span style={{
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '10px',
            background: badgeColor,
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: `0 2px 4px ${badgeColor}60`
          }}>
            {attentionCount}
          </span>
        ) : (
          evaluatedTrainings.length > 0 && (
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              color: '#1e3a8a',
              background: '#dbeafe',
              borderRadius: '8px',
              padding: '1px 5px'
            }}>
              {evaluatedTrainings.length}
            </span>
          )
        )}
      </button>

      {/* Expiry Details Popover Modal (Mounted directly to document.body via Portal) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '85vh',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            {/* Popover Header */}
            <div style={{
              padding: '14px 18px',
              background: '#f8fafc',
              borderBottom: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(30, 58, 138, 0.08)',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>교육 수료 및 만료 현황</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e3a8a', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1px 6px' }}>
                      총 {evaluatedTrainings.length}건
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    {currentUser ? `${currentUser.name} ${currentUser.rank || ''} (${currentUser.team || currentUser.division || '임직원'})` : '사용자'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '5px',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Popover Scrollable Body */}
            <div
              className="custom-scrollbar"
              style={{
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '390px',
                flex: 1
              }}
            >
              {/* Status Alert Banner if any expiring */}
              {expiredCount > 0 ? (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#dc2626',
                  fontWeight: '700'
                }}>
                  <ShieldAlert size={16} color="#dc2626" flexShrink={0} />
                  <span>만료된 교육이 <strong>{expiredCount}건</strong> 있습니다. 즉시 재이수가 필요합니다.</span>
                </div>
              ) : urgentCount > 0 ? (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#ef4444',
                  fontWeight: '700'
                }}>
                  <AlertTriangle size={16} color="#ef4444" flexShrink={0} />
                  <span>만료 7일 이내 긴급 교육이 <strong>{urgentCount}건</strong> 있습니다.</span>
                </div>
              ) : warningCount > 0 ? (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#d97706',
                  fontWeight: '700'
                }}>
                  <Clock size={16} color="#d97706" flexShrink={0} />
                  <span>만료 30일 이내 도래 교육이 <strong>{warningCount}건</strong> 있습니다.</span>
                </div>
              ) : evaluatedTrainings.length > 0 ? (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: '#047857',
                  fontWeight: '700'
                }}>
                  <CheckCircle2 size={15} color="#047857" />
                  <span>모든 등록된 보안 및 안전 교육 기한이 안전합니다.</span>
                </div>
              ) : null}

              {/* Training List */}
              {evaluatedTrainings.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <GraduationCap size={28} color="#94a3b8" />
                  <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b' }}>
                    등록된 교육 수료 내역이 없습니다.
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    사용자 정보 탭에서 사내/사업장 교육을 등록해 주세요.
                  </span>
                </div>
              ) : (
                evaluatedTrainings.map((item, idx) => {
                  const catStyle = getCategoryBadgeStyle(item.category);
                  const st = item.status;
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: st.isExpired ? '#fef2f2' : (st.isUrgent ? '#fef2f2' : (st.isWarning ? '#fffbeb' : '#ffffff')),
                        border: `1.5px solid ${st.border}`,
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: catStyle.bg,
                            border: `1px solid ${catStyle.border}`,
                            color: catStyle.color
                          }}>
                            {catStyle.label}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                            {item.title}
                          </span>
                        </div>

                        {/* Real-time D-Day Badge */}
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                          flexShrink: 0
                        }}>
                          {st.text}
                        </span>
                      </div>

                      {/* Dates */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Calendar size={11} /> 수료: {item.completionDate || '-'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: st.color, fontWeight: '700' }}>
                          <Clock size={11} /> 만료: {item.expiryDate || '-'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Popover Footer Button */}
            <div style={{
              padding: '12px 18px',
              background: '#f8fafc',
              borderTop: '1.5px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                만료 30일/7일 전 알림 제공
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigateToUserProfile) onNavigateToUserProfile('userProfile');
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  background: '#1e3a8a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)'
                }}
              >
                <span>교육 관리 바로가기</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
