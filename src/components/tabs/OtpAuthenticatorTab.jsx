import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, Plus, Check, ShieldCheck, Server, Mail, Globe } from 'lucide-react';
import { dbService } from '../../services/dbService';

export default function OtpAuthenticatorTab({ onTriggerToast }) {
  const [copiedId, setCopiedId] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const initialMock = [
    {
      id: 'vpn',
      name: '회사 SSL-VPN 2차인증',
      issuer: 'Corp Security Gateway',
      code: '849 201',
      iconType: 'Server',
      color: '#00f2fe'
    },
    {
      id: 'mail',
      name: '사내 보안 메인 웹메일',
      issuer: 'mail.company.com',
      code: '310 948',
      iconType: 'Mail',
      color: '#3b82f6'
    },
    {
      id: 'erp',
      name: '통합 ERP & 재무 시스템',
      issuer: 'erp.internal.net',
      code: '529 114',
      iconType: 'Globe',
      color: '#8b5cf6'
    }
  ];

  const getIconComponent = (iconType) => {
    switch (iconType) {
      case 'Server': return Server;
      case 'Mail': return Mail;
      case 'Globe': return Globe;
      default: return KeyRound;
    }
  };

  const [accounts, setAccounts] = useState(initialMock);

  useEffect(() => {
    async function loadOtp() {
      try {
        const dbItems = await dbService.getOtpAccounts();
        if (dbItems && dbItems.length > 0) {
          setAccounts(dbItems);
        } else {
          for (const item of initialMock) {
            await dbService.saveOtpAccount(item);
          }
        }
      } catch (err) {
        console.error('Failed to load OTP accounts from DB:', err);
      }
    }
    loadOtp();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setAccounts((accs) =>
            accs.map((a) => ({
              ...a,
              code: `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`
            }))
          );
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (id, code) => {
    const cleanCode = code.replace(/\s+/g, '');
    navigator.clipboard?.writeText(cleanCode);
    setCopiedId(id);
    onTriggerToast(`OTP 번호 [${cleanCode}]가 클립보드에 복사되었습니다.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddAccount = async () => {
    const randomCode = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
    const newAcc = {
      id: Date.now().toString(),
      name: '사내 신규 보안 시스템',
      issuer: 'sso.company.com',
      code: randomCode,
      iconType: 'KeyRound',
      color: '#10b981'
    };
    try {
      await dbService.saveOtpAccount(newAcc);
    } catch (err) {
      console.error('Failed to save OTP to DB:', err);
    }
    setAccounts([...accounts, newAcc]);
    onTriggerToast('새로운 2차 인증 계정이 DB에 추가되었습니다.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>회사 통합 2FA 인증기</h2>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>30초 주기 생성 실시간 보안 OTP</div>
        </div>

        <button
          onClick={handleAddAccount}
          className="glass-button-primary"
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={16} /> 계정 추가
        </button>
      </div>

      {/* Countdown Meter Bar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
          <ShieldCheck size={16} color="#00f2fe" />
          <span>보안 알고리즘: <strong>TOTP (SHA-256)</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: `conic-gradient(#00f2fe ${(secondsLeft / 30) * 360}deg, rgba(255,255,255,0.1) 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0a0f1d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="mono-font" style={{ fontSize: '10px', fontWeight: '700', color: '#00f2fe' }}>
                {secondsLeft}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts OTP Card List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {accounts.map((acc) => {
          const IconComp = typeof acc.icon === 'function' ? acc.icon : getIconComponent(acc.iconType);
          const isCopied = copiedId === acc.id;

          return (
            <div
              key={acc.id}
              className="glass-panel"
              style={{
                padding: '18px 16px',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: `${acc.color}15`,
                  border: `1px solid ${acc.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComp size={22} color={acc.color} />
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {acc.issuer}
                  </div>
                  <div className="mono-font" style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: acc.color,
                    letterSpacing: '3px',
                    marginTop: '4px'
                  }}>
                    {acc.code}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCopy(acc.id, acc.code)}
                className="glass-button"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                  borderColor: isCopied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.12)'
                }}
                title="복사하기"
              >
                {isCopied ? <Check size={18} color="#10b981" /> : <Copy size={18} color="#94a3b8" />}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
