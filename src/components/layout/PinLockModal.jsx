import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PinLockModal({ isLocked, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBioScanning, setIsBioScanning] = useState(false);

  const CORRECT_PIN = '123456';

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 6) {
        if (newPin === CORRECT_PIN) {
          triggerSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleBiometricAuth = () => {
    setIsBioScanning(true);
    setTimeout(() => {
      setIsBioScanning(false);
      triggerSuccess();
    }, 1200);
  };

  const triggerSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setPin('');
      onUnlock();
    }, 600);
  };

  if (!isLocked) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(24px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '40px 24px 32px 24px'
    }}>
      {/* Top Header info */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: error ? 'rgba(244, 63, 94, 0.12)' : isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(14, 165, 233, 0.12)',
          border: `1px solid ${error ? 'rgba(244, 63, 94, 0.4)' : isSuccess ? 'rgba(16, 185, 129, 0.4)' : 'rgba(14, 165, 233, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          transition: 'all 0.3s ease'
        }}>
          {isSuccess ? (
            <CheckCircle2 size={32} color="#059669" />
          ) : error ? (
            <AlertCircle size={32} color="#e11d48" />
          ) : (
            <Shield size={32} color="#0284c7" />
          )}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
          {isSuccess ? '보안 인증 완료' : 'WithSecurity 인증'}
        </h2>
        <p style={{ fontSize: '13px', color: error ? '#e11d48' : '#64748b' }}>
          {error ? '잘못된 PIN 번호입니다 (테스트 PIN: 123456)' : '생체 인증 또는 보안 PIN 6자리를 입력하세요'}
        </p>
      </div>

      {/* PIN Dots Indicator */}
      <div style={{ display: 'flex', gap: '14px', margin: '24px 0' }}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const filled = pin.length > idx;
          return (
            <div
              key={idx}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: filled ? (error ? '#e11d48' : '#0284c7') : '#f1f5f9',
                boxShadow: filled ? `0 0 10px ${error ? 'rgba(225, 29, 72, 0.5)' : 'rgba(2, 132, 199, 0.5)'}` : 'none',
                border: filled ? 'none' : '1px solid #cbd5e1',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          );
        })}
      </div>

      {/* Keypad */}
      <div style={{ width: '100%', maxWidth: '280px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              style={{
                height: '64px',
                borderRadius: '50%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontSize: '22px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
              }}
              onMouseDown={(e) => e.currentTarget.style.background = '#e0f2fe'}
              onMouseUp={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              {num}
            </button>
          ))}

          {/* Biometric trigger */}
          <button
            onClick={handleBiometricAuth}
            style={{
              height: '64px',
              borderRadius: '50%',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
            title="Face ID / Touch ID"
          >
            <Fingerprint size={26} className={isBioScanning ? 'animate-pulse-glow' : ''} />
          </button>

          {/* Zero */}
          <button
            onClick={() => handleKeyPress('0')}
            style={{
              height: '64px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '22px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            0
          </button>

          {/* Backspace */}
          <button
            onClick={handleDelete}
            style={{
              height: '64px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            지우기
          </button>
        </div>

        {/* Demo Hint */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
          * 테스트용 PIN: <span className="mono-font" style={{ color: '#0284c7', fontWeight: '700' }}>123456</span> 또는 지문 아이콘 클릭
        </div>
      </div>
    </div>
  );
}
