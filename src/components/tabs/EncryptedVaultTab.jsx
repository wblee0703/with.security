import React, { useState, useEffect } from 'react';
import { Settings, Building2, Plus, Trash2, Edit3, Shield, Lock, X } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';

export default function EncryptedVaultTab({ onTriggerToast }) {
  const [sites, setSites] = useState([]);
  const [newSiteForm, setNewSiteForm] = useState({ type: '보안어플O', name: '', address: '' });

  // Edit Site Modal State
  const [editingSite, setEditingSite] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadSites = async () => {
    try {
      const siteList = await dbService.getSites();
      setSites(siteList || []);
    } catch (err) {
      console.error('Failed to load entrance sites:', err);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleAddSite = async (e) => {
    e.preventDefault();
    const type = newSiteForm.type.trim() || '일반구역';
    const name = newSiteForm.name.trim();
    const address = newSiteForm.address.trim();

    if (!name) {
      if (onTriggerToast) onTriggerToast('사업장명을 입력해 주세요.', 'warning');
      return;
    }

    // 이름과 위치가 모두 일치하는 경우만 중복으로 체크
    const existingDuplicate = sites.find(
      s => String(s.name || '').trim().toLowerCase() === name.toLowerCase() &&
        String(s.address || '').trim().toLowerCase() === address.toLowerCase()
    );

    if (existingDuplicate) {
      if (onTriggerToast) onTriggerToast(`이미 동일한 사업장명과 위치('${name}' - '${address}')가 등록되어 있습니다.`, 'warning');
      return;
    }

    const uniqueId = `site-${Date.now().toString().slice(-6)}`;

    const newSite = {
      id: uniqueId,
      type: type,
      name: name,
      address: address
    };

    await dbService.saveSite(newSite);
    await loadSites();
    setNewSiteForm({ type: '보안어플O', name: '', address: '' });
    if (onTriggerToast) onTriggerToast(`'${newSite.name}' (${newSite.address || '위치 미지정'}) 사업장이 성공적으로 등록되었습니다.`, 'success');
  };

  // Open Edit Site Modal
  const handleOpenEditModal = (site) => {
    setEditingSite({
      id: site.id,
      type: site.type || '보안어플O',
      name: site.name || '',
      address: site.address || ''
    });
    setIsEditModalOpen(true);
  };

  // Save Edited Site
  const handleSaveEditSite = async (e) => {
    if (e) e.preventDefault();
    if (!editingSite || !editingSite.name.trim()) {
      if (onTriggerToast) onTriggerToast('사업장명을 입력해 주세요.', 'warning');
      return;
    }

    const updatedSite = {
      id: editingSite.id,
      type: editingSite.type.trim() || '보안어플O',
      name: editingSite.name.trim(),
      address: editingSite.address.trim()
    };

    await dbService.saveSite(updatedSite);
    await loadSites();
    setIsEditModalOpen(false);
    setEditingSite(null);
    if (onTriggerToast) onTriggerToast(`'${updatedSite.name}' 출입 사업장 정보가 성공적으로 수정되었습니다.`, 'success');
  };

  // Delete Site Modal States
  const [deleteTargetSite, setDeleteTargetSite] = useState(null);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const handleInitiateDeleteSite = (siteId, siteName) => {
    if (sites.length <= 1) {
      if (onTriggerToast) onTriggerToast('최소 1개 이상의 출입 사업장이 등록되어 있어야 합니다.', 'warning');
      return;
    }
    setDeleteTargetSite({ id: siteId, name: siteName });
    setDevPasswordInput('');
    setDeleteErrorMsg('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSite = async (e) => {
    if (e) e.preventDefault();
    if (!deleteTargetSite) return;

    if (!devPasswordInput || !devPasswordInput.trim()) {
      setDeleteErrorMsg('개발자 비밀번호를 입력해 주세요.');
      return;
    }

    const inputPass = devPasswordInput.trim();
    const hashedInput = await hashPassword(inputPass);
    const users = await dbService.getUsers();
    const devUsers = users.filter(u => u.role === '개발자' || u.username === 'admin');

    let isValidDevPass = false;
    for (const devUser of devUsers) {
      if (
        (devUser.password && inputPass === devUser.password) ||
        (devUser.passwordHash && hashedInput === devUser.passwordHash)
      ) {
        isValidDevPass = true;
        break;
      }
    }

    if (!isValidDevPass) {
      setDeleteErrorMsg('개발자 비밀번호가 일치하지 않습니다.');
      if (onTriggerToast) onTriggerToast('❌ 개발자 비밀번호 인증에 실패했습니다.', 'error');
      return;
    }

    await dbService.deleteSite(deleteTargetSite.id);
    await loadSites();
    setIsDeleteModalOpen(false);
    setDeleteTargetSite(null);
    setDevPasswordInput('');
    if (onTriggerToast) onTriggerToast(`'${deleteTargetSite.name}' 출입 사업장이 성공적으로 삭제되었습니다.`, 'info');
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
                출입 대상 사업장 통합 관리
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                security_site DB 테이블 기반으로 사업장 목록(type, name, address, id: site-000)을 관리합니다.
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
          {/* 3-Column Grid for 분류, 사업장명, 사업장 위치 (1:1:1 비율) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                분류 *
              </label>
              <select
                value={newSiteForm.type}
                onChange={(e) => setNewSiteForm({ ...newSiteForm, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#0a0f1d',
                  border: '1px solid rgba(0, 242, 254, 0.4)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="보안어플O">보안어플O</option>
                <option value="보안어플X">보안어플X</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                사업장명 *
              </label>
              <input
                type="text"
                placeholder="예: SKH"
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

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                사업장 위치
              </label>
              <input
                type="text"
                placeholder="예: 이천사업장"
                value={newSiteForm.address}
                onChange={(e) => setNewSiteForm({ ...newSiteForm, address: e.target.value })}
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
            security_site 데이터베이스 연동
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
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Type Badge */}
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: s.type === '보안어플O' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: s.type === '보안어플O' ? '#34d399' : '#f87171',
                  border: s.type === '보안어플O' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  {s.type || '보안어플O'}
                </span>

                {/* Name & Address */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                    {s.name}
                  </span>
                  {s.address && (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {s.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: 수정 & 삭제 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(s)}
                  style={{
                    background: 'rgba(0, 242, 254, 0.1)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#00f2fe',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Edit3 size={13} /> 수정
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateDeleteSite(s.id, s.name)}
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
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Trash2 size={13} /> 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Edit Site Information */}
      {isEditModalOpen && editingSite && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 200,
          background: 'rgba(3, 6, 13, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', borderRadius: '24px', border: '1px solid rgba(0, 242, 254, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} /> 출입 사업장 정보 수정
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  분류 *
                </label>
                <select
                  value={editingSite.type}
                  onChange={(e) => setEditingSite({ ...editingSite, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="보안어플O">보안어플O</option>
                  <option value="보안어플X">보안어플X</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  사업장명 *
                </label>
                <input
                  type="text"
                  value={editingSite.name}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
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
                  사업장 위치
                </label>
                <input
                  type="text"
                  value={editingSite.address}
                  onChange={(e) => setEditingSite({ ...editingSite, address: e.target.value })}
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                    border: 'none',
                    color: '#050b14',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  수정 완료 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Developer Password Verification for Site Deletion */}
      {isDeleteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 200,
          background: 'rgba(3, 6, 13, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '24px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> 출입 사업장 삭제 권한 인증
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.5 }}>
              '<strong style={{ color: '#fff' }}>{deleteTargetSite?.name}</strong>' ({deleteTargetSite?.id}) 사업장을 삭제하시겠습니까?<br />
              보안을 위해 개발자 계정 비밀번호를 입력해 주세요.
            </p>

            <form onSubmit={handleConfirmDeleteSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                placeholder="개발자 비밀번호 입력"
                value={devPasswordInput}
                onChange={(e) => {
                  setDevPasswordInput(e.target.value);
                  setDeleteErrorMsg('');
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#0a0f1d',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />

              {deleteErrorMsg && (
                <div style={{ fontSize: '12px', color: '#f43f5e', fontWeight: '700' }}>
                  ⚠️ {deleteErrorMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  확인 및 삭제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
