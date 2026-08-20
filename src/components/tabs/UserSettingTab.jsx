import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { UserCheck, UserPlus, LogIn, LogOut, Shield, Save, User, Database, FileCode, Download, Edit3, Key, X, Lock, Users, Trash2, Search, Globe, Link, Server, CheckCircle2, AlertCircle, RefreshCw, GraduationCap, Calendar, Clock, AlertTriangle, Plus } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { dbMigrationService } from '../../services/dbMigrationService';
import { hashPassword, verifyPasswordHash } from '../../services/cryptoUtil';
import { useModalBack } from '../../services/modalBackHandler';
import { DIVISION_LIST, getTeamsForDivision, RANK_LIST } from '../../services/userMatcher';

const TRAINING_CATEGORIES = ['SKHynix', 'Samsung', 'LGD', '법정', '기타 (직접입력)'];

const getCategoryBadgeStyle = (category) => {
  const cat = String(category || '').trim();
  if (cat === 'SKHynix') {
    return { bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed', label: 'SKHynix' };
  } else if (cat === 'Samsung') {
    return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Samsung' };
  } else if (cat === 'LGD') {
    return { bg: '#fdf2f8', border: '#fbcfe8', color: '#db2777', label: 'LGD' };
  } else if (cat === '법정') {
    return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', label: '법정' };
  } else {
    return { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', label: cat || '기타' };
  }
};

const calculateOneYearLater = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTrainingStatus = (expiryStr) => {
  if (!expiryStr) return { text: '미등록', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryStr);
  exp.setHours(0, 0, 0, 0);
  if (isNaN(exp.getTime())) return { text: '날짜 오류', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { text: `만료됨 (D+${Math.abs(diffDays)}일)`, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', isExpired: true };
  } else if (diffDays === 0) {
    return { text: 'D-Day (오늘 만료)', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', isUrgent: true };
  } else if (diffDays <= 7) {
    return { text: `D-${diffDays}일 [긴급 만료임박]`, color: '#ef4444', bg: '#fef2f2', border: '#fecaca', isUrgent: true };
  } else if (diffDays <= 30) {
    return { text: `D-${diffDays}일 [만료예정]`, color: '#d97706', bg: '#fffbeb', border: '#fde68a', isWarning: true };
  } else {
    return { text: `D-${diffDays}일 (안전)`, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
  }
};

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

export default function UserSettingTab({ onTriggerToast, setActiveTab }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    role: '일반',
    division: '영업/운영사업부',
    team: '영업팀',
    rank: '대리',
    name: '',
    phone: '',
    email: ''
  });

  // Profile Edit State & Edit Mode Lock
  const [editForm, setEditForm] = useState(null);
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  // Account Management Modal States
  const [isAccountMgmtModalOpen, setIsAccountMgmtModalOpen] = useState(false);
  const [mgmtUsers, setMgmtUsers] = useState([]);
  const [mgmtSearch, setMgmtSearch] = useState('');

  // Login Failure Alert Modal State
  const [loginAlertModal, setLoginAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    failCount: 0,
    remainingAttempts: 5,
    isBlocked: false,
    remainingSec: 0
  });

  // Back button hooks
  useModalBack(isVerifyModalOpen, () => setIsVerifyModalOpen(false), 'user-verify-modal');
  useModalBack(isAccountMgmtModalOpen, () => setIsAccountMgmtModalOpen(false), 'user-account-mgmt-modal');
  useModalBack(loginAlertModal.isOpen, () => setLoginAlertModal(prev => ({ ...prev, isOpen: false })), 'login-alert-modal');

  // Remote Backend Server Config States & Initial Lock Protection
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [activeServerUrl, setActiveServerUrl] = useState('');
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverConnectionStatus, setServerConnectionStatus] = useState(null);
  const [isServerLocked, setIsServerLocked] = useState(() => {
    return localStorage.getItem('with_security_server_locked') === 'true';
  });
  const [isServerUnlockModalOpen, setIsServerUnlockModalOpen] = useState(false);
  const [serverUnlockPassword, setServerUnlockPassword] = useState('');
  useModalBack(isServerUnlockModalOpen, () => setIsServerUnlockModalOpen(false), 'server-unlock-modal');

  // Multi-Training Management States
  const [trainings, setTrainings] = useState([]);
  const [isAddingTraining, setIsAddingTraining] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [trainingForm, setTrainingForm] = useState({
    category: '법정',
    customCategory: '',
    title: '',
    completionDate: '',
    expiryDate: '',
    memo: ''
  });

  // Load active user profile & server URL on mount
  useEffect(() => {
    async function loadUser() {
      const active = await dbService.getUserProfile();
      if (active) {
        setCurrentUser(active);
        setEditForm(active);
        setTrainings(Array.isArray(active.trainings) ? active.trainings : []);
      }
      const sUrl = dbService.getServerUrl();
      setActiveServerUrl(sUrl);
      setServerUrlInput(sUrl);
    }
    loadUser();
  }, []);

  const handleOpenAddTraining = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const expStr = calculateOneYearLater(todayStr);
    setTrainingForm({
      category: '법정',
      customCategory: '',
      title: '',
      completionDate: todayStr,
      expiryDate: expStr,
      memo: ''
    });
    setEditingTrainingId(null);
    setIsAddingTraining(true);
  };

  const handleOpenEditTraining = (item) => {
    const isCustom = !['SKHynix', 'Samsung', 'LGD', '법정'].includes(item.category);
    setTrainingForm({
      category: isCustom ? '기타 (직접입력)' : item.category,
      customCategory: isCustom ? (item.customCategory || item.category) : '',
      title: item.title || '',
      completionDate: item.completionDate || '',
      expiryDate: item.expiryDate || '',
      memo: item.memo || ''
    });
    setEditingTrainingId(item.id);
    setIsAddingTraining(true);
  };

  const handleSaveTraining = async (e) => {
    if (e) e.preventDefault();
    if (!trainingForm.title.trim()) {
      if (onTriggerToast) onTriggerToast('교육명을 입력해 주세요.', 'warning');
      return;
    }
    if (!trainingForm.completionDate) {
      if (onTriggerToast) onTriggerToast('교육 수료일을 선택해 주세요.', 'warning');
      return;
    }

    const finalCategory = trainingForm.category === '기타 (직접입력)'
      ? (trainingForm.customCategory.trim() || '기타')
      : trainingForm.category;

    let updatedList = [];
    if (editingTrainingId) {
      updatedList = trainings.map(t => {
        if (t.id === editingTrainingId) {
          return {
            ...t,
            category: finalCategory,
            customCategory: trainingForm.customCategory,
            title: trainingForm.title.trim(),
            completionDate: trainingForm.completionDate,
            expiryDate: trainingForm.expiryDate || calculateOneYearLater(trainingForm.completionDate),
            memo: trainingForm.memo.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
    } else {
      const newItem = {
        id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        category: finalCategory,
        customCategory: trainingForm.customCategory,
        title: trainingForm.title.trim(),
        completionDate: trainingForm.completionDate,
        expiryDate: trainingForm.expiryDate || calculateOneYearLater(trainingForm.completionDate),
        memo: trainingForm.memo.trim(),
        createdAt: new Date().toISOString()
      };
      updatedList = [newItem, ...trainings];
    }

    setTrainings(updatedList);
    setIsAddingTraining(false);
    setEditingTrainingId(null);

    const updatedUser = {
      ...currentUser,
      trainings: updatedList,
      educationDate: updatedList[0]?.completionDate || '',
      educationExpiryDate: updatedList[0]?.expiryDate || '',
      educationName: updatedList[0]?.title || ''
    };

    await dbService.saveUserProfile(updatedUser);
    setCurrentUser(updatedUser);
    setEditForm(updatedUser);

    if (onTriggerToast) {
      onTriggerToast(editingTrainingId ? '교육 이수 정보가 수정되었습니다.' : '교육 이수가 성공적으로 등록되었습니다.', 'success');
    }
  };

  const handleDeleteTraining = async (item) => {
    if (!window.confirm(`정말로 '${item.title}' 교육 이수 내역을 삭제하시겠습니까?`)) {
      return;
    }
    const updatedList = trainings.filter(t => t.id !== item.id);
    setTrainings(updatedList);

    const updatedUser = {
      ...currentUser,
      trainings: updatedList,
      educationDate: updatedList[0]?.completionDate || '',
      educationExpiryDate: updatedList[0]?.expiryDate || '',
      educationName: updatedList[0]?.title || ''
    };

    await dbService.saveUserProfile(updatedUser);
    setCurrentUser(updatedUser);
    setEditForm(updatedUser);

    if (onTriggerToast) {
      onTriggerToast(`'${item.title}' 교육 이수 내역이 삭제되었습니다.`, 'success');
    }
  };

  // Server Connection Test
  const handleTestServer = async () => {
    if (!serverUrlInput.trim()) {
      if (onTriggerToast) onTriggerToast('테스트할 서버 URL을 입력해 주세요.', 'warning');
      return;
    }
    setIsTestingServer(true);
    setServerConnectionStatus(null);
    const res = await dbService.testServerConnection(serverUrlInput);
    setIsTestingServer(false);
    setServerConnectionStatus({
      type: res.success ? 'success' : 'error',
      message: res.message
    });
    if (onTriggerToast) {
      onTriggerToast(res.message, res.success ? 'success' : 'warning');
    }
  };

  // Save Server URL & Lock Configuration
  const handleSaveServerUrl = async () => {
    if (!serverUrlInput.trim()) {
      handleResetServerUrl();
      return;
    }
    setIsTestingServer(true);
    setServerConnectionStatus(null);
    dbService.setServerUrl(serverUrlInput);
    const updated = dbService.getServerUrl();
    setActiveServerUrl(updated);
    localStorage.setItem('with_security_server_locked', 'true');
    setIsServerLocked(true);

    // Perform live remote server data sync & merge
    const syncRes = await dbService.syncAllWithServer(updated);
    setIsTestingServer(false);

    if (syncRes.success) {
      setServerConnectionStatus({
        type: 'success',
        message: `${syncRes.message} (초기 설정 완료 및 수정 방지 잠금 적용됨)`
      });
      if (onTriggerToast) {
        onTriggerToast('서버 연동 설정이 완료되고 안전하게 고정(잠금)되었습니다.', 'success');
      }
      const active = await dbService.getUserProfile();
      if (active) setCurrentUser(active);
      if (typeof loadUserMgmtList === 'function') {
        await loadUserMgmtList();
      }
    } else {
      setServerConnectionStatus({
        type: 'warning',
        message: syncRes.message || '서버 등록 완료 및 잠금 적용됨'
      });
      if (onTriggerToast) {
        onTriggerToast(`서버 연동이 등록되고 수정 방지 잠금이 적용되었습니다.`, 'info');
      }
    }
  };

  // Reset Server URL (Requires confirmation)
  const handleResetServerUrl = () => {
    setServerUrlInput('https://wblee0703.github.io/with.security');
    dbService.setServerUrl('https://wblee0703.github.io/with.security');
    setActiveServerUrl('https://wblee0703.github.io/with.security');
    localStorage.setItem('with_security_server_locked', 'true');
    setIsServerLocked(true);
    setServerConnectionStatus(null);
    if (onTriggerToast) {
      onTriggerToast('기본 도메인(wblee0703.github.io)으로 초기화되었습니다.', 'info');
    }
  };

  // Handle Server Unlock via Admin Password
  const handleConfirmServerUnlock = async (e) => {
    e.preventDefault();
    if (!serverUnlockPassword) {
      if (onTriggerToast) onTriggerToast('비밀번호를 입력해 주세요.', 'warning');
      return;
    }
    const hashedInput = await hashPassword(serverUnlockPassword);
    const adminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
    let isValid = (serverUnlockPassword === adminPass || serverUnlockPassword === 'withtech123!' || (currentUser?.passwordHash && hashedInput === currentUser.passwordHash));

    if (isValid) {
      localStorage.removeItem('with_security_server_locked');
      setIsServerLocked(false);
      setIsServerUnlockModalOpen(false);
      setServerUnlockPassword('');
      if (onTriggerToast) onTriggerToast('🔓 서버 연동 설정이 수정 가능하도록 잠금 해제되었습니다.', 'success');
    } else {
      if (onTriggerToast) onTriggerToast('❌ 비밀번호가 일치하지 않습니다.', 'error');
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      if (onTriggerToast) onTriggerToast('아이디와 비밀번호를 모두 입력해 주세요.', 'warning');
      return;
    }

    const inputUsername = loginForm.username.trim();
    const inputPassword = loginForm.password.trim();

    const loginResult = await dbService.login(inputUsername, inputPassword);

    if (loginResult.success && loginResult.user) {
      const activeUser = {
        ...loginResult.user,
        role: loginResult.user.username === 'admin' ? '개발자' : (loginResult.user.role || '일반')
      };
      await dbService.saveUserProfile(activeUser);
      setCurrentUser(activeUser);
      setEditForm(activeUser);
      setLoginForm({ username: '', password: '' });
      if (onTriggerToast) onTriggerToast(`'${activeUser.name}'님 환영합니다! [구분: ${activeUser.role}]`, 'success');
      
      // 플랫폼/디바이스 모드에 따른 초기 화면: 모바일/어플 -> 보안 서약(entryCheck), PC 웹 -> 업무 일지(workLog)
      const savedTab = typeof localStorage !== 'undefined' ? localStorage.getItem('with_security_active_tab') : null;
      const isMobileEnv = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth <= 768);
      const targetTab = (savedTab && savedTab !== 'userProfile') ? savedTab : (isMobileEnv ? 'entryCheck' : 'workLog');
      if (setActiveTab) setActiveTab(targetTab);
    } else {
      // Show dedicated security alert modal showing attempt count out of 5
      const fCount = loginResult.failCount || 1;
      const rAttempts = loginResult.remainingAttempts !== undefined ? loginResult.remainingAttempts : Math.max(0, 5 - fCount);
      const isBlocked = Boolean(loginResult.blocked || rAttempts === 0);

      setLoginAlertModal({
        isOpen: true,
        title: isBlocked ? '🔒 로그인 5회 실패 (접근 차단)' : '⚠️ 비밀번호 불일치',
        message: loginResult.message || (isBlocked
          ? '로그인 5회 실패로 보안 차단되었습니다. 5분 후에 다시 시도해 주세요.'
          : '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.'),
        failCount: fCount,
        remainingAttempts: rAttempts,
        isBlocked,
        remainingSec: loginResult.remainingSec || (isBlocked ? 300 : 0)
      });
    }
  };

  // Handle Account Signup
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupForm.username.trim() || !signupForm.password.trim() || !signupForm.name.trim()) {
      if (onTriggerToast) onTriggerToast('아이디, 비밀번호 및 성명은 필수 입력 항목입니다.', 'warning');
      return;
    }

    const users = await dbService.getRegisteredUsers();
    if (users.some(u => u.username.trim().toLowerCase() === signupForm.username.trim().toLowerCase())) {
      if (onTriggerToast) onTriggerToast('이미 존재하는 아이디입니다. 다른 아이디를 사용해 주세요.', 'warning');
      return;
    }

    const passwordHash = await hashPassword(signupForm.password);

    // Initial signups are strictly created as regular user ('일반')
    const newUser = {
      username: signupForm.username.trim(),
      password: signupForm.password.trim(),
      passwordHash: passwordHash,
      role: '일반',
      division: signupForm.division.trim() || '일반사업부',
      team: signupForm.team.trim() || '운영팀',
      rank: signupForm.rank.trim() || '매니저',
      name: signupForm.name.trim(),
      phone: signupForm.phone.trim() || '010-0000-0000',
      email: signupForm.email.trim() || `${signupForm.username}@withsecurity.com`
    };

    await dbService.registerUser(newUser);
    await dbService.saveUserProfile(newUser);
    setCurrentUser(newUser);
    setEditForm(newUser);
    setSignupForm({
      username: '',
      password: '',
      role: '일반',
      division: '영업/운영사업부',
      team: '영업팀',
      rank: '대리',
      name: '',
      phone: '',
      email: ''
    });

    if (onTriggerToast) onTriggerToast(`'${newUser.name}'님 계정이 정상 생성되고 로그인 되었습니다. [구분: 일반]`, 'success');
    
    // 플랫폼/디바이스 모드에 따른 초기 화면
    const isMobileEnv = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth <= 768);
    const targetTab = isMobileEnv ? 'entryCheck' : 'workLog';
    if (setActiveTab) setActiveTab(targetTab);
  };

  // Handle Opening Password Verification Modal / Cancel Edit
  const handleOpenVerifyModal = () => {
    if (isEditUnlocked) {
      setIsEditUnlocked(false);
      setEditForm(currentUser);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      if (onTriggerToast) onTriggerToast('수정이 취소되고 사용자 정보가 잠금 상태로 전환되었습니다.', 'info');
      return;
    }
    setVerifyPassword('');
    setIsVerifyModalOpen(true);
  };

  // Handle Verify Password & Unlock Edit Mode
  const handleVerifyPasswordSubmit = async (e) => {
    e.preventDefault();
    const inputPass = verifyPassword.trim();
    if (!inputPass) {
      if (onTriggerToast) onTriggerToast('현재 비밀번호를 입력해 주세요.', 'warning');
      return;
    }

    const dbPass = String(currentUser?.password || '').trim();
    const dbHash = String(currentUser?.passwordHash || '').trim();

    let isPasswordCorrect = (await verifyPasswordHash(inputPass, dbHash)) || (await verifyPasswordHash(inputPass, dbPass));

    // Query latest DB if local currentUser cache lacks password properties
    if (!isPasswordCorrect && currentUser?.username) {
      try {
        const latestUsers = await dbService.getRegisteredUsers();
        const found = latestUsers.find(u => u.username?.toLowerCase() === currentUser.username.toLowerCase());
        if (found) {
          const fPass = String(found.password || '').trim();
          const fHash = String(found.passwordHash || '').trim();
          if ((await verifyPasswordHash(inputPass, fHash)) || (await verifyPasswordHash(inputPass, fPass))) {
            isPasswordCorrect = true;
          }
        }
      } catch (err) {
        console.warn('Fallback verification error:', err);
      }
    }

    if (isPasswordCorrect) {
      setIsEditUnlocked(true);
      setIsVerifyModalOpen(false);
      setVerifyPassword('');
      if (onTriggerToast) onTriggerToast('비밀번호 인증 성공! 사내 사용자 정보를 수정할 수 있습니다.', 'success');
    } else {
      if (onTriggerToast) onTriggerToast('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.', 'warning');
    }
  };

  // Handle Profile Update
  const handleProfileUpdate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isEditUnlocked) {
      if (onTriggerToast) onTriggerToast('상단의 [정보 수정] 버튼을 클릭하여 비밀번호 인증을 진행해 주세요.', 'warning');
      return;
    }
    if (!editForm || !editForm.name.trim()) {
      if (onTriggerToast) onTriggerToast('이름을 입력해 주세요.', 'warning');
      return;
    }

    // New Password Validation if entered
    let updatedPasswordHash = currentUser?.passwordHash;
    if (passwordForm.newPassword || passwordForm.confirmPassword) {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        if (onTriggerToast) onTriggerToast('변경할 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'warning');
        return;
      }
      if (passwordForm.newPassword.length < 4) {
        if (onTriggerToast) onTriggerToast('비밀번호는 최소 4자리 이상 입력해 주세요.', 'warning');
        return;
      }
      updatedPasswordHash = await hashPassword(passwordForm.newPassword);
    }

    const isAdmin = currentUser?.role === '관리자' || currentUser?.username === 'admin';
    const newPass = passwordForm.newPassword ? passwordForm.newPassword.trim() : '';
    const updatedUser = {
      ...editForm,
      role: isAdmin ? (editForm.role || '일반') : (currentUser?.role || '일반'),
      password: newPass || currentUser?.password || editForm?.password || '',
      passwordHash: updatedPasswordHash
    };

    await dbService.saveUserProfile(updatedUser);
    setCurrentUser(updatedUser);
    setEditForm(updatedUser);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsEditUnlocked(false); // Lock back after update
    if (onTriggerToast) onTriggerToast('사용자 정보가 성공적으로 수정/저장되었습니다.', 'success');
  };

  // Handle Account Management Modal Open
  const handleOpenAccountMgmtModal = async () => {
    const allUsers = await dbService.getRegisteredUsers();
    setMgmtUsers(allUsers);
    setMgmtSearch('');
    setIsAccountMgmtModalOpen(true);
  };

  // Handle Delete User Account
  const handleDeleteUserAccount = async (targetUser) => {
    if (targetUser.username === 'admin') {
      if (onTriggerToast) onTriggerToast('개발자 대표 계정(admin)은 삭제할 수 없습니다.', 'warning');
      return;
    }
    if (targetUser.username === currentUser?.username) {
      if (onTriggerToast) onTriggerToast('현재 접속 중인 본인 계정은 삭제할 수 없습니다.', 'warning');
      return;
    }
    if (!window.confirm(`정말로 '${targetUser.name}(${targetUser.username})' 사용자 계정을 삭제하시겠습니까?\n삭제 즉시 데이터베이스에 반영됩니다.`)) {
      return;
    }

    const ok = await dbService.deleteUser(targetUser.username);
    if (ok) {
      setMgmtUsers(prevUsers => prevUsers.filter(u => u.username !== targetUser.username));
      if (onTriggerToast) onTriggerToast(`'${targetUser.name}(${targetUser.username})' 사용자 계정이 성공적으로 삭제되었습니다.`, 'success');
    } else {
      if (onTriggerToast) onTriggerToast('계정 삭제에 실패했습니다.', 'warning');
    }
  };

  // Handle Developer Role Change in Management Center
  const handleUserRoleChange = async (targetUser, newRole) => {
    if (!isDevUser) return;
    if (targetUser.username === 'admin' && newRole !== '개발자') {
      if (onTriggerToast) onTriggerToast('개발자 대표 계정(admin)의 권한은 변경할 수 없습니다.', 'warning');
      return;
    }

    const updatedUser = {
      ...targetUser,
      role: newRole
    };

    await dbService.saveUserProfile(updatedUser);

    // Update modal state in real-time
    setMgmtUsers(prevUsers => prevUsers.map(u => u.username === targetUser.username ? updatedUser : u));

    // If active logged-in user changed their own role, update active user state too
    if (targetUser.username === currentUser?.username) {
      setCurrentUser(updatedUser);
      setEditForm(updatedUser);
    }

    if (onTriggerToast) onTriggerToast(`'${targetUser.name}'님의 계정 구분이 '${newRole}'(으)로 변경되었습니다.`, 'success');
  };

  // Handle Logout
  const handleLogout = async () => {
    localStorage.removeItem('with_security_active_tab');
    await dbService.logoutUser();
    setCurrentUser(null);
    setEditForm(null);
    setIsEditUnlocked(false);
    setIsAccountMgmtModalOpen(false);
    if (onTriggerToast) onTriggerToast('로그아웃 되었습니다.', 'info');
  };

  const isDevUser = currentUser?.role === '개발자' || currentUser?.username === 'admin';
  const isManagerUser = currentUser?.role === '관리자';

  // Filter users based on logged-in user role for Management Modal
  const filteredMgmtUsers = mgmtUsers.filter(u => {
    const query = mgmtSearch.trim().toLowerCase();
    const matchSearch = query === '' ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      (u.division && u.division.toLowerCase().includes(query)) ||
      (u.team && u.team.toLowerCase().includes(query));

    if (!matchSearch) return false;

    if (isDevUser) return true; // Developers see ALL users

    if (isManagerUser) {
      // Managers see users from their same division or team
      const sameDiv = currentUser?.division && u.division === currentUser?.division;
      const sameTeam = currentUser?.team && u.team === currentUser?.team;
      return sameDiv || sameTeam;
    }

    return false;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Top Banner Header */}
      <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '6px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Row 1: Title & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            border: '1.5px solid #1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.25)',
            flexShrink: 0
          }}>
            <UserCheck size={22} />
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
            사용자 정보
          </div>
        </div>

        {/* Row 2: Action Buttons (계정 관리 왼쪽, 로그아웃 오른쪽 1:1 너비) */}
        {currentUser && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: (isDevUser || isManagerUser) ? '1fr 1fr' : '1fr',
            gap: '8px',
            width: '100%'
          }}>
            {(isDevUser || isManagerUser) && (
              <button
                type="button"
                onClick={handleOpenAccountMgmtModal}
                style={{
                  width: '100%',
                  background: 'rgba(30, 58, 138, 0.08)',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e3a8a',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Users size={15} /> 계정 관리
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                background: '#fff1f2',
                border: '1.5px solid #fda4af',
                color: '#e11d48',
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.08)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <LogOut size={15} /> 로그아웃
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Logged In User Profile Console */}
      {currentUser ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Active User Card Banner */}
          <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '6px', background: '#ffffff', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                  border: '1.5px solid #1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '18px',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.25)',
                  flexShrink: 0
                }}>
                  {currentUser.name ? currentUser.name.slice(0, 1) : 'U'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                      {currentUser.name} {currentUser.rank}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: currentUser.role === '개발자' ? 'rgba(30, 58, 138, 0.12)' : currentUser.role === '관리자' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: currentUser.role === '개발자' ? '#1e3a8a' : currentUser.role === '관리자' ? '#d97706' : '#059669',
                      border: currentUser.role === '개발자' ? '1px solid rgba(30, 58, 138, 0.25)' : currentUser.role === '관리자' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      구분: {currentUser.role || '일반'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    <span style={{ color: '#1e3a8a', fontWeight: '700' }}>{currentUser.division}</span> • {currentUser.team} • ID: <strong style={{ color: '#1e3a8a' }}>{currentUser.username}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={18} color="#1e3a8a" /> 사용자 상세 정보 수정 및 관리
              </div>

              {/* Edit Mode Actions (Top Right) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditUnlocked ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenVerifyModal}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#64748b',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <X size={14} /> 취소
                    </button>
                    <button
                      type="button"
                      onClick={handleProfileUpdate}
                      style={{
                        padding: '7px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#1e3a8a',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CheckCircle2 size={14} /> 저장
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenVerifyModal}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      background: '#eff6ff',
                      color: '#1e3a8a',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Edit3 size={14} /> 정보 수정
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: Account Role & Division (2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    계정 구분
                  </label>
                  {(currentUser?.role === '개발자' || currentUser?.username === 'admin') ? (
                    <select
                      disabled={!isEditUnlocked}
                      value={editForm?.role || '개발자'}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                        border: isEditUnlocked ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                        color: isEditUnlocked ? '#0f172a' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: isEditUnlocked ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <option value="일반">일반</option>
                      <option value="관리자">관리자</option>
                      <option value="개발자">개발자</option>
                    </select>
                  ) : currentUser?.role === '관리자' ? (
                    <select
                      disabled={!isEditUnlocked}
                      value={editForm?.role || '관리자'}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                        border: isEditUnlocked ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                        color: isEditUnlocked ? '#0f172a' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: isEditUnlocked ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <option value="일반">일반</option>
                      <option value="관리자">관리자</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={editForm?.role || '일반'}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        border: '1.5px solid #cbd5e1',
                        color: '#64748b',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'not-allowed'
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    사업부 *
                  </label>
                  <select
                    disabled={!isEditUnlocked}
                    value={editForm?.division || ''}
                    onChange={(e) => {
                      const newDiv = e.target.value;
                      const teams = getTeamsForDivision(newDiv);
                      setEditForm({
                        ...editForm,
                        division: newDiv,
                        team: teams.length > 0 ? (teams.includes(editForm?.team) ? editForm.team : teams[0]) : editForm?.team || ''
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                      border: isEditUnlocked ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                      color: isEditUnlocked ? '#0f172a' : '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'pointer' : 'not-allowed'
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
              </div>

              {/* Row 2: Team, Rank & Name (3 Columns in the Same Row) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    소속팀 *
                  </label>
                  <select
                    disabled={!isEditUnlocked}
                    value={editForm?.team || ''}
                    onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                      border: isEditUnlocked ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                      color: isEditUnlocked ? '#0f172a' : '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <option value="" disabled>-- 소속팀 선택 --</option>
                    {getTeamsForDivision(editForm?.division).map(tm => (
                      <option key={tm} value={tm}>
                        {tm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    직급 *
                  </label>
                  <select
                    disabled={!isEditUnlocked}
                    value={editForm?.rank || ''}
                    onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                      border: isEditUnlocked ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                      color: isEditUnlocked ? '#0f172a' : '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'pointer' : 'not-allowed'
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
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    이름 (성명) *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditUnlocked}
                    placeholder="홍길동"
                    value={editForm?.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                      border: isEditUnlocked ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                      color: isEditUnlocked ? '#0f172a' : '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    전화번호 *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditUnlocked}
                    placeholder="010-0000-0000"
                    maxLength={13}
                    inputMode="numeric"
                    value={editForm?.phone || ''}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setEditForm({ ...editForm, phone: formatted });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                      border: isEditUnlocked ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                      color: isEditUnlocked ? '#0f172a' : '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    이메일 주소 *
                  </label>
                  <input
                    type="email"
                    disabled={!isEditUnlocked}
                    placeholder="user@withsecurity.com"
                    value={editForm?.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                      border: isEditUnlocked ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                      color: isEditUnlocked ? '#0f172a' : '#64748b',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </div>

              {/* Password Change Section (Optional) */}
              <div style={{
                background: isEditUnlocked ? '#eff6ff' : '#f8fafc',
                border: isEditUnlocked ? '1.5px solid #bfdbfe' : '1.5px solid #e2e8f0',
                padding: '16px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: isEditUnlocked ? '#1e3a8a' : '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={15} color={isEditUnlocked ? '#1e3a8a' : '#64748b'} /> 계정 비밀번호 변경 (선택 사항)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      변경할 비밀번호
                    </label>
                    <input
                      type="password"
                      disabled={!isEditUnlocked}
                      placeholder={isEditUnlocked ? "새 비밀번호 입력" : "수정 모드 시 입력 가능"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                        border: isEditUnlocked ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                        color: isEditUnlocked ? '#0f172a' : '#64748b',
                        fontSize: '13px',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: isEditUnlocked ? 'text' : 'not-allowed'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      disabled={!isEditUnlocked}
                      placeholder={isEditUnlocked ? "변경할 비밀번호 재입력" : "수정 모드 시 입력 가능"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                        border: isEditUnlocked ? '1.5px solid #3b82f6' : '1.5px solid #cbd5e1',
                        color: isEditUnlocked ? '#0f172a' : '#64748b',
                        fontSize: '13px',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: isEditUnlocked ? 'text' : 'not-allowed'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar when in Edit Mode */}
              {isEditUnlocked && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <button
                    type="button"
                    onClick={handleOpenVerifyModal}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#64748b',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    수정 취소
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '9px 22px',
                      borderRadius: '6px',
                      background: '#1e3a8a',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(30, 58, 138, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>저장</span>
                  </button>
                </div>
              )}

            </form>
          </div>

          {/* Dedicated Separate Training & Education Expiry Card */}
          <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '6px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(30, 58, 138, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e3a8a'
                }}>
                  <GraduationCap size={18} />
                </div>
                <span>교육 수료 관리</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e3a8a'
                }}>
                  총 {trainings.length}건
                </span>
              </div>

              {!isAddingTraining && (
                <button
                  type="button"
                  onClick={handleOpenAddTraining}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #1e3a8a',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={14} />
                  <span>교육 추가</span>
                </button>
              )}
            </div>

            {/* Add / Edit Training Form Panel */}
            {isAddingTraining && (
              <form onSubmit={handleSaveTraining} style={{
                background: '#f8fafc',
                border: '1.5px solid #93c5fd',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GraduationCap size={16} />
                    {editingTrainingId ? '교육 이수 정보 수정' : '교육 이수 정보 등록'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsAddingTraining(false); setEditingTrainingId(null); }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: trainingForm.category === '기타 (직접입력)' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      구분 *
                    </label>
                    <select
                      value={trainingForm.category}
                      onChange={(e) => setTrainingForm({ ...trainingForm, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #3b82f6',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {TRAINING_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {trainingForm.category === '기타 (직접입력)' && (
                    <div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                        직접 입력 *
                      </label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="예: LG디스플레이"
                        value={trainingForm.customCategory}
                        onChange={(e) => setTrainingForm({ ...trainingForm, customCategory: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1.5px solid #3b82f6',
                          color: '#0f172a',
                          fontSize: '13px',
                          fontWeight: '700',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    교육명 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 기본 안전보건 교육, 취급자 교육"
                    value={trainingForm.title}
                    onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1.5px solid #3b82f6',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      교육 수료일 (이수일) *
                    </label>
                    <input
                      type="date"
                      value={trainingForm.completionDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const exp = calculateOneYearLater(newDate);
                        setTrainingForm({
                          ...trainingForm,
                          completionDate: newDate,
                          expiryDate: exp || trainingForm.expiryDate
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>
                        만료일 *
                      </label>
                      {trainingForm.completionDate && (
                        <button
                          type="button"
                          onClick={() => {
                            const exp = calculateOneYearLater(trainingForm.completionDate);
                            if (exp) setTrainingForm({ ...trainingForm, expiryDate: exp });
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#1e3a8a',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            cursor: 'pointer'
                          }}
                        >
                          +1년
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={trainingForm.expiryDate}
                      onChange={(e) => setTrainingForm({ ...trainingForm, expiryDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    비고 / 메모 (선택 사항)
                  </label>
                  <input
                    type="text"
                    placeholder="수료증 번호, 교육 기관 등 메모"
                    value={trainingForm.memo}
                    onChange={(e) => setTrainingForm({ ...trainingForm, memo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setIsAddingTraining(false); setEditingTrainingId(null); }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      background: '#1e3a8a',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)'
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{editingTrainingId ? '수정 완료' : '교육 저장'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Training Items List */}
            {trainings.length === 0 ? (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <GraduationCap size={32} color="#94a3b8" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                  등록된 교육 수료 내역이 없습니다.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {trainings.map((item, idx) => {
                  const catStyle = getCategoryBadgeStyle(item.category);
                  const status = getTrainingStatus(item.expiryDate);
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: status.isExpired ? '#fef2f2' : '#ffffff',
                        border: status.isExpired ? '1.5px solid #fecaca' : (status.isUrgent ? '1.5px solid #fecaca' : '1.5px solid #e2e8f0'),
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                          {/* Category Badge */}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '2.5px 8px',
                            borderRadius: '6px',
                            background: catStyle.bg,
                            border: `1px solid ${catStyle.border}`,
                            color: catStyle.color,
                            flexShrink: 0
                          }}>
                            {catStyle.label}
                          </span>

                          {/* Title */}
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            color: '#0f172a',
                            wordBreak: 'break-all'
                          }}>
                            {item.title}
                          </span>
                        </div>

                        {/* Real-Time D-Day Badge */}
                        <div style={{
                          fontSize: '11.5px',
                          fontWeight: '800',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: status.bg,
                          color: status.color,
                          border: `1px solid ${status.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}>
                          <Clock size={12} />
                          <span>{status.text}</span>
                        </div>
                      </div>

                      {/* Dates Box & Memo */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#f8fafc',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        flexWrap: 'wrap',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} color="#64748b" />
                            수료일: <strong style={{ color: '#0f172a' }}>{item.completionDate || '-'}</strong>
                          </span>
                          <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} color={status.color} />
                            만료일: <strong style={{ color: status.color }}>{item.expiryDate || '-'}</strong>
                          </span>
                          {item.memo && (
                            <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                              (비고: {item.memo})
                            </span>
                          )}
                          {/* Item Edit & Delete Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditTraining(item)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e3a8a',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="교육 이수 정보 수정"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTraining(item)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="교육 이수 내역 삭제"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>


                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              💡 교육의 만료일 <strong>30일 </strong> & <strong>7일 </strong>전에 앱 알림 팝업이 제공됩니다.
            </div>
          </div>

          {/* Password Verification Modal Overlay */}
          {isVerifyModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1200,
              padding: '16px'
            }}>
              <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '400px',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1.5px solid #3b82f6',
                background: '#ffffff',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'rgba(30, 58, 138, 0.08)',
                      border: '1.5px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Key size={20} color="#1e3a8a" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                        현재 비밀번호 인증
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleVerifyPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                      비밀번호 입력 *
                    </label>
                    <input
                      type="password"
                      autoFocus
                      placeholder="현재 계정 비밀번호를 입력해 주세요"
                      value={verifyPassword}
                      onChange={(e) => setVerifyPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsVerifyModalOpen(false)}
                      className="glass-button"
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="glass-button-primary"
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      확인
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Logged Out State (Login / Signup Tabs) */
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px' }}>
            <button
              onClick={() => setAuthMode('login')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: authMode === 'login' ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: authMode === 'login' ? 'rgba(30, 58, 138, 0.08)' : '#ffffff',
                color: authMode === 'login' ? '#1e3a8a' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <LogIn size={16} /> 기존 계정 로그인
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: authMode === 'signup' ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: authMode === 'signup' ? 'rgba(30, 58, 138, 0.08)' : '#ffffff',
                color: authMode === 'signup' ? '#1e3a8a' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={16} /> 신규 회원가입
            </button>
          </div>

          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  아이디 (Username) *
                </label>
                <input
                  type="text"
                  placeholder="예: admin 또는 생성한 아이디"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
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
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                <LogIn size={16} /> 로그인하기
              </button>
            </form>
          )}

          {/* Signup Form */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    신규 아이디 (ID) *
                  </label>
                  <input
                    type="text"
                    placeholder="사용할 아이디"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
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
                    비밀번호 (PW) *
                  </label>
                  <input
                    type="password"
                    placeholder="비밀번호 설정"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
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
                    계정 구분
                  </label>
                  <input
                    type="text"
                    disabled
                    value="일반"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      color: '#64748b',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    사업부 *
                  </label>
                  <select
                    value={signupForm.division}
                    onChange={(e) => {
                      const newDiv = e.target.value;
                      const teams = getTeamsForDivision(newDiv);
                      setSignupForm({
                        ...signupForm,
                        division: newDiv,
                        team: teams.length > 0 ? teams[0] : signupForm.team
                      });
                    }}
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
                    <option value="" disabled>-- 사업부 선택 --</option>
                    {DIVISION_LIST.map(div => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Team, Rank & Name (3 Columns in the Same Row) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    소속팀 *
                  </label>
                  <select
                    value={signupForm.team}
                    onChange={(e) => setSignupForm({ ...signupForm, team: e.target.value })}
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
                    <option value="" disabled>-- 소속팀 선택 --</option>
                    {getTeamsForDivision(signupForm.division).map(tm => (
                      <option key={tm} value={tm}>
                        {tm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    직급 *
                  </label>
                  <select
                    value={signupForm.rank}
                    onChange={(e) => setSignupForm({ ...signupForm, rank: e.target.value })}
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
                    <option value="" disabled>-- 직급 선택 --</option>
                    {RANK_LIST.map(rk => (
                      <option key={rk} value={rk}>
                        {rk}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    이름 (성명) *
                  </label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    전화번호 *
                  </label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    maxLength={13}
                    inputMode="numeric"
                    value={signupForm.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setSignupForm({ ...signupForm, phone: formatted });
                    }}
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
                    이메일 주소 *
                  </label>
                  <input
                    type="email"
                    placeholder="user@withsecurity.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
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

              <button
                type="submit"
                onClick={handleSignupSubmit}
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
                  fontSize: '13px',
                  marginTop: '8px'
                }}
              >
                <UserPlus size={16} /> 계정 생성 및 회원가입 완료
              </button>
            </form>
          )}
        </div>
      )}

      {/* Remote Backend Server Configuration Card (Visible ONLY for Developer Role) */}
      {currentUser?.role === '개발자' && (
        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '6px', border: isServerLocked ? '1.5px solid #cbd5e1' : '1.5px solid #cbd5e1', background: '#eff6ff', marginTop: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} /> 호스팅 백엔드 서버 연동 설정 (개발자 전용)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isServerLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: isServerLocked ? '#059669' : '#d97706',
                border: isServerLocked ? '1.5px solid #6ee7b7' : '1.5px solid #fde68a'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isServerLocked ? '#10b981' : '#f59e0b' }}></span>
                {isServerLocked ? '🔒 서버 연동 고정됨 (수정 잠금)' : '🔓 초기 설정 모드 (수정 가능)'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '14px', lineHeight: '1.5' }}>
            {isServerLocked ? (
              <>
                현재 앱은 <strong style={{ color: '#1e3a8a' }}>{activeServerUrl || '기본 도메인(wblee0703.github.io)'}</strong>으로 안전하게 고정되어 있습니다.<br />
                향후 가비아 호스팅 등으로 서버 도메인을 이전할 때만 <strong>[수정 잠금 해제]</strong>를 진행해 주세요.
              </>
            ) : (
              <>
                모바일 APK 설치 후 맨 처음 접속 시 백엔드 DB 주소를 연결합니다.<br />
                - 가비아 호스팅 이전 기본 주소: <code style={{ color: '#1e3a8a', background: '#ffffff', padding: '1px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>https://wblee0703.github.io/with.security</code><br />
                - 저장을 완료하면 이후 실수로 변경되지 않도록 <strong>자동으로 수정 방지 잠금</strong>이 적용됩니다.
              </>
            )}
          </p>

          {/* URL Input */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              백엔드 DB API 서버 주소 (Base API URL)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Server size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#1e3a8a' }} />
                <input
                  type="text"
                  disabled={isServerLocked}
                  placeholder="예: https://wblee0703.github.io/with.security"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '12px',
                    background: isServerLocked ? '#f1f5f9' : '#ffffff',
                    border: isServerLocked ? '1.5px solid #cbd5e1' : '1.5px solid #1e3a8a',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: isServerLocked ? 'not-allowed' : 'text'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Presets (Only visible when unlocked) */}
          {!isServerLocked && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>빠른 선택:</span>
              <button
                type="button"
                onClick={() => setServerUrlInput('https://wblee0703.github.io/with.security')}
                style={{ padding: '4px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#1e3a8a', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                🌐 기본 호스팅 주소 (wblee0703.github.io)
              </button>
              <button
                type="button"
                onClick={() => setServerUrlInput('http://192.168.0.108:4000')}
                style={{ padding: '4px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#475569', fontSize: '11px', cursor: 'pointer' }}
              >
                📡 사내 Wi-Fi 테스트 (192.168.0.108:4000)
              </button>
            </div>
          )}

          {/* Connection Test Result Feedback */}
          {serverConnectionStatus && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '14px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: serverConnectionStatus.type === 'success' ? '#ecfdf5' : '#fff1f2',
              color: serverConnectionStatus.type === 'success' ? '#059669' : '#e11d48',
              border: serverConnectionStatus.type === 'success' ? '1.5px solid #a7f3d0' : '1.5px solid #fda4af'
            }}>
              {serverConnectionStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {serverConnectionStatus.message}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTestServer}
              disabled={isTestingServer}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={isTestingServer ? 'spin-anim' : ''} />
              연결 상태 확인
            </button>

            {!isServerLocked ? (
              <button
                type="button"
                onClick={handleSaveServerUrl}
                disabled={isTestingServer}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  background: '#1e3a8a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                }}
              >
                <Save size={14} /> 초기 설정 완료 및 영구 고정(잠금)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setServerUnlockPassword('');
                  setIsServerUnlockModalOpen(true);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1.5px solid #fda4af',
                  color: '#e11d48',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Key size={14} /> 서버 연동 수정 잠금 해제 (개발자 인증)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Account Management Modal */}
      {isAccountMgmtModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '680px',
            borderRadius: '24px',
            padding: '24px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#1e3a8a" /> 사내 계정 관리 센터
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {isDevUser ? (
                    <span style={{ color: '#1e3a8a', fontWeight: '700' }}>[전체 사내 계정 조회 및 관리 - 개발자 권한]</span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: '700' }}>[{currentUser?.division || '소속'} 소속 계정 조회 및 관리 - 관리자 권한]</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsAccountMgmtModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input Bar */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="성명, 아이디, 사업부, 소속팀으로 검색..."
                value={mgmtSearch}
                onChange={(e) => setMgmtSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Account List */}
            <div style={{
              overflowY: 'auto',
              maxHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px'
            }}>
              {filteredMgmtUsers.length === 0 ? (
                <div style={{ padding: '35px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  조회 가능한 등록 계정이 없습니다.
                </div>
              ) : (
                filteredMgmtUsers.map(u => (
                  <div
                    key={u.username}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: u.role === '개발자' ? 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' :
                          u.role === '관리자' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                            '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: u.role === '일반' ? '#475569' : '#ffffff',
                        fontWeight: '800',
                        fontSize: '16px'
                      }}>
                        {u.name ? u.name.slice(0, 1) : 'U'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                            {u.name} {u.rank}
                          </span>
                          {isDevUser ? (
                            <select
                              value={u.role || '일반'}
                              onChange={(e) => handleUserRoleChange(u, e.target.value)}
                              disabled={u.username === 'admin'}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: u.role === '개발자' ? '#eff6ff' : u.role === '관리자' ? '#fffbeb' : '#ecfdf5',
                                border: u.role === '개발자' ? '1.5px solid #cbd5e1' : u.role === '관리자' ? '1.5px solid #fde68a' : '1.5px solid #a7f3d0',
                                color: u.role === '개발자' ? '#1e3a8a' : u.role === '관리자' ? '#d97706' : '#059669',
                                cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="일반">구분: 일반</option>
                              <option value="관리자">구분: 관리자</option>
                              <option value="개발자">구분: 개발자</option>
                            </select>
                          ) : (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              background: u.role === '개발자' ? 'rgba(30, 58, 138, 0.12)' : u.role === '관리자' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: u.role === '개발자' ? '#1e3a8a' : u.role === '관리자' ? '#d97706' : '#059669',
                              border: u.role === '개발자' ? '1px solid #cbd5e1' : u.role === '관리자' ? '1px solid #fde68a' : '1px solid #a7f3d0'
                            }}>
                              {u.role || '일반'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: '#334155', fontWeight: '600' }}>{u.division || '사업부 미지정'}</span>
                          <span>•</span>
                          <span>{u.team || '소속팀'}</span>
                          <span>•</span>
                          <span className="mono-font">{u.phone || '연락처 미등록'}</span>
                          <span>•</span>
                          <span>ID: <strong style={{ color: '#1e3a8a' }}>{u.username}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {u.username !== 'admin' && u.username !== currentUser?.username && u.role === '일반' ? (
                        <button
                          onClick={() => handleDeleteUserAccount(u)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #fda4af',
                            background: '#fff1f2',
                            color: '#e11d48',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={13} /> 계정 삭제
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                          {u.username === currentUser?.username ? '(본인 계정)' : u.role === '개발자' ? '(개발자 보호)' : '(보호 계정)'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Server Unlock Verification Modal */}
      {isServerUnlockModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '400px',
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                <Key size={18} color="#1e3a8a" /> 서버 연동 수정 잠금 해제
              </div>
              <button
                type="button"
                onClick={() => setIsServerUnlockModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
              서버 연동 도메인을 재설정하거나 변경하려면 <strong>개발자 비밀번호(withtech123!)</strong>를 입력해 주세요.
            </p>

            <form onSubmit={handleConfirmServerUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  개발자 인증 비밀번호
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="비밀번호 입력"
                  value={serverUnlockPassword}
                  onChange={(e) => setServerUnlockPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsServerUnlockModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1.4,
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#1e3a8a',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                  }}
                >
                  잠금 해제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Failure & Brute Force Attempt Counter Modal */}
      {loginAlertModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '380px',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '22px 20px',
            border: loginAlertModal.isBlocked ? '1.5px solid #fda4af' : '1.5px solid #cbd5e1',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            animation: 'staticFadeIn 0.2s ease forwards'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: loginAlertModal.isBlocked ? '#fee2e2' : '#fef3c7',
                border: loginAlertModal.isBlocked ? '1.5px solid #fca5a5' : '1.5px solid #fde68a',
                color: loginAlertModal.isBlocked ? '#dc2626' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {loginAlertModal.isBlocked ? <Lock size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: loginAlertModal.isBlocked ? '#dc2626' : '#0f172a',
                  letterSpacing: '-0.2px'
                }}>
                  {loginAlertModal.title}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  보안 로그인 정책 (최대 5회 시도)
                </div>
              </div>
            </div>

            {/* Visual Attempt Progress Counter Badge */}
            <div style={{
              background: loginAlertModal.isBlocked ? '#fff1f2' : '#f8fafc',
              border: loginAlertModal.isBlocked ? '1.5px solid #fecdd3' : '1.5px solid #e2e8f0',
              padding: '12px 14px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  로그인 실패 횟수
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '800',
                  color: loginAlertModal.isBlocked ? '#e11d48' : '#d97706'
                }}>
                  5회 중 {Math.min(5, loginAlertModal.failCount)}회 실패
                </span>
              </div>

              {/* 5 Dots Indicator */}
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                {[1, 2, 3, 4, 5].map(step => {
                  const isFailed = step <= loginAlertModal.failCount;
                  return (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        background: isFailed
                          ? (loginAlertModal.isBlocked ? '#ef4444' : '#f59e0b')
                          : '#e2e8f0',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  );
                })}
              </div>

              <div style={{
                fontSize: '12px',
                fontWeight: '800',
                color: loginAlertModal.isBlocked ? '#dc2626' : '#1e3a8a',
                textAlign: 'center',
                paddingTop: '2px'
              }}>
                {loginAlertModal.isBlocked ? (
                  `🚫 5회 연속 실패로 5분간 로그인이 제한됩니다.`
                ) : (
                  `⚡ 남은 로그인 시도: ${loginAlertModal.remainingAttempts}회`
                )}
              </div>
            </div>

            {/* Description Text */}
            <p style={{
              fontSize: '12.5px',
              color: '#475569',
              lineHeight: '1.5',
              margin: 0,
              textAlign: 'center'
            }}>
              {loginAlertModal.isBlocked ? (
                '계정 보안을 위해 일시적으로 로그인이 차단되었습니다. 5분 후 다시 시도해 주세요.'
              ) : (
                '입력하신 비밀번호가 올바르지 않습니다. 5회 연속 실패 시 보안을 위해 5분간 로그인이 차단됩니다.'
              )}
            </p>

            {/* Action Confirm Button */}
            <button
              type="button"
              onClick={() => setLoginAlertModal(prev => ({ ...prev, isOpen: false }))}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                background: loginAlertModal.isBlocked ? '#dc2626' : '#1e3a8a',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: loginAlertModal.isBlocked
                  ? '0 4px 12px rgba(220, 38, 38, 0.25)'
                  : '0 4px 12px rgba(30, 58, 138, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
