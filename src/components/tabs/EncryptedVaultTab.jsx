import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Copy, Plus, ShieldCheck, Key, FileText, Check } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { encryptData, decryptData } from '../../services/cryptoUtil';

export default function EncryptedVaultTab({ onTriggerToast }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [revealedIds, setRevealedIds] = useState({});

  const initialMock = [
    {
      id: '1',
      title: '사내 보안 Wi-Fi WPA3 암호',
      category: 'Network',
      secret: 'Secured_Corp_2026!#Key',
      lastModified: '2026-08-01'
    },
    {
      id: '2',
      title: 'AWS Cloud Admin API Token',
      category: 'API Key',
      secret: 'ak_live_89a3f2e109bc48d7a1e',
      lastModified: '2026-07-28'
    },
    {
      id: '3',
      title: '긴급 시스템 복구 마스터 PGP 키',
      category: 'Master Key',
      secret: 'PGP-KEY-9021-X992-SECURE-ALPHA',
      lastModified: '2026-08-05'
    }
  ];

  const [vaultItems, setVaultItems] = useState(initialMock);

  useEffect(() => {
    async function loadVault() {
      try {
        const dbItems = await dbService.getVaultItems();
        if (dbItems && dbItems.length > 0) {
          setVaultItems(dbItems);
        } else {
          for (const item of initialMock) {
            const encryptedSecret = await encryptData(item.secret);
            await dbService.saveVaultItem({ ...item, secret: encryptedSecret });
          }
        }
      } catch (err) {
        console.error('Failed to load vault from DB:', err);
      }
    }
    loadVault();
  }, []);


  const toggleReveal = (id) => {
    if (!isUnlocked) {
      onTriggerToast('기밀 정보를 보려면 먼저 마스터 해제(생체 인증)를 진행하세요.');
      return;
    }
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (index, secret) => {
    if (!isUnlocked) {
      onTriggerToast('마스터 인증 후 복사가 가능합니다.');
      return;
    }
    navigator.clipboard?.writeText(secret);
    setCopiedIndex(index);
    onTriggerToast('암호화 키가 복사되었습니다.');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleMasterAuth = () => {
    setIsUnlocked(true);
    onTriggerToast('마스터 생체 인증 성공: 암호화 보관함이 해제되었습니다.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Vault Master Lock Status Banner */}
      <div className={isUnlocked ? 'glass-panel-cyan' : 'glass-panel'} style={{
        padding: '16px 20px',
        borderRadius: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: isUnlocked ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={20} color={isUnlocked ? '#00f2fe' : '#94a3b8'} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {isUnlocked ? '보관함 잠금 해제됨 (AES-256)' : '암호화 보관함 잠김'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {isUnlocked ? '마스터 키로 인메모리 복호화 실행 중' : '기밀 노출 방지를 위해 잠금 상태 유지 중'}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (isUnlocked) {
              setIsUnlocked(false);
              setRevealedIds({});
              onTriggerToast('보관함이 안전하게 다시 잠겼습니다.');
            } else {
              handleMasterAuth();
            }
          }}
          className={isUnlocked ? 'glass-button' : 'glass-button-primary'}
          style={{
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '11px'
          }}
        >
          {isUnlocked ? '다시 잠그기' : '마스터 해제'}
        </button>
      </div>

      {/* Vault List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1' }}>저장된 기밀 자산 ({vaultItems.length})</h3>
        <button
          onClick={async () => {
            if (!isUnlocked) {
              onTriggerToast('마스터 인증 후 새 항목을 추가할 수 있습니다.');
              return;
            }
            const rawSecret = 'db_pass_2026_x88912';
            const encryptedSecret = await encryptData(rawSecret);
            const newItem = {
              id: Date.now().toString(),
              title: '신규 DB 접근 세션 토큰',
              category: 'Database',
              secret: encryptedSecret,
              lastModified: '오늘'
            };
            try {
              await dbService.saveVaultItem(newItem);
            } catch (err) {
              console.error('Failed to save vault item to DB:', err);
            }
            setVaultItems([...vaultItems, newItem]);
            onTriggerToast('새 암호화 기밀 항목이 DB에 저장되었습니다.');
          }}
          className="glass-button"
          style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={14} /> 추가
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {vaultItems.map((item, idx) => {
          const isRevealed = revealedIds[item.id];
          const isCopied = copiedIndex === idx;

          return (
            <div key={item.id} className="glass-panel" style={{ padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#00f2fe', background: 'rgba(0,242,254,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                  {item.category}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>수정일: {item.lastModified}</span>
              </div>

              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                {item.title}
              </div>

              {/* Masked / Unmasked Password Display */}
              <div style={{
                background: 'rgba(5, 8, 16, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span className="mono-font" style={{ fontSize: '13px', color: isUnlocked && isRevealed ? '#10b981' : '#64748b', letterSpacing: '1px' }}>
                  {isUnlocked && isRevealed ? item.secret : '••••••••••••••••••••'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => toggleReveal(item.id)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title={isRevealed ? '숨기기' : '보기'}
                  >
                    {isRevealed ? <EyeOff size={16} color="#00f2fe" /> : <Eye size={16} />}
                  </button>

                  <button
                    onClick={() => handleCopy(idx, item.secret)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title="복사"
                  >
                    {isCopied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
