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
  Award
} from 'lucide-react';
import SignatureCanvas from '../SignatureCanvas';
import { dbService } from '../../services/dbService';

export default function SiteSecurityChecklistTab({ onTriggerToast }) {
  // Mock Initial Registrations
  const initialMock = [
    {
      id: 'SEC-PASS-2026-001',
      site: '삼성전자 평택캠퍼스 (P3 라인)',
      visitorName: '홍길동',
      company: '(주)위드설비보안',
      phone: '010-3849-1928',
      hostName: '김삼성 책임 (반도체설비팀)',
      purpose: 'FAB P3 2층 초순수 배관 정기 점검 및 시공',
      visitDate: '2026-08-07 ~ 2026-08-09',
      mdmVerified: true,
      mdmToken: 'MDM-SAM-89412-OK',
      cameraLocked: true,
      materials: [
        { category: '노트북', model: 'Galaxy Book Pro 15', serial: 'SN-SAMP3-9941', qty: 1, sealId: 'SEC-SEAL-8831' },
        { category: '공구/측정기', model: '레이저 수평 계측기 Fluke-88', serial: 'FLK-99382', qty: 1, sealId: 'SEC-SEAL-8832' }
      ],
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M 10 25 Q 30 5 50 25 T 90 25" stroke="%2300f2fe" stroke-width="2" fill="none"/></svg>',
      status: '승인완료',
      createdAt: '2026-08-07 09:15'
    }
  ];

  const [checklistList, setChecklistList] = useState(initialMock);

  // Load from IndexedDB on component mount
  useEffect(() => {
    async function loadFromDB() {
      try {
        const dbItems = await dbService.getChecklists();
        if (dbItems && dbItems.length > 0) {
          setChecklistList(dbItems);
        } else {
          // Initialize DB with initial records
          for (const item of initialMock) {
            await dbService.saveChecklist(item);
          }
        }
      } catch (err) {
        console.error('Failed to load checklists from DB:', err);
      }
    }
    loadFromDB();
  }, []);
,
    {
      id: 'SEC-PASS-2026-002',
      site: 'SK하이닉스 이천캠퍼스 (M16 라인)',
      visitorName: '이수석',
      company: '(주)한국반도체엔지니어링',
      phone: '010-8831-4091',
      hostName: '박하이 수석 (EUV장비팀)',
      purpose: 'M16 EUV 노광 장비 센서 캘리브레이션 지원',
      visitDate: '2026-08-07 ~ 2026-08-07',
      mdmVerified: true,
      mdmToken: 'MDM-HYN-77301-OK',
      cameraLocked: true,
      materials: [
        { category: '노트북', model: 'ThinkPad P1 Gen5', serial: 'PF-3982A1', qty: 1, sealId: 'HYN-SEAL-1104' },
        { category: 'USB/스토리지', model: '보안 전용 USB 64GB', serial: 'USB-SEC-0912', qty: 2, sealId: 'HYN-SEAL-1105' }
      ],
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M 10 20 Q 40 35 70 10 T 90 30" stroke="%2300f2fe" stroke-width="2" fill="none"/></svg>',
      status: '승인완료',
      createdAt: '2026-08-07 11:30'
    },
    {
      id: 'SEC-PASS-2026-003',
      site: '삼성전자 화성캠퍼스 (EUV 라인)',
      visitorName: '최보안',
      company: '(주)위드네트웍스',
      phone: '010-5541-9021',
      hostName: '이화성 선임 (네트워크보안팀)',
      purpose: '네트워크 스위치 라우터 교체 작업',
      visitDate: '2026-08-08 ~ 2026-08-08',
      mdmVerified: true,
      mdmToken: 'MDM-SAM-11923-WAIT',
      cameraLocked: true,
      materials: [
        { category: '노트북', model: 'MacBook Pro 16', serial: 'C02FX931MD6R', qty: 1, sealId: 'SEC-SEAL-9012' }
      ],
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M 10 15 Q 50 30 80 15" stroke="%2300f2fe" stroke-width="2" fill="none"/></svg>',
      status: '결재대기',
      createdAt: '2026-08-07 15:40'
    }
  ]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Form State for New Entry Pass
  const [formData, setFormData] = useState({
    site: '삼성전자 평택캠퍼스 (P3 라인)',
    visitorName: '',
    company: '',
    phone: '',
    hostName: '',
    purpose: '',
    visitDate: `${new Date().toISOString().split('T')[0]} ~ ${new Date().toISOString().split('T')[0]}`,
    mdmVerified: true,
    cameraLocked: true,
    audioLocked: true,
    tetheringDisabled: true,
    mdmToken: `MDM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    materials: [
      { category: '노트북', model: '', serial: '', qty: 1, sealId: `SEAL-${Math.floor(1000 + Math.random() * 9000)}` }
    ],
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
    e.preventDefault();
    if (!formData.visitorName || !formData.company || !formData.hostName) {
      if (onTriggerToast) onTriggerToast('방문자 및 담당자 필수 정보를 입력해주세요.');
      return;
    }
    if (!formData.agreedToTerms) {
      if (onTriggerToast) onTriggerToast('보안 준수 서약서에 동의하여 주십시오.');
      return;
    }
    if (!formData.signatureDataUrl) {
      if (onTriggerToast) onTriggerToast('전자 서명을 작성해 주십시오.');
      return;
    }

    const newPass = {
      id: `SEC-PASS-2026-00${checklistList.length + 1}`,
      site: formData.site,
      visitorName: formData.visitorName,
      company: formData.company,
      phone: formData.phone || '010-0000-0000',
      hostName: formData.hostName,
      purpose: formData.purpose || '사업장 시설 점검 및 작업',
      visitDate: formData.visitDate,
      mdmVerified: formData.mdmVerified,
      mdmToken: formData.mdmToken,
      cameraLocked: formData.cameraLocked,
      materials: formData.materials.filter(m => m.model || m.serial),
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
      site: '삼성전자 평택캠퍼스 (P3 라인)',
      visitorName: '',
      company: '',
      phone: '',
      hostName: '',
      purpose: '',
      visitDate: `${new Date().toISOString().split('T')[0]} ~ ${new Date().toISOString().split('T')[0]}`,
      mdmVerified: true,
      cameraLocked: true,
      audioLocked: true,
      tetheringDisabled: true,
      mdmToken: `MDM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      materials: [
        { category: '노트북', model: '', serial: '', qty: 1, sealId: `SEAL-${Math.floor(1000 + Math.random() * 9000)}` }
      ],
      agreedToTerms: false,
      signatureDataUrl: ''
    });

    if (onTriggerToast) {
      onTriggerToast(`[${newPass.site}] 보안서약 및 지입자재 승인증이 정상 등록되었습니다.`);
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
                삼성 · SK하이닉스 사업장 출입 보안 검수 Hub
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              모바일 보안 앱(MDM) 검수 · 지입 자재 시리얼 봉인 · 전자 보안 서약서 통합 관리
            </p>
          </div>

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
            <Plus size={18} /> 신규 출입 보안서약 & 자재 반입 등록
          </button>
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
                  <div style={{ color: '#64748b', fontSize: '11px' }}>지입자재 봉인등록</div>
                  <div style={{ color: '#f59e0b', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PackageCheck size={13} /> {item.materials.length}개 품목 봉인
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
                { step: 3, label: '3. 지입자재 봉인' },
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

                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      출입 대상 사업장 (필수)
                    </label>
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
                      <option value="삼성전자 평택캠퍼스 (P3 라인)">삼성전자 평택캠퍼스 (P3/P4 라인)</option>
                      <option value="삼성전자 화성캠퍼스 (EUV/메모리)">삼성전자 화성캠퍼스 (EUV/메모리)</option>
                      <option value="삼성전자 기흥/온양 사업장">삼성전자 기흥/온양 사업장</option>
                      <option value="SK하이닉스 이천캠퍼스 (M16/M14)">SK하이닉스 이천캠퍼스 (M16/M14)</option>
                      <option value="SK하이닉스 청주캠퍼스 (M15)">SK하이닉스 청주캠퍼스 (M15)</option>
                      <option value="LG디스플레이 파주 사업장">LG디스플레이 파주 사업장</option>
                    </select>
                  </div>

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
                        소속 회사명 *
                      </label>
                      <input
                        type="text"
                        placeholder="(주)회사명"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        사업장 접견 담당자 *
                      </label>
                      <input
                        type="text"
                        placeholder="김삼성 책임 (부서명)"
                        value={formData.hostName}
                        onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
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
                      방문 목적 상세
                    </label>
                    <textarea
                      placeholder="예: 반도체 FAB 설비 유지보수 및 공구 자재 반입 점검"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#0a0f1d',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>

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

              {/* STEP 2: Mobile Security App (MDM) Verification */}
              {activeStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe' }}>
                    📱 Step 2. 단말기 모바일 보안 앱(MDM) & 차단 기능 검수
                  </div>

                  {/* Security App Status Indicator Card */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '14px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Smartphone size={22} color="#10b981" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                          {formData.site.includes('삼성') ? '삼성 모바일 보안 (Mobile Security)' : 'SK하이닉스 MDM 보안 앱'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          보안 정책 인증 토큰: <span className="mono-font" style={{ color: '#00f2fe' }}>{formData.mdmToken}</span>
                        </div>
                      </div>
                    </div>

                    <span className="badge-secure">
                      <CheckCircle2 size={12} /> 인증 성공
                    </span>
                  </div>

                  {/* Checklist of locks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Camera size={18} color="#f43f5e" />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>카메라 렌즈 차단 락 (Camera Lock)</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>전/후면 카메라 촬영 소프트웨어 차단 및 봉인 스티커 부착</div>
                        </div>
                      </div>
                      <div className="toggle-switch active">
                        <div className="toggle-switch-handle" />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MicOff size={18} color="#f59e0b" />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>음성 녹음 및 마이크 차단</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>음성 녹음 앱 제한 및 마이크 입력 제어</div>
                        </div>
                      </div>
                      <div className="toggle-switch active">
                        <div className="toggle-switch-handle" />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <WifiOff size={18} color="#3b82f6" />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>테더링 / Wi-Fi Direct 비활성화</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>무선 데이터 유출 방지를 위한 테더링 락</div>
                        </div>
                      </div>
                      <div className="toggle-switch active">
                        <div className="toggle-switch-handle" />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="glass-button"
                      style={{ padding: '12px', borderRadius: '12px', flex: 1, cursor: 'pointer' }}
                    >
                      이전 단계
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="glass-button-primary"
                      style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      다음: 지입자재 및 장비 봉인 등록 <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Incoming Material & Equipment Checklist */}
              {activeStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#00f2fe' }}>
                      📦 Step 3. 반입 지입 자재 & 장비 체크리스트
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMaterial}
                      style={{
                        background: 'rgba(0, 242, 254, 0.15)',
                        border: '1px solid rgba(0, 242, 254, 0.4)',
                        color: '#00f2fe',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> 품목 추가
                    </button>
                  </div>

                  {/* Materials Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formData.materials.map((mat, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '14px',
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc' }}>
                            자재/장비 품목 #{idx + 1}
                          </span>
                          {formData.materials.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(idx)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: '#94a3b8' }}>분류</label>
                            <select
                              value={mat.category}
                              onChange={(e) => handleMaterialChange(idx, 'category', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '8px',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            >
                              <option value="노트북">노트북 / 태블릿</option>
                              <option value="USB/스토리지">USB / 외장드라이브</option>
                              <option value="공구/측정기">공구 / 계측 장비</option>
                              <option value="차량">출입 작업 차량</option>
                              <option value="기타자재">기타 반입 자재</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '10px', color: '#94a3b8' }}>모델명 / 상세품목 *</label>
                            <input
                              type="text"
                              placeholder="예: ThinkPad P1 Gen5"
                              value={mat.model}
                              onChange={(e) => handleMaterialChange(idx, 'model', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '8px',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: '#94a3b8' }}>시리얼 번호 (S/N)</label>
                            <input
                              type="text"
                              placeholder="SN-994182"
                              value={mat.serial}
                              onChange={(e) => handleMaterialChange(idx, 'serial', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '8px',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '10px', color: '#94a3b8' }}>수량</label>
                            <input
                              type="number"
                              min="1"
                              value={mat.qty}
                              onChange={(e) => handleMaterialChange(idx, 'qty', parseInt(e.target.value) || 1)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '8px',
                                background: '#0a0f1d',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '10px', color: '#94a3b8' }}>보안스티커 봉인태그 ID</label>
                            <input
                              type="text"
                              value={mat.sealId}
                              readOnly
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '8px',
                                background: 'rgba(0, 242, 254, 0.08)',
                                border: '1px solid rgba(0, 242, 254, 0.3)',
                                color: '#00f2fe',
                                fontSize: '11px',
                                fontWeight: '700',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
                      onClick={() => setActiveStep(4)}
                      className="glass-button-primary"
                      style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      다음: 보안 준수 서약서 작성 <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

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
                    1. 본인은 당사 사업장 출입 시 지정된 구역 외 무단 이동을 금지하며, 사업장 내부 제반 시설 및 설비의 촬영, 음성 녹음을 엄격히 금지합니다.<br/>
                    2. 반입 승인되지 않은 스마트 기기, 촬영 장비, 미인증 USB 수용매체의 반입을 금지하며, 반입 시 사전에 시리얼 번호 등록 및 보안 봉인 스티커를 부착합니다.<br/>
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

              {/* Sealed Materials List */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', marginBottom: '6px' }}>
                  🔒 봉인 등록 지입 자재 목록 ({selectedPass.materials.length}건)
                </div>
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

    </div>
  );
}
