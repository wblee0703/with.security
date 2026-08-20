import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { useModalBack } from '../../services/modalBackHandler';
import { Capacitor } from '@capacitor/core';

export default function ExitConfirmModal({ isOpen, onClose }) {
  useModalBack(isOpen, onClose, 'app-exit-confirm-modal');

  if (!isOpen) return null;

  const handleConfirmExit = () => {
    window.__allowAppExit = true;
    onClose();

    // 1. Android / iOS Native Capacitor App
    if (Capacitor.isNativePlatform()) {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
          window.Capacitor.Plugins.App.exitApp();
          return;
        }
      } catch (e) {
        console.warn('Capacitor.App.exitApp error:', e);
      }
      try {
        if (navigator.app && typeof navigator.app.exitApp === 'function') {
          navigator.app.exitApp();
          return;
        }
      } catch (e) { }
    }

    // 2. Web Browser (모바일 모드 / 웹 모드)
    try {
      window.close();
    } catch (e) { }

    // Fallback: If window.close() is blocked by browser security policy, go back
    setTimeout(() => {
      try {
        window.history.go(-2);
      } catch (e) { }
    }, 100);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px 20px 20px 20px',
          width: '100%',
          maxWidth: '340px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'scaleUp 0.2s ease-out',
          boxSizing: 'border-box'
        }}
      >
        {/* Warning Icon Badge */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1.5px solid #fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
          }}
        >
          <LogOut size={24} />
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '17px',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 8px 0',
            letterSpacing: '-0.3px'
          }}
        >
          정말 종료하시겠습니까?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            lineHeight: '1.5',
            margin: '0 0 20px 0',
            wordBreak: 'keep-all'
          }}
        >
          확인을 누르면 페이지를 벗어나며, 취소를 누르면 현재 작업 화면이 유지됩니다.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            width: '100%'
          }}
        >
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            취소
          </button>

          {/* Confirm Exit Button */}
          <button
            type="button"
            onClick={handleConfirmExit}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
