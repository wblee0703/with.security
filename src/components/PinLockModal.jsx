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
      background: 'rgba(5, 8, 16, 0.96)',
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
          background: error ? 'rgba(244, 63, 94, 0.15)' : isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 242, 254, 0.12)',
          border: `1px solid ${error ? 'rgba(244, 63, 94, 0.4)' : isSuccess ? 'rgba(16, 185, 129, 0.4)' : 'rgba(0, 242, 254, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          transition: 'all 0.3s ease'
        }}>
          {isSuccess ? (
            <CheckCircle2 size={32} color="#10b981" />
          ) : error ? (
            <AlertCircle size={32} color="#f43f5e" />
          ) : (
            <Shield size={32} color="#00f2fe" />
          )}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
          {isSuccess ? '보안 인증 완료' : 'WithSecurity 인증'}
        </h2>
        <p style={{ fontSize: '13px', color: error ? '#f43f5e' : '#94a3b8' }}>
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
                background: filled ? (error ? '#f43f5e' : '#00f2fe') : 'rgba(255, 255, 255, 0.15)',
                boxShadow: filled ? `0 0 12px ${error ? 'rgba(244, 63, 94, 0.8)' : 'rgba(0, 242, 254, 0.8)'}` : 'none',
                border: filled ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
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
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '22px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseDown={(e) => e.currentTarget.style.background = 'rgba(0, 242, 254, 0.2)'}
              onMouseUp={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
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
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: '#00f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '22px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            지우기
          </button>
        </div>

        {/* Demo Hint */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
          * 테스트용 PIN: <span className="mono-font" style={{ color: '#00f2fe' }}>123456</span> 또는 지문 아이콘 클릭
        </div>
      </div>
    </div>
  );
}
