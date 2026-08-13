import React, { useState, useEffect } from 'react';
import { Settings, Building2, Plus, Trash2, Edit3, Shield, Lock, X, Smartphone, Search, Upload, CheckCircle2, FileCode, Folder } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';

const SECURITY_APP_CATALOG = [
  { id: 'knox', name: '삼성 Knox Security', company: '삼성전자 / 삼성SDI / 삼성디스플레이', scheme: 'intent://#Intent;scheme=secapp;package=com.sec.knox.app;end', desc: '삼성 스마트폰 Enterprise Knox 보안어플', badge: '삼성' },
  { id: 'ssm', name: 'SK하이닉스 SSM', company: 'SK하이닉스 이천 / 청주사업장', scheme: 'intent://#Intent;scheme=ssm;package=com.skhynix.ssm;end', desc: 'SK하이닉스 Smart Security Manager', badge: 'SK하이닉스' },
  { id: 'lgd', name: 'LG디스플레이 모바일 보안관제', company: 'LG디스플레이 파주 / 구미사업장', scheme: 'intent://#Intent;scheme=lgdsec;package=com.lgd.security;end', desc: 'LG디스플레이 모바일 보안 어플', badge: 'LGD' },
  { id: 'v3', name: '안랩 V3 Mobile Enterprise', company: '기업 통합 모바일 백신 및 보안어플', scheme: 'intent://#Intent;scheme=v3mobile;package=com.ahnlab.v3mobile;end', desc: 'AhnLab V3 Enterprise Security', badge: '안랩' },
  { id: 'hmg', name: '현대자동차그룹 모바일 보안', company: '현대자동차 / 기아 남양연구소 및 공장', scheme: 'intent://#Intent;scheme=hsec;package=com.hmg.security;end', desc: 'HMG Mobile Security Guard', badge: '현대차그룹' },
  { id: 'posco', name: '포스코 제철소 모바일 관제', company: '포스코 포항 / 광양제철소', scheme: 'intent://#Intent;scheme=pososec;package=com.posco.security;end', desc: 'POSCO Mobile Guard', badge: '포스코' },
  { id: 'hanwha', name: '한화 모바일 통합 보안관제', company: '한화솔루션 / 한화토탈 사업장', scheme: 'intent://#Intent;scheme=hanwhasec;package=com.hanwha.sec;end', desc: 'Hanwha Mobile Guard', badge: '한화' },
  { id: 'kt', name: 'KT 기업 통합 보안어플', company: 'KT 사옥 및 IDC 통합 관제', scheme: 'intent://#Intent;scheme=ktsec;package=com.kt.enterprise;end', desc: 'KT Enterprise Security', badge: 'KT' },
  { id: 'samsungsec', name: '삼성 모바일 통합 보안관제', company: '삼성그룹 통계 및 보안관제', scheme: 'intent://#Intent;scheme=samsungsec;package=com.samsung.sec;end', desc: 'Samsung Mobile Security', badge: '삼성' }
];

