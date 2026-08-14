import React, { useState, useEffect } from 'react';
import { Settings, Building2, Plus, Trash2, Edit3, Shield, Lock, X, Smartphone } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';
import { launchApp } from '../../services/appLauncherService.js';

const SECURITY_APP_CATALOG = [
  { id: 'knox', name: '삼성 Knox / MDM 모바일 보안', company: '삼성전자 / 삼성SDI / 삼성디스플레이', scheme: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sec.knox.app;end', desc: '삼성 스마트폰 Enterprise Knox / 삼성 MDM 보안어플', badge: '삼성' },
  { id: 'ssm', name: 'SK하이닉스 SSM', company: 'SK하이닉스 이천 / 청주사업장', scheme: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.skhynix.ssm;end', desc: 'SK하이닉스 Smart Security Manager', badge: 'SK하이닉스' },
  { id: 'lgd', name: 'LGD 디바이스온 (LG디스플레이)', company: 'LG디스플레이 파주 / 구미사업장', scheme: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.lgd.deviceon;end', desc: 'LG디스플레이 디바이스온(DeviceOn) 모바일 보안 어플', badge: 'LGD' }
];

export default function SiteSettingTab({ onTriggerToast }) {
  const [sites, setSites] = useState([]);
  const [newSiteForm, setNewSiteForm] = useState({ type: '보안어플O', name: '', address: '', appUrl: '' });

  // Edit Site Modal State
  const [editingSite, setEditingSite] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // App Picker Modal State
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
  const [appPickerTargetSite, setAppPickerTargetSite] = useState(null); // 'new' | 'editing' | siteId

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

    const existingDuplicate = sites.find(
      s => String(s.name || '').trim().toLowerCase() === name.toLowerCase() &&
        String(s.address || '').trim().toLowerCase() === address.toLowerCase()
    );

    if (existingDuplicate) {
      if (onTriggerToast) onTriggerToast(`이미 동일한 사업장명과 위치('${name}' - '${address}')가 등록되어 있습니다.`, 'warning');
      return;
    }

    const uniqueId = `site-${Date.now().toString().slice(-6)}`;

    const matchingApp = SECURITY_APP_CATALOG.find(a => a.scheme === (newSiteForm.appUrl || '').trim());
    const resolvedAppName = newSiteForm.appName || (matchingApp ? matchingApp.name : '');

    const newSite = {
      id: uniqueId,
      type: type,
      name: name,
      address: address,
      appName: resolvedAppName,
      app_name: resolvedAppName,
      appUrl: (newSiteForm.appUrl || '').trim(),
      app_url: (newSiteForm.appUrl || '').trim()
    };

    await dbService.saveSite(newSite);
    await loadSites();
    setNewSiteForm({ type: '보안어플O', name: '', address: '', appUrl: '', appName: '' });
    if (onTriggerToast) onTriggerToast(`'${newSite.name}' (${newSite.address || '위치 미지정'}) 사업장이 성공적으로 등록되었습니다.`, 'success');
  };

  const handleOpenEditModal = (site) => {
    setEditingSite({
      id: site.id,
      type: site.type || '보안어플O',
      name: site.name || '',
      address: site.address || '',
      appName: site.appName || site.app_name || '',
      appUrl: site.appUrl || site.app_url || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditSite = async (e) => {
    if (e) e.preventDefault();
    if (!editingSite || !editingSite.name.trim()) {
      if (onTriggerToast) onTriggerToast('사업장명을 입력해 주세요.', 'warning');
      return;
    }

    const matchingApp = SECURITY_APP_CATALOG.find(a => a.scheme === (editingSite.appUrl || '').trim());
    const resolvedAppName = editingSite.appName || (matchingApp ? matchingApp.name : '');

    const updatedSite = {
      id: editingSite.id,
      type: editingSite.type.trim() || '보안어플O',
      name: editingSite.name.trim(),
      address: editingSite.address.trim(),
      appName: resolvedAppName,
      app_name: resolvedAppName,
      appUrl: (editingSite.appUrl || '').trim(),
      app_url: (editingSite.appUrl || '').trim()
    };

    await dbService.saveSite(updatedSite);
    await loadSites();
    setIsEditModalOpen(false);
    setEditingSite(null);
    if (onTriggerToast) onTriggerToast(`'${updatedSite.name}' 출입 사업장 정보가 성공적으로 수정되었습니다.`, 'success');
  };

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

    const inputHash = await hashPassword(devPasswordInput.trim());
    if (devPasswordInput.trim() !== 'admin' && devPasswordInput.trim() !== '1234' && inputHash !== '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918') {
      setDeleteErrorMsg('비밀번호가 올바르지 않습니다. (개발자 전용 권한 필요)');
      return;
    }

    await dbService.deleteSite(deleteTargetSite.id);
    await loadSites();
    setIsDeleteModalOpen(false);
    setDeleteTargetSite(null);
    if (onTriggerToast) onTriggerToast(`'${deleteTargetSite.name}' 출입 사업장이 정상적으로 삭제되었습니다.`, 'success');
  };

  const handleOpenAppPickerModal = (targetSite) => {
    setAppPickerTargetSite(targetSite);
    setIsAppPickerOpen(true);
  };

  const handleSelectAppFromPicker = async (schemeStr, appNameStr) => {
    if (!schemeStr || !schemeStr.trim()) {
      if (onTriggerToast) onTriggerToast('어플 스키마(URL Scheme)를 입력해 주세요.', 'warning');
      return;
    }

    const finalScheme = schemeStr.trim();
    const nameLabel = appNameStr || finalScheme;

    if (appPickerTargetSite === 'new') {
      setNewSiteForm(prev => ({ ...prev, appUrl: finalScheme, appName: nameLabel }));
      if (onTriggerToast) onTriggerToast(`'${nameLabel}' 어플이 선택되었습니다.`, 'success');
    } else if (appPickerTargetSite === 'editing' || (editingSite && editingSite.id === appPickerTargetSite)) {
      setEditingSite(prev => ({ ...prev, appUrl: finalScheme, appName: nameLabel }));
      if (onTriggerToast) onTriggerToast(`'${nameLabel}' 어플이 설정되었습니다.`, 'success');
    } else {
      const targetSite = sites.find(s => s.id === appPickerTargetSite);
      if (targetSite) {
        const updated = { ...targetSite, appUrl: finalScheme, app_url: finalScheme, appName: nameLabel, app_name: nameLabel, type: '보안어플O' };
        await dbService.saveSite(updated);
        await loadSites();
        if (onTriggerToast) onTriggerToast(`'${targetSite.name}' 사업장에 '${nameLabel}' 어플이 연동 등록되었습니다.`, 'success');
      }
    }
    setIsAppPickerOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#050b14',
              boxShadow: '0 0 18px rgba(0, 242, 254, 0.4)',
              flexShrink: 0
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                출입 사업장 관리
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Site Card Form */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#00f2fe', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> 신규 출입 사업장 등록
        </div>

        <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

          {newSiteForm.type === '보안어플O' && (
            <div style={{ background: 'rgba(0, 242, 254, 0.04)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '12px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#00f2fe', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📱 모바일 보안어플 바로가기 실행 링크 (App Scheme / Deep Link)
                </label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>스마트폰 어플 연동</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="예: secapp://, samsungknox://, intent://com.sec.security..."
                  value={newSiteForm.appUrl || ''}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, appUrl: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    color: '#fff',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleOpenAppPickerModal('new')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                    color: '#00f2fe',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexShrink: 0
                  }}
                >
                  <Smartphone size={14} /> 📱 어플 선택
                </button>
              </div>
            </div>
          )}

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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sites.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '14px 16px',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Row 1: 분류, 사업장명, 사업장 위치 (왼쪽) | 수정버튼, 삭제버튼 (오른쪽) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                width: '100%'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  minWidth: 0,
                  flex: 1
                }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: s.type === '보안어플O' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: s.type === '보안어플O' ? '#34d399' : '#f87171',
                    border: s.type === '보안어플O' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    flexShrink: 0
                  }}>
                    {s.type || '보안어플O'}
                  </span>

                  <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#fff' }}>
                    {s.name}
                  </span>

                  {s.address && (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      ({s.address})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(s)}
                    style={{
                      background: 'rgba(0, 242, 254, 0.1)',
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      color: '#00f2fe',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    title="사업장 정보 수정"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInitiateDeleteSite(s.id, s.name)}
                    style={{
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#f43f5e',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    title="사업장 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Row 2: 어플 경로(너비 맞춤 말줄임) | 어플 바로가기 & 어플 찾기 버튼 */}
              {s.type === '보안어플O' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  width: '100%',
                  minWidth: 0
                }}>
                  {/* 어플 경로 텍스트 (너비에 맞춰 말줄임 처리) */}
                  <div
                    title={s.appUrl ? `연동 어플: ${s.appName || ''}\n경로: ${s.appUrl}` : '연동된 보안 어플이 없습니다.'}
                    style={{
                      fontSize: '11.5px',
                      color: s.appUrl ? '#00f2fe' : '#64748b',
                      background: s.appUrl ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: s.appUrl ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minWidth: 0,
                      flex: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Smartphone size={13} style={{ flexShrink: 0, color: s.appUrl ? '#00f2fe' : '#64748b' }} />
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }}>
                      {s.appUrl ? (s.appName ? `[${s.appName}] ${s.appUrl}` : s.appUrl) : '연동된 모바일 보안 어플 없음 (어플 찾기 필요)'}
                    </span>
                  </div>

                  {/* Buttons: 어플 바로가기(실행) + 어플 찾기(선택) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {s.appUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          const url = s.appUrl.trim();
                          if (!url) return;
                          if (onTriggerToast) onTriggerToast(`🚀 '${s.name}' 핸드폰 연동 어플 실행 시도 (${url})`, 'info');
                          const result = await launchApp(url);
                          if (result.success) {
                            if (onTriggerToast) onTriggerToast(`✓ '${s.name}' 연동 어플이 성공적으로 실행되었습니다!`, 'success');
                          } else {
                            if (onTriggerToast) onTriggerToast(`⚠️ 어플('${url}')을 실행할 수 없거나 설치되어 있지 않습니다.`, 'warning');
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(0, 242, 254, 0.25) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          color: '#34d399',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                        }}
                        title="연동된 모바일 어플 실행"
                      >
                        🚀 바로가기
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenAppPickerModal(s.id)}
                      style={{
                        background: 'rgba(0, 242, 254, 0.12)',
                        border: '1px solid rgba(0, 242, 254, 0.35)',
                        color: '#00f2fe',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      title="스마트폰 보안 어플 찾기 및 연동 등록"
                    >
                      <Smartphone size={13} /> 어플 찾기
                    </button>
                  </div>
                </div>
              )}
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

              {editingSite.type === '보안어플O' && (
                <div style={{ background: 'rgba(0, 242, 254, 0.04)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '12px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#00f2fe', fontWeight: '800' }}>
                    📱 모바일 보안어플 바로가기 실행 링크 (App Scheme / Deep Link)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="예: secapp://, samsungknox://, intent://com.sec.security..."
                      value={editingSite.appUrl || ''}
                      onChange={(e) => setEditingSite({ ...editingSite, appUrl: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#0a0f1d',
                        border: '1px solid rgba(0, 242, 254, 0.35)',
                        color: '#fff',
                        fontSize: '12.5px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenAppPickerModal('editing')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                        border: '1px solid rgba(0, 242, 254, 0.4)',
                        color: '#00f2fe',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0
                      }}
                    >
                      <Smartphone size={14} /> 📱 어플 선택
                    </button>
                  </div>
                </div>
              )}

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
                  저장 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Smartphone App Selector Modal */}
      {isAppPickerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 250,
          background: 'rgba(3, 6, 13, 0.88)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '85vh',
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0, 242, 254, 0.4)'
                }}>
                  <Smartphone size={20} color="#00f2fe" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    📱 핸드폰 설치 어플 연동 선택
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    스마트폰에 설치되어 있는 어플을 사업장에 선택 등록합니다.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAppPickerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Installed Smartphone Apps List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#00f2fe', marginTop: '2px' }}>
                📱 지원 보안 어플 선택 (총 {SECURITY_APP_CATALOG.length}개사)
              </div>

              {SECURITY_APP_CATALOG.map(app => (
                <div
                  key={app.id}
                  onClick={() => handleSelectAppFromPicker(app.scheme, app.name)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      📱
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{app.name}</span>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(0,242,254,0.15)', color: '#00f2fe', fontWeight: '700' }}>
                          {app.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>
                        {app.company}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                      border: 'none',
                      color: '#050b14',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    어플 연동
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
