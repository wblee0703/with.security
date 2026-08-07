import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Wifi, 
  Lock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Radio,
  Zap,
  ChevronRight
} from 'lucide-react';

export default function DashboardTab({ onTriggerToast, platform }) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState('방금 전');
  const [securityScore, setSecurityScore] = useState(98);

  const handleScan = () => {
    setIsScanning(true);
    onTriggerToast('단말기 바이러스 및 탈옥/루팅 정밀 검사를 시작합니다...');
    
    setTimeout(() => {
      setIsScanning(false);
      setLastScanTime('방금 전 (100% 안전)');
      setSecurityScore(98);
      onTriggerToast('보안 점검 완료! 위협 요소가 발견되지 않았습니다.');
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Platform Indicator Banner */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
          <Smartphone size={16} color="#00f2fe" />
          <span>감지된 단말 OS: <strong style={{ color: '#fff' }}>{platform === 'ios' ? 'Apple iOS 17.5.1' : 'Android 14 (SAMSUNG One UI 6.1)'}</strong></span>
        </div>
        <span className="badge-secure" style={{ fontSize: '11px', padding: '2px 8px' }}>
          호환 완료
        </span>
      </div>

      {/* Main Score Hero Card */}
      <div className="glass-panel" style={{
        padding: '24px 20px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 25, 47, 0.8) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow accent in background */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(0, 242, 254, 0.15)',
          filter: 'blur(30px)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#00f2fe', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Company Device Audit
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>
              디바이스 보안 상태
            </h1>
          </div>

          <button 
            onClick={handleScan}
            disabled={isScanning}
            className="glass-button"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <RefreshCw size={14} className={isScanning ? 'animate-radar' : ''} color="#00f2fe" />
            {isScanning ? '검사 중...' : '검사하기'}
          </button>
        </div>

        {/* Circular Gauge / Score Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'conic-gradient(#00f2fe 0% 98%, rgba(255,255,255,0.1) 98% 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.2)'
          }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: '#0a0f1d',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="mono-font" style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>
                {securityScore}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>/ 100점</span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span className="badge-secure">
                <CheckCircle size={12} /> 최고 보안 수준
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
              사내 보안 정책 준수율 100%. 악성코드 및 탈옥 위험 요소 없음.
            </p>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              최근 검사: {lastScanTime}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Checklist Grid */}
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', marginTop: '4px' }}>
        실시간 무결성 점검 항목
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Item 1 */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <ShieldCheck size={20} color="#10b981" />
            <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>정상</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>루팅/탈옥 감지</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>무결성 서명 확인됨</div>
        </div>

        {/* Item 2 */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Lock size={20} color="#00f2fe" />
            <span style={{ fontSize: '10px', color: '#00f2fe', background: 'rgba(0,242,254,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>보호됨</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>단말기 암호화</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>AES-256 저장소</div>
        </div>

        {/* Item 3 */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Wifi size={20} color="#3b82f6" />
            <span style={{ fontSize: '10px', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>WPA3</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>사내 Wi-Fi</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Corp-Enterprise-5G</div>
        </div>

        {/* Item 4 */}
        <div className="glass-panel" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Radio size={20} color="#8b5cf6" />
            <span style={{ fontSize: '10px', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>최신</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>보안 패치</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>v2026.08 버전</div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="glass-panel-cyan" style={{ padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#00f2fe" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>긴급 단말 락다운 (Remote Lock)</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>분실 또는 위협 발생 시 1초 내 사내 데이터 차단</div>
          </div>
        </div>
        <button 
          onClick={() => onTriggerToast('원격 보안 차단 모드가 활성화되었습니다.')}
          style={{
            background: 'none',
            border: 'none',
            color: '#00f2fe',
            cursor: 'pointer'
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

    </div>
  );
}
