import React, { useState, useEffect } from 'react';
import { QrCode, Shield, MapPin, Building, User, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function AccessPassTab({ onTriggerToast }) {
  const [gate, setGate] = useState('main'); // main, rnd, datacenter
  const [timeLeft, setTimeLeft] = useState(30);
  const [qrSeed, setQrSeed] = useState(102938);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setQrSeed(Math.floor(100000 + Math.random() * 900000));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshQR = () => {
    setQrSeed(Math.floor(100000 + Math.random() * 900000));
    setTimeLeft(30);
    onTriggerToast('보안 QR 코드가 새 토큰으로 갱신되었습니다.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Gate Selector */}
      <div style={{
        display: 'flex',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '4px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {[
          { id: 'main', label: '본사 정문 게이트' },
          { id: 'rnd', label: 'R&D 연구소' },
          { id: 'datacenter', label: '데이터센터 B2' }
        ].map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGate(g.id);
              onTriggerToast(`${g.label} 출입 게이트가 선택되었습니다.`);
            }}
            style={{
              flex: 1,
              padding: '8px 6px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              background: gate === g.id ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: gate === g.id ? '#00f2fe' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Main Employee Pass Card */}
      <div className="glass-panel" style={{
        padding: '24px 20px',
        background: 'linear-gradient(145deg, rgba(16, 24, 40, 0.9) 0%, rgba(10, 18, 32, 0.95) 100%)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        borderRadius: '24px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 242, 254, 0.1)',
        position: 'relative'
      }}>
        {/* Hologram Badge effect */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10px',
          fontWeight: '700',
          color: '#00f2fe',
          background: 'rgba(0, 242, 254, 0.1)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          <Shield size={12} /> SECURE ID
        </div>

        {/* Employee Info Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '800',
            color: '#050b14',
            boxShadow: '0 4px 12px rgba(0, 242, 254, 0.3)'
          }}>
            김보안
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
              김보안 수석연구원
            </h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={13} color="#00f2fe" />
              <span>정보보안실 Cyber Defense Team</span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }} className="mono-font">
              ID: EMP-2026-0892 | Level 4 Clear
            </div>
          </div>
        </div>

        {/* QR Code Canvas Simulation */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          position: 'relative',
          margin: '0 auto',
          maxWidth: '240px'
        }}>
          {/* Animated Scanning Line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #00f2fe, transparent)',
            boxShadow: '0 0 10px #00f2fe',
            animation: 'scanline 2s infinite ease-in-out'
          }} />

          <div style={{
            width: '170px',
            height: '170px',
            background: `repeating-conic-gradient(#080d1a 0% 25%, #ffffff 0% 50%) 50% / ${15 + (qrSeed % 10)}px ${15 + (qrSeed % 10)}px`,
            borderRadius: '12px',
            border: '8px solid #ffffff',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
          }} />

          {/* Dynamic OTP Code under QR */}
          <div className="mono-font" style={{
            marginTop: '12px',
            fontSize: '16px',
            fontWeight: '800',
            color: '#080d1a',
            letterSpacing: '2px'
          }}>
            {qrSeed}
          </div>
        </div>

        {/* Timer Bar */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            <Clock size={14} color="#00f2fe" />
            <span>QR 코드 자동 갱신까지: <strong className="mono-font" style={{ color: '#00f2fe' }}>{timeLeft}초</strong></span>
          </div>

          <button 
            onClick={refreshQR}
            className="glass-button"
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={12} /> 수동 즉시 갱신
          </button>
        </div>
      </div>

      {/* Access History */}
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>
        최근 게이트 출입 이력
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { time: '14:22 오늘', gate: '본사 정문 A스피드게이트', status: '승인' },
          { time: '09:05 오늘', gate: 'R&D 연구소 보안통제실', status: '승인' },
          { time: '18:40 어제', gate: '본사 지하 주차장 3층', status: '승인' }
        ].map((item, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={16} color="#10b981" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{item.gate}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{item.time}</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>{item.status}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