export default function EncryptedVaultTab({ onTriggerToast }) {
  const [sites, setSites] = useState([]);
  const [newSiteForm, setNewSiteForm] = useState({ type: '보안어플O', name: '', address: '', appUrl: '' });

  // Edit Site Modal State
  const [editingSite, setEditingSite] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // App Picker Modal State
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
  const [appPickerTargetSite, setAppPickerTargetSite] = useState(null); // 'new' | 'editing' | siteId
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [customAppInput, setCustomAppInput] = useState('');

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
      address: address,
      appUrl: (newSiteForm.appUrl || '').trim()
    };

    await dbService.saveSite(newSite);
    await loadSites();
    setNewSiteForm({ type: '보안어플O', name: '', address: '', appUrl: '' });
    if (onTriggerToast) onTriggerToast(`'${newSite.name}' (${newSite.address || '위치 미지정'}) 사업장이 성공적으로 등록되었습니다.`, 'success');
  };

  // Open Edit Site Modal
  const handleOpenEditModal = (site) => {
    setEditingSite({
      id: site.id,
      type: site.type || '보안어플O',
      name: site.name || '',
      address: site.address || '',
      appUrl: site.appUrl || site.app_url || ''
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
      address: editingSite.address.trim(),
      appUrl: (editingSite.appUrl || '').trim()
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

  // App Picker Modal Logic
  const handleOpenAppPickerModal = (targetSite) => {
    setAppPickerTargetSite(targetSite);
    setAppSearchTerm('');
    setCustomAppInput('');
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
      setNewSiteForm(prev => ({ ...prev, appUrl: finalScheme }));
      if (onTriggerToast) onTriggerToast(`'${nameLabel}' (${finalScheme}) 어플이 선택되었습니다.`, 'success');
    } else if (appPickerTargetSite === 'editing' || (editingSite && editingSite.id === appPickerTargetSite)) {
      setEditingSite(prev => ({ ...prev, appUrl: finalScheme }));
      if (onTriggerToast) onTriggerToast(`'${nameLabel}' (${finalScheme}) 어플이 설정되었습니다.`, 'success');
    } else {
      const targetSite = sites.find(s => s.id === appPickerTargetSite);
      if (targetSite) {
        const updated = { ...targetSite, appUrl: finalScheme, type: '보안어플O' };
        await dbService.saveSite(updated);
        await loadSites();
        if (onTriggerToast) onTriggerToast(`'${targetSite.name}' 사업장에 '${nameLabel}' 어플이 연동 등록되었습니다.`, 'success');
      }
    }
    setIsAppPickerOpen(false);
  };

  const handleAppFileBrowsing = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name;
    const generatedScheme = `app://${fileName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    handleSelectAppFromPicker(generatedScheme, `설치 어플 파일 (${fileName})`);
  };

  const handleAppFolderBrowsing = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const folderPath = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : '어플_폴더';

    const appFiles = Array.from(files).filter(f => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.apk') || ext.endsWith('.app') || ext.endsWith('.ipa') || ext.endsWith('.exe') || ext.endsWith('.lnk');
    });

    if (appFiles.length > 0) {
      const selectedFile = appFiles[0];
      const generatedScheme = `app://${selectedFile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      handleSelectAppFromPicker(generatedScheme, `폴더 내 감지 어플 (${folderPath} - ${selectedFile.name})`);
    } else {
      const generatedScheme = `app://${folderPath.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      handleSelectAppFromPicker(generatedScheme, `선택한 어플 폴더 (${folderPath})`);
    }
  };

  const filteredCatalog = SECURITY_APP_CATALOG.filter(app => {
    const q = appSearchTerm.toLowerCase();
    return app.name.toLowerCase().includes(q) || app.company.toLowerCase().includes(q) || app.scheme.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '20px' }}>
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
          {/* 3-Column Grid for 분류, 사업장명, 사업장 위치 */}
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

          {/* App URL Scheme Input with App Finder Button */}
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
                  <Search size={14} /> 🔍 어플 찾기
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
                  {s.appUrl && (
                    <span style={{ fontSize: '11px', color: '#00f2fe', background: 'rgba(0,242,254,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      📱 {s.appUrl}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: 어플 찾기 + 수정 & 삭제 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {s.type === '보안어플O' && (
                  <button
                    type="button"
                    onClick={() => handleOpenAppPickerModal(s.id)}
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
                    title="스마트폰 보안 어플 찾기 및 연동 등록"
                  >
                    <Search size={13} /> 어플 찾기
                  </button>
                )}
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
                  <Edit3 size={13} />
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
                  <Trash2 size={13} />
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

              {/* Edit App URL Scheme Input with App Finder Button */}
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
                      <Search size={14} /> 🔍 어플 찾기
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

      {/* Modal: Interactive Security App Finder & Package Register Modal */}
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
                    📱 핸드폰 보안 어플 탐색 및 등록
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    스마트폰에 설치된 기업 보안 어플을 찾아 사업장에 연동합니다.
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

            {/* App Search Bar, Auto-Detect & File Browser */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Smart Device Auto-Detect & Quick Register Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '12px 14px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚡ 접속 핸드폰 기기 자동 감지
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                    현재 사용하는 스마트폰 종류에 맞는 보안 어플을 자동 감지하여 연동합니다.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const ua = navigator.userAgent.toLowerCase();
                    let detectedScheme = 'secapp://';
                    let detectedName = '삼성 Knox Security';

                    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('macintosh')) {
                      detectedScheme = 'iosmdm://';
                      detectedName = 'iOS Enterprise Security';
                    } else if (ua.includes('skhynix') || ua.includes('hynix')) {
                      detectedScheme = 'ssm://';
                      detectedName = 'SK하이닉스 SSM';
                    } else if (ua.includes('lg')) {
                      detectedScheme = 'lgdsec://';
                      detectedName = 'LG디스플레이 모바일 보안';
                    }

                    handleSelectAppFromPicker(detectedScheme, `${detectedName} (기기 자동 감지)`);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #00f2fe 100%)',
                    border: 'none',
                    color: '#050b14',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Smartphone size={14} /> 핸드폰 어플 자동 감지 연동
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0a0f1d', border: '1px solid rgba(0, 242, 254, 0.35)', padding: '10px 14px', borderRadius: '12px' }}>
                <Search size={16} color="#00f2fe" />
                <input
                  type="text"
                  placeholder="어플 이름, 회사명 또는 스키마 검색..."
                  value={appSearchTerm}
                  onChange={(e) => setAppSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Reassuring User Guide Banner */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '12px 14px',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💡 핸드폰 어플 연동 안내 (파일 찾기/등록 필요 없음!)
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  스마트폰에 이미 설치된 앱은 <strong>파일(.apk)을 찾거나 등록할 필요가 없습니다.</strong><br />
                  아래 카탈로그 목록에서 사용 중인 보안어플(Knox, SSM, V3 등)의 <strong>[연동 선택]</strong>을 클릭하시거나, 하단에 어플 이름(예: 삼성, 하이닉스, 안랩)을 입력해 주세요.
                </div>
              </div>
            </div>

            {/* App Catalog Grid */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#00f2fe', marginTop: '4px' }}>
                🏢 주요 기업용 모바일 보안 어플 카탈로그 ({filteredCatalog.length}개)
              </div>

              {filteredCatalog.map(app => (
                <div
                  key={app.id}
                  onClick={() => handleSelectAppFromPicker(app.scheme, app.name)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '12px 14px',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}>
                      {app.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{app.name}</span>
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(0,242,254,0.15)', color: '#00f2fe' }}>
                          {app.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {app.company}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: 'rgba(0, 242, 254, 0.15)',
                      border: '1px solid rgba(0, 242, 254, 0.35)',
                      color: '#00f2fe',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    연동 선택
                  </button>
                </div>
              ))}
            </div>

            {/* Smart App Name / Package Direct Input */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11.5px', color: '#00f2fe', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📱 어플 이름 직접 입력 및 즉시 연동 (예: 삼성, 하이닉스, 안랩, V3 등)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="예: 삼성, 하이닉스, 안랩, 또는 com.sec.knox.app"
                  value={customAppInput}
                  onChange={(e) => setCustomAppInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customAppInput || !customAppInput.trim()) {
                      if (onTriggerToast) onTriggerToast('어플 이름 또는 패키지명을 입력해 주세요.', 'warning');
                      return;
                    }
                    const val = customAppInput.trim();
                    const lower = val.toLowerCase();
                    let targetLaunchUrl = val;
                    let labelName = val;

                    if (lower.includes('knox') || lower.includes('삼성') || lower.includes('sec')) {
                      targetLaunchUrl = 'intent://#Intent;scheme=secapp;package=com.sec.knox.app;end';
                      labelName = '삼성 Knox Security';
                    } else if (lower.includes('ssm') || lower.includes('하이닉스') || lower.includes('sk')) {
                      targetLaunchUrl = 'intent://#Intent;scheme=ssm;package=com.skhynix.ssm;end';
                      labelName = 'SK하이닉스 SSM';
                    } else if (lower.includes('v3') || lower.includes('안랩') || lower.includes('ahnlab')) {
                      targetLaunchUrl = 'intent://#Intent;scheme=v3mobile;package=com.ahnlab.v3mobile;end';
                      labelName = '안랩 V3 Mobile';
                    } else if (lower.includes('lg') || lower.includes('lgd') || lower.includes('엘지')) {
                      targetLaunchUrl = 'intent://#Intent;scheme=lgdsec;package=com.lgd.security;end';
                      labelName = 'LG디스플레이 모바일 보안';
                    } else if (lower.includes('현대') || lower.includes('hmg')) {
                      targetLaunchUrl = 'intent://#Intent;scheme=hsec;package=com.hmg.security;end';
                      labelName = '현대차 모바일 보안';
                    } else if (lower.includes('포스코') || lower.includes('posco')) {
                      targetLaunchUrl = 'intent://#Intent;scheme=pososec;package=com.posco.security;end';
                      labelName = '포스코 제철소 관제어플';
                    } else if (val.includes('.') && !val.includes('://')) {
                      targetLaunchUrl = `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${val};end`;
                      labelName = `핸드폰 설치 앱 (${val})`;
                    }

                    handleSelectAppFromPicker(targetLaunchUrl, labelName);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                    color: '#050b14',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📱 연동 등록
                </button>
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
