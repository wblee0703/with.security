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
  UserPlus,
  LogIn,
  ChevronRight,
  ChevronLeft,
  Calendar,
  ExternalLink,
  Award,
  Settings
} from 'lucide-react';

import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';

export default function SiteSecurityChecklistTab({ onTriggerToast }) {
  const [checklistList, setChecklistList] = useState([]);

  // Load from IndexedDB on component mount
  useEffect(() => {
    async function loadFromDB() {
      try {
        const dbItems = await dbService.getChecklists();
        setChecklistList(dbItems || []);
      } catch (err) {
        console.error('Failed to load checklists from DB:', err);
      }
    }
    loadFromDB();
  }, []);

  // Admin Managed Entrance Sites State
  const [sites, setSites] = useState([]);

  // Login Modal & Active Check State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [inlineAuthMode, setInlineAuthMode] = useState('login'); // 'login' | 'signup'
  const [inlineLogin, setInlineLogin] = useState({ username: '', password: '' });
  const [inlineSignup, setInlineSignup] = useState({
    username: '',
    password: '',
    division: 'DS부문 (반도체)',
    team: '보안관제팀',
    rank: '책임',
    name: '',
    phone: '',
    email: ''
  });

  // Current Logged in User State (For Team-Level Security Isolation)
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function loadSitesAndUser() {
      try {
        const siteList = await dbService.getSites();
        setSites(siteList);
        const activeUser = await dbService.getUserProfile();
        setCurrentUser(activeUser);
        const userTeam = activeUser ? (activeUser.team || activeUser.department || '') : '';
        setFormData(prev => ({
          ...prev,
          site: '',
          visitorName: activeUser ? activeUser.name : prev.visitorName,
          phone: activeUser ? activeUser.phone : prev.phone,
          team: userTeam || prev.team,
          department: userTeam || prev.department,
          rank: activeUser ? activeUser.rank : prev.rank
        }));
      } catch (err) {
        console.error('Failed to load sites & user:', err);
      }
    }
    loadSitesAndUser();
  }, []);

  // Handle Open Pledge Form Button Click (Login Enforcement)
  const handleOpenPledgeModal = async () => {
    const active = await dbService.getUserProfile();
    setCurrentUser(active);
    if (!active) {
      if (onTriggerToast) onTriggerToast('보안 서약을 작성하려면 로그인이 필요합니다.', 'warning');
      setIsLoginModalOpen(true);
      return;
    }
    resetAppVerificationState();
    const userTeam = active ? (active.team || active.department || '') : '';
    setFormData(prev => ({
      ...prev,
      visitorName: active.name || prev.visitorName,
      phone: active.phone || prev.phone,
      team: userTeam || prev.team,
      department: userTeam || prev.department,
      rank: active.rank || prev.rank
    }));
    setIsModalOpen(true);
  };

  // Handle Inline Login Submit
  const handleInlineLoginSubmit = async (e) => {
    e.preventDefault();
    if (!inlineLogin.username.trim() || !inlineLogin.password.trim()) {
      if (onTriggerToast) onTriggerToast('아이디와 비밀번호를 입력해 주세요.', 'warning');
      return;
    }

    const users = await dbService.getRegisteredUsers();
    const inputHash = await hashPassword(inlineLogin.password);
    const match = users.find(u =>
      u.username === inlineLogin.username.trim() &&
      (u.passwordHash === inputHash || u.password === inlineLogin.password)
    );

    if (match) {
      await dbService.saveUserProfile(match);
      setCurrentUser(match);
      const userTeam = match.team || match.department || '';
      setFormData(prev => ({
        ...prev,
        visitorName: match.name || prev.visitorName,
        phone: match.phone || prev.phone,
        team: userTeam || prev.team,
        department: userTeam || prev.department,
        rank: match.rank || prev.rank
      }));
      setIsLoginModalOpen(false);
      setIsModalOpen(true);
      setInlineLogin({ username: '', password: '' });
      if (onTriggerToast) onTriggerToast(`'${match.name}'님 로그인 성공! 보안 서약 작성을 진행합니다.`, 'success');
    } else {
      if (onTriggerToast) onTriggerToast('아이디 또는 비밀번호가 일치하지 않습니다.', 'warning');
    }
  };

  // Handle Inline Signup Submit
  const handleInlineSignupSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inlineSignup.username.trim() || !inlineSignup.password.trim() || !inlineSignup.name.trim()) {
      if (onTriggerToast) onTriggerToast('아이디, 비밀번호 및 성명은 필수 입력 항목입니다.', 'warning');
      return;
    }

    const users = await dbService.getRegisteredUsers();
    if (users.some(u => u.username === inlineSignup.username.trim())) {
      if (onTriggerToast) onTriggerToast('이미 존재하는 아이디입니다. 다른 아이디를 입력해 주세요.', 'warning');
      return;
    }

    const passwordHash = await hashPassword(inlineSignup.password);
    const newUser = {
      username: inlineSignup.username.trim(),
      passwordHash: passwordHash,
      role: '일반',
      division: inlineSignup.division.trim() || '일반사업부',
      team: inlineSignup.team.trim() || '운영팀',
      rank: inlineSignup.rank.trim() || '매니저',
      name: inlineSignup.name.trim(),
      phone: inlineSignup.phone.trim() || '010-0000-0000',
      email: inlineSignup.email.trim() || `${inlineSignup.username}@withsecurity.com`
    };

    await dbService.saveUserProfile(newUser);
    setCurrentUser(newUser);
    setFormData(prev => ({
      ...prev,
      visitorName: newUser.name,
      phone: newUser.phone,
      team: newUser.team,
      department: newUser.team,
      rank: newUser.rank
    }));
    setIsLoginModalOpen(false);
    setIsModalOpen(true);
    setInlineSignup({
      username: '',
      password: '',
      division: 'DS부문 (반도체)',
      team: '보안관제팀',
      rank: '책임',
      name: '',
      phone: '',
      email: ''
    });
    if (onTriggerToast) onTriggerToast(`'${newUser.name}'님 회원가입 및 로그인 완료! 보안 서약 작성을 진행합니다.`, 'success');
  };

  // Delete Pledge Record Handler
  const handleDeletePledge = async (id, siteName) => {
    try {
      await dbService.deleteItem('checklists', id);
      const updated = checklistList.filter(item => item.id !== id);
      setChecklistList(updated);
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(updated));
      if (onTriggerToast) onTriggerToast(`[${siteName}] 서약증 이력이 삭제되었습니다.`, 'info');
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Mobile Security App Detection Helper (Samsung MDM vs SK Hynix SSM vs General)
  const getTargetSecurityAppInfo = (siteName = '') => {
    if (!siteName || !siteName.trim()) {
      return {
        appName: '출입 대상 사업장 미선택',
        appCode: 'NO_SITE_SELECTED',
        shortName: '사업장 미선택',
        packageName: 'none',
        scheme: '',
        tokenPrefix: 'NONE-',
        company: '사업장 미선택',
        color: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        desc: '⚠️ 1단계에서 출입 대상 사업장을 먼저 선택해 주세요.'
      };
    }
    if (siteName.includes('삼성')) {
      return {
        appName: '삼성 보안 어플 (MDM)',
        appCode: 'SAMSUNG_MDM',
        shortName: '삼성보안어플',
        packageName: 'com.samsung.knox.mdm',
        scheme: 'sec-mdm://',
        intentUri: 'intent://#Intent;scheme=sec-mdm;end',
        tokenPrefix: 'MDM-SAM-',
        company: '삼성전자',
        color: '#00f2fe',
        badgeBg: 'rgba(0, 242, 254, 0.15)',
        desc: '삼성전자 사업장 출입 전용 모바일 보안 어플 가동 필수'
      };
    } else if (siteName.includes('SK') || siteName.includes('하이닉스')) {
      return {
        appName: 'SK하이닉스 보안 어플 (SSM)',
        appCode: 'HYNIX_SSM',
        shortName: 'SK하이닉스 SSM 어플',
        packageName: 'com.skhynix.ssm',
        scheme: 'ssm-hynix://',
        intentUri: 'intent://#Intent;scheme=ssm-hynix;end',
        tokenPrefix: 'SSM-SKH-',
        company: 'SK하이닉스',
        color: '#a78bfa',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        desc: 'SK하이닉스 사업장 출입 전용 모바일 보안 어플 가동 필수'
      };
    } else {
      return {
        appName: '일반 사업장 출입 보안 (카메라 봉인 스티커)',
        appCode: 'GENERAL_SECURITY',
        shortName: '일반 보안 가이드',
        packageName: 'com.security.general',
        scheme: 'security://',
        intentUri: '',
        tokenPrefix: 'GEN-SEC-',
        company: '기타 사업장',
        color: '#fbbf24',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        desc: '카메라 렌즈 봉인 스티커 부착 및 기본 사업장 보안 준수'
      };
    }
  };

  // Mobile Device Detector Helper
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // App Scan & Verification State
  const [appScanState, setAppScanState] = useState({
    isScanning: false,
    status: 'NOT_INSTALLED', // 'VERIFIED' | 'NOT_RUNNING' | 'NOT_INSTALLED' | 'CAMERA_UNLOCKED'
    lastScannedAt: null,
    scanLog: []
  });

  // App Installation Check Verified State
  const [appCheckState, setAppCheckState] = useState({
    isChecking: false,
    isVerified: false
  });

  // Camera Restriction Live Test State
  const [cameraCheckState, setCameraCheckState] = useState({
    isTesting: false,
    isVerified: false,
    result: null, // 'LOCKED' | 'UNLOCKED'
    message: ''
  });

  // Reset Security App & Camera Verification States (Mandatory Re-verification on modal open/close)
  const resetAppVerificationState = () => {
    setAppCheckState({ isChecking: false, isVerified: false });
    setCameraCheckState({ isTesting: false, isVerified: false, result: null, message: '' });
    setAppScanState({ isScanning: false, status: 'NOT_INSTALLED', lastScannedAt: null, scanLog: [] });
    setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
  };

  // Close Security Pledge Modal & Force Security App Re-verification
  const handleCloseModal = () => {
    resetAppVerificationState();
    setIsModalOpen(false);
  };

  // Unified Mobile Security App Execution Verification (Camera Hardware Block Verification)
  const handleCheckAppExecutionStatus = async () => {
    if (!formData.site || !formData.site.trim()) {
      if (onTriggerToast) onTriggerToast('1단계: 출입 대상 사업장을 먼저 선택해 주세요.', 'warning');
      setActiveStep(1);
      return;
    }
    const targetApp = getTargetSecurityAppInfo(formData.site);

    setAppCheckState({ isChecking: true, isVerified: false });
    setCameraCheckState(prev => ({ ...prev, isTesting: true, message: '' }));
    setAppScanState(prev => ({ ...prev, isScanning: true, status: 'CHECKING' }));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NOT_SUPPORTED');
      }

      // ACTUALLY ATTEMPT TO EXECUTE / OPEN CAMERA STREAM
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // IF CAMERA STREAM OPENS -> CAMERA IS WORKING & NOT BLOCKED BY MDM POLICY!
      stream.getTracks().forEach(track => track.stop());

      // STRICT FAIL! Security app is NOT RUNNING / Camera restriction is NOT active!
      setAppCheckState({ isChecking: false, isVerified: false });
      setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '' });
      setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
      setAppScanState({
        isScanning: false,
        status: 'NOT_RUNNING',
        lastScannedAt: new Date().toLocaleTimeString(),
        scanLog: []
      });

      if (onTriggerToast) {
        onTriggerToast(`⚠️ [실행 상태 확인 필요] '${targetApp.shortName}' 보안 어플이 실행되지 않았거나 보안 정책(카메라 차단)이 비활성화되어 있습니다. 어플을 실행해 주세요.`, 'warning');
      }
    } catch (err) {
      // IF CAMERA HARDWARE ACCESS IS DENIED/BLOCKED BY KNOX/MDM POLICY (NotAllowedError / SecurityError / NotReadableError)
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.name === 'NotReadableError') {
        // STRICT SUCCESS! Hardware camera access was blocked by MDM policy!
        setAppCheckState({ isChecking: false, isVerified: true });
        setCameraCheckState({ isTesting: false, isVerified: true, result: 'LOCKED', message: '' });
        setFormData(prev => ({ ...prev, mdmVerified: true, cameraLocked: true }));
        setAppScanState({
          isScanning: false,
          status: 'VERIFIED',
          lastScannedAt: new Date().toLocaleTimeString(),
          scanLog: []
        });

        if (onTriggerToast) {
          onTriggerToast(`✓ [검수 완료] '${targetApp.appName}' 가동 및 보안 정책이 정상 확인되었습니다!`, 'success');
        }
      } else {
        // PC Browser environment or no camera device error -> STRICT FAIL!
        setAppCheckState({ isChecking: false, isVerified: false });
        setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '' });
        setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
        setAppScanState({
          isScanning: false,
          status: 'NOT_RUNNING',
          lastScannedAt: new Date().toLocaleTimeString(),
          scanLog: []
        });

        if (onTriggerToast) {
          onTriggerToast(`⚠️ [실행 상태 확인 필요] 모바일 보안 정책이 감지되지 않았습니다. PC 환경인 경우 하단 개발자 수동 전환을 이용해 주세요.`, 'warning');
        }
      }
    }
  };

  // Helper for manual simulation state switch (For Dev/Demo testing on PC)
  const handleSetSimulatedStatus = (statusType) => {
    const targetApp = getTargetSecurityAppInfo(formData.site);
    if (statusType === 'NOT_RUNNING' || statusType === 'NOT_INSTALLED') {
      setAppCheckState({ isChecking: false, isVerified: false });
      setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '' });
      setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
      setAppScanState({ isScanning: false, status: 'NOT_RUNNING', lastScannedAt: null, scanLog: [] });
    } else if (statusType === 'VERIFIED') {
      setAppCheckState({ isChecking: false, isVerified: true });
      setCameraCheckState({ isTesting: false, isVerified: true, result: 'LOCKED', message: '' });
      setFormData(prev => ({ ...prev, mdmVerified: true, cameraLocked: true }));
      setAppScanState({ isScanning: false, status: 'VERIFIED', lastScannedAt: null, scanLog: [] });
    }
  };

  // Helper: Get local date string YYYY-MM-DD in user system timezone (Avoids UTC timezone shift bug)
  const getTodayLocalIsoDate = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Search & Filters & Interactive Date Navigator
  const todayStr = getTodayLocalIsoDate();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Automatic Midnight Date Rollover Sync (24:00 -> 00:00 Auto Date Refresh)
  useEffect(() => {
    let lastDateStr = getTodayLocalIsoDate();

    const intervalId = setInterval(() => {
      const currentDateStr = getTodayLocalIsoDate();
      if (currentDateStr !== lastDateStr) {
        setSelectedDate(prev => (prev === lastDateStr ? currentDateStr : prev));
        lastDateStr = currentDateStr;
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  // Date Shift Handlers (Left/Right Arrow Navigation)
  const handlePrevDay = () => {
    const parts = selectedDate.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() - 1);
    setSelectedDate(getTodayLocalIsoDate(d));
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);
    setSelectedDate(getTodayLocalIsoDate(d));
  };

  const handleToday = () => {
    setSelectedDate(getTodayLocalIsoDate());
  };

  const getFormattedKoreanDate = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month - 1, day);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = days[d.getDay()];
      return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일 (${dayName})`;
    } catch (e) {
      return dateStr;
    }
  };

  const matchesSelectedDate = (item, dateStr) => {
    if (!dateStr) return true;
    const parts = dateStr.split('-');
    if (parts.length < 3) return true;
    const y = parts[0];
    const m = String(parseInt(parts[1], 10));
    const d = String(parseInt(parts[2], 10));

    const created = item.createdAt || '';
    const visit = item.visitDate || '';

    const matchIso = created.includes(dateStr) || visit.includes(dateStr);
    const matchKr1 = created.includes(`${y}. ${m}. ${d}.`) || visit.includes(`${y}. ${m}. ${d}.`);
    const matchKr2 = created.includes(`${y}.${parts[1]}.${parts[2]}`) || visit.includes(`${y}.${parts[1]}.${parts[2]}`);
    const matchKr3 = created.includes(`${y}년 ${m}월 ${d}일`) || visit.includes(`${y}년 ${m}월 ${d}일`);

    return matchIso || matchKr1 || matchKr2 || matchKr3;
  };

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Step Navigation Handler (Allows free step navigation)
  const handleStepHeaderClick = (targetStep) => {
    setActiveStep(targetStep);
  };

  // Form State for New Entry Pass
  const [formData, setFormData] = useState({
    site: '',
    visitorName: '',
    department: '',
    rank: '',
    company: '',
    phone: '',
    hostName: '',
    purposeType: '작업',
    customPurpose: '',
    purpose: '작업',
    visitDate: `${getTodayLocalIsoDate()} ~ ${getTodayLocalIsoDate()}`,
    mdmVerified: false,
    docChecklist: {
      gateApproved: false,
      docSecVerified: false,
      preCheckVerified: false
    },
    materials: [],
    agreedToTerms: false,
    isCompanionMode: false,
    parentPledgeId: null
  });

  // Handle Open Companion Pledge Modal (Register Companion for Existing Pledge)
  const handleOpenCompanionPledgeModal = async (targetItem) => {
    const activeUser = await dbService.getUserProfile();
    if (!activeUser) {
      if (onTriggerToast) onTriggerToast('동행 보안 서약을 작성하려면 로그인이 필요합니다.', 'warning');
      setIsLoginModalOpen(true);
      return;
    }

    const userName = (activeUser.name || '').trim();
    const userPhone = (activeUser.phone || '').trim();
    const userAccount = (activeUser.username || '').trim();

    // 1) 최초 작성자(대표 등록자) 중복 검사
    const isPrimaryVisitor =
      targetItem.visitorName?.trim() === userName ||
      (userAccount && targetItem.username === userAccount) ||
      (userPhone && targetItem.phone === userPhone);

    if (isPrimaryVisitor) {
      if (onTriggerToast) {
        onTriggerToast(`'${userName || '본인'}'님은 해당 서약서의 최초 작성자(대표 등록자)입니다. 동행자로 중복 등록할 수 없습니다.`, 'warning');
      }
      return;
    }

    // 2) 이미 등록된 동행인 목록 중복 검사
    const isAlreadyCompanion = targetItem.companions?.some(c =>
      c.visitorName?.trim() === userName ||
      (userAccount && c.username && c.username === userAccount) ||
      (userPhone && c.phone && c.phone === userPhone)
    );

    if (isAlreadyCompanion) {
      if (onTriggerToast) {
        onTriggerToast(`'${userName || '본인'}'님은 이미 해당 서약서에 동행자로 등록되어 있습니다. (중복 등록 불가)`, 'warning');
      }
      return;
    }

    const userTeam = activeUser.team || activeUser.department || '';
    setFormData({
      site: targetItem.site,
      visitorName: activeUser.name || '',
      phone: activeUser.phone || '010-0000-0000',
      team: userTeam,
      department: userTeam,
      rank: activeUser.rank || '대리',
      company: userTeam,
      hostName: targetItem.hostName || '사업장 보안관제센터',
      purposeType: targetItem.purpose || '작업',
      customPurpose: '',
      purpose: targetItem.purpose || '작업',
      visitDate: targetItem.visitDate || `${getTodayLocalIsoDate()} ~ ${getTodayLocalIsoDate()}`,
      mdmVerified: false,
      docChecklist: {
        gateApproved: false,
        docSecVerified: false,
        preCheckVerified: false
      },
      materials: [],
      agreedToTerms: false,
      isCompanionMode: true,
      parentPledgeId: targetItem.id
    });

    setActiveStep(1);
    setIsModalOpen(true);
    if (onTriggerToast) onTriggerToast(`[${targetItem.site}] '${activeUser.name}'님 동행 등록 모드가 시작되었습니다.`, 'info');
  };

  // Selected Detail Modal State
  const [selectedPass, setSelectedPass] = useState(null);

  // Filtered List (Enforcing Team-Level Security Isolation & Date Navigation)
  const filteredList = checklistList.filter(item => {
    // 1. Team-Level Security Isolation Rule
    const isAdmin = currentUser?.role === '관리자' || currentUser?.role === '개발자' || currentUser?.username === 'admin';
    if (!isAdmin) {
      const userTeam = (currentUser?.team || currentUser?.department || '').trim();
      if (userTeam) {
        const itemTeam = (item.team || item.department || '').trim();
        const matchesMainTeam = itemTeam.includes(userTeam) || userTeam.includes(itemTeam);
        const matchesCompanionTeam = item.companions?.some(c => {
          const cTeam = (c.team || c.department || '').trim();
          return cTeam.includes(userTeam) || userTeam.includes(cTeam);
        });
        if (!matchesMainTeam && !matchesCompanionTeam) {
          return false;
        }
      }
    }

    // 2. Date Navigation Filter
    if (!matchesSelectedDate(item, selectedDate)) {
      return false;
    }

    // 3. Search Filter
    const matchesSearch = item.visitorName.includes(searchTerm) ||
      (item.department && item.department.includes(searchTerm)) ||
      (item.company && item.company.includes(searchTerm)) ||
      (item.rank && item.rank.includes(searchTerm)) ||
      item.site.includes(searchTerm) ||
      item.id.includes(searchTerm);

    // 4. Site Filter
    let matchesSite = true;
    if (selectedSiteFilter === '삼성전자') {
      matchesSite = item.site.includes('삼성');
    } else if (selectedSiteFilter === 'SK하이닉스') {
      matchesSite = item.site.includes('SK') || item.site.includes('하이닉스');
    } else if (selectedSiteFilter === 'OTHER') {
      matchesSite = !item.site.includes('삼성') && !item.site.includes('SK') && !item.site.includes('하이닉스');
    }

    // 5. Status Filter
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

    const activeUser = await dbService.getUserProfile();
    const targetApp = getTargetSecurityAppInfo(formData.site);

    // 1) Step 1 Validation: Site Selection & Visitor Name
    if (!formData.site || !formData.site.trim()) {
      if (onTriggerToast) onTriggerToast('1단계: 출입 대상 사업장을 선택해 주세요.', 'warning');
      setActiveStep(1);
      return;
    }
    if (!formData.visitorName || !formData.visitorName.trim()) {
      if (onTriggerToast) onTriggerToast('1단계: 방문자 성명을 입력해 주세요.', 'warning');
      setActiveStep(1);
      return;
    }

    // 2) Step 2 Validation: Security App & Camera Lock Verification
    if (!formData.mdmVerified && appScanState.status !== 'VERIFIED') {
      if (onTriggerToast) {
        onTriggerToast(`[승인 제출 거부] 2단계 모바일 보안 어플('${targetApp.shortName}') 가동 및 카메라 사용제한 검수가 완료되지 않았습니다. 2단계로 이동하여 검증해 주세요.`, 'warning');
      }
      setActiveStep(2);
      return;
    }

    // 3) Step 3 Validation: Material & Document Security Checklist
    const docCheck = formData.docChecklist || {};
    if (!docCheck.gateApproved || !docCheck.docSecVerified || !docCheck.preCheckVerified) {
      if (onTriggerToast) {
        onTriggerToast('[승인 제출 거부] 3단계 자재&문서 확인 체크리스트 3개 항목을 모두 확인해 주세요.', 'warning');
      }
      setActiveStep(3);
      return;
    }

    // 4) Step 4 Validation: Terms Agreement
    if (!formData.agreedToTerms) {
      if (onTriggerToast) onTriggerToast('4단계: 보안 준수 서약 동의 항목에 체크해 주십시오.', 'warning');
      return;
    }

    const finalPurpose = formData.purposeType === '기타'
      ? (formData.customPurpose.trim() || '기타')
      : formData.purposeType;

    const wasCompanion = formData.isCompanionMode;
    const userTeam = (formData.team || formData.department)?.trim() || '보안관제팀';

    // If Companion Registration Mode: Append companion info directly to existing pledge item!
    if (wasCompanion && formData.parentPledgeId) {
      const targetPledge = checklistList.find(item => item.id === formData.parentPledgeId);
      if (targetPledge) {
        const inputVisitorName = formData.visitorName.trim();
        const inputPhone = (formData.phone || '').trim();
        const inputUsername = activeUser?.username || '';

        // 1) 최초 작성자(대표 등록자) 중복 체크
        const isPrimaryVisitor =
          targetPledge.visitorName?.trim() === inputVisitorName ||
          (inputUsername && targetPledge.username === inputUsername) ||
          (inputPhone && targetPledge.phone === inputPhone);

        if (isPrimaryVisitor) {
          if (onTriggerToast) {
            onTriggerToast(`'${inputVisitorName}'님은 이미 해당 서약서의 최초 작성자(대표 등록자)입니다. 중복 동행 등록할 수 없습니다.`, 'warning');
          }
          return;
        }

        // 2) 이미 등록된 동행인 목록 중복 체크
        const isAlreadyCompanion = targetPledge.companions?.some(c =>
          c.visitorName?.trim() === inputVisitorName ||
          (inputUsername && c.username && c.username === inputUsername) ||
          (inputPhone && c.phone && c.phone === inputPhone)
        );

        if (isAlreadyCompanion) {
          if (onTriggerToast) {
            onTriggerToast(`'${inputVisitorName}'님은 이미 해당 서약서에 동행자로 등록되어 있습니다. (중복 등록 불가)`, 'warning');
          }
          return;
        }

        const newCompanion = {
          id: `COMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          visitorName: inputVisitorName,
          username: inputUsername,
          team: userTeam,
          department: userTeam,
          rank: formData.rank?.trim() || '대리',
          phone: inputPhone || '010-0000-0000',
          createdAt: new Date().toLocaleString('ko-KR', { hour12: false })
        };

        const updatedPledge = {
          ...targetPledge,
          companions: [...(targetPledge.companions || []), newCompanion]
        };

        try {
          await dbService.saveChecklist(updatedPledge);
        } catch (err) {
          console.error('Failed to update pass in DB:', err);
        }

        setChecklistList(prev => prev.map(item => item.id === updatedPledge.id ? updatedPledge : item));
        handleCloseModal();
        setActiveStep(1);

        // Reset Form
        const activeTeam = activeUser ? (activeUser.team || activeUser.department || '') : '';
        setFormData({
          site: '',
          visitorName: activeUser ? activeUser.name : '',
          team: activeTeam,
          department: activeTeam,
          rank: activeUser ? activeUser.rank : '',
          company: '',
          phone: activeUser ? activeUser.phone : '',
          hostName: '',
          purposeType: '작업',
          customPurpose: '',
          purpose: '작업',
          visitDate: `${getTodayLocalIsoDate()} ~ ${getTodayLocalIsoDate()}`,
          mdmVerified: false,
          docChecklist: {
            gateApproved: false,
            docSecVerified: false,
            preCheckVerified: false
          },
          materials: [],
          agreedToTerms: false,
          isCompanionMode: false,
          parentPledgeId: null
        });

        if (onTriggerToast) {
          onTriggerToast(`[${updatedPledge.site}] '${newCompanion.visitorName}' 동행 서약 정보가 해당 내역에 추가되었습니다.`, 'success');
        }
        return;
      }
    }

    const newPass = {
      id: `SEC-PASS-2026-${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')}`,
      site: formData.site,
      visitorName: formData.visitorName.trim(),
      team: userTeam,
      department: userTeam,
      rank: formData.rank?.trim() || '대리',
      company: userTeam,
      phone: formData.phone || '010-0000-0000',
      hostName: '사업장 보안관제센터',
      purpose: finalPurpose,
      visitDate: formData.visitDate,
      mdmVerified: formData.mdmVerified,
      docChecklist: formData.docChecklist || { gateApproved: false, docSecVerified: false, preCheckVerified: false },
      materials: [],
      status: '승인완료',
      companions: [],
      createdAt: new Date().toLocaleString('ko-KR', { hour12: false })
    };

    try {
      await dbService.saveChecklist(newPass);
    } catch (err) {
      console.error('Failed to save pass to DB:', err);
    }

    setChecklistList([newPass, ...checklistList]);
    handleCloseModal();
    setActiveStep(1);

    // Reset Form
    const activeTeam = activeUser ? (activeUser.team || activeUser.department || '') : '';
    setFormData({
      site: '',
      visitorName: activeUser ? activeUser.name : '',
      team: activeTeam,
      department: activeTeam,
      rank: activeUser ? activeUser.rank : '',
      company: '',
      phone: activeUser ? activeUser.phone : '',
      hostName: '',
      purposeType: '작업',
      customPurpose: '',
      purpose: '작업',
      visitDate: `${new Date().toISOString().split('T')[0]} ~ ${new Date().toISOString().split('T')[0]}`,
      mdmVerified: false,
      docChecklist: {
        gateApproved: false,
        docSecVerified: false,
        preCheckVerified: false
      },
      materials: [],
      agreedToTerms: false,
      isCompanionMode: false,
      parentPledgeId: null
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
              모바일 보안 앱 · 자재&문서 확인 · 전자 서약서
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleOpenPledgeModal}
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
      </div>

      {/* Interactive Date Selector Navigation Bar (Proportionally Spaced & Balanced) */}
      <div className="glass-panel" style={{
        padding: '12px 20px',
        borderRadius: '16px',
        background: 'rgba(0, 242, 254, 0.05)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '16px'
      }}>
        <button
          type="button"
          onClick={handlePrevDay}
          title="이전 날짜"
          style={{
            flex: '0 0 38px',
            height: '38px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            background: 'rgba(0, 242, 254, 0.12)',
            color: '#00f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '17px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
            {getFormattedKoreanDate(selectedDate)}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
            해당 날짜 서약: <strong style={{ color: '#00f2fe', fontSize: '16px', fontWeight: '800' }}>{filteredList.length}건</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          title="다음 날짜"
          style={{
            flex: '0 0 38px',
            height: '38px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            background: 'rgba(0, 242, 254, 0.12)',
            color: '#00f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronRight size={20} />
        </button>
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
            { id: 'SK하이닉스', label: 'SK하이닉스' },
            { id: 'OTHER', label: '기타 사업장' }
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
              {/* Row Header: Site Title & Companion Register Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} color={item.site.includes('삼성전자') ? '#00f2fe' : '#8b5cf6'} />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                    {item.site}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenCompanionPledgeModal(item)}
                    style={{
                      background: 'rgba(0, 242, 254, 0.12)',
                      border: '1px solid rgba(0, 242, 254, 0.35)',
                      color: '#00f2fe',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(0, 242, 254, 0.15)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <UserPlus size={13} /> 동행 등록
                  </button>

                  {(currentUser?.role === '개발자' || currentUser?.role === '관리자' || currentUser?.username === 'admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`'${item.visitorName}'님의 [${item.site}] 보안 서약 내역을 정말로 삭제하시겠습니까?`)) {
                          handleDeletePledge(item.id, item.site);
                        }
                      }}
                      title="개발자 전용: 서약 내역 삭제"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#ef4444',
                        padding: '5px 10px',
                        borderRadius: '10px',
                        fontSize: '11px',
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
                  )}
                </div>
              </div>

              {/* Single Line Info Row: 소속팀 | 직급 | 이름 | 연락처 순 (사업부 제외 & 라벨 없이 표출) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                color: '#cbd5e1'
              }}>
                <span style={{ color: '#00f2fe', fontWeight: '700' }}>
                  {item.team || (item.department ? (item.department.includes(' ') ? item.department.split(' ').slice(1).join(' ') : item.department) : '') || '소속팀 미지정'}
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>
                  {item.rank || '대리'}
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span style={{ color: '#fff', fontWeight: '800' }}>
                  {item.visitorName}
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span className="mono-font" style={{ color: '#94a3b8' }}>
                  {item.phone || '010-0000-0000'}
                </span>
              </div>

              {/* Additional Registrations / Companions Rows (Identical formatting to initial applicant) */}
              {item.companions && item.companions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {item.companions.map((comp, idx) => (
                    <div
                      key={comp.id || idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        color: '#cbd5e1'
                      }}
                    >
                      <span style={{ color: '#00f2fe', fontWeight: '700' }}>
                        {comp.team || comp.department || '소속팀 미지정'}
                      </span>
                      <span style={{ color: '#475569' }}>|</span>
                      <span style={{ color: '#fff', fontWeight: '700' }}>
                        {comp.rank || '대리'}
                      </span>
                      <span style={{ color: '#475569' }}>|</span>
                      <span style={{ color: '#fff', fontWeight: '800' }}>
                        {comp.visitorName}
                      </span>
                      <span style={{ color: '#475569' }}>|</span>
                      <span className="mono-font" style={{ color: '#94a3b8' }}>
                        {comp.phone || '010-0000-0000'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Tags: High Visibility Visit Purpose Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>방문목적:</span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    background: item.purpose?.includes('작업') || item.purpose?.includes('공사')
                      ? 'rgba(245, 158, 11, 0.22)'
                      : item.purpose?.includes('미팅') || item.purpose?.includes('방문')
                        ? 'rgba(0, 242, 254, 0.22)'
                        : 'rgba(139, 92, 246, 0.22)',
                    color: item.purpose?.includes('작업') || item.purpose?.includes('공사')
                      ? '#f59e0b'
                      : item.purpose?.includes('미팅') || item.purpose?.includes('방문')
                        ? '#00f2fe'
                        : '#a78bfa',
                    border: item.purpose?.includes('작업') || item.purpose?.includes('공사')
                      ? '1px solid rgba(245, 158, 11, 0.55)'
                      : item.purpose?.includes('미팅') || item.purpose?.includes('방문')
                        ? '1px solid rgba(0, 242, 254, 0.55)'
                        : '1px solid rgba(139, 92, 246, 0.55)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    📌 {item.purpose || '작업'}
                  </span>
                </div>
                <div className="mono-font" style={{ fontSize: '11px', color: '#64748b' }}>등록일: {item.createdAt}</div>
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
                    사업장 출입 보안 서약
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    출입 절차 기준 준수
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
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
                  onClick={() => handleStepHeaderClick(s.step)}
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

                  {formData.isCompanionMode && (
                    <div style={{
                      background: 'rgba(0, 242, 254, 0.08)',
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <UserPlus size={24} color="#00f2fe" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                        <div style={{ color: '#00f2fe', fontWeight: '800', marginBottom: '2px' }}>
                          👥 동행인 보안 서약 등록 모드
                        </div>
                        사업장 정보(<strong>{formData.site}</strong>)는 동일하게 적용되며, 아래 본인(동행자) 정보를 확인 후 [다음 단계] 버튼을 눌러 서약을 완료해 주세요.
                      </div>
                    </div>
                  )}

                  {/* Site Select */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      출입 대상 사업장 {formData.isCompanionMode ? '(동행 사업장 고정)' : '(필수)'}
                    </label>
                    <select
                      disabled={formData.isCompanionMode}
                      value={formData.site}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: formData.isCompanionMode ? 'rgba(255,255,255,0.04)' : '#0a0f1d',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: formData.isCompanionMode ? '#00f2fe' : '#fff',
                        fontWeight: formData.isCompanionMode ? '700' : 'normal',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: formData.isCompanionMode ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="" disabled hidden={formData.isCompanionMode}>-- 출입 사업장을 선택해 주세요 --</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.name}>
                          [{s.category}] {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visitor Name & Rank */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        방문자 성명 {formData.isCompanionMode ? '(동행자 본인)' : '*'}
                      </label>
                      <input
                        type="text"
                        disabled={formData.isCompanionMode}
                        placeholder="홍길동"
                        value={formData.visitorName}
                        onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: formData.isCompanionMode ? 'rgba(255,255,255,0.04)' : '#0a0f1d',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: formData.isCompanionMode ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        직급
                      </label>
                      <input
                        type="text"
                        disabled={formData.isCompanionMode}
                        placeholder="예: 책임 / 수석"
                        value={formData.rank}
                        onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: formData.isCompanionMode ? 'rgba(255,255,255,0.04)' : '#0a0f1d',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: formData.isCompanionMode ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>
                  </div>

                  {/* Department & Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        소속팀 (부서)
                      </label>
                      <input
                        type="text"
                        disabled={formData.isCompanionMode}
                        placeholder="예: 보안관제팀, EUV설비팀"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: formData.isCompanionMode ? 'rgba(255,255,255,0.04)' : '#0a0f1d',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: formData.isCompanionMode ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        연락처
                      </label>
                      <input
                        type="text"
                        disabled={formData.isCompanionMode}
                        placeholder="010-0000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: formData.isCompanionMode ? 'rgba(255,255,255,0.04)' : '#0a0f1d',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: formData.isCompanionMode ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>
                  </div>

                  {/* Visit Purpose Dropdown & Custom Text Input */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      방문 목적 {formData.isCompanionMode ? '(이전 동행 서약 항목 고정)' : '(필수 선택)'}
                    </label>
                    <select
                      disabled={formData.isCompanionMode}
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
                        background: formData.isCompanionMode ? 'rgba(255,255,255,0.04)' : '#0a0f1d',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: formData.isCompanionMode ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="작업">작업</option>
                      <option value="회의">회의</option>
                      <option value="납품">납품</option>
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
                    다음: 모바일 보안 앱 검수 <ChevronRight size={16} />
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
                    {!formData.site && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        color: '#fca5a5',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        <span>⚠️ 출입 대상 사업장이 선택되지 않았습니다! 1단계에서 사업장을 먼저 선택해 주세요.</span>
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          1단계로 이동
                        </button>
                      </div>
                    )}

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
                            어플 및 보안 상태: <strong style={{
                              color: appScanState.status === 'VERIFIED'
                                ? '#10b981'
                                : appScanState.status === 'NOT_RUNNING'
                                  ? '#f59e0b'
                                  : (appScanState.status === 'NOT_INSTALLED' || appScanState.status === 'CAMERA_UNLOCKED')
                                    ? '#ef4444'
                                    : '#f59e0b'
                            }}>
                              {appScanState.status === 'VERIFIED'
                                ? '✓ 정상 실행 및 카메라 사용제한 활성화됨'
                                : appScanState.status === 'NOT_RUNNING'
                                  ? '⚠️ 실행 상태 확인 필요'
                                  : appScanState.status === 'NOT_INSTALLED'
                                    ? '❌ 어플 미설치 (핸드폰에 미설치됨)'
                                    : appScanState.status === 'CAMERA_UNLOCKED'
                                      ? '❌ 카메라 사용 제한 검증 실패'
                                      : appScanState.status === 'CAMERA_CHECK_NEEDED'
                                        ? '🟡 보안 어플 실행 완료 (카메라 검증 필요)'
                                        : '검수 대기 중'}
                            </strong>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleCheckAppExecutionStatus}
                              disabled={appScanState.isScanning || cameraCheckState.isTesting}
                              style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '800',
                                background: appScanState.status === 'VERIFIED'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : `linear-gradient(135deg, ${targetApp.color} 0%, #00b4d8 100%)`,
                                color: appScanState.status === 'VERIFIED' ? '#10b981' : '#000',
                                border: appScanState.status === 'VERIFIED'
                                  ? '1px solid rgba(16, 185, 129, 0.5)'
                                  : 'none',
                                boxShadow: appScanState.status === 'VERIFIED'
                                  ? '0 0 14px rgba(16, 185, 129, 0.35)'
                                  : '0 4px 14px rgba(0, 242, 254, 0.25)',
                                cursor: (appScanState.isScanning || cameraCheckState.isTesting) ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.25s ease'
                              }}
                            >
                              {appScanState.isScanning || cameraCheckState.isTesting ? (
                                <><ShieldCheck size={18} className="animate-spin" /> 보안 어플 실행 상태 검수 중...</>
                              ) : appScanState.status === 'VERIFIED' ? (
                                <><CheckCircle2 size={18} color="#10b981" /> ✓ 보안 어플 실행 상태 확인 완료</>
                              ) : (
                                <><ShieldCheck size={18} /> 보안 어플 실행 상태 확인</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Manual Simulation Controls (Visible ONLY for Developer / admin account) */}
                      {(currentUser?.role === '개발자' || currentUser?.username === 'admin') && (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '1px dashed rgba(0, 242, 254, 0.4)',
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🧪 [개발자 전용] 보안 상태 테스트 수동 전환
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleSetSimulatedStatus('NOT_RUNNING')}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textAlign: 'left',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              ⚠️ 1. 보안 어플 상태 확인 필요
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetSimulatedStatus('VERIFIED')}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textAlign: 'left',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              🟢 2. 보안 어플 정상 가동중
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

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
                        다음: 자재&문서 보안 확인 <ChevronRight size={16} />
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
                        onClick={() => setActiveStep(4)}
                        className="glass-button-primary"
                        style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        다음: 전자 서약서 작성 <ChevronRight size={16} />
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

                  {/* Agreement Checkbox with Red Alert Box when Unchecked */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: formData.agreedToTerms
                      ? '1px solid rgba(0, 242, 254, 0.4)'
                      : '2px solid #ef4444',
                    background: formData.agreedToTerms
                      ? 'rgba(0, 242, 254, 0.08)'
                      : 'rgba(239, 68, 68, 0.12)',
                    boxShadow: formData.agreedToTerms
                      ? '0 2px 10px rgba(0, 242, 254, 0.15)'
                      : '0 0 14px rgba(239, 68, 68, 0.35)',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.agreedToTerms}
                        onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#00f2fe', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: formData.agreedToTerms ? '#fff' : '#fca5a5' }}>
                        위 보안 준수 사항을 숙지하였으며 성실히 이행할 것을 서약합니다.
                      </span>
                    </label>
                    {!formData.agreedToTerms && (
                      <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginLeft: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} color="#ef4444" />
                        <span>전자 서약을 제출하려면 서약 동의 체크박스를 확인해 주십시오.</span>
                      </div>
                    )}
                  </div>

                  {/* Submission Readiness Checklist Banner */}
                  {(() => {
                    const isSiteValid = !!formData.site?.trim();
                    const isNameValid = !!formData.visitorName?.trim();
                    const isStep1Valid = isSiteValid && isNameValid;
                    const isMdmValid = !!formData.mdmVerified || appScanState.status === 'VERIFIED';
                    const isDocValid = !!formData.docChecklist?.gateApproved && !!formData.docChecklist?.docSecVerified && !!formData.docChecklist?.preCheckVerified;
                    const isTermsValid = !!formData.agreedToTerms;
                    const isReadyToSubmit = isStep1Valid && isMdmValid && isDocValid && isTermsValid;

                    return (
                      <div style={{
                        background: 'rgba(10, 15, 29, 0.9)',
                        border: isReadyToSubmit ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: isReadyToSubmit ? '#10b981' : '#f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>📋 보안 서약 승인 제출 필수 요건 검수:</span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: isReadyToSubmit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: isReadyToSubmit ? '#10b981' : '#ef4444' }}>
                            {isReadyToSubmit ? '✓ 제출 승인 가능' : '⚠️ 제출 필수 항목 확인 필요'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                          <div style={{ color: isStep1Valid ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isStep1Valid ? '✓' : '❌'} 1. 방문자 및 사업장 선택 {!isSiteValid ? '(사업장 미선택)' : ''}
                          </div>
                          <div style={{ color: isMdmValid ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isMdmValid ? '✓' : '❌'} 2. 보안 어플 실행 상태 확인
                          </div>
                          <div style={{ color: isDocValid ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isDocValid ? '✓' : '❌'} 3. 자재&문서 체크리스트
                          </div>
                          <div style={{ color: isTermsValid ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isTermsValid ? '✓' : '❌'} 4. 보안 서약 동의
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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
                  <span style={{ color: '#64748b' }}>방문자/직급:</span> <strong style={{ color: '#fff' }}>{selectedPass.visitorName} {selectedPass.rank ? `(${selectedPass.rank})` : ''}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>소속 부서:</span> <strong style={{ color: '#00f2fe' }}>{selectedPass.department || selectedPass.company || '소속 미지정'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>연락처:</span> <strong style={{ color: '#fff' }}>{selectedPass.phone || '010-0000-0000'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>방문목적:</span> <strong style={{ color: '#00f2fe' }}>{selectedPass.purpose || '작업'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b' }}>유효기간:</span> <strong style={{ color: '#fff' }}>{selectedPass.visitDate}</strong>
                </div>
              </div>

              {/* Security Inspection Status List */}
              <div style={{ background: 'rgba(0, 242, 254, 0.04)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00f2fe', marginBottom: '8px' }}>
                  🔒 자재 및 문서 보안 검수 완료 상태 (3개 항목)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                  <div>✓ 1. 지입 자재 물품 보안 검색대 승인 완료</div>
                  <div>✓ 2. 문서 보안 상태 확인 완료</div>
                  <div>✓ 3. 보안 물품 반입 전 확인 완료</div>
                </div>
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
              {(currentUser?.role === '개발자' || currentUser?.role === '관리자' || currentUser?.username === 'admin') && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`'${selectedPass.visitorName}'님의 [${selectedPass.site}] 보안 서약 내역을 정말로 삭제하시겠습니까?`)) {
                      handleDeletePledge(selectedPass.id, selectedPass.site);
                      setSelectedPass(null);
                    }
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} /> 서약 삭제
                </button>
              )}
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

      {/* Required Login Modal Overlay */}
      {isLoginModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1150,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 242, 254, 0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(0, 242, 254, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={20} color="#00f2fe" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    보안 서약 작성 전 로그인
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                    출입 서약서 등록을 위해 계정 로그인이 필요합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Auth Mode Toggle Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setInlineAuthMode('login')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: inlineAuthMode === 'login' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: inlineAuthMode === 'login' ? '#00f2fe' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <LogIn size={14} /> 기존 계정 로그인
              </button>
              <button
                type="button"
                onClick={() => setInlineAuthMode('signup')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: inlineAuthMode === 'signup' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: inlineAuthMode === 'signup' ? '#00f2fe' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <UserPlus size={14} /> 신규 회원가입 (계정 생성)
              </button>
            </div>

            {inlineAuthMode === 'login' ? (
              <form onSubmit={handleInlineLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    아이디 (ID) *
                  </label>
                  <input
                    type="text"
                    placeholder="예: admin 또는 등록한 아이디"
                    value={inlineLogin.username}
                    onChange={(e) => setInlineLogin({ ...inlineLogin, username: e.target.value })}
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
                    비밀번호 (Password) *
                  </label>
                  <input
                    type="password"
                    placeholder="비밀번호 입력 (예: password123)"
                    value={inlineLogin.password}
                    onChange={(e) => setInlineLogin({ ...inlineLogin, password: e.target.value })}
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
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px'
                  }}
                >
                  <LogIn size={16} /> 로그인하고 서약서 작성 계속하기
                </button>
              </form>
            ) : (
              <form onSubmit={handleInlineSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>아이디 *</label>
                    <input
                      type="text"
                      placeholder="신규 아이디"
                      value={inlineSignup.username}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, username: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>비밀번호 *</label>
                    <input
                      type="password"
                      placeholder="비밀번호"
                      value={inlineSignup.password}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, password: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>사업부 *</label>
                    <input
                      type="text"
                      placeholder="DS부문"
                      value={inlineSignup.division}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, division: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>소속팀 *</label>
                    <input
                      type="text"
                      placeholder="보안관제팀"
                      value={inlineSignup.team}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, team: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>직급 *</label>
                    <input
                      type="text"
                      placeholder="책임"
                      value={inlineSignup.rank}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, rank: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>이름 *</label>
                    <input
                      type="text"
                      placeholder="홍길동"
                      value={inlineSignup.name}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>전화번호 *</label>
                    <input
                      type="text"
                      placeholder="010-0000-0000"
                      value={inlineSignup.phone}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>이메일 *</label>
                    <input
                      type="email"
                      placeholder="user@withsecurity.com"
                      value={inlineSignup.email}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={handleInlineSignupSubmit}
                  className="glass-button-primary"
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px'
                  }}
                >
                  <UserPlus size={15} /> 계정 생성 및 서약서 작성 계속하기
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
