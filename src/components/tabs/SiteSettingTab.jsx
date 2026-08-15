import React, { useState, useEffect } from 'react';
import { Settings, Building2, Plus, Trash2, Edit3, Shield, Lock, X, Smartphone } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';
import { launchApp, scanInstalledSecurityApps } from '../../services/appLauncherService.js';
import { useModalBack } from '../../services/modalBackHandler';

const SECURITY_APP_CATALOG = [
  { id: 'knox', name: '삼성 MDM', company: '삼성전자 / 삼성SDI / 삼성디스플레이 / 삼성반도체', scheme: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.moplus.samsung.semi.user;end', desc: '삼성 MDM (협력사 MDM / com.moplus.samsung.semi.user)', badge: '삼성' },
  { id: 'ssm', name: 'SK하이닉스 SSM', company: 'SK하이닉스 이천 / 청주사업장', scheme: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.skhynix.ssm;end', desc: 'SK하이닉스 Smart Security Manager', badge: 'SK하이닉스' },
  { id: 'lgd', name: 'LG디스플레이 디바이스온', company: 'LG디스플레이 파주 / 구미사업장', scheme: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.lgd.deviceon;end', desc: 'LG디스플레이 디바이스온(DeviceOn) 모바일 보안 앱', badge: 'LGD' }
];

export default function SiteSettingTab({ onTriggerToast }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [sites, setSites] = useState([]);
  const [newSiteForm, setNewSiteForm] = useState({ type: '보안앱O', name: '', address: '', appUrl: '' });

  // Edit Site Modal State
  const [editingSite, setEditingSite] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // App Picker Modal State
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
  const [appPickerTargetSite, setAppPickerTargetSite] = useState(null); // 'new' | 'editing' | siteId
  const [scannedDeviceApps, setScannedDeviceApps] = useState([]);
  const [isScanningApps, setIsScanningApps] = useState(false);

  // Back button hooks
  useModalBack(isEditModalOpen, () => { setIsEditModalOpen(false); setEditingSite(null); }, 'site-edit-modal');
  useModalBack(isAppPickerOpen, () => setIsAppPickerOpen(false), 'site-app-picker-modal');

  const isDevUser = currentUser?.role === '개발자' || currentUser?.username === 'admin';

  // Helper: Get local device app configuration mapping
  const getDeviceAppMap = () => {
    try {
      const raw = localStorage.getItem('with_security_device_site_apps');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };

  // Helper: Save local device app configuration mapping
  const saveDeviceAppMap = (siteId, appName, appUrl) => {
    try {
      const map = getDeviceAppMap();
      if (!appUrl && !appName) {
        delete map[siteId];
      } else {
        map[siteId] = { appName: appName || '', appUrl: appUrl || '' };
      }
      localStorage.setItem('with_security_device_site_apps', JSON.stringify(map));
    } catch (e) {
      console.warn('Save device app map error:', e);
    }
  };

  const loadSites = async () => {
    try {
      const siteList = await dbService.getSites();
      const deviceApps = getDeviceAppMap();
      const mapped = (siteList || []).map(s => {
        const localApp = deviceApps[s.id] || {};
        return {
          ...s,
          appName: localApp.appName || '',
          appUrl: localApp.appUrl || ''
        };
      });
      setSites(mapped);
    } catch (err) {
      console.error('Failed to load entrance sites:', err);
    }
  };

  useEffect(() => {
    async function loadUser() {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
    }
    loadUser();
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

    // 1. Pure Site data to Central Database
    const newSite = {
      id: uniqueId,
      type: type,
      name: name,
      address: address
    };

    await dbService.saveSite(newSite);

    // 2. Save App linkage exclusively to device local storage
    if (resolvedAppName || newSiteForm.appUrl) {
      saveDeviceAppMap(uniqueId, resolvedAppName, (newSiteForm.appUrl || '').trim());
    }

    await loadSites();
    setNewSiteForm({ type: '보안앱O', name: '', address: '', appUrl: '', appName: '' });
    if (onTriggerToast) onTriggerToast(`'${newSite.name}' (${newSite.address || '위치 미지정'}) 사업장이 성공적으로 등록되었습니다.`, 'success');
  };

  const handleOpenEditModal = (site) => {
    const deviceApps = getDeviceAppMap();
    const localApp = deviceApps[site.id] || {};
    setEditingSite({
      id: site.id,
      type: (site.type === '보안어플O' ? '보안앱O' : site.type === '보안어플X' ? '보안앱X' : site.type) || '보안앱O',
      name: site.name || '',
      address: site.address || '',
      appName: localApp.appName || site.appName || '',
      appUrl: localApp.appUrl || site.appUrl || ''
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

    // 1. Pure Site data to Central Database
    const updatedSite = {
      id: editingSite.id,
      type: editingSite.type.trim() || '보안앱O',
      name: editingSite.name.trim(),
      address: editingSite.address.trim()
    };

    await dbService.saveSite(updatedSite);

    // 2. Save App linkage exclusively to device local storage
    saveDeviceAppMap(editingSite.id, resolvedAppName, (editingSite.appUrl || '').trim());

    await loadSites();
    setIsEditModalOpen(false);
    setEditingSite(null);
    if (onTriggerToast) onTriggerToast(`'${updatedSite.name}' 출입 사업장 정보가 성공적으로 수정되었습니다.`, 'success');
  };

  const [deleteTargetSite, setDeleteTargetSite] = useState(null);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  useModalBack(isDeleteModalOpen, () => { setIsDeleteModalOpen(false); setDeleteTargetSite(null); }, 'site-delete-modal');

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

  const handleOpenAppPickerModal = async (targetSite) => {
    setAppPickerTargetSite(targetSite);
    setIsAppPickerOpen(true);
    setIsScanningApps(true);
    try {
      const detected = await scanInstalledSecurityApps();
      setScannedDeviceApps(detected || []);
    } catch (e) {
      console.warn('Scan apps error:', e);
    } finally {
      setIsScanningApps(false);
    }
  };

  const handleSelectAppFromPicker = async (schemeStr, appNameStr) => {
    if (!schemeStr || !schemeStr.trim()) {
      if (onTriggerToast) onTriggerToast('앱 스키마(URL Scheme)를 입력해 주세요.', 'warning');
      return;
    }

    const finalScheme = schemeStr.trim();
    const nameLabel = appNameStr || finalScheme;

    if (appPickerTargetSite === 'new') {
      setNewSiteForm(prev => ({ ...prev, appUrl: finalScheme, appName: nameLabel }));
      if (onTriggerToast) onTriggerToast(`'${nameLabel}' 앱이 선택되었습니다.`, 'success');
    } else if (appPickerTargetSite === 'editing' || (editingSite && editingSite.id === appPickerTargetSite)) {
      setEditingSite(prev => ({ ...prev, appUrl: finalScheme, appName: nameLabel }));
      if (onTriggerToast) onTriggerToast(`'${nameLabel}' 앱이 설정되었습니다.`, 'success');
    } else {
      const targetSite = sites.find(s => s.id === appPickerTargetSite);
      if (targetSite) {
        saveDeviceAppMap(targetSite.id, nameLabel, finalScheme);
        await loadSites();
        if (onTriggerToast) onTriggerToast(`'${targetSite.name}' 사업장에 '${nameLabel}' 앱이 단말기에 연동 설정되었습니다.`, 'success');
      }
    }
    setIsAppPickerOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '2px', border: '1.5px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              border: '1.5px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(14, 165, 233, 0.25)',
              flexShrink: 0
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                출입 사업장 관리
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Site Card Form (Visible ONLY for Developer Role) */}
      {isDevUser && (
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '2px', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> 신규 출입 사업장 등록
          </div>

          <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  분류 *
                </label>
                <select
                  value={newSiteForm.type}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                >
                  <option value="보안앱O">보안앱O</option>
                  <option value="보안앱X">보안앱X</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  사업장명 *
                </label>
                <input
                  type="text"
                  placeholder="예: SEC, SKH"
                  value={newSiteForm.name}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  사업장 위치
                </label>
                <input
                  type="text"
                  placeholder="예: 평택 사업장"
                  value={newSiteForm.address}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {(newSiteForm.type === '보안앱O' || newSiteForm.type === '보안어플O') && (
              <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', padding: '12px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', color: '#0284c7', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📱 모바일 보안 앱 바로가기 실행 링크
                  </label>
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
                      background: '#ffffff',
                      border: '1.5px solid #7dd3fc',
                      color: '#0f172a',
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
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      border: '1px solid #0284c7',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                    }}
                  >
                    <Smartphone size={14} /> 📱 앱 선택
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
      )}

      {/* Registered Sites List */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '2px', border: '1.5px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} color="#0284c7" /> 등록된 출입 사업장 목록 ({sites.length}개)
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sites.map((s) => {
            const isSecAppO = s.type === '보안앱O' || s.type === '보안어플O' || !s.type;
            const displayType = isSecAppO ? '보안앱O' : '보안앱X';

            return (
              <div
                key={s.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  padding: '14px 16px',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  width: '100%',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px -1px rgba(15, 23, 42, 0.04)'
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
                      background: isSecAppO ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: isSecAppO ? '#059669' : '#dc2626',
                      border: isSecAppO ? '1.5px solid #6ee7b7' : '1.5px solid #fca5a5',
                      flexShrink: 0
                    }}>
                      {displayType}
                    </span>

                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      {s.name}
                    </span>

                    {s.address && (
                      <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '500' }}>
                        ({s.address})
                      </span>
                    )}
                  </div>

                  {isDevUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(s)}
                        style={{
                          background: '#f0f9ff',
                          border: '1.5px solid #7dd3fc',
                          color: '#0284c7',
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
                          background: '#fff1f2',
                          border: '1.5px solid #fda4af',
                          color: '#e11d48',
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
                  )}
                </div>

                {/* Row 2: 앱 경로(너비 맞춤 말줄임) | 앱 바로가기 & 앱 찾기 버튼 */}
                {isSecAppO && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingTop: '8px',
                    borderTop: '1.5px solid #e2e8f0',
                    width: '100%',
                    minWidth: 0
                  }}>
                    {/* 앱 경로 텍스트 (너비에 맞춰 말줄임 처리) */}
                    <div
                      title={s.appUrl ? `연동 앱: ${s.appName || ''}\n경로: ${s.appUrl}` : '연동된 보안 앱이 없습니다.'}
                      style={{
                        fontSize: '11.5px',
                        color: s.appUrl ? '#0369a1' : '#64748b',
                        background: s.appUrl ? '#f0f9ff' : '#f8fafc',
                        border: s.appUrl ? '1.5px solid #bae6fd' : '1.5px solid #cbd5e1',
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
                      <Smartphone size={13} style={{ flexShrink: 0, color: s.appUrl ? '#0284c7' : '#64748b' }} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flex: 1,
                        fontWeight: '600'
                      }}>
                        {s.appUrl ? (s.appName ? `[${s.appName}] ${s.appUrl}` : s.appUrl) : '연동된 모바일 보안 앱 없음 (앱 찾기 필요)'}
                      </span>
                    </div>

                    {/* Buttons: 앱 바로가기(실행) + 앱 찾기(선택) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {s.appUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            const url = s.appUrl.trim();
                            if (!url) return;
                            if (onTriggerToast) onTriggerToast(`🚀 '${s.name}' 핸드폰 연동 앱 실행 시도 (${url})`, 'info');
                            const result = await launchApp(url);
                            if (result.success) {
                              if (onTriggerToast) onTriggerToast(`✓ '${s.name}' 연동 앱이 성공적으로 실행되었습니다!`, 'success');
                            } else {
                              if (onTriggerToast) onTriggerToast(`⚠️ 앱('${url}')을 실행할 수 없거나 설치되어 있지 않습니다.`, 'warning');
                            }
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: '1px solid #059669',
                            color: '#ffffff',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                          }}
                          title="연동된 모바일 앱 실행"
                        >
                          🚀 바로가기
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenAppPickerModal(s.id)}
                        style={{
                          background: '#f0f9ff',
                          border: '1.5px solid #7dd3fc',
                          color: '#0284c7',
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
                        title="스마트폰 보안 앱 찾기 및 연동 등록"
                      >
                        <Smartphone size={13} /> 앱 찾기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', borderRadius: '4px', border: '1.5px solid #38bdf8', background: '#ffffff', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} /> 출입 사업장 정보 수정
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  분류 *
                </label>
                <select
                  value={editingSite.type}
                  onChange={(e) => setEditingSite({ ...editingSite, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="보안앱O">보안앱O</option>
                  <option value="보안앱X">보안앱X</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
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
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
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
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {(editingSite.type === '보안앱O' || editingSite.type === '보안어플O') && (
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', padding: '12px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#0284c7', fontWeight: '800' }}>
                    📱 모바일 보안 앱 바로가기 실행 링크
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
                        background: '#ffffff',
                        border: '1.5px solid #7dd3fc',
                        color: '#0f172a',
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
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        border: '1px solid #0284c7',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0
                      }}
                    >
                      <Smartphone size={14} /> 앱 선택
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
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    color: '#475569',
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
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
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
          background: 'rgba(15, 23, 42, 0.6)',
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
            borderRadius: '4px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #bae6fd'
                }}>
                  <Smartphone size={20} color="#0284c7" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    📱 핸드폰 설치 앱 연동 선택
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    스마트폰에 설치되어 있는 앱을 사업장에 선택 등록합니다.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAppPickerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Installed Smartphone Apps List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflowY: 'auto',
              maxHeight: '60vh',
              paddingRight: '4px'
            }}>
              {/* 1. Official Standard Presets (주요 기업 지원 보안 앱 - First) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7', display: 'inline-block', boxShadow: '0 0 8px #0284c7' }} />
                  📱 주요 기업 지원 보안 앱 (프리셋 선택)
                </div>

                {SECURITY_APP_CATALOG.map(app => (
                  <div
                    key={app.id}
                    onClick={() => handleSelectAppFromPicker(app.scheme, app.name)}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.borderColor = '#7dd3fc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        📱
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{app.name}</span>
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(14,165,233,0.12)', color: '#0284c7', fontWeight: '700', border: '1px solid rgba(14,165,233,0.25)' }}>
                            {app.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                          {app.company}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      앱 연동
                    </button>
                  </div>
                ))}
              </div>

              {/* 2. Real-time Device Scanned Apps (내 스마트폰에서 발견된 보안 앱 - Second) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                  🔍 내 스마트폰에서 발견된 보안 앱 {scannedDeviceApps.length > 0 ? `(${scannedDeviceApps.length}개)` : ''}
                </div>

                {isScanningApps ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    스마트폰 설치 보안 앱 검색 중...
                  </div>
                ) : scannedDeviceApps.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    스마트폰에서 추가로 감지된 기타 보안 앱이 없습니다.
                  </div>
                ) : (
                  scannedDeviceApps.map((sc, idx) => (
                    <div
                      key={sc.packageName || idx}
                      onClick={() => handleSelectAppFromPicker(sc.scheme || `package:${sc.packageName}`, sc.label || sc.packageName)}
                      style={{
                        background: '#ecfdf5',
                        border: '1.5px solid #a7f3d0',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ecfdf5'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                          📱
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sc.label || sc.packageName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sc.packageName}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        연동 선택
                      </button>
                    </div>
                  ))
                )}
              </div>
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
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '4px', border: '1.5px solid #fda4af', background: '#ffffff', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> 출입 사업장 삭제 권한 인증
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
              '<strong style={{ color: '#0f172a' }}>{deleteTargetSite?.name}</strong>' ({deleteTargetSite?.id}) 사업장을 삭제하시겠습니까?<br />
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
                  background: '#ffffff',
                  border: '1.5px solid #fda4af',
                  color: '#0f172a',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />

              {deleteErrorMsg && (
                <div style={{ fontSize: '12px', color: '#e11d48', fontWeight: '700' }}>
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
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    color: '#475569',
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
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)'
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
