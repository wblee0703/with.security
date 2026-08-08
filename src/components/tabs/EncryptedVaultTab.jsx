import React, { useState, useEffect } from 'react';
import { Settings, Building2, Plus, Trash2, Shield } from 'lucide-react';
import { dbService } from '../../services/dbService';

export default function EncryptedVaultTab({ onTriggerToast }) {
  const [sites, setSites] = useState([]);
  const [newSiteForm, setNewSiteForm] = useState({ name: '', category: '삼성전자', note: '' });

  const loadSites = async () => {
    try {
      const siteList = await dbService.getSites();
      setSites(siteList);
    } catch (err) {
      console.error('Failed to load entrance sites:', err);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!newSiteForm.name.trim()) {
      if (onTriggerToast) onTriggerToast('사업장 위치를 입력해 주세요.', 'warning');
      return;
    }
    const companyName = newSiteForm.category.trim() || '기타';
    const siteLocation = newSiteForm.name.trim();
    const fullSiteName = siteLocation.includes(companyName) ? siteLocation : `${companyName} ${siteLocation}`;

    const newSite = {
      id: `SITE-${Date.now()}`,
      name: fullSiteName,
      category: companyName,
      note: newSiteForm.note.trim() || '관리자 등록 사업장'
    };
    await dbService.saveSite(newSite);
    await loadSites();
    setNewSiteForm({ name: '', category: '삼성전자', note: '' });
    if (onTriggerToast) onTriggerToast(`'${newSite.name}' 사업장이 등록되었습니다.`, 'success');
  };

  const handleDeleteSite = async (siteId, siteName) => {
    if (sites.length <= 1) {
      if (onTriggerToast) onTriggerToast('최소 1개 이상의 출입 사업장이 등록되어 있어야 합니다.', 'warning');
      return;
    }
    await dbService.deleteSite(siteId);
    await loadSites();
    if (onTriggerToast) onTriggerToast(`'${siteName}' 사업장이 삭제되었습니다.`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0, 242, 254, 0.4)'
            }}>
              <Settings size={24} color="#00f2fe" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                출입 대상 사업장 통합 관리 (Admin)
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                보안 서약 신청 및 출입 수속 시 선택할 수 있는 사업장을 등록/삭제합니다.
              </div>
            </div>
          </div>
          <span className="badge-secure" style={{ fontSize: '11px' }}>
            <Shield size={13} /> ADMIN CONSOLE
          </span>
        </div>
      </div>

      {/* Add New Site Card Form */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#00f2fe', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> 신규 출입 사업장 등록
        </div>

        <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1:1 ratio Grid for Company Name and Site Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                분류 / 회사명 *
              </label>
              <input
                type="text"
                placeholder="예: 삼성전자, SK하이닉스, 위드보안"
                value={newSiteForm.category}
                onChange={(e) => setNewSiteForm({ ...newSiteForm, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#0a0f1d',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                사업장 위치 *
              </label>
              <input
                type="text"
                placeholder="예: 평택캠퍼스 P4 라인, 이천 M16 라인"
                value={newSiteForm.name}
                onChange={(e) => setNewSiteForm({ ...newSiteForm, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#0a0f1d',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              비고 / 관리 메모 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 반도체 FAB 신규 증설 라인 전용 출입 게이트"
              value={newSiteForm.note}
              onChange={(e) => setNewSiteForm({ ...newSiteForm, note: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#0a0f1d',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            className="glass-button-primary"
            style={{
              padding: '12px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700',
              fontSize: '13px'
            }}
          >
            <Plus size={16} /> 신규 사업장 추가 저장
          </button>
        </form>
      </div>

      {/* Registered Sites List */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} color="#00f2fe" /> 등록된 출입 사업장 목록 ({sites.length}개)
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            보안 서약 드롭다운에 자동 반영됩니다.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sites.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '14px 16px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: s.category?.includes('삼성') ? 'rgba(0, 242, 254, 0.15)' : s.category?.includes('SK') ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                  color: s.category?.includes('삼성') ? '#00f2fe' : s.category?.includes('SK') ? '#a78bfa' : '#cbd5e1',
                  border: `1px solid ${s.category?.includes('삼성') ? '#00f2fe40' : s.category?.includes('SK') ? '#a78bfa40' : 'rgba(255,255,255,0.2)'}`
                }}>
                  {s.category || '일반'}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {s.note || '관리자 등록 사업장'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteSite(s.id, s.name)}
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#f43f5e',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={13} /> 삭제
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
