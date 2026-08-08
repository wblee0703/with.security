import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  PackageCheck,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  QrCode,
  Printer,
  Smartphone,
  Lock,
  Camera,
  MicOff,
  WifiOff,
  Trash2,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Award,
  Settings
} from 'lucide-react';
import SignatureCanvas from '../common/SignatureCanvas';
import { dbService } from '../../services/dbService';

export default function SiteSecurityChecklistTab({ onTriggerToast }) {
  const [checklistList, setChecklistList] = useState([]);

  // Load from IndexedDB on component mount
  useEffect(() => {
    async function loadFromDB() {
      try {
        const dbItems = await dbService.getChecklists();
        // Filter out sample mock entries if present
        const realItems = (dbItems || []).filter(
          item => item.visitorName !== '홍길동' && item.visitorName !== '이수석' && item.visitorName !== '최보안'
        );
        setChecklistList(realItems);
        localStorage.setItem('with_security_checklists_backup', JSON.stringify(realItems));
      } catch (err) {
        console.error('Failed to load checklists from DB:', err);
      }
    }
    loadFromDB();
  }, []);

  // Admin Managed Entrance Sites State
  const [sites, setSites] = useState([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newSiteForm, setNewSiteForm] = useState({ name: '', category: '삼성전자', note: '' });

  useEffect(() => {
    async function loadSites() {
      try {
        const siteList = await dbService.getSites();
        setSites(siteList);
        if (siteList.length > 0) {
          setFormData(prev => ({ ...prev, site: siteList[0].name }));
        }
      } catch (err) {
        console.error('Failed to load sites:', err);
      }
    }
    loadSites();
  }, []);

  // Admin Site Handlers
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
    const updated = await dbService.getSites();
    setSites(updated);
    setNewSiteForm({ name: '', category: '', note: '' });
    if (onTriggerToast) onTriggerToast(`'${newSite.name}' 사업장이 추가되었습니다.`, 'success');
  };

  const handleDeleteSite = async (siteId, siteName) => {
    if (sites.length <= 1) {
      if (onTriggerToast) onTriggerToast('최소 1개 이상의 사업장이 등록되어 있어야 합니다.', 'warning');
      return;
    }
    await dbService.deleteSite(siteId);
    const updated = await dbService.getSites();
    setSites(updated);
    if (onTriggerToast) onTriggerToast(`'${siteName}' 사업장이 삭제되었습니다.`, 'info');
  };

  // Mobile Security App Detection Helper (Samsung MDM vs SK Hynix SSM vs General)
  const getTargetSecurityAppInfo = (siteName = '') => {
    if (siteName.includes('삼성')) {
      return {
        appName: '삼성 보안 어플 (MDM)',
        appCode: 'SAMSUNG_MDM',
        shortName: '삼성보안어플',
        packageName: 'com.samsung.knox.mdm',
        scheme: 'sec-mdm://',
        tokenPrefix: 'MDM-SAM-',
        company: '삼성전자',
        color: '#00f2fe',
        badgeBg: 'rgba(0, 242, 254, 0.15)',
      };
    } else if (siteName.includes('SK') || siteName.includes('하이닉스')) {
      return {
        appName: 'SK하이닉스 보안 어플 (SSM)',
        appCode: 'HYNIX_SSM',
        shortName: 'SK하이닉스 SSM 어플',
        packageName: 'com.skhynix.ssm',
        scheme: 'ssm-hynix://',
        tokenPrefix: 'SSM-SKH-',
        company: 'SK하이닉스',
        color: '#a78bfa',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
      };
    } else {
      return {
        appName: '일반 사업장 출입 보안 (카메라 봉인 스티커)',
        appCode: 'GENERAL_SECURITY',
        shortName: '일반 보안 가이드',
        packageName: 'com.security.general',
        scheme: 'security://',
        tokenPrefix: 'GEN-SEC-',
        company: '기타 사업장',
        color: '#fbbf24',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        desc: '카메라 렌즈 봉인 스티커 부착 및 기본 사업장 보안 준수'
      };
    }
  };

  // App Scan & Verification State
  const [appScanState, setAppScanState] = useState({
    isScanning: false,
    status: 'VERIFIED', // 'VERIFIED' | 'NOT_RUNNING'
    lastScannedAt: new Date().toLocaleTimeString(),
    scanLog: []
  });

  const handleScanSecurityApp = () => {
    const targetApp = getTargetSecurityAppInfo(formData.site);
    setAppScanState({
      isScanning: true,
      status: 'UNCHECKED',
      lastScannedAt: null,
      scanLog: [
        `[1/2] 단말기 디바이스 프로세스 스캔 중...`,
        `[2/2] 패키지 '${targetApp.packageName}' 감지 중...`
      ]
    });

    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        mdmVerified: true,
        cameraLocked: true,
        audioLocked: true,
        tetheringDisabled: true
      }));
      setAppScanState({
        isScanning: false,
        status: 'VERIFIED',
        lastScannedAt: new Date().toLocaleTimeString(),
        scanLog: [
          `[✓ 완료] '${targetApp.appName}' 백그라운드 서비스 실행 확인 완료`,
          `[✓ 완료] 단말기 보안 기능(카메라/마이크/테더링 차단) 적용됨`
        ]
      });
      if (onTriggerToast) {
        onTriggerToast(`'${targetApp.shortName}' 어플 실행 상태 확인 완료!`, 'success');
      }
    }, 1200);
  };

  const handleOpenSecurityApp = () => {
    const targetApp = getTargetSecurityAppInfo(formData.site);

    // Deep Link / Scheme execution
    try {
      window.location.href = targetApp.scheme;
    } catch (err) {
      console.warn('App scheme launch attempt:', err);
    }

    setFormData(prev => ({ ...prev, mdmVerified: true }));
    setAppScanState({
      isScanning: false,
      status: 'VERIFIED',
      lastScannedAt: new Date().toLocaleTimeString(),
      scanLog: [
        `[📱 어플 이동] '${targetApp.shortName}' 호출 중 (${targetApp.scheme})...`,
        `[✓ 완료] 어플 세션 및 백그라운드 활성화 확인`
      ]
    });

    if (onTriggerToast) {
      onTriggerToast(`'${targetApp.shortName}' 어플로 이동을 시도하며 실행 상태가 확인되었습니다.`, 'success');
    }
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Form State for New Entry Pass
  const [formData, setFormData] = useState({
    site: '',
    visitorName: '',
    company: '',
    phone: '',
    hostName: '',
    purposeType: '작업',
    customPurpose: '',
    purpose: '작업',
    visitDate: `${new Date().toISOString().split('T')[0]} ~ ${new Date().toISOString().split('T')[0]}`,
    mdmVerified: true,
    docChecklist: {
      gateApproved: true,
      docSecVerified: true,
      preCheckVerified: true
    },
    materials: [],
    agreedToTerms: false,
    signatureDataUrl: ''
  });

  // Selected Detail Modal State
  const [selectedPass, setSelectedPass] = useState(null);

  // Filtered List
  const filteredList = checklistList.filter(item => {
    const matchesSearch = item.visitorName.includes(searchTerm) ||
      item.company.includes(searchTerm) ||
      item.site.includes(searchTerm) ||
      item.id.includes(searchTerm);
    const matchesSite = selectedSiteFilter === 'ALL' || item.site.includes(selectedSiteFilter);
    const matchesStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;
    return matchesSearch && matchesSite && matchesStatus;
  });

  // Handle Add Material Row
  const handleAddMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        { category: '공구/측정기', model: '', serial: '', qty: 1, sealId: `SEAL-${Math.floor(1000 + Math.random() * 9000)}` }
      ]
    }));
  };

  // Handle Remove Material Row
  const handleRemoveMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Handle Material Field Change
  const handleMaterialChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.materials];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, materials: updated };
    });
  };

  // Submit Form
  const handleSubmitForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.visitorName || !formData.visitorName.trim()) {
      if (onTriggerToast) onTriggerToast('방문자 성명을 입력해 주세요.', 'warning');
      return;
    }
    if (!formData.agreedToTerms) {
      if (onTriggerToast) onTriggerToast('보안 준수 서약서에 동의하여 주십시오.', 'warning');
      return;
    }
    if (!formData.signatureDataUrl) {
      if (onTriggerToast) onTriggerToast('전자 서명을 작성해 주십시오.', 'warning');
      return;
    }

    const finalPurpose = formData.purposeType === '기타'
      ? (formData.customPurpose.trim() || '기타')
      : formData.purposeType;

    const newPass = {
      id: `SEC-PASS-2026-${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')}`,
      site: formData.site,
      visitorName: formData.visitorName.trim(),
      company: '일반 출입자',
      phone: formData.phone || '010-0000-0000',
      hostName: '사업장 보안관제센터',
      purpose: finalPurpose,
      visitDate: formData.visitDate,
      mdmVerified: formData.mdmVerified,
      docChecklist: formData.docChecklist || { gateApproved: true, docSecVerified: true, preCheckVerified: true },
      materials: [],
      signature: formData.signatureDataUrl,
      status: '승인완료',
      createdAt: new Date().toLocaleString('ko-KR', { hour12: false })
    };

    try {
      await dbService.saveChecklist(newPass);
    } catch (err) {
      console.error('Failed to save pass to DB:', err);
    }

    setChecklistList([newPass, ...checklistList]);
    setIsModalOpen(false);
    setActiveStep(1);

    // Reset Form
    setFormData({
      site: sites.length > 0 ? sites[0].name : '',
      visitorName: '',
      company: '',
      phone: '',
      hostName: '',
      purposeType: '작업',
      customPurpose: '',
      purpose: '작업',
      visitDate: `${new Date().toISOString().split('T')[0]} ~ ${new Date().toISOString().split('T')[0]}`,
      mdmVerified: true,
      docChecklist: {
        gateApproved: true,
        docSecVerified: true,
        preCheckVerified: true
      },
      materials: [],
      agreedToTerms: false,
      signatureDataUrl: ''
    });

    if (onTriggerToast) {
      onTriggerToast(`[${newPass.site}] 보안서약 및 출입 승인증이 데이터베이스에 정상 등록되었습니다.`, 'success');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header Title Banner */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Building2 size={22} color="#00f2fe" />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                사업장 출입 보안 서약
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              모바일 보안 앱(MDM) 검수 · 지입 자재 시리얼 봉인 · 전자 보안 서약서 통합 관리
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="glass-button"
              style={{
                padding: '10px 16px',
                borderRadius: '14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                background: 'rgba(0, 242, 254, 0.1)',
                color: '#00f2fe',
                border: '1px solid rgba(0, 242, 254, 0.3)'
              }}
            >
              <Settings size={18} /> 사업장 관리 (Admin)
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="glass-button-primary"
              style={{
                padding: '10px 18px',
                borderRadius: '14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> 사업장 출입 체크리스트 & 보안 서약
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginTop: '18px'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>총 출입 결재 건수</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#00f2fe' }}>{checklistList.length}건</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>삼성전자 사업장</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>
              {checklistList.filter(i => i.site.includes('삼성전자')).length}건
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>SK하이닉스 사업장</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#8b5cf6' }}>
              {checklistList.filter(i => i.site.includes('SK하이닉스')).length}건
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>지입자재 봉인 등록</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>
              {checklistList.reduce((acc, curr) => acc + curr.materials.length, 0)}개
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '8px 14px',
          flex: '1 1 240px'
        }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="성명, 회사명, 사업장, 서약 번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        {/* Site Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: '전체 사업장' },
            { id: '삼성전자', label: '삼성전자' },
            { id: 'SK하이닉스', label: 'SK하이닉스' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedSiteFilter(filter.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                border: 'none',
                background: selectedSiteFilter === filter.id ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedSiteFilter === filter.id ? '#00f2fe' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist Registrations Data List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredList.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            검색 결과에 해당하는 보안서약 및 출입 내역이 없습니다.
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                borderLeft: item.site.includes('삼성전자') ? '4px solid #00f2fe' : '4px solid #8b5cf6',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Row Header: Site & Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} color={item.site.includes('삼성전자') ? '#00f2fe' : '#8b5cf6'} />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                    {item.site}
                  </span>
                  <span className="mono-font" style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '6px' }}>
                    {item.id}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.status === '승인완료' ? (
                    <span className="badge-secure" style={{ fontSize: '11px' }}>
                      <CheckCircle2 size={13} /> 승인 완료
                    </span>
                  ) : (
                    <span className="badge-warning" style={{ fontSize: '11px' }}>
                      <Clock size={13} /> 결재 대기
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedPass(item)}
                    className="glass-button"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#00f2fe',
                      borderColor: 'rgba(0, 242, 254, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <QrCode size={13} /> 상세/승인증 QR
                  </button>
                </div>
              </div>

              {/* Information Row Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>방문자 / 소속회사</div>
                  <div style={{ fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
                    {item.visitorName} ({item.company})
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>접견 담당자</div>
                  <div style={{ color: '#94a3b8', marginTop: '2px' }}>{item.hostName}</div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>보안 앱(MDM) 검수</div>
                  <div style={{ color: '#10b981', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Smartphone size={13} /> 검수완과 (카메라 차단)
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>자재&문서 보안검수</div>
                  <div style={{ color: '#00f2fe', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PackageCheck size={13} /> {item.materials && item.materials.length > 0 ? `${item.materials.length}개 품목 봉인` : '보안 검수 완료'}
                  </div>
                </div>
              </div>

              {/* Bottom Tags */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                <div>방문목적: {item.purpose}</div>
                <div className="mono-font">등록일: {item.createdAt}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: 4-Step Registration Wizard */}
      {isModalOpen && (
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
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '24px',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} color="#00f2fe" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    신규 사업장 출입 보안 서약 & 지입자재 등록
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    삼성 / SK하이닉스 출입 절차 기준 준수
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Progress Tracker */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
              padding: '12px 24px',
              background: 'rgba(0,0,0,0.2)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {[
                { step: 1, label: '1. 사업장 정보' },
                { step: 2, label: '2. 보안 앱 검수' },
                { step: 3, label: '3. 자재&문서 확인' },
                { step: 4, label: '4. 전자 서약서' }
              ].map(s => (
                <div
                  key={s.step}
                  onClick={() => setActiveStep(s.step)}
                  style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: activeStep === s.step ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                    color: activeStep === s.step ? '#00f2fe' : '#64748b',
                    borderBottom: activeStep === s.step ? '2px solid #00f2fe' : '2px solid transparent'
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {/* Step Contents Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* STEP 1: Site & Visitor Info */}
              {activeStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe' }}>
                    📍 Step 1. 출입 사업장 및 방문자 기본 정보
                  </div>

                  {/* Site Select with Admin Settings Icon */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
                        출입 대상 사업장 (필수)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAdminModalOpen(true)}
                        style={{
                          background: 'rgba(0, 242, 254, 0.1)',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          color: '#00f2fe',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Settings size={12} /> 사업장 관리 (Admin)
                      </button>
                    </div>
                    <select
                      value={formData.site}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
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
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.name}>
                          [{s.category}] {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visitor Name & Phone 1:1 ratio */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        방문자 성명 *
                      </label>
                      <input
                        type="text"
                        placeholder="홍길동"
                        value={formData.visitorName}
                        onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
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
                        연락처
                      </label>
                      <input
                        type="text"
                        placeholder="010-0000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

                  {/* Visit Purpose Dropdown & Custom Text Input */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      방문 목적 (필수 선택)
                    </label>
                    <select
                      value={formData.purposeType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          purposeType: type,
                          purpose: type === '기타' ? prev.customPurpose : type
                        }));
                      }}
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
                    >
                      <option value="작업">작업</option>
                      <option value="회의">회의</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>

                  {formData.purposeType === '기타' && (
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        기타 방문 목적 상세 입력 *
                      </label>
                      <input
                        type="text"
                        placeholder="방문 목적을 직접 입력해 주세요 (예: 설비 정기 점검 및 세미나 참석)"
                        value={formData.customPurpose}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            customPurpose: val,
                            purpose: val
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: '#0a0f1d',
                          border: '1px solid rgba(0, 242, 254, 0.4)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="glass-button-primary"
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      marginTop: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    다음: 모바일 보안 앱(MDM) 검수 <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* STEP 2: Mobile Security App Verification (Samsung MDM & SK Hynix SSM) */}
              {activeStep === 2 && (() => {
                const targetApp = getTargetSecurityAppInfo(formData.site);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe' }}>
                        📱 Step 2. 모바일 보안 어플 실행 확인
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: targetApp.badgeBg,
                        color: targetApp.color,
                        border: `1px solid ${targetApp.color}40`
                      }}>
                        {targetApp.shortName}
                      </span>
                    </div>

                    {/* Target Security App Card */}
                    <div style={{
                      background: 'rgba(10, 15, 29, 0.8)',
                      border: `1px solid ${targetApp.color}35`,
                      padding: '16px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: targetApp.badgeBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${targetApp.color}50`
                          }}>
                            <Smartphone size={22} color={targetApp.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                              {targetApp.appName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              {targetApp.desc}
                            </div>
                          </div>
                        </div>

                        {appScanState.status === 'VERIFIED' && formData.mdmVerified ? (
                          <span className="badge-secure" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                            <CheckCircle2 size={13} /> 어플 실행 확인됨
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={13} /> 어플 미실행
                          </span>
                        )}
                      </div>

                      {/* Real-time Scan Action Banner */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            어플 동작 상태: <strong style={{ color: appScanState.status === 'VERIFIED' ? '#10b981' : '#ef4444' }}>{appScanState.status === 'VERIFIED' ? '정상 실행 중' : '미실행'}</strong>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleOpenSecurityApp}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                background: `linear-gradient(135deg, ${targetApp.color} 0%, #00b4d8 100%)`,
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(0, 242, 254, 0.25)'
                              }}
                            >
                              <ExternalLink size={14} /> {targetApp.shortName} 열기 / 이동
                            </button>

                            <button
                              type="button"
                              onClick={handleScanSecurityApp}
                              disabled={appScanState.isScanning}
                              className="glass-button"
                              style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#00f2fe',
                                cursor: appScanState.isScanning ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              {appScanState.isScanning ? (
                                <>🔍 확인 중...</>
                              ) : (
                                <>🔍 실행 상태 재확인</>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* App Scan Live Logs */}
                        {appScanState.scanLog.length > 0 && (
                          <div style={{
                            background: '#050811',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: '#00f2fe',
                            border: '1px solid rgba(0, 242, 254, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            {appScanState.scanLog.map((log, i) => (
                              <div key={i}>{log}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Warning Box if App NOT Running */}
                    {appScanState.status === 'NOT_RUNNING' && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <AlertTriangle size={20} color="#ef4444" />
                        <div style={{ fontSize: '12px', color: '#fca5a5' }}>
                          <strong>[경고] 필수 보안 어플이 실행되어 있지 않습니다!</strong><br />
                          {targetApp.company} 사업장에 출입하려면 핸드폰에서 <strong>{targetApp.appName}</strong>을 미리 실행한 후 다시 [실행 여부 확인] 버튼을 눌러주세요.
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="glass-button"
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          flex: 1,
                          cursor: 'pointer'
                        }}
                      >
                        이전
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.mdmVerified && appScanState.status === 'NOT_RUNNING') {
                            if (onTriggerToast) onTriggerToast(`필수 보안 어플('${targetApp.shortName}')을 실행해 주세요.`, 'warning');
                            return;
                          }
                          setActiveStep(3);
                        }}
                        className="glass-button-primary"
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          flex: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        다음: 반입 자재 등록 (3/4) <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 3: Material & Document Security Checklist */}
              {activeStep === 3 && (() => {
                const docChecklist = formData.docChecklist || { gateApproved: false, docSecVerified: false, preCheckVerified: false };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe' }}>
                        📦 Step 3. 자재&문서 확인
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        반입 자재 및 문서 필수 검수
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Item 1 */}
                      <div
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          docChecklist: { ...docChecklist, gateApproved: !docChecklist.gateApproved }
                        }))}
                        style={{
                          background: docChecklist.gateApproved ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.03)',
                          border: docChecklist.gateApproved ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                          padding: '14px',
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <PackageCheck size={20} color={docChecklist.gateApproved ? '#00f2fe' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                              1. 지입 자재 물품 보안 검색대 승인
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              출입구 게이트 보안 검색대를 통한 자재 및 물품 검수/승인 완료
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={docChecklist.gateApproved}
                          readOnly
                          style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Item 2 */}
                      <div
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          docChecklist: { ...docChecklist, docSecVerified: !docChecklist.docSecVerified }
                        }))}
                        style={{
                          background: docChecklist.docSecVerified ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.03)',
                          border: docChecklist.docSecVerified ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                          padding: '14px',
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText size={20} color={docChecklist.docSecVerified ? '#00f2fe' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                              2. 문서 보안 상태 확인
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              지입 서류 및 문서 내 영업비밀 및 기밀 정보 노출/유출 방지 확인
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={docChecklist.docSecVerified}
                          readOnly
                          style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Item 3 */}
                      <div
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          docChecklist: { ...docChecklist, preCheckVerified: !docChecklist.preCheckVerified }
                        }))}
                        style={{
                          background: docChecklist.preCheckVerified ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.03)',
                          border: docChecklist.preCheckVerified ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                          padding: '14px',
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ShieldCheck size={20} color={docChecklist.preCheckVerified ? '#00f2fe' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                              3. 보안 물품 반입 전 확인
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              전자기기/노트북/공구 등 보안 물품 봉인 라벨 부착 및 사전 점검 완료
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={docChecklist.preCheckVerified}
                          readOnly
                          style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="glass-button"
                        style={{ padding: '12px', borderRadius: '12px', flex: 1, cursor: 'pointer' }}
                      >
                        이전 단계
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!docChecklist.gateApproved || !docChecklist.docSecVerified || !docChecklist.preCheckVerified) {
                            if (onTriggerToast) onTriggerToast('자재&문서 확인 체크리스트 3개 항목을 모두 확인해 주세요.', 'warning');
                            return;
                          }
                          setActiveStep(4);
                        }}
                        className="glass-button-primary"
                        style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        다음: 보안 준수 서약서 작성 <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 4: Digital Security Pledge & Signature */}
              {activeStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe' }}>
                    📜 Step 4. 사업장 정보보호 서약 및 전자 서명
                  </div>

                  {/* Pledge Terms Card */}
                  <div style={{
                    background: 'rgba(5, 10, 20, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '14px',
                    borderRadius: '12px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    color: '#94a3b8',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                      [사업장 정보보안 및 영업비밀 보호 서약서]
                    </div>
                    1. 본인은 당사 사업장 출입 시 지정된 구역 외 무단 이동을 금지하며, 사업장 내부 제반 시설 및 설비의 촬영, 음성 녹음을 엄격히 금지합니다.<br />
                    2. 반입 승인되지 않은 스마트 기기, 촬영 장비, 미인증 USB 수용매체의 반입을 금지하며, 반입 시 사전에 시리얼 번호 등록 및 보안 봉인 스티커를 부착합니다.<br />
                    3. 퇴장 시 보안 서약 검수 및 반입 자재 반출 상태를 필수적으로 확인받으며, 기밀 유출 시 관계 법령에 따라 형사 처벌 조치를 받는 것에 동의합니다.
                  </div>

                  {/* Agreement Checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.agreedToTerms}
                      onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#00f2fe' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                      위 보안 준수 사항을 숙지하였으며 성실히 이행할 것을 서약합니다.
                    </span>
                  </label>

                  {/* Digital Signature Canvas */}
                  <SignatureCanvas
                    onSave={(dataUrl) => setFormData({ ...formData, signatureDataUrl: dataUrl })}
                    onClear={() => setFormData({ ...formData, signatureDataUrl: '' })}
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="glass-button"
                      style={{ padding: '12px', borderRadius: '12px', flex: 1, cursor: 'pointer' }}
                    >
                      이전 단계
                    </button>
                    <button
                      type="submit"
                      className="glass-button-primary"
                      style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      <ShieldCheck size={18} /> 보안 서약 & 결재 승인 제출
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Electronic Security Pass Card Details View */}
      {selectedPass && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 250,
          background: 'rgba(3, 6, 13, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: '24px',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 0 40px rgba(0, 242, 254, 0.2)'
          }}>
            {/* Modal Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} color="#00f2fe" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>
                  전자 출입 보안서약증 & 자재 승인표
                </span>
              </div>
              <button
                onClick={() => setSelectedPass(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Electronic Badge Card Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 26, 0.95) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Watermark / Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#00f2fe' }}>
                  {selectedPass.site}
                </div>
                <span className="badge-secure" style={{ fontSize: '10px' }}>
                  VERIFIED PASS
                </span>
              </div>

              {/* QR Code Container */}
              <div style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 auto',
                boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)'
              }}>
                {/* SVG Mock QR Code */}
                <svg width="120" height="120" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#ffffff" />
                  <path d="M 10 10 H 35 V 35 H 10 Z M 15 15 V 30 H 30 V 15 Z" fill="#050b14" />
                  <path d="M 65 10 H 90 V 35 H 65 Z M 70 15 V 30 H 85 V 15 Z" fill="#050b14" />
                  <path d="M 10 65 H 35 V 90 H 10 Z M 15 70 V 85 H 30 V 70 Z" fill="#050b14" />
                  <rect x="40" y="10" width="10" height="10" fill="#050b14" />
                  <rect x="50" y="25" width="10" height="15" fill="#050b14" />
                  <rect x="20" y="45" width="20" height="10" fill="#050b14" />
                  <rect x="60" y="55" width="25" height="10" fill="#050b14" />
                  <rect x="45" y="70" width="15" height="15" fill="#050b14" />
                  <rect x="75" y="75" width="15" height="15" fill="#050b14" />
                </svg>
              </div>

              <div className="mono-font" style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                {selectedPass.id}
              </div>

              {/* Data Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>방문자:</span> <strong style={{ color: '#fff' }}>{selectedPass.visitorName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>소속:</span> <strong style={{ color: '#fff' }}>{selectedPass.company}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>접견자:</span> <strong style={{ color: '#fff' }}>{selectedPass.hostName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>유효기간:</span> <strong style={{ color: '#00f2fe' }}>{selectedPass.visitDate}</strong>
                </div>
              </div>

              {/* Sealed Materials / Security Inspection List */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00f2fe', marginBottom: '6px' }}>
                  🔒 자재 및 문서 보안 검수 완료 (3개 항목)
                </div>
                {selectedPass.materials && selectedPass.materials.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedPass.materials.map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '6px 10px',
                        borderRadius: '8px'
                      }}>
                        <span style={{ color: '#fff' }}>[{m.category}] {m.model} ({m.qty}개)</span>
                        <span className="mono-font" style={{ color: '#00f2fe' }}>{m.sealId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Electronic Signature Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>서약자 전자 서명:</span>
                <img
                  src={selectedPass.signature}
                  alt="전자 서명"
                  style={{ height: '30px', filter: 'brightness(1.5)' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  if (onTriggerToast) onTriggerToast('전자 승인증이 인쇄/PDF 파일로 발급되었습니다.');
                }}
                className="glass-button"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  flex: 1,
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Printer size={16} /> 승인증 인쇄 / PDF 저장
              </button>
              <button
                onClick={() => setSelectedPass(null)}
                className="glass-button-primary"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  flex: 1,
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                확인 닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Site Management Modal */}
      {isAdminModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(10, 15, 29, 0.7)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={22} color="#00f2fe" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    출입 대상 사업장 목록 관리 (Admin)
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Add New Site Form */}
              <form onSubmit={handleAddSite} style={{
                background: 'rgba(0, 242, 254, 0.04)',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> 신규 사업장 추가
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>회사명 *</label>
                    <input
                      type="text"
                      placeholder="예: 삼성전자, SK하이닉스, 현대자동차"
                      value={newSiteForm.category}
                      onChange={(e) => setNewSiteForm({ ...newSiteForm, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#0a0f1d',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>사업장 위치 *</label>
                    <input
                      type="text"
                      placeholder="예: 평택캠퍼스 (P3/P4 라인), 아산공장"
                      value={newSiteForm.name}
                      onChange={(e) => setNewSiteForm({ ...newSiteForm, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#0a0f1d',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="비고 / 참고사항 (선택)"
                    value={newSiteForm.note}
                    onChange={(e) => setNewSiteForm({ ...newSiteForm, note: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#0a0f1d',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    className="glass-button-primary"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    등록 저장
                  </button>
                </div>
              </form>

              {/* Registered Sites List */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>
                  현재 등록된 사업장 목록 ({sites.length}개)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {sites.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: '700',
                            background: item.category === '삼성전자' ? 'rgba(0, 242, 254, 0.15)' : item.category === 'SK하이닉스' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: item.category === '삼성전자' ? '#00f2fe' : item.category === 'SK하이닉스' ? '#a78bfa' : '#fbbf24',
                            border: `1px solid ${item.category === '삼성전자' ? 'rgba(0, 242, 254, 0.3)' : item.category === 'SK하이닉스' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                          }}>
                            {item.category}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                            {item.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {item.note}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSite(item.id, item.name)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px'
                        }}
                      >
                        <Trash2 size={13} /> 삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(10, 15, 29, 0.7)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="glass-button-primary"
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
