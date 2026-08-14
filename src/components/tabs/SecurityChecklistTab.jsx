import React, { useState, useEffect, useRef } from 'react';
import { AppLauncher } from '@capacitor/app-launcher';
import { launchApp } from '../../services/appLauncherService.js';
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
  XCircle,
  ShieldAlert,
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
import { isSamePerson, DIVISION_LIST, getTeamsForDivision, RANK_LIST } from '../../services/userMatcher';
import { useModalBack } from '../../services/modalBackHandler';

const formatPhoneNumber = (value) => {
  if (!value) return '';
  const clean = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (clean.length <= 3) {
    return clean;
  } else if (clean.length <= 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  } else {
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`;
  }
};

export default function SecurityChecklistTab({ onTriggerToast }) {
  const [checklistList, setChecklistList] = useState([]);

  // Load from IndexedDB on component mount & listen for real-time DB changes
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

    const handleDataChanged = async () => {
      try {
        const freshItems = await dbService.getChecklists();
        setChecklistList(freshItems || []);
      } catch (e) { }
    };

    window.addEventListener('with_security_data_changed', handleDataChanged);
    return () => window.removeEventListener('with_security_data_changed', handleDataChanged);
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
    division: '영업/운영사업부',
    team: '보안관제팀',
    rank: '대리',
    name: '',
    phone: '',
    email: ''
  });

  // Current Logged in User State (For Team-Level Security Isolation)
  const [currentUser, setCurrentUser] = useState(null);

  // Companion Multi-Select Suggestion Modal State
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const [targetPledgeForCompanion, setTargetPledgeForCompanion] = useState(null);
  const [allSystemUsers, setAllSystemUsers] = useState([]);
  const [companionSearchTerm, setCompanionSearchTerm] = useState('');
  const [selectedCompanionUsernames, setSelectedCompanionUsernames] = useState([]);

  // Back button hooks for login & companion modals
  useModalBack(isLoginModalOpen, () => setIsLoginModalOpen(false), 'security-login-modal');
  useModalBack(isCompanionModalOpen, () => setIsCompanionModalOpen(false), 'security-companion-modal');

  useEffect(() => {
    async function loadSitesAndUser() {
      try {
        const siteList = await dbService.getSites();
        let deviceApps = {};
        try {
          const raw = localStorage.getItem('with_security_device_site_apps');
          if (raw) deviceApps = JSON.parse(raw);
        } catch (e) { }

        const mappedSites = (siteList || []).map(s => {
          const local = deviceApps[s.id] || {};
          return {
            ...s,
            appName: local.appName || s.appName || '',
            appUrl: local.appUrl || s.appUrl || ''
          };
        });

        setSites(mappedSites);
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
    const handleDataChange = () => {
      loadSitesAndUser();
    };
    window.addEventListener('with_security_data_changed', handleDataChange);
    return () => window.removeEventListener('with_security_data_changed', handleDataChange);
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
      division: '영업/운영사업부',
      team: '보안관제팀',
      rank: '대리',
      name: '',
      phone: '',
      email: ''
    });
    if (onTriggerToast) onTriggerToast(`'${newUser.name}'님 회원가입 및 로그인 완료! 보안 서약 작성을 진행합니다.`, 'success');
  };

  // Delete Pledge Record Handler
  const handleDeletePledge = async (id, siteName) => {
    try {
      await dbService.deleteChecklist(id);
      const updated = checklistList.filter(item => item.id !== id && item.log_id !== id);
      setChecklistList(updated);
      if (onTriggerToast) onTriggerToast(`[${siteName || '사업장'}] 서약증 이력이 삭제되었습니다.`, 'info');
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Mobile Security App Detection Helper (보안앱O: 보안앱 검수, 보안앱X: 수동 체크리스트)
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

    const cleanSiteName = siteName.trim().toLowerCase();

    const foundSite = sites.find(s => {
      const displayName = (s.address ? `${s.name} (${s.address})` : s.name).trim().toLowerCase();
      const sName = (s.name || '').trim().toLowerCase();
      return displayName === cleanSiteName ||
        sName === cleanSiteName ||
        cleanSiteName.includes(sName) ||
        (s.address && cleanSiteName.includes(s.address.trim().toLowerCase()));
    });

    const isAppX = cleanSiteName.includes('보안앱x') ||
      cleanSiteName.includes('보안어플x') ||
      (foundSite && (foundSite.type === '보안앱X' || foundSite.type === '보안어플X' || foundSite.type === '수동체크'));

    const isAppRequired = !isAppX;

    if (isAppRequired) {
      return {
        appName: '사내 모바일 보안 앱',
        appCode: 'SECURITY_APP',
        shortName: '보안앱O',
        packageName: 'com.withsecurity.app',
        scheme: 'sec-app://',
        intentUri: 'intent://#Intent;scheme=sec-app;end',
        tokenPrefix: 'SEC-APP-',
        company: '보안앱O 사업장',
        color: '#34d399',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        desc: '사업장 출입 보안 앱 상태 확인 (카메라 차단 검수)',
        isChecklistMode: false
      };
    } else {
      return {
        appName: '보안 앱 예외 사업장 (수동 서약)',
        appCode: 'NO_APP_REQUIRED',
        shortName: '보안앱X',
        company: '보안앱X 사업장',
        color: '#f87171',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        desc: '본 사업장은 보안 앱 가동 예외 구역입니다. 수동 보안 체크리스트로 진행합니다.',
        isChecklistMode: true
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

  // Camera Security Self-Checklist State for LG Display & General Sites
  const [cameraSelfChecklist, setCameraSelfChecklist] = useState({
    stickerAttached: false,
    noPhotoAgreed: false,
    cameraChecked: false
  });
  const [cameraPreviewActive, setCameraPreviewActive] = useState(false);
  const videoPreviewRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Independent Step Verification States
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [secAppVerified, setSecAppVerified] = useState(false);
  const [secAppFailed, setSecAppFailed] = useState(false);
  const [cameraCheckVerified, setCameraCheckVerified] = useState(false);
  const [step2Attempted, setStep2Attempted] = useState(false);

  // Handler for Launching Native Smartphone Camera Application
  const handleLaunchNativeCameraApp = async () => {
    if (Capacitor.isNativePlatform()) {
      await launchApp('android.media.action.STILL_IMAGE_CAMERA');
      setCameraSelfChecklist(prev => {
        const updated = { ...prev, cameraChecked: true };
        const isAll = updated.stickerAttached && updated.noPhotoAgreed && updated.cameraChecked;
        setFormData(f => ({ ...f, mdmVerified: isAll, cameraLocked: isAll }));
        return updated;
      });
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.click();
      setCameraSelfChecklist(prev => {
        const updated = { ...prev, cameraChecked: true };
        const isAll = updated.stickerAttached && updated.noPhotoAgreed && updated.cameraChecked;
        setFormData(f => ({ ...f, mdmVerified: isAll, cameraLocked: isAll }));
        return updated;
      });
    }
  };

  // Reset Security App & Camera Verification States (Mandatory Re-verification on modal open/close)
  const resetAppVerificationState = () => {
    setStep1Attempted(false);
    setAppCheckState({ isChecking: false, isVerified: false });
    setCameraCheckState({ isTesting: false, isVerified: false, result: null, message: '' });
    setAppScanState({ isScanning: false, status: 'NOT_INSTALLED', lastScannedAt: null, scanLog: [] });
    setCameraSelfChecklist({ stickerAttached: false, noPhotoAgreed: false, cameraChecked: false });
    setSecAppVerified(false);
    setSecAppFailed(false);
    setCameraCheckVerified(false);
    setStep2Attempted(false);
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

      // IF CAMERA STREAM OPENS -> CAMERA IS ACTIVE & UNLOCKED!
      // SECURITY APP MDM POLICY IS NOT RESTRICTING CAMERA!
      stream.getTracks().forEach(track => track.stop());

      // STRICT FAIL! Camera is ACTIVE / Unlocked!
      setAppCheckState({ isChecking: false, isVerified: false });
      setCameraCheckVerified(false);
      setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '❌ 카메라 차단 안됨 (카메라 활성화 감지)' });
      setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
      setAppScanState({
        isScanning: false,
        status: 'CAMERA_UNLOCKED',
        lastScannedAt: new Date().toLocaleTimeString(),
        scanLog: []
      });
      return false;
    } catch (err) {
      if (err.message === 'NOT_SUPPORTED') {
        const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isMobile) {
          setAppCheckState({ isChecking: false, isVerified: false });
          setCameraCheckVerified(false);
          setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '카메라 검수 미지원' });
          setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
          return false;
        } else {
          // PC simulation
          setAppCheckState({ isChecking: false, isVerified: true });
          setCameraCheckVerified(true);
          setCameraCheckState({ isTesting: false, isVerified: true, result: 'LOCKED', message: 'PC 시뮬레이션 카메라 차단 검수 완료' });
          setFormData(prev => ({ ...prev, mdmVerified: true, cameraLocked: true }));
          return true;
        }
      }

      // IF CAMERA HARDWARE ACCESS IS STRICTLY BLOCKED BY KNOX/MDM SECURITY POLICY (NotReadableError / SecurityError / TrackStartError)
      if (err.name === 'NotReadableError' || err.name === 'SecurityError' || err.name === 'TrackStartError') {
        // STRICT SUCCESS! Camera hardware access was completely blocked by Knox/MDM policy!
        setAppCheckState({ isChecking: false, isVerified: true });
        setCameraCheckVerified(true);
        setCameraCheckState({ isTesting: false, isVerified: true, result: 'LOCKED', message: '카메라 비활성화(차단) 확인됨' });
        setFormData(prev => ({ ...prev, mdmVerified: true, cameraLocked: true }));
        setAppScanState({
          isScanning: false,
          status: 'VERIFIED',
          lastScannedAt: new Date().toLocaleTimeString(),
          scanLog: []
        });

        if (onTriggerToast) {
          onTriggerToast(`✓ [카메라 검수 완료] 스마트폰 카메라 비활성화(차단) 상태가 정상 확인되었습니다!`, 'success');
        }
        return true;
      } else {
        // Camera is active or permission was denied -> STRICT FAIL!
        setAppCheckState({ isChecking: false, isVerified: false });
        setCameraCheckVerified(false);
        setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '❌ 카메라 차단 안됨 (차단 상태 확인 필요)' });
        setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
        setAppScanState({
          isScanning: false,
          status: 'CAMERA_UNLOCKED',
          lastScannedAt: new Date().toLocaleTimeString(),
          scanLog: []
        });

        if (onTriggerToast) {
          onTriggerToast(`⚠️ [카메라 검수 실패] 카메라 차단 안됨: 보안 앱에서 카메라 차단을 켜주세요.`, 'warning');
        }
        return false;
      }
    }
  };

  // Helper for manual simulation state switch (For Dev/Demo testing on PC)
  const handleSetSimulatedStatus = (statusType) => {
    const targetApp = getTargetSecurityAppInfo(formData.site);
    if (statusType === 'NOT_RUNNING' || statusType === 'NOT_INSTALLED') {
      setAppCheckState({ isChecking: false, isVerified: false });
      setCameraCheckState({ isTesting: false, isVerified: false, result: 'UNLOCKED', message: '' });
      setSecAppVerified(false);
      setCameraCheckVerified(false);
      setFormData(prev => ({ ...prev, mdmVerified: false, cameraLocked: false }));
      setAppScanState({ isScanning: false, status: 'NOT_RUNNING', lastScannedAt: null, scanLog: [] });
    } else if (statusType === 'VERIFIED') {
      setAppCheckState({ isChecking: false, isVerified: true });
      setCameraCheckState({ isTesting: false, isVerified: true, result: 'LOCKED', message: '' });
      setSecAppVerified(true);
      setCameraCheckVerified(true);
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

  // Back button hook for main pledge modal
  useModalBack(isModalOpen, handleCloseModal, 'security-pledge-modal');

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
    purposeType: '',
    customPurpose: '',
    purpose: '',
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
    parentPledgeId: null,
    companionId: null
  });

  // Handle Open Companion Selection Modal (App Users Suggestion Box & Multi-Select)
  const handleOpenCompanionRegisterModal = async (targetItem) => {
    const activeUser = await dbService.getUserProfile();
    if (!activeUser) {
      if (onTriggerToast) onTriggerToast('동행 등록을 진행하려면 로그인이 필요합니다.', 'warning');
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const regUsers = await dbService.getRegisteredUsers();
      setAllSystemUsers(regUsers || []);
    } catch (e) {
      console.warn('Failed to load registered users:', e);
      setAllSystemUsers([]);
    }

    setTargetPledgeForCompanion(targetItem);
    setCompanionSearchTerm('');
    setSelectedCompanionUsernames([]);
    setIsCompanionModalOpen(true);
  };

  // Handle Toggle Companion Select Checkbox
  const handleToggleCompanionSelect = (username) => {
    setSelectedCompanionUsernames(prev => {
      if (prev.includes(username)) {
        return prev.filter(u => u !== username);
      } else {
        return [...prev, username];
      }
    });
  };

  // Handle Confirm Add Selected Companions to Pledge
  const handleConfirmAddCompanions = async () => {
    if (!targetPledgeForCompanion || selectedCompanionUsernames.length === 0) {
      if (onTriggerToast) onTriggerToast('등록할 동행자를 1명 이상 선택해 주세요.', 'warning');
      return;
    }

    const selectedUsers = allSystemUsers.filter(u => selectedCompanionUsernames.includes(u.username));
    if (selectedUsers.length === 0) return;

    let updatedCompanions = [...(targetPledgeForCompanion.companions || [])];
    const addedNames = [];

    for (const u of selectedUsers) {
      const uName = (u.name || '').trim();
      const uTeam = (u.team || u.department || u.division || targetPledgeForCompanion.department || '보안관제팀').trim();

      const isPrimary = isSamePerson(u, targetPledgeForCompanion) ||
        (u.username && targetPledgeForCompanion.username && u.username === targetPledgeForCompanion.username) ||
        (u.name?.trim() === targetPledgeForCompanion.visitorName?.trim() &&
          (u.phone === targetPledgeForCompanion.phone || u.team === targetPledgeForCompanion.team || u.department === targetPledgeForCompanion.department));

      const isAlreadyCompanion = updatedCompanions.some(c => isSamePerson(u, c));

      if (!isPrimary && !isAlreadyCompanion) {
        const compLogId = `PASS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        updatedCompanions.push({
          id: compLogId,
          log_id: compLogId,
          visitorName: uName,
          name: uName,
          username: u.username || '',
          division: u.division || targetPledgeForCompanion.division || '사업부 미지정',
          team: uTeam,
          department: uTeam,
          rank: u.rank || '대리',
          role: u.role || '일반',
          phone: u.phone || '010-0000-0000',
          status: '서약전',
          mdmVerified: false,
          pledgedAt: null,
          createdAt: new Date().toLocaleString('ko-KR', { hour12: false })
        });
        addedNames.push(uName);

        // 데이터 베이스 security_log에 동행 계정 정보로 서약전 상태 레코드 즉시 기입
        try {
          await dbService.saveChecklist({
            id: compLogId,
            log_id: compLogId,
            parent_log_id: targetPledgeForCompanion.id || targetPledgeForCompanion.log_id,
            parentLogId: targetPledgeForCompanion.id || targetPledgeForCompanion.log_id,
            parentPledgeId: targetPledgeForCompanion.id || targetPledgeForCompanion.log_id,
            name: uName,
            user_name: uName,
            visitorName: uName,
            userName: uName,
            username: u.username || '',
            division: u.division || targetPledgeForCompanion.division || '',
            role: u.role || '일반',
            site: targetPledgeForCompanion.site || '',
            purpose: targetPledgeForCompanion.purpose || targetPledgeForCompanion.purposeType || '',
            phone: u.phone || '',
            visitor_phone: u.phone || '',
            visitorPhone: u.phone || '',
            team: uTeam,
            visitor_team: uTeam,
            department: uTeam,
            rank: u.rank || '대리',
            visitor_rank: u.rank || '대리',
            mdmVerified: false,
            docChecklist: { gateApproved: false, docSecVerified: false, preCheckVerified: false },
            pledgeTerms: targetPledgeForCompanion.pledgeTerms || '',
            signature_date: '',
            signatureDate: '',
            signedAt: '',
            status: '서약전'
          });
        } catch (compErr) {
          console.warn('Companion security_log save warning:', compErr);
        }
      }
    }

    if (addedNames.length === 0) {
      if (onTriggerToast) onTriggerToast('선택한 인원이 이미 해당 서약서에 모두 추가되어 있습니다.', 'warning');
      setIsCompanionModalOpen(false);
      return;
    }

    const updatedPledge = {
      ...targetPledgeForCompanion,
      companions: updatedCompanions
    };

    try {
      await dbService.saveChecklist(updatedPledge);
    } catch (err) {
      console.error('Failed to register companions in DB:', err);
    }

    setChecklistList(prev => prev.map(item => item.id === updatedPledge.id ? updatedPledge : item));
    setIsCompanionModalOpen(false);

    if (onTriggerToast) {
      onTriggerToast(`✓ '${addedNames.join(', ')}' 등 총 ${addedNames.length}명이 동행자로 추가 등록되었습니다. (서약 대기 상태로 공유됨)`, 'success');
    }
  };

  // Handle Perform Companion Pledge (Companion performs security pledge for shared pledge)
  // Handle Companion Pledge Action (Directly jump to Step 2 with locked site and purpose)
  const handlePerformCompanionPledge = async (targetItem, companion) => {
    const activeUser = await dbService.getUserProfile();
    if (!activeUser) {
      if (onTriggerToast) onTriggerToast('동행 보안 서약을 진행하려면 로그인이 필요합니다.', 'warning');
      setIsLoginModalOpen(true);
      return;
    }

    resetAppVerificationState();

    const userTeam = activeUser.team || activeUser.department || companion.team || '보안관제팀';
    const targetSite = targetItem.site || targetItem.site_name || targetItem.siteName || '';
    const inheritedPurpose = targetItem.purpose || targetItem.purposeType || '작업';
    const inheritedPurposeType = targetItem.purposeType || targetItem.purpose || '작업';
    const inheritedCustomPurpose = targetItem.customPurpose || (targetItem.purposeType === '기타' ? targetItem.purpose : '') || '';

    setFormData({
      site: targetSite,
      visitorName: companion.visitorName || activeUser.name || '',
      phone: activeUser.phone || companion.phone || '010-0000-0000',
      team: userTeam,
      department: userTeam,
      rank: activeUser.rank || companion.rank || '대리',
      company: userTeam,
      hostName: targetItem.hostName || '사업장 보안관제센터',
      purposeType: inheritedPurposeType,
      customPurpose: inheritedCustomPurpose,
      purpose: inheritedPurpose,
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
      parentPledgeId: targetItem.id,
      companionId: companion.id,
      isEditMode: false,
      editingPledgeId: null
    });

    setActiveStep(2);
    setIsModalOpen(true);
    const targetApp = getTargetSecurityAppInfo(targetSite);
    if (onTriggerToast) {
      if (targetApp.isChecklistMode) {
        onTriggerToast(`[${targetSite}] 동행인 '${companion.visitorName}'님의 보안 서약이 시작되었습니다. 2단계 수동 보안 체크리스트부터 진행해 주세요.`, 'info');
      } else {
        onTriggerToast(`[${targetSite}] 동행인 '${companion.visitorName}'님의 보안 서약이 시작되었습니다. 2단계 모바일 보안 앱 검수부터 진행해 주세요.`, 'info');
      }
    }
  };

  // Handle Primary Creator Re-Signing Pledge
  const handlePerformPrimaryResign = async (targetItem) => {
    const activeUser = await dbService.getUserProfile();
    if (!activeUser) {
      if (onTriggerToast) onTriggerToast('보안 서약을 재작성하려면 로그인이 필요합니다.', 'warning');
      setIsLoginModalOpen(true);
      return;
    }

    resetAppVerificationState();

    const userTeam = activeUser.team || activeUser.department || targetItem.team || '보안관제팀';
    setFormData({
      site: targetItem.site || '',
      visitorName: activeUser ? activeUser.name : (targetItem.visitorName || ''),
      phone: activeUser ? activeUser.phone : (targetItem.phone || '010-0000-0000'),
      team: userTeam,
      department: userTeam,
      rank: activeUser ? activeUser.rank : (targetItem.rank || '대리'),
      company: userTeam,
      hostName: targetItem.hostName || '사업장 보안관제센터',
      purposeType: '',
      customPurpose: '',
      purpose: '',
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
      parentPledgeId: null,
      companionId: null,
      isEditMode: true,
      editingPledgeId: targetItem.id
    });

    setActiveStep(1);
    setIsModalOpen(true);
    if (onTriggerToast) onTriggerToast(`[${targetItem.site}] 서약 재작성 모드가 시작되었습니다. 1단계부터 확인 후 다시 서약을 완료해 주세요.`, 'info');
  };

  // Handle Delete Companion Entry from Pledge
  const handleDeleteCompanion = async (pledgeId, companionId, companionName) => {
    if (!window.confirm(`'${companionName}' 동행자의 서약 내역을 삭제하시겠습니까?`)) {
      return;
    }

    const targetPledge = checklistList.find(item => String(item.id) === String(pledgeId) || String(item.log_id) === String(pledgeId));
    if (!targetPledge) return;

    const updatedCompanions = (targetPledge.companions || []).filter(c => String(c.id) !== String(companionId) && String(c.log_id) !== String(companionId));
    const updatedPledge = {
      ...targetPledge,
      companions: updatedCompanions
    };

    try {
      if (companionId) {
        await dbService.deleteChecklist(companionId);
      }
      await dbService.saveChecklist(updatedPledge);
    } catch (err) {
      console.error('Failed to delete companion from DB:', err);
    }

    setChecklistList(prev => prev.map(item => (String(item.id) === String(updatedPledge.id) || String(item.log_id) === String(updatedPledge.id)) ? updatedPledge : item));
    if (onTriggerToast) {
      onTriggerToast(`'${companionName}' 동행자 서약 내역이 성공적으로 삭제되었습니다.`, 'success');
    }
  };

  // Selected Detail Modal State
  const [selectedPass, setSelectedPass] = useState(null);

  // Filtered List (Enforcing Role-Based & Team-Level Security Isolation & Date Navigation)
  const filteredList = checklistList.filter(item => {
    // 1. Role-Based Access Control & Security Isolation Rule
    // - 개발자 (Developer): 전체 서약 내역 조회 가능
    // - 관리자 (Admin): 같은 소속(팀/부서/회사) 인원의 서약 내역 전체 조회 가능
    // - 일반 (General): 본인이 작성했거나 본인이 동행자로 포함된 서약 내역만 조회 가능
    const isDev = currentUser?.role === '개발자' || currentUser?.username === 'admin';
    const isManager = currentUser?.role === '관리자';

    if (!isDev) {
      const userName = (currentUser?.name || '').trim();
      const userPhone = (currentUser?.phone || '').trim();
      const userAccount = (currentUser?.username || '').trim();
      const userTeam = (currentUser?.team || currentUser?.department || currentUser?.division || currentUser?.company || '').trim();

      // Strict person identity matching (If division, team, rank, phone, name, role, username differs -> different person)
      const isPrimaryVisitor = isSamePerson(currentUser, item);

      const isCompanionVisitor = item.companions?.some(c => isSamePerson(currentUser, c));

      const isSelfPledge = isPrimaryVisitor || isCompanionVisitor;

      if (isManager) {
        // 관리자 계정: 같은 소속(팀/부서/회사) 인원의 모든 서약 내역 조회
        if (userTeam) {
          const itemTeam = (item.team || item.department || item.company || '').trim();
          const matchesMainTeam = itemTeam.includes(userTeam) || userTeam.includes(itemTeam);
          const matchesCompanionTeam = item.companions?.some(c => {
            const cTeam = (c.team || c.department || c.company || '').trim();
            return cTeam.includes(userTeam) || userTeam.includes(cTeam);
          });
          if (!matchesMainTeam && !matchesCompanionTeam && !isSelfPledge) {
            return false;
          }
        } else if (!isSelfPledge) {
          return false;
        }
      } else {
        // 일반 계정: 본인 서약 내역만 조회 가능
        if (!isSelfPledge) {
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
    if (selectedSiteFilter && selectedSiteFilter !== 'ALL') {
      matchesSite = item.site?.includes(selectedSiteFilter) || item.site_name?.includes(selectedSiteFilter);
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

  // Helper: 사업장(사업장명 + 위치 조합) 및 사용자(ID, 소속, 직급, 이름) 기준 오늘 서약 완료 여부 엄격 체크
  const isSiteAlreadyPledgedToday = (siteObj, visitorName, phone, username, team, rank) => {
    if (!siteObj) return false;
    const todayIso = getTodayLocalIsoDate();
    const siteNameStr = String(siteObj.name || '').trim().toLowerCase();
    const siteAddrStr = String(siteObj.address || '').trim().toLowerCase();

    return (checklistList || []).some(item => {
      // 1. 오늘 날짜 체크
      const itemDate = item.signature_date || item.signatureDate || item.signedAt || item.createdAt || '';
      const itemVisitDate = item.visitDate || '';
      const isToday = itemDate.includes(todayIso) || itemVisitDate.includes(todayIso) || matchesSelectedDate(item, todayIso);
      if (!isToday) return false;

      // 2. 사업장 구분: 사업장명 AND 사업장 위치 조합 확인 (1개라도 다르면 다른 사업장으로 판단)
      const itemSite = String(item.site_name || item.siteName || item.site || '').trim().toLowerCase();
      let nameMatches = siteNameStr ? itemSite.includes(siteNameStr) : false;
      let addrMatches = siteAddrStr ? itemSite.includes(siteAddrStr) : true; // 위치 미지정 시 사업장명만 검증

      if (!nameMatches || !addrMatches) return false;

      // 3. 사용자 식별: ID, 소속(team), 직급(rank), 이름(name) 기준 동일인 판단 (1개라도 다르면 다른 사람으로 판단)
      const targetUserObj = {
        username: username || currentUser?.username || '',
        name: visitorName || currentUser?.name || '',
        visitorName: visitorName || currentUser?.name || '',
        team: team || currentUser?.team || currentUser?.department || '',
        department: team || currentUser?.team || currentUser?.department || '',
        rank: rank || currentUser?.rank || '',
        phone: phone || currentUser?.phone || ''
      };

      const isPrimary = isSamePerson(targetUserObj, item);
      if (isPrimary && item.status !== '서약전') return true;

      if (Array.isArray(item.companions)) {
        const compMatch = item.companions.some(c => isSamePerson(targetUserObj, c) && c.status !== '서약전');
        if (compMatch) return true;
      }

      return false;
    });
  };

  // Submit Form
  const handleSubmitForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const activeUser = await dbService.getUserProfile();
    const targetApp = getTargetSecurityAppInfo(formData.site);
    const userTeam = (formData.team || formData.department || activeUser?.team || activeUser?.department || currentUser?.team || currentUser?.department || '보안관제팀').trim();
    const userDivision = (activeUser?.division || currentUser?.division || '사업부 미지정').trim();

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

    // 중복 서약 방지 검증: 오늘 동일 사업장에 이미 서약이 완료된 경우 방지
    if (!formData.isEditMode && !formData.isCompanionMode && formData.site) {
      const selectedSiteObj = sites.find(s => {
        const dName = s.address ? `${s.name} (${s.address})` : s.name;
        return dName === formData.site || s.name === formData.site || formData.site.includes(s.name);
      });

      const targetName = formData.visitorName || currentUser?.name || '';
      const targetPhone = formData.phone || currentUser?.phone || '';
      const targetUsername = activeUser?.username || currentUser?.username || '';
      const targetTeam = formData.team || formData.department || currentUser?.team || currentUser?.department || '';
      const targetRank = formData.rank || currentUser?.rank || '';

      if (selectedSiteObj && isSiteAlreadyPledgedToday(selectedSiteObj, targetName, targetPhone, targetUsername, targetTeam, targetRank)) {
        if (onTriggerToast) {
          onTriggerToast(`⛔ [중복 서약 방지] '${selectedSiteObj.name}' 사업장은 오늘 자로 이미 서약이 완료되었습니다. 동일 사업장에 중복 서명은 제한됩니다.`, 'warning');
        }
        setActiveStep(1);
        return;
      }
    }

    // 2) Step 2 Validation: Security App & Camera Lock Verification
    if (targetApp.isChecklistMode) {
      const isAll = cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed;
      if (!isAll && !formData.mdmVerified) {
        if (onTriggerToast) {
          onTriggerToast('❌ [승인 제출 거부] 2단계 카메라 보안 체크리스트 2개 항목 검수가 완료되지 않았습니다. 2단계로 이동하여 확인해 주세요.', 'warning');
        }
        setActiveStep(2);
        return;
      }
    } else {
      if (!secAppVerified) {
        if (onTriggerToast) {
          onTriggerToast(`❌ [승인 제출 거부] 2단계 모바일 보안 앱('${targetApp.shortName}') 실행 및 검수가 완료되지 않았습니다. [1. 모바일 보안 앱 바로가기]를 클릭해 주세요.`, 'warning');
        }
        setActiveStep(2);
        return;
      }

      if (!cameraCheckVerified) {
        if (onTriggerToast) {
          onTriggerToast(`❌ [승인 제출 거부] 2단계 [카메라 검수]가 완료되지 않았습니다. [2. 카메라 검수] 버튼을 클릭해 주세요.`, 'warning');
        }
        setActiveStep(2);
        return;
      }
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
    // If Companion Registration/Pledge Mode: Append or Update companion info directly on target pledge!
    if (wasCompanion && formData.parentPledgeId) {
      const targetPledge = checklistList.find(item => item.id === formData.parentPledgeId);
      if (targetPledge) {
        const inputVisitorName = formData.visitorName.trim();
        const inputPhone = (formData.phone || '').trim();
        const inputUsername = activeUser?.username || '';
        const compId = formData.companionId;

        let updatedCompanions = [...(targetPledge.companions || [])];

        const existingIndex = updatedCompanions.findIndex(c =>
          (compId && c.id === compId) ||
          isSamePerson(c, {
            visitorName: inputVisitorName,
            name: inputVisitorName,
            phone: inputPhone,
            username: inputUsername,
            rank: formData.rank?.trim() || '대리',
            team: userTeam,
            department: userTeam,
            division: currentUser?.division,
            role: currentUser?.role
          })
        );

        if (existingIndex >= 0) {
          // Update existing companion record to "완료"
          updatedCompanions[existingIndex] = {
            ...updatedCompanions[existingIndex],
            status: '완료',
            mdmVerified: true,
            phone: inputPhone || updatedCompanions[existingIndex].phone,
            username: inputUsername || updatedCompanions[existingIndex].username,
            division: currentUser?.division || updatedCompanions[existingIndex].division || '사업부 미지정',
            rank: formData.rank?.trim() || updatedCompanions[existingIndex].rank || '대리',
            role: currentUser?.role || updatedCompanions[existingIndex].role || '일반',
            pledgedAt: new Date().toLocaleString('ko-KR', { hour12: false })
          };
        } else {
          // Add new companion with "완료"
          const newCompanion = {
            id: compId || `COMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            visitorName: inputVisitorName,
            name: inputVisitorName,
            username: inputUsername,
            division: currentUser?.division || '사업부 미지정',
            team: userTeam,
            department: userTeam,
            rank: formData.rank?.trim() || '대리',
            role: currentUser?.role || '일반',
            phone: inputPhone || '010-0000-0000',
            status: '완료',
            mdmVerified: true,
            pledgedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
            createdAt: new Date().toLocaleString('ko-KR', { hour12: false })
          };
          updatedCompanions.push(newCompanion);
        }

        const updatedPledge = {
          ...targetPledge,
          companions: updatedCompanions
        };

        try {
          await dbService.saveChecklist(updatedPledge);

          const targetComp = updatedCompanions[existingIndex >= 0 ? existingIndex : updatedCompanions.length - 1];
          if (targetComp && targetComp.id) {
            await dbService.saveChecklist({
              id: targetComp.id,
              log_id: targetComp.id,
              parent_log_id: targetPledge.id || targetPledge.log_id,
              parentLogId: targetPledge.id || targetPledge.log_id,
              name: inputVisitorName,
              user_name: inputVisitorName,
              visitorName: inputVisitorName,
              userName: inputVisitorName,
              username: inputUsername,
              division: currentUser?.division || '',
              role: currentUser?.role || '일반',
              site: targetPledge.site || targetPledge.site_name || '',
              purpose: targetPledge.purpose || '',
              phone: inputPhone,
              visitor_phone: inputPhone,
              visitorPhone: inputPhone,
              team: userTeam,
              visitor_team: userTeam,
              department: userTeam,
              rank: formData.rank?.trim() || '대리',
              visitor_rank: formData.rank?.trim() || '대리',
              mdmVerified: true,
              docChecklist: { gateApproved: true, docSecVerified: true, preCheckVerified: true },
              pledgeTerms: targetPledge.pledgeTerms || '',
              signature_date: new Date().toLocaleString('ko-KR', { hour12: false }),
              signatureDate: new Date().toLocaleString('ko-KR', { hour12: false }),
              signedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
              status: '승인완료'
            });
          }
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
          onTriggerToast(`[${updatedPledge.site}] '${inputVisitorName}' 동행 서약 정보가 해당 내역에 반영되었습니다.`, 'success');
        }
        return;
      }
    }

    // Handle Primary Creator Re-Signing Submission
    const wasEditMode = Boolean(formData.isEditMode && formData.editingPledgeId);
    if (wasEditMode) {
      const targetPledge = checklistList.find(item => String(item.id) === String(formData.editingPledgeId) || String(item.log_id) === String(formData.editingPledgeId));
      if (targetPledge) {
        const updatedCompanions = (targetPledge.companions || []).map(c => ({
          ...c,
          site: formData.site,
          site_name: formData.site,
          siteName: formData.site
        }));

        const updatedPledge = {
          ...targetPledge,
          site: formData.site,
          site_name: formData.site,
          siteName: formData.site,
          name: formData.visitorName.trim(),
          visitorName: formData.visitorName.trim(),
          team: userTeam,
          visitor_team: userTeam,
          department: userTeam,
          rank: formData.rank?.trim() || targetPledge.rank || '대리',
          visitor_rank: formData.rank?.trim() || targetPledge.rank || '대리',
          company: userTeam,
          phone: formData.phone || targetPledge.phone || '010-0000-0000',
          visitor_phone: formData.phone || targetPledge.phone || '010-0000-0000',
          purpose: finalPurpose,
          purposeType: formData.purposeType,
          customPurpose: formData.customPurpose,
          visitDate: formData.visitDate,
          mdmVerified: formData.mdmVerified,
          docChecklist: formData.docChecklist || targetPledge.docChecklist,
          materials: formData.materials || [],
          companions: updatedCompanions,
          status: '승인완료',
          updatedAt: new Date().toLocaleString('ko-KR', { hour12: false })
        };

        try {
          await dbService.saveChecklist(updatedPledge);
        } catch (err) {
          console.error('Failed to update pass in DB:', err);
        }

        setChecklistList(prev => prev.map(item => (String(item.id) === String(updatedPledge.id) || String(item.log_id) === String(updatedPledge.id)) ? updatedPledge : item));
        handleCloseModal();
        setActiveStep(1);

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
          purposeType: '',
          customPurpose: '',
          purpose: '',
          visitDate: `${getTodayLocalIsoDate()} ~ ${getTodayLocalIsoDate()}`,
          mdmVerified: false,
          materials: [],
          agreedToTerms: false,
          isCompanionMode: false,
          parentPledgeId: null,
          isEditMode: false,
          editingPledgeId: null
        });

        if (onTriggerToast) {
          onTriggerToast(`[${updatedPledge.site}] 보안 서약이 성공적으로 다시 서명(수정)되었습니다.`, 'success');
        }
        return;
      }
    }

    const currentYear = new Date().getFullYear();
    const nextNum = checklistList.length + 1;
    const newPassId = `PASS-${currentYear}-${String(nextNum).padStart(3, '0')}`;

    const rawSiteStr = String(formData.site || '').trim();

    const newPass = {
      id: newPassId,
      log_id: newPassId,
      site_name: rawSiteStr,
      siteName: rawSiteStr,
      site: rawSiteStr,
      visitorName: formData.visitorName.trim(),
      name: formData.visitorName.trim(),
      username: activeUser?.username || currentUser?.username || '',
      division: userDivision || activeUser?.division || currentUser?.division || '사업부 미지정',
      role: activeUser?.role || currentUser?.role || '일반',
      team: userTeam,
      department: userTeam,
      rank: formData.rank?.trim() || '대리',
      phone: formData.phone || '010-0000-0000',
      purpose: finalPurpose,
      mdmVerified: formData.mdmVerified,
      docChecklist: formData.docChecklist || { gateApproved: false, docSecVerified: false, preCheckVerified: false },
      status: '승인완료',
      signature_date: new Date().toLocaleString('ko-KR', { hour12: false }),
      signatureDate: new Date().toLocaleString('ko-KR', { hour12: false }),
      signedAt: new Date().toLocaleString('ko-KR', { hour12: false })
    };

    try {
      await dbService.saveChecklist(newPass);
      const freshList = await dbService.getChecklists();
      setChecklistList(freshList || []);
    } catch (err) {
      console.error('Failed to save pass to DB:', err);
      setChecklistList([newPass, ...checklistList]);
    }
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
      purposeType: '',
      customPurpose: '',
      purpose: '',
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
      onTriggerToast(`[${newPass.site}] 보안서약 및 출입 승인증이 데이터베이스에 정상 등록되었습니다.`, 'success');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header Title Banner */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(14, 165, 233, 0.25)',
              flexShrink: 0
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
                사업장 출입 보안 서약
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                모바일 보안 앱 · 자재&문서 확인 · 전자 서약서
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', width: '100%' }}>
            {(Capacitor.isNativePlatform() || currentUser?.role === '개발자' || currentUser?.username === 'admin') ? (
              <button
                type="button"
                onClick={handleOpenPledgeModal}
                className="glass-button-primary"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25)'
                }}
              >
                <Plus size={18} /> 사업장 출입 체크리스트 & 보안 서약
              </button>
            ) : (
              <div style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <Smartphone size={16} color="#0284c7" />
                <span>사업장 출입 보안 서약 작성은 <strong>현장 모바일 앱(APK)</strong>에서만 가능합니다.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Date Selector Navigation Bar (Proportionally Spaced & Balanced) */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        borderRadius: '18px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '16px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)'
      }}>
        <button
          type="button"
          onClick={handlePrevDay}
          title="이전 날짜"
          style={{
            flex: '0 0 38px',
            height: '38px',
            borderRadius: '12px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
            {getFormattedKoreanDate(selectedDate)}
          </span>
          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            해당 날짜 서약: <strong style={{ color: '#0284c7', fontSize: '15px', fontWeight: '800' }}>{filteredList.length}건</strong>
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
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Checklist Registrations Data List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredList.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '18px', border: '1.5px solid #cbd5e1', color: '#64748b' }}>
            <ShieldCheck size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '14px', fontWeight: '700' }}>선택하신 날짜에 등록된 보안 서약 내역이 없습니다.</div>
          </div>
        ) : (
          filteredList.map((item) => {
            const isPrimaryVisitor = isSamePerson(currentUser, item);

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: '18px',
                  border: '1.5px solid #cbd5e1',
                  borderLeft: '4px solid #0284c7',
                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Row Header: Site Title & Companion Register Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="#0284c7" />
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      {item.site}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenCompanionRegisterModal(item)}
                      style={{
                        background: '#f0f9ff',
                        border: '1.5px solid #7dd3fc',
                        color: '#0284c7',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.12)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <UserPlus size={13} /> 동행 등록
                    </button>

                    {(() => {
                      const hasCompletedCompanions = item.companions && item.companions.some(c => c.status === '완료' || c.status === '서약 완료' || c.status === '승인완료');
                      const isDevUser = currentUser?.role === '개발자' || currentUser?.username === 'admin';
                      const canDeleteMainPledge = hasCompletedCompanions
                        ? isDevUser
                        : (isDevUser || currentUser?.role === '관리자' || isPrimaryVisitor);

                      if (!canDeleteMainPledge) return null;

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`'${item.visitorName}'님의 [${item.site}] 보안 서약 내역을 정말로 삭제하시겠습니까?`)) {
                              handleDeletePledge(item.id, item.site);
                            }
                          }}
                          title={hasCompletedCompanions ? "개발자 전용: 완료된 동행인이 포함된 서약 내역 삭제" : "서약 내역 삭제"}
                          style={{
                            background: '#fff1f2',
                            border: '1.5px solid #fda4af',
                            color: '#e11d48',
                            padding: '6px 10px',
                            borderRadius: '10px',
                            fontSize: '11.5px',
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
                      );
                    })()}
                  </div>
                </div>

                {/* Primary Visitor Info Row */}
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  color: '#475569'
                }}>
                  {/* Top Line: Primary Visitor Info & Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#0284c7', fontWeight: '700', fontSize: '11.5px' }}>
                        {item.team || (item.department ? (item.department.includes(' ') ? item.department.split(' ').slice(1).join(' ') : item.department) : '') || '소속팀 미지정'}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '11.5px' }}>
                        {item.rank || '대리'}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '12px' }}>
                        {item.visitorName}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span className="mono-font" style={{ color: '#64748b', fontSize: '11.5px' }}>
                        {item.phone || '010-0000-0000'}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1.5px solid #a7f3d0'
                    }}>
                      완료
                    </span>
                  </div>

                  {/* Bottom Full-Width Line: Primary Creator Re-Sign Action Button (Hidden when any companion is completed) */}
                  {(() => {
                    const hasCompletedCompanions = item.companions && item.companions.some(c => c.status === '완료' || c.status === '서약 완료' || c.status === '승인완료');
                    if (!isPrimaryVisitor || hasCompletedCompanions) return null;

                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePerformPrimaryResign(item);
                        }}
                        style={{
                          width: '100%',
                          marginTop: '2px',
                          padding: '9px 14px',
                          background: '#f0f9ff',
                          color: '#0284c7',
                          border: '1.5px solid #7dd3fc',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ✍️ 다시 서명하기
                      </button>
                    );
                  })()}
                </div>

                {/* Additional Registrations / Companions Rows */}
                {item.companions && item.companions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {item.companions.map((comp, idx) => {
                      const isCompleted = comp.status === '완료' || comp.status === '서약 완료' || comp.status === '승인완료';
                      const isCurrentCompanion = isSamePerson(currentUser, comp);
                      const isDev = currentUser?.role === '개발자' || currentUser?.username === 'admin';
                      const canDeleteCompanion = isCompleted
                        ? isDev
                        : (isDev || isPrimaryVisitor || isCurrentCompanion);

                      return (
                        <div
                          key={comp.id || idx}
                          style={{
                            background: isCurrentCompanion ? '#f0f9ff' : '#f8fafc',
                            border: isCurrentCompanion ? '1.5px solid #7dd3fc' : '1.5px solid #cbd5e1',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            color: '#475569'
                          }}
                        >
                          {/* Top Line: Companion Info & Status Badge & Delete Button */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ color: '#0284c7', fontWeight: '700', fontSize: '11.5px' }}>
                                {comp.team || comp.department || '소속팀 미지정'}
                              </span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '11.5px' }}>
                                {comp.rank || '대리'}
                              </span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '12px' }}>
                                {comp.visitorName}
                              </span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <span className="mono-font" style={{ color: '#64748b', fontSize: '11.5px' }}>
                                {comp.phone || '010-0000-0000'}
                              </span>
                            </div>

                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: isCompleted ? '#ecfdf5' : '#fffbeb',
                              color: isCompleted ? '#059669' : '#d97706',
                              border: isCompleted ? '1.5px solid #a7f3d0' : '1.5px solid #fde68a'
                            }}>
                              {isCompleted ? '완료' : '대기'}
                            </span>
                          </div>

                          {/* Bottom Line: Companion Action Buttons (Pledge & Delete - 1:1 side-by-side when both exist) */}
                          {(() => {
                            const showPledgeBtn = isCurrentCompanion && !isCompleted;
                            const showDeleteBtn = canDeleteCompanion;

                            if (!showPledgeBtn && !showDeleteBtn) return null;

                            const isBoth = showPledgeBtn && showDeleteBtn;

                            return (
                              <div style={{
                                display: isBoth ? 'grid' : 'flex',
                                gridTemplateColumns: isBoth ? '1fr 1fr' : undefined,
                                gap: '8px',
                                width: '100%',
                                marginTop: '2px'
                              }}>
                                {showPledgeBtn && (
                                  <button
                                    type="button"
                                    onClick={() => handlePerformCompanionPledge(item, comp)}
                                    style={{
                                      width: '100%',
                                      padding: '9px 12px',
                                      background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '10px',
                                      fontSize: '12.5px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      transition: 'all 0.2s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    ✍️ 동행 서약 하기
                                  </button>
                                )}

                                {showDeleteBtn && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCompanion(item.id, comp.id, comp.visitorName);
                                    }}
                                    title={isCurrentCompanion ? "본인 동행 서약 삭제" : isPrimaryVisitor ? "최초 등록자 권한: 동행자 삭제" : "개발자 권한: 동행자 삭제"}
                                    style={{
                                      width: '100%',
                                      padding: '9px 12px',
                                      background: '#fff1f2',
                                      color: '#e11d48',
                                      border: '1.5px solid #fda4af',
                                      borderRadius: '10px',
                                      fontSize: '12.5px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 8px rgba(244, 63, 94, 0.08)',
                                      transition: 'all 0.2s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <Trash2 size={13} /> 동행인 삭제
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Tags: High Visibility Visit Purpose Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700' }}>방문목적:</span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      background: item.purpose?.includes('작업') || item.purpose?.includes('공사')
                        ? '#fffbeb'
                        : item.purpose?.includes('미팅') || item.purpose?.includes('방문') || item.purpose?.includes('회의')
                          ? '#f0f9ff'
                          : '#faf5ff',
                      color: item.purpose?.includes('작업') || item.purpose?.includes('공사')
                        ? '#d97706'
                        : item.purpose?.includes('미팅') || item.purpose?.includes('방문') || item.purpose?.includes('회의')
                          ? '#0284c7'
                          : '#7c3aed',
                      border: item.purpose?.includes('작업') || item.purpose?.includes('공사')
                        ? '1.5px solid #fde68a'
                        : item.purpose?.includes('미팅') || item.purpose?.includes('방문') || item.purpose?.includes('회의')
                          ? '1.5px solid #7dd3fc'
                          : '1.5px solid #c4b5fd'
                    }}>
                      📌 {item.purpose || '작업'}
                    </span>
                  </div>
                  <div className="mono-font" style={{ fontSize: '11.5px', color: '#64748b' }}>등록일: {item.createdAt}</div>
                </div>
              </div>
            );
          })
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
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1.5px solid #cbd5e1',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  border: '1.5px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(14, 165, 233, 0.25)',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
                    사업장 출입 보안 서약
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', display: 'block' }}>
                    보안 앱 · 자재&문서 · 전자 서약서
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Step Progress Tracker (Modern High-Contrast Stepper with Incomplete Warning) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
              padding: '10px 12px',
              background: '#f8fafc',
              borderBottom: '1.5px solid #cbd5e1'
            }}>
              {(() => {
                const isStep1Done = Boolean(
                  formData.site && formData.site.trim() &&
                  formData.visitorName && formData.visitorName.trim() &&
                  formData.purposeType && formData.purposeType.trim() &&
                  (formData.purposeType !== '기타' || formData.customPurpose?.trim())
                );
                const selSite = sites.find(s => {
                  const dName = s.address ? `${s.name} (${s.address})` : s.name;
                  return dName === formData.site || s.name === formData.site || (formData.site && formData.site.includes(s.name));
                });
                const isSecSite = selSite ? (selSite.type !== '보안앱X' && selSite.type !== '보안어플X') : true;
                const isStep2Done = isSecSite
                  ? (secAppVerified && cameraCheckVerified)
                  : Boolean(cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed && cameraSelfChecklist.cameraChecked);
                const isStep3Done = Boolean(
                  formData.docChecklist?.gateApproved &&
                  formData.docChecklist?.docSecVerified &&
                  formData.docChecklist?.preCheckVerified
                );

                const getStepCompletion = (st) => {
                  if (st === 1) return isStep1Done;
                  if (st === 2) return isStep2Done;
                  if (st === 3) return isStep3Done;
                  return false;
                };

                return [
                  { step: 1, title: '사업장 정보', sub: '기본 정보' },
                  { step: 2, title: '보안 앱', sub: 'MDM & 카메라' },
                  { step: 3, title: '자재&문서', sub: '보안 체크' },
                  { step: 4, title: '전자 서약서', sub: '서명 & 승인' }
                ].map(s => {
                  const isActive = activeStep === s.step;
                  const isDone = getStepCompletion(s.step);
                  const isPassed = activeStep > s.step;
                  const isMissing = isPassed && !isDone;

                  let borderColor = '#cbd5e1';
                  let bgColor = '#f1f5f9';
                  let textColor = '#475569';
                  let badgeBg = '#cbd5e1';
                  let badgeText = s.step;

                  if (isActive) {
                    borderColor = isMissing ? '#fda4af' : '#0284c7';
                    bgColor = '#ffffff';
                    textColor = isMissing ? '#e11d48' : '#0284c7';
                    badgeBg = isMissing ? '#e11d48' : '#0284c7';
                    badgeText = s.step;
                  } else if (isMissing) {
                    borderColor = '#fda4af';
                    bgColor = '#fff1f2';
                    textColor = '#e11d48';
                    badgeBg = '#e11d48';
                    badgeText = '!';
                  } else if (isDone) {
                    borderColor = '#86efac';
                    bgColor = '#f0fdf4';
                    textColor = '#16a34a';
                    badgeBg = '#16a34a';
                    badgeText = '✓';
                  }

                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => handleStepHeaderClick(s.step)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: `1.5px solid ${borderColor}`,
                        background: bgColor,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none',
                        position: 'relative',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* 줄 1: 단계 숫자 / 완료 체크 / 경고 아이콘 원형 뱃지 */}
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: badgeBg,
                        color: '#ffffff',
                        flexShrink: 0
                      }}>
                        {badgeText}
                      </span>

                      {/* 줄 2: 단계 제목 텍스트 */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: isActive ? '800' : '700',
                        color: textColor,
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        lineHeight: '1.2'
                      }}>
                        {s.title}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Step Contents Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* STEP 1: Site & Security Checklist Entry Information */}
              {activeStep === 1 && (() => {
                const isSiteInvalid = step1Attempted && (!formData.site || !formData.site.trim());
                const isPurposeInvalid = step1Attempted && (!formData.purposeType || !formData.purposeType.trim());
                const isCustomPurposeInvalid = step1Attempted && formData.purposeType === '기타' && (!formData.customPurpose || !formData.customPurpose.trim());

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Select Target Site */}
                    <div>
                      <label style={{ fontSize: '12px', color: isSiteInvalid ? '#e11d48' : '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        출입 대상 사업장 * {isSiteInvalid && <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '800' }}>[사업장을 선택해 주세요]</span>}
                      </label>
                      {formData.isCompanionMode ? (
                        <input
                          type="text"
                          disabled
                          value={formData.site}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            color: '#0284c7',
                            fontWeight: '800',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'not-allowed'
                          }}
                        />
                      ) : (
                        <select
                          value={formData.site}
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedSiteObj = sites.find(s => {
                              const dName = s.address ? `${s.name} (${s.address})` : s.name;
                              return dName === val || s.name === val;
                            });

                            const targetName = formData.visitorName || currentUser?.name || '';
                            const targetPhone = formData.phone || currentUser?.phone || '';
                            const targetUsername = currentUser?.username || '';
                            const targetTeam = formData.team || formData.department || currentUser?.team || currentUser?.department || '';
                            const targetRank = formData.rank || currentUser?.rank || '';

                            if (!formData.isEditMode && !formData.isCompanionMode && selectedSiteObj && isSiteAlreadyPledgedToday(selectedSiteObj, targetName, targetPhone, targetUsername, targetTeam, targetRank)) {
                              if (onTriggerToast) {
                                onTriggerToast(`⛔ [중복 서약 방지] '${selectedSiteObj.name}' 사업장은 오늘 자로 이미 서약이 완료되었습니다. 다른 사업장을 선택해 주세요.`, 'warning');
                              }
                              return;
                            }

                            setFormData({ ...formData, site: val });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: isSiteInvalid ? '#fff1f2' : '#ffffff',
                            border: isSiteInvalid ? '2px solid #e11d48' : '1.5px solid #cbd5e1',
                            boxShadow: isSiteInvalid ? '0 0 0 3px rgba(225, 29, 72, 0.15)' : 'none',
                            color: formData.site ? '#0f172a' : '#94a3b8',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <option value="" disabled>-- 출입 사업장을 선택해 주세요 --</option>
                          {sites.map((s) => {
                            const displayName = s.address ? `${s.name} (${s.address})` : s.name;
                            const targetName = formData.visitorName || currentUser?.name || '';
                            const targetPhone = formData.phone || currentUser?.phone || '';
                            const targetUsername = currentUser?.username || '';
                            const targetTeam = formData.team || formData.department || currentUser?.team || currentUser?.department || '';
                            const targetRank = formData.rank || currentUser?.rank || '';

                            const isPledged = !formData.isEditMode && !formData.isCompanionMode && isSiteAlreadyPledgedToday(s, targetName, targetPhone, targetUsername, targetTeam, targetRank);

                            return (
                              <option
                                key={s.id}
                                value={displayName}
                                disabled={isPledged}
                                style={{
                                  background: isPledged ? '#f1f5f9' : '#ffffff',
                                  color: isPledged ? '#94a3b8' : '#0f172a'
                                }}
                              >
                                [{(s.type === '보안어플O' ? '보안앱O' : s.type === '보안어플X' ? '보안앱X' : s.type) || s.category || '보안앱O'}] {displayName} {isPledged ? '⛔ (오늘 서약 완료됨)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                    {/* Visit Purpose Dropdown & Custom Text Input */}
                    <div>
                      <label style={{ fontSize: '12px', color: isPurposeInvalid ? '#e11d48' : '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        방문 목적 * {isPurposeInvalid && <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '800' }}>[방문 목적을 선택해 주세요]</span>}
                      </label>
                      {formData.isCompanionMode ? (
                        <input
                          type="text"
                          disabled
                          value={formData.purpose || formData.purposeType || '작업'}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            color: '#0284c7',
                            fontWeight: '800',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'not-allowed'
                          }}
                        />
                      ) : (
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
                            background: isPurposeInvalid ? '#fff1f2' : '#ffffff',
                            border: isPurposeInvalid ? '2px solid #e11d48' : '1.5px solid #cbd5e1',
                            boxShadow: isPurposeInvalid ? '0 0 0 3px rgba(225, 29, 72, 0.15)' : 'none',
                            color: formData.purposeType ? '#0f172a' : '#94a3b8',
                            fontSize: '13px',
                            fontWeight: formData.purposeType ? '600' : '500',
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <option value="" disabled>-- 방문 목적을 선택해 주세요 --</option>
                          <option value="작업">작업</option>
                          <option value="회의">회의</option>
                          <option value="납품">납품</option>
                          <option value="기타">기타</option>
                        </select>
                      )}
                    </div>

                    {formData.purposeType === '기타' && (
                      <div>
                        <label style={{ fontSize: '12px', color: isCustomPurposeInvalid ? '#e11d48' : '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                          기타 방문 목적 상세 입력 * {isCustomPurposeInvalid && <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '800' }}>[목적을 입력해 주세요]</span>}
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
                            background: isCustomPurposeInvalid ? '#fff1f2' : '#ffffff',
                            border: isCustomPurposeInvalid ? '2px solid #e11d48' : '1.5px solid #cbd5e1',
                            boxShadow: isCustomPurposeInvalid ? '0 0 0 3px rgba(225, 29, 72, 0.15)' : 'none',
                            color: '#0f172a',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      </div>
                    )}

                    {/* Visitor Name & Rank (Disabled - Fixed to Logged In User Profile) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                          방문자 성명 <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500' }}></span>
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder="홍길동"
                          value={formData.visitorName}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '13px',
                            fontWeight: '700',
                            outline: 'none',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                          직급 <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500' }}></span>
                        </label>
                        <input
                          type="text"
                          disabled
                          value={formData.rank || '대리'}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '13px',
                            fontWeight: '700',
                            outline: 'none',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                    </div>

                    {/* Department & Phone (Disabled - Fixed to Logged In User Profile) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                          소속팀 (부서) <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500' }}></span>
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder="예: 보안관제팀"
                          value={formData.department}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '13px',
                            fontWeight: '700',
                            outline: 'none',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                          연락처 <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500' }}></span>
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder="010-0000-0000"
                          maxLength={13}
                          value={formData.phone}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '13px',
                            fontWeight: '700',
                            outline: 'none',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStep1Attempted(true);
                        if (!formData.site || !formData.site.trim()) {
                          if (onTriggerToast) onTriggerToast('❌ [필수 선택] 출입하실 사업장을 선택해 주세요.', 'warning');
                          return;
                        }
                        if (!formData.visitorName || !formData.visitorName.trim()) {
                          if (onTriggerToast) onTriggerToast('❌ [필수 입력] 방문자 성명을 입력해 주세요.', 'warning');
                          return;
                        }
                        if (!formData.purposeType || !formData.purposeType.trim()) {
                          if (onTriggerToast) onTriggerToast('❌ [필수 입력] 방문 목적을 선택해 주세요.', 'warning');
                          return;
                        }
                        if (formData.purposeType === '기타' && (!formData.customPurpose || !formData.customPurpose.trim())) {
                          if (onTriggerToast) onTriggerToast('❌ [필수 입력] 기타 방문 목적 상세 내용을 입력해 주세요.', 'warning');
                          return;
                        }
                        setActiveStep(2);
                      }}
                      className="glass-button-primary"
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        marginTop: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '800'
                      }}
                    >
                      다음: 모바일 보안 앱 검수 <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })()}

              {/* STEP 2: Mobile Security App Verification (Samsung MDM & SK Hynix SSM) */}
              {activeStep === 2 && (() => {
                const targetApp = getTargetSecurityAppInfo(formData.site);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📱 Step 2. 모바일 보안 앱 실행 확인
                      </div>
                    </div>

                    {/* Target Security App Card */}
                    {!formData.site && (
                      <div style={{
                        background: '#fff1f2',
                        border: '1.5px solid #fda4af',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        color: '#e11d48',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        <span>⚠️ 사업장을 먼저 선택해 주세요.</span>
                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#e11d48',
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

                    {/* Step 2 Content: Checklist Mode vs MDM Scan Mode */}
                    {targetApp.isChecklistMode ? (
                      <div style={{
                        background: '#f8fafc',
                        border: `1.5px solid #cbd5e1`,
                        padding: '18px',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: targetApp.badgeBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1.5px solid ${targetApp.color}50`,
                            flexShrink: 0
                          }}>
                            <Camera size={22} color={targetApp.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                              {targetApp.appName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                              {targetApp.desc}
                            </div>
                          </div>
                        </div>

                        {/* 1. 체크리스트 카드 */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          padding: '14px',
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', marginBottom: '2px' }}>
                            📋 1단계: 카메라 보안 상태 셀프 체크
                          </div>

                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#0f172a', fontWeight: '600', cursor: 'pointer', lineHeight: '1.4' }}>
                            <input
                              type="checkbox"
                              checked={cameraSelfChecklist.stickerAttached}
                              onChange={(e) => {
                                const nextVal = e.target.checked;
                                const updated = { ...cameraSelfChecklist, stickerAttached: nextVal };
                                setCameraSelfChecklist(updated);
                                const isAll = updated.stickerAttached && updated.noPhotoAgreed && updated.cameraChecked;
                                setFormData(prev => ({ ...prev, mdmVerified: isAll, cameraLocked: isAll }));
                              }}
                              style={{ width: '16px', height: '16px', accentColor: '#0284c7', marginTop: '2px' }}
                            />
                            <span>[필수] 스마트폰 카메라 렌즈에 보안 스티커 부착</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#0f172a', fontWeight: '600', cursor: 'pointer', lineHeight: '1.4' }}>
                            <input
                              type="checkbox"
                              checked={cameraSelfChecklist.noPhotoAgreed}
                              onChange={(e) => {
                                const nextVal = e.target.checked;
                                const updated = { ...cameraSelfChecklist, noPhotoAgreed: nextVal };
                                setCameraSelfChecklist(updated);
                                const isAll = updated.stickerAttached && updated.noPhotoAgreed && updated.cameraChecked;
                                setFormData(prev => ({ ...prev, mdmVerified: isAll, cameraLocked: isAll }));
                              }}
                              style={{ width: '16px', height: '16px', accentColor: '#0284c7', marginTop: '2px' }}
                            />
                            <span>[필수] 사업장 내 사진 및 동영상 무단 촬영 금지</span>
                          </label>
                        </div>

                        {/* 2. 스마트폰 카메라 앱 실행 카드 */}
                        <div style={{
                          background: cameraSelfChecklist.cameraChecked ? '#ecfdf5' : '#ffffff',
                          border: cameraSelfChecklist.cameraChecked ? '1.5px solid #a7f3d0' : '1.5px solid #cbd5e1',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.25s ease',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                        }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '800', color: cameraSelfChecklist.cameraChecked ? '#059669' : '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📸 2단계: 스마트폰 기본 카메라 앱 실행</span>
                          </div>

                          <button
                            type="button"
                            onClick={handleLaunchNativeCameraApp}
                            style={{
                              width: '100%',
                              height: '46px',
                              padding: '0 16px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: '800',
                              background: cameraSelfChecklist.cameraChecked ? '#ecfdf5' : '#f0f9ff',
                              color: cameraSelfChecklist.cameraChecked ? '#059669' : '#0284c7',
                              border: cameraSelfChecklist.cameraChecked ? '1.5px solid #a7f3d0' : '1.5px solid #7dd3fc',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.25s ease'
                            }}
                          >
                            {cameraSelfChecklist.cameraChecked ? (
                              <><CheckCircle2 size={18} color="#059669" /> 스마트폰 카메라 앱 실행됨 (차단 확인 완료)</>
                            ) : (
                              <><Camera size={18} /> 📸 스마트폰 카메라 앱 실행 (스티커 차단 확인)</>
                            )}
                          </button>
                        </div>

                        {/* 3. Real-time Checklist Verification Indicator */}
                        <div style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '800',
                          background: (cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed && cameraSelfChecklist.cameraChecked)
                            ? '#ecfdf5'
                            : '#fff1f2',
                          color: (cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed && cameraSelfChecklist.cameraChecked)
                            ? '#059669'
                            : '#e11d48',
                          border: (cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed && cameraSelfChecklist.cameraChecked)
                            ? '1.5px solid #a7f3d0'
                            : '1.5px solid #fda4af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {(cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed && cameraSelfChecklist.cameraChecked) ? (
                            <><CheckCircle2 size={16} color="#059669" /> ✓ 카메라 보안 및 스티커 차단 확인 완료</>
                          ) : (
                            <><X size={16} color="#e11d48" /> ❌ 보안앱 미확인 (셀프 체크 및 카메라 앱 실행 확인 필요)</>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
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
                              border: `1.5px solid ${targetApp.color}50`
                            }}>
                              <Smartphone size={22} color={targetApp.color} />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                {targetApp.appName}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                {targetApp.desc}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 2 Decoupled Dual Sub-Check Section */}
                        <div style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>

                          {/* Sub-Check 1: 모바일 보안 앱 바로가기 (앱 검수) */}
                          <div style={{
                            background: secAppVerified
                              ? '#ecfdf5'
                              : (!secAppVerified && (secAppFailed || step2Attempted))
                                ? '#fff1f2'
                                : '#ffffff',
                            border: secAppVerified
                              ? '1.5px solid #a7f3d0'
                              : (!secAppVerified && (secAppFailed || step2Attempted))
                                ? '1.5px solid #fda4af'
                                : '1.5px solid #cbd5e1',
                            borderRadius: '14px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.25s ease',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                          }}>
                            <div style={{
                              fontSize: '12.5px',
                              fontWeight: '800',
                              color: secAppVerified ? '#059669' : (!secAppVerified && (secAppFailed || step2Attempted)) ? '#e11d48' : '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>📱 1단계: 모바일 보안 앱</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const selectedSiteObj = sites.find(s => {
                                  const dName = s.address ? `${s.name} (${s.address})` : s.name;
                                  return dName === formData.site || s.name === formData.site || (formData.site && formData.site.includes(s.name));
                                });

                                const registeredAppUrl = selectedSiteObj?.appUrl || selectedSiteObj?.app_url || '';
                                const siteName = selectedSiteObj?.name || formData.site || '출입 사업장';

                                if (!registeredAppUrl || !registeredAppUrl.trim()) {
                                  setSecAppVerified(false);
                                  setSecAppFailed(true);
                                  return;
                                }

                                const targetScheme = registeredAppUrl.trim();
                                const result = await launchApp(targetScheme);

                                if (result.success) {
                                  setSecAppVerified(true);
                                  setSecAppFailed(false);
                                } else if (result.method === 'web-disabled') {
                                  setSecAppVerified(false);
                                  setSecAppFailed(true);
                                } else {
                                  setSecAppVerified(false);
                                  setSecAppFailed(true);
                                }
                              }}
                              style={{
                                width: '100%',
                                height: '46px',
                                padding: '0 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '800',
                                background: secAppVerified
                                  ? '#ecfdf5'
                                  : (!secAppVerified && (secAppFailed || step2Attempted))
                                    ? '#fff1f2'
                                    : '#f0f9ff',
                                color: secAppVerified ? '#059669' : (!secAppVerified && (secAppFailed || step2Attempted)) ? '#e11d48' : '#0284c7',
                                border: secAppVerified
                                  ? '1.5px solid #a7f3d0'
                                  : (!secAppVerified && (secAppFailed || step2Attempted))
                                    ? '1.5px solid #fda4af'
                                    : '1.5px solid #7dd3fc',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.25s ease'
                              }}
                            >
                              {secAppVerified ? (
                                <><CheckCircle2 size={18} color="#059669" /> 모바일 보안 앱 바로가기 (검수 완료)</>
                              ) : (!secAppVerified && (secAppFailed || step2Attempted)) ? (
                                <>❌ 보안 앱 미실행 (설치 상태 확인 필요)</>
                              ) : (
                                <><Smartphone size={18} /> 모바일 보안 앱 실행</>
                              )}
                            </button>
                          </div>

                          {/* Sub-Check 2: 카메라 검수 */}
                          <div style={{
                            background: cameraCheckVerified
                              ? '#ecfdf5'
                              : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted))
                                ? '#fff1f2'
                                : '#ffffff',
                            border: cameraCheckVerified
                              ? '1.5px solid #a7f3d0'
                              : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted))
                                ? '1.5px solid #fda4af'
                                : '1.5px solid #cbd5e1',
                            borderRadius: '14px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.25s ease',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                          }}>
                            <div style={{
                              fontSize: '12.5px',
                              fontWeight: '800',
                              color: cameraCheckVerified ? '#059669' : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted)) ? '#e11d48' : '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>📸 2단계: 스마트폰 카메라 차단 검수</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const isLocked = await handleCheckAppExecutionStatus();
                                if (isLocked) {
                                  setCameraCheckVerified(true);
                                } else {
                                  setCameraCheckVerified(false);
                                }
                              }}
                              disabled={appScanState.isScanning || cameraCheckState.isTesting}
                              style={{
                                width: '100%',
                                height: '46px',
                                padding: '0 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '800',
                                background: cameraCheckVerified
                                  ? '#ecfdf5'
                                  : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted))
                                    ? '#fff1f2'
                                    : '#f0f9ff',
                                color: cameraCheckVerified ? '#059669' : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted)) ? '#e11d48' : '#0284c7',
                                border: cameraCheckVerified
                                  ? '1.5px solid #a7f3d0'
                                  : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted))
                                    ? '1.5px solid #fda4af'
                                    : '1.5px solid #7dd3fc',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                cursor: (appScanState.isScanning || cameraCheckState.isTesting) ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.25s ease'
                              }}
                            >
                              {appScanState.isScanning || cameraCheckState.isTesting ? (
                                <><ShieldCheck size={16} className="animate-spin" /> 카메라 검수 진행 중</>
                              ) : cameraCheckVerified ? (
                                <><CheckCircle2 size={16} color="#059669" /> 카메라 차단 확인됨 (검수 완료)</>
                              ) : (!cameraCheckVerified && (cameraCheckState.result === 'UNLOCKED' || step2Attempted)) ? (
                                <>❌ 카메라 차단 안됨 (앱 상태 확인 필요)</>
                              ) : (
                                <>📸 카메라 검수 시작</>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Manual Simulation Controls (Visible ONLY for Developer / admin account) */}
                        {(currentUser?.role === '개발자' || currentUser?.username === 'admin') && (
                          <div style={{
                            background: '#f1f5f9',
                            border: '1.5px dashed #0284c7',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                  background: '#fffbeb',
                                  color: '#d97706',
                                  border: '1.5px solid #fde68a',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                ⚠️ 1. 보안 앱 상태 확인 필요
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
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  border: '1.5px solid #a7f3d0',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                🟢 2. 보안 앱 정상 가동중
                              </button>
                            </div>
                          </div>
                        )}
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
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        이전
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (targetApp.isChecklistMode) {
                            const isAll = cameraSelfChecklist.stickerAttached && cameraSelfChecklist.noPhotoAgreed && cameraSelfChecklist.cameraChecked;
                            if (!isAll) {
                              if (onTriggerToast) {
                                if (!cameraSelfChecklist.stickerAttached || !cameraSelfChecklist.noPhotoAgreed) {
                                  onTriggerToast('❌ [검수 미완료] 카메라 보안 체크리스트 2개 항목을 모두 체크해 주세요.', 'warning');
                                } else if (!cameraSelfChecklist.cameraChecked) {
                                  onTriggerToast('❌ [검수 미완료] 2단계 [카메라 실행]을 통해 스티커 차단 상태를 확인해 주세요.', 'warning');
                                }
                              }
                              return;
                            }
                          } else {
                            if (!secAppVerified || !cameraCheckVerified) {
                              setStep2Attempted(true);
                              if (!secAppVerified && !cameraCheckVerified) {
                                if (onTriggerToast) onTriggerToast(`❌ [검수 미완료] 1단계 모바일 보안 앱 실행과 2단계 카메라 차단 검수를 모두 완료해 주세요.`, 'warning');
                              } else if (!secAppVerified) {
                                if (onTriggerToast) onTriggerToast(`❌ [검수 미완료] 1단계 모바일 보안 앱 실행 검수가 완료되지 않았습니다.`, 'warning');
                              } else {
                                if (onTriggerToast) onTriggerToast(`❌ [검수 미완료] 2단계 카메라 차단 검수가 완료되지 않았습니다. [카메라 검수 시작]을 진행해 주세요.`, 'warning');
                              }
                              return;
                            }
                          }
                          setStep2Attempted(false);
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
                          gap: '6px',
                          fontWeight: '800'
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
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📦 Step 3. 자재&문서 보안 확인
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Item 1 */}
                      <div
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          docChecklist: { ...docChecklist, gateApproved: !docChecklist.gateApproved }
                        }))}
                        style={{
                          background: docChecklist.gateApproved ? '#f0f9ff' : '#f8fafc',
                          border: docChecklist.gateApproved ? '1.5px solid #7dd3fc' : '1.5px solid #cbd5e1',
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
                          <PackageCheck size={20} color={docChecklist.gateApproved ? '#0284c7' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              1. 지입 자재 물품 보안 검색대 승인
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                              보안 검색대를 통한 자재 및 물품 검수/승인 완료
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={docChecklist.gateApproved}
                          readOnly
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Item 2 */}
                      <div
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          docChecklist: { ...docChecklist, docSecVerified: !docChecklist.docSecVerified }
                        }))}
                        style={{
                          background: docChecklist.docSecVerified ? '#f0f9ff' : '#f8fafc',
                          border: docChecklist.docSecVerified ? '1.5px solid #7dd3fc' : '1.5px solid #cbd5e1',
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
                          <FileText size={20} color={docChecklist.docSecVerified ? '#0284c7' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              2. 문서 보안 상태 확인
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                              서류 및 문서 보안 상태 확인
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={docChecklist.docSecVerified}
                          readOnly
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Item 3 */}
                      <div
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          docChecklist: { ...docChecklist, preCheckVerified: !docChecklist.preCheckVerified }
                        }))}
                        style={{
                          background: docChecklist.preCheckVerified ? '#f0f9ff' : '#f8fafc',
                          border: docChecklist.preCheckVerified ? '1.5px solid #7dd3fc' : '1.5px solid #cbd5e1',
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
                          <ShieldCheck size={20} color={docChecklist.preCheckVerified ? '#0284c7' : '#64748b'} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              3. 보안 물품 반입 전 확인
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                              전자기기/노트북/공구 등 보안 물품 봉인 라벨 부착 상태 확인
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={docChecklist.preCheckVerified}
                          readOnly
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="glass-button"
                        style={{ padding: '12px', borderRadius: '12px', flex: 1, cursor: 'pointer', fontWeight: '700' }}
                      >
                        이전 단계
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const cl = formData.docChecklist || { gateApproved: false, docSecVerified: false, preCheckVerified: false };
                          if (!cl.gateApproved || !cl.docSecVerified || !cl.preCheckVerified) {
                            if (onTriggerToast) {
                              onTriggerToast('⚠️ [자재&문서 보안] 확인 체크박스 항목을 확인해 주세요. (미체크 시 미완료 표시)', 'warning');
                            }
                          }
                          setActiveStep(4);
                        }}
                        className="glass-button-primary"
                        style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: '800' }}
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
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📜 Step 4. 사업장 정보보호 서약 및 전자 서명
                  </div>

                  {/* Pledge Terms Card */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    fontSize: '12px',
                    color: '#334155',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                      [사업장 정보보안 및 영업비밀 보호 서약서]
                    </div>
                    1. 본인은 당사 사업장 출입 시 지정된 구역 외 무단 이동을 금지합니다.<br />
                    2. 사업장 내부 제반 시설 및 설비의 촬영을 엄격히 금지합니다.<br />
                    3. 반입 승인되지 않은 스마트 기기, 촬영 장비, 미인증 USB 수용매체의 반입을 금지합니다.<br />
                    4. 퇴장 시 보안 서약 검수 및 반입 자재 반출 상태를 필수적으로 확인받으며, 기밀 유출 시 관계 법령에 따라 형사 처벌 조치를 받는 것에 동의합니다.
                  </div>

                  {/* Agreement Checkbox with Red Alert Box when Unchecked */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: formData.agreedToTerms
                      ? '1.5px solid #7dd3fc'
                      : '1.5px solid #fda4af',
                    background: formData.agreedToTerms
                      ? '#f0f9ff'
                      : '#fff1f2',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
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
                        style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: formData.agreedToTerms ? '#0284c7' : '#e11d48' }}>
                        위 사항을 숙지하였으며 성실히 이행할 것을 서약합니다.
                      </span>
                    </label>
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
                        background: isReadyToSubmit ? '#ecfdf5' : '#fffbeb',
                        border: isReadyToSubmit ? '1.5px solid #a7f3d0' : '1.5px solid #fde68a',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: isReadyToSubmit ? '#059669' : '#d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>📋 보안 서약 요건 검수</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11.5px' }}>
                          <div style={{ color: isStep1Valid ? '#059669' : '#e11d48', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isStep1Valid ? '✓' : '❌'} 1. 사업장 선택
                          </div>
                          <div style={{ color: isMdmValid ? '#059669' : '#e11d48', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isMdmValid ? '✓' : '❌'} 2. 보안 앱 상태
                          </div>
                          <div style={{ color: isDocValid ? '#059669' : '#e11d48', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isDocValid ? '✓' : '❌'} 3. 자재&문서 확인
                          </div>
                          <div style={{ color: isTermsValid ? '#059669' : '#e11d48', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      style={{ padding: '12px', borderRadius: '12px', flex: 1, cursor: 'pointer', fontWeight: '700' }}
                    >
                      이전 단계
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmitForm}
                      className="glass-button-primary"
                      style={{ padding: '12px', borderRadius: '12px', flex: 2, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: '800' }}
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
          background: 'rgba(15, 23, 42, 0.65)',
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
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}>
            {/* Modal Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} color="#0284c7" />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  전자 출입 보안서약증 & 자재 승인표
                </span>
              </div>
              <button
                onClick={() => setSelectedPass(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Electronic Badge Card Box */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
            }}>
              {/* Top Watermark / Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7' }}>
                  {selectedPass.site}
                </div>
                <span className="badge-secure" style={{ fontSize: '10px' }}>
                  VERIFIED PASS
                </span>
              </div>

              {/* QR Code Container */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                padding: '16px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 auto',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
              }}>
                {/* SVG Mock QR Code */}
                <svg width="120" height="120" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#ffffff" />
                  <path d="M 10 10 H 35 V 35 H 10 Z M 15 15 V 30 H 30 V 15 Z" fill="#0f172a" />
                  <path d="M 65 10 H 90 V 35 H 65 Z M 70 15 V 30 H 85 V 15 Z" fill="#0f172a" />
                  <path d="M 10 65 H 35 V 90 H 10 Z M 15 70 V 85 H 30 V 70 Z" fill="#0f172a" />
                  <rect x="40" y="10" width="10" height="10" fill="#0f172a" />
                  <rect x="50" y="25" width="10" height="15" fill="#0f172a" />
                  <rect x="20" y="45" width="20" height="10" fill="#0f172a" />
                  <rect x="60" y="55" width="25" height="10" fill="#0f172a" />
                  <rect x="45" y="70" width="15" height="15" fill="#0f172a" />
                  <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
                </svg>
              </div>

              <div className="mono-font" style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748b' }}>
                {selectedPass.id}
              </div>

              {/* Data Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11.5px', background: '#ffffff', border: '1.5px solid #cbd5e1', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>방문자/직급:</span> <strong style={{ color: '#0f172a' }}>{selectedPass.visitorName} {selectedPass.rank ? `(${selectedPass.rank})` : ''}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>소속 부서:</span> <strong style={{ color: '#0284c7' }}>{selectedPass.department || selectedPass.company || '소속 미지정'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>연락처:</span> <strong style={{ color: '#0f172a' }}>{selectedPass.phone || '010-0000-0000'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>방문목적:</span> <strong style={{ color: '#0284c7' }}>{selectedPass.purpose || '작업'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b' }}>유효기간:</span> <strong style={{ color: '#0f172a' }}>{selectedPass.visitDate}</strong>
                </div>
              </div>

              {/* Security Inspection Status List */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', marginBottom: '8px' }}>
                  🔒 자재 및 문서 보안 검수 완료 상태 (3개 항목)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#334155' }}>
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

      {/* Companion User Multi-Select Suggestion Modal Overlay */}
      {isCompanionModalOpen && targetPledgeForCompanion && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 300,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            borderRadius: '24px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={22} color="#0284c7" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    동행인 서약 등록
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    [사업장: {targetPledgeForCompanion.site}] 등록할 동행 인원을 선택해 주세요
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsCompanionModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Filter Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px 14px'
            }}>
              <Search size={16} color="#0284c7" />
              <input
                type="text"
                placeholder="성명, 소속팀, 직급, 연락처로 사용자 검색..."
                value={companionSearchTerm}
                onChange={(e) => setCompanionSearchTerm(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none',
                  width: '100%'
                }}
              />
              {companionSearchTerm && (
                <button
                  type="button"
                  onClick={() => setCompanionSearchTerm('')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
                >
                  초기화
                </button>
              )}
            </div>

            {/* Select All Toggle Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '0 4px' }}>
              <span style={{ color: '#64748b' }}>
                선택됨: <strong style={{ color: '#059669' }}>{selectedCompanionUsernames.length}명</strong>
              </span>
            </div>

            {/* Users Suggestion List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '340px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {allSystemUsers
                .filter(u => {
                  const term = companionSearchTerm.toLowerCase();
                  if (!term) return true;
                  return (u.name && u.name.toLowerCase().includes(term)) ||
                    (u.team && u.team.toLowerCase().includes(term)) ||
                    (u.department && u.department.toLowerCase().includes(term)) ||
                    (u.rank && u.rank.toLowerCase().includes(term)) ||
                    (u.phone && u.phone.includes(term));
                })
                .map(u => {
                  const isPrimary = isSamePerson(u, targetPledgeForCompanion) ||
                    (u.username && targetPledgeForCompanion.username && u.username === targetPledgeForCompanion.username) ||
                    (u.name?.trim() === targetPledgeForCompanion.visitorName?.trim() &&
                      (u.phone === targetPledgeForCompanion.phone || u.team === targetPledgeForCompanion.team || u.department === targetPledgeForCompanion.department));

                  const isAlreadyCompanion = targetPledgeForCompanion.companions?.some(c => isSamePerson(u, c));

                  const isChecked = selectedCompanionUsernames.includes(u.username);
                  const isDisabled = isPrimary || isAlreadyCompanion;

                  return (
                    <div
                      key={u.username}
                      onClick={() => {
                        if (!isDisabled) handleToggleCompanionSelect(u.username);
                      }}
                      style={{
                        background: isChecked ? '#f0f9ff' : isDisabled ? '#f8fafc' : '#ffffff',
                        border: isChecked ? '1.5px solid #7dd3fc' : '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.55 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked || isDisabled}
                          disabled={isDisabled}
                          onChange={() => { }}
                          style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {u.name}
                            <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>({u.rank || '대리'})</span>
                            <span style={{ fontSize: '10px', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: '700' }}>
                              {u.role || '일반'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ color: '#334155', fontWeight: '700' }}>{u.division || '사업부 미지정'}</span>
                            <span>•</span>
                            <span>{u.team || u.department || '소속팀'}</span>
                          </div>
                        </div>
                      </div>

                      {isDisabled && (
                        <span style={{ fontSize: '10.5px', color: '#d97706', fontWeight: '800', background: '#fffbeb', border: '1.5px solid #fde68a', padding: '2px 6px', borderRadius: '6px' }}>
                          {isPrimary ? '대표 작성자' : '이미 등록됨'}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Modal Bottom Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCompanionModalOpen(false)}
                className="glass-button"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCompanions}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25)'
                }}
              >
                선택한 {selectedCompanionUsernames.length}명 동행 등록
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
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
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
            background: '#ffffff',
            overflow: 'hidden',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#f0f9ff',
                  border: '1.5px solid #7dd3fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={20} color="#0284c7" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    보안 서약 작성 전 로그인
                  </h3>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
                    출입 서약서 등록을 위해 계정 로그인이 필요합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Auth Mode Toggle Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setInlineAuthMode('login')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: inlineAuthMode === 'login' ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: inlineAuthMode === 'login' ? 'rgba(2, 132, 199, 0.1)' : '#ffffff',
                  color: inlineAuthMode === 'login' ? '#0284c7' : '#64748b',
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
                  border: inlineAuthMode === 'signup' ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: inlineAuthMode === 'signup' ? 'rgba(2, 132, 199, 0.1)' : '#ffffff',
                  color: inlineAuthMode === 'signup' ? '#0284c7' : '#64748b',
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
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
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
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
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
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>아이디 *</label>
                    <input
                      type="text"
                      placeholder="신규 아이디"
                      value={inlineSignup.username}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, username: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>비밀번호 *</label>
                    <input
                      type="password"
                      placeholder="비밀번호"
                      value={inlineSignup.password}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, password: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>사업부 *</label>
                    <select
                      value={inlineSignup.division}
                      onChange={(e) => {
                        const newDiv = e.target.value;
                        const teams = getTeamsForDivision(newDiv);
                        setInlineSignup({
                          ...inlineSignup,
                          division: newDiv,
                          team: teams.length > 0 ? teams[0] : inlineSignup.team
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: inlineSignup.division ? '#0f172a' : '#94a3b8',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" disabled>-- 사업부 선택 --</option>
                      {DIVISION_LIST.map(div => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>소속팀 *</label>
                    <select
                      value={inlineSignup.team}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, team: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: inlineSignup.team ? '#0f172a' : '#94a3b8',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" disabled>-- 소속팀 선택 --</option>
                      {getTeamsForDivision(inlineSignup.division).map(tm => (
                        <option key={tm} value={tm}>
                          {tm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>직급 *</label>
                    <select
                      value={inlineSignup.rank}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, rank: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: inlineSignup.rank ? '#0f172a' : '#94a3b8',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" disabled>-- 직급 선택 --</option>
                      {RANK_LIST.map(rk => (
                        <option key={rk} value={rk}>
                          {rk}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>이름 *</label>
                    <input
                      type="text"
                      placeholder="홍길동"
                      value={inlineSignup.name}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>전화번호 *</label>
                    <input
                      type="text"
                      placeholder="010-0000-0000"
                      value={inlineSignup.phone}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>이메일 *</label>
                    <input
                      type="email"
                      placeholder="user@withsecurity.com"
                      value={inlineSignup.email}
                      onChange={(e) => setInlineSignup({ ...inlineSignup, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '12px', outline: 'none' }}
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
