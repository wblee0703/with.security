import React from 'react';
import { AlertTriangle, ShieldAlert, GraduationCap, Calendar, Clock, ArrowRight, X } from 'lucide-react';
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

export default function TrainingExpiryModal({
  isOpen,
  onClose,
  onGoToSettings,
  currentUser
}) {
  useModalBack(isOpen, onClose, 'training-expiry-modal');

  if (!isOpen || !currentUser) return null;

  // Extract all trainings (multi-item support + backwards compatibility fallback)
  let allTrainings = Array.isArray(currentUser.trainings) ? currentUser.trainings : [];
  if (allTrainings.length === 0 && (currentUser.educationExpiryDate || currentUser.educationDate)) {
    allTrainings = [{
      id: 'legacy-1',
      category: '법정',
      title: currentUser.educationName || '사내 정기 정보보안 및 안전 교육',
      completionDate: currentUser.educationDate || '',
      expiryDate: currentUser.educationExpiryDate || '',
      memo: ''
    }];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Evaluate expiring training items (30 days or less, including expired)
  const evaluatedItems = allTrainings.map(t => {
    if (!t.expiryDate) return null;
    const exp = new Date(t.expiryDate);
    exp.setHours(0, 0, 0, 0);
    if (isNaN(exp.getTime())) return null;

    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    const isExpired = diffDays < 0;
    const isUrgent = diffDays >= 0 && diffDays <= 7;
    const isWarning = diffDays > 7 && diffDays <= 30;

    if (isExpired || isUrgent || isWarning) {
      return {
        ...t,
        diffDays,
        isExpired,
        isUrgent,
        isWarning
      };
    }
    return null;
  }).filter(Boolean);

  if (evaluatedItems.length === 0) return null;

  // Highest severity level
  const hasExpired = evaluatedItems.some(i => i.isExpired);
  const hasUrgent = evaluatedItems.some(i => i.isUrgent);

  const themeColor = hasExpired ? '#dc2626' : (hasUrgent ? '#ef4444' : '#f59e0b');

  const handleDismissToday = () => {
    try {
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const uid = currentUser.username || currentUser.name || 'default';
      localStorage.setItem(`with_security_training_alert_dismissed_${uid}`, todayStr);
    } catch (e) {}
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      zIndex: 20000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 24px) 16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '490px',
        maxHeight: '90vh',
        borderRadius: '20px',
        background: '#ffffff',
        border: `2px solid ${themeColor}`,
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Bar */}
        <div style={{
          background: `linear-gradient(135deg, ${themeColor} 0%, ${hasExpired ? '#991b1b' : (hasUrgent ? '#b91c1c' : '#d97706')} 100%)`,
          padding: '16px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              flexShrink: 0
            }}>
              {hasExpired ? <ShieldAlert size={22} color="#ffffff" /> : <AlertTriangle size={22} color="#ffffff" />}
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.5px' }}>
                {hasExpired ? '보안 교육 만료' : (hasUrgent ? '보안 교육 만료 7일 전 [긴급]' : '보안 교육 만료 30일 전 안내')}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px' }}>
                사내/사업장 안전·보안 교육 만료 안내 ({evaluatedItems.length}건)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
          {/* User Info Line */}
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700' }}>
            대상자: <strong style={{ color: '#0f172a' }}>{currentUser.name} {currentUser.rank || ''}</strong> ({currentUser.team || currentUser.division || '임직원'})
          </div>

          {/* List of Expiring Training Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {evaluatedItems.map((item, idx) => {
              const catStyle = getCategoryBadgeStyle(item.category);
              const badgeColor = item.isExpired ? '#dc2626' : (item.isUrgent ? '#ef4444' : '#d97706');
              const badgeBg = item.isExpired ? '#fef2f2' : (item.isUrgent ? '#fef2f2' : '#fffbeb');
              const badgeBorder = item.isExpired ? '#fecaca' : (item.isUrgent ? '#fecaca' : '#fde68a');

              return (
                <div
                  key={item.id || idx}
                  style={{
                    background: badgeBg,
                    border: `1.5px solid ${badgeBorder}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        background: catStyle.bg,
                        border: `1px solid ${catStyle.border}`,
                        color: catStyle.color
                      }}>
                        {catStyle.label}
                      </span>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                        {item.title}
                      </strong>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '900',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: badgeColor,
                      color: '#ffffff',
                      flexShrink: 0
                    }}>
                      {item.isExpired ? '만료됨' : (item.diffDays === 0 ? 'D-Day (오늘)' : `D-${item.diffDays}일`)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={11} color="#64748b" />
                      수료일: {item.completionDate || '-'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '800', color: badgeColor }}>
                      <Clock size={11} color={badgeColor} />
                      만료일: {item.expiryDate || '-'}
                    </span>
                    {item.memo && <span style={{ color: '#64748b' }}>({item.memo})</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guide Note */}
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            {hasExpired ? (
              <span style={{ color: '#dc2626', fontWeight: '800' }}>
                ⚠️ 유효기간이 만료된 교육이 있습니다. 안전한 사업장 출입 및 보안 권한 유지를 위해 교육을 재이수하고 수료일을 갱신해 주세요.
              </span>
            ) : hasUrgent ? (
              <span>
                🚨 만료일이 <strong>7일 이내</strong>인 교육이 있습니다. 기한 내에 해당 교육을 이수하고 갱신하시기 바랍니다.
              </span>
            ) : (
              <span>
                💡 만료일이 <strong>30일 이내</strong>인 교육이 있습니다. 정기 교육 일정을 확인하고 수료일을 갱신해 주세요.
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderTop: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={handleDismissToday}
            style={{
              padding: '9px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            오늘 하루 보지 않기
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onGoToSettings) onGoToSettings();
              }}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: themeColor,
                border: 'none',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: `0 3px 10px ${themeColor}40`
              }}
            >
              <span>교육 관리로 이동</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
