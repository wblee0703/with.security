import React, { useState } from 'react';
import { AlertOctagon, Send, ShieldAlert, Wifi, CheckCircle2, Bell, ChevronRight, FileWarning } from 'lucide-react';
import { dbService } from '../../services/dbService';

export default function IncidentReportTab({ onTriggerToast }) {
  const [reportType, setReportType] = useState('phishing');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      onTriggerToast('신고 상세 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    const newIncident = {
      id: `SOC-INC-${Date.now()}`,
      reportType,
      description,
      reportedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
      status: 'SOC 관제팀 접수완료'
    };

    try {
      await dbService.saveIncident(newIncident);
    } catch (err) {
      console.error('Failed to save incident to DB:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      onTriggerToast('보안 관제 센터(SOC)로 긴급 위협 신고가 제출되어 DB에 보관되었습니다!');
      setTimeout(() => {
        setSubmitted(false);
        setDescription('');
      }, 3000);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        borderRadius: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <ShieldAlert size={26} color="#f43f5e" />
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>사내 보안 위협 신고 (SOC)</h2>
        </div>
        <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
          의심스러운 악성 이메일, 파밍 사이트, 미인가 단말 접근 발견 시 24시간 보안 관제 센터에 즉시 신고하세요.
        </p>
      </div>

      {/* Incident Report Form */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>
          위협 유형 선택
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { id: 'phishing', label: '피싱 메일/SMS' },
            { id: 'wifi', label: '의심스러운 Wi-Fi' },
            { id: 'malware', label: '악성코드/파일' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id)}
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                border: reportType === t.id ? '1px solid #f43f5e' : '1px solid rgba(255,255,255,0.08)',
                background: reportType === t.id ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.03)',
                color: reportType === t.id ? '#f43f5e' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
              상세 신고 내용 (URL, 발신자 메일 주소 등)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: [긴급] 계정 재인증 요청 제목으로 사칭 이메일 수신 (URL: http://phishing-fake.com)"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(5, 8, 16, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || submitted}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              background: submitted ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              border: 'none',
              color: '#fff',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: submitted ? '0 4px 16px rgba(16, 185, 129, 0.4)' : '0 4px 16px rgba(244, 63, 94, 0.4)'
            }}
          >
            {submitted ? (
              <>
                <CheckCircle2 size={18} /> 접수 완료되었습니다
              </>
            ) : (
              <>
                <Send size={16} /> {isSubmitting ? '전송 중...' : '보안관제실에 1초 긴급 신고'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Security Notices */}
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Bell size={14} color="#00f2fe" /> 사내 보안 공지사항
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { title: '[필수] 8월 사내 계정 비밀번호 주기적 변경 지침', date: '2026.08.01', urgent: true },
          { title: '사외 네트워크 접속 시 SSL-VPN 필수 사용 안내', date: '2026.07.25', urgent: false },
          { title: 'Android 14 & iOS 17 보안 업데이트 권고', date: '2026.07.20', urgent: false }
        ].map((notice, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {notice.urgent && <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}>긴급</span>}
                {notice.title}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{notice.date}</div>
            </div>
            <ChevronRight size={16} color="#64748b" />
          </div>
        ))}
      </div>

    </div>
  );
}
