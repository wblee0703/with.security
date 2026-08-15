import React, { useState, useEffect } from 'react';
import { UserCheck, UserPlus, LogIn, LogOut, Shield, Save, User, Database, FileCode, Download, Edit3, Key, X, Lock, Users, Trash2, Search, Globe, Link, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { dbMigrationService } from '../../services/dbMigrationService';
import { hashPassword, verifyPasswordHash } from '../../services/cryptoUtil';
import { useModalBack } from '../../services/modalBackHandler';
import { DIVISION_LIST, getTeamsForDivision, RANK_LIST } from '../../services/userMatcher';

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

  // Back button hooks
  useModalBack(isVerifyModalOpen, () => setIsVerifyModalOpen(false), 'user-verify-modal');
  useModalBack(isAccountMgmtModalOpen, () => setIsAccountMgmtModalOpen(false), 'user-account-mgmt-modal');

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

  // Load active user profile & server URL on mount
  useEffect(() => {
    async function loadUser() {
      const active = await dbService.getUserProfile();
      if (active) {
        setCurrentUser(active);
        setEditForm(active);
      }
      const sUrl = dbService.getServerUrl();
      setActiveServerUrl(sUrl);
      setServerUrlInput(sUrl);
    }
    loadUser();
  }, []);

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
    const inputHash = await hashPassword(inputPassword);
    const users = await dbService.getRegisteredUsers();

    let match = null;
    for (const u of users) {
      const dbUsername = String(u?.username || '').trim().toLowerCase();
      if (dbUsername === inputUsername.toLowerCase()) {
        const dbPass = String(u?.password || '').trim();
        const dbHash = String(u?.passwordHash || '').trim();
        const isPassOk = (await verifyPasswordHash(inputPassword, dbHash)) || (await verifyPasswordHash(inputPassword, dbPass));
        if (isPassOk) {
          match = u;
          break;
        }
      }
    }

    // Failsafe fallback: Fresh app install without cached DB
    if (!match && inputUsername.toLowerCase() === 'admin') {
      const defaultAdminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
      if (inputPassword === defaultAdminPass || inputPassword === 'admin') {
        const defaultHash = await hashPassword(defaultAdminPass);
        match = {
          username: 'admin',
          password: defaultHash,
          passwordHash: defaultHash,
          name: '이원배',
          role: '개발자',
          division: '영업/운영사업부',
          team: '운영1팀',
          rank: '대리',
          siteId: 'ALL',
          phone: '010-9885-0393',
          email: 'wblee@withtech.co.kr'
        };
      }
    }

    if (match) {
      const activeUser = {
        ...match,
        role: match.username === 'admin' ? '개발자' : (match.role || '일반')
      };
      await dbService.saveUserProfile(activeUser);
      setCurrentUser(activeUser);
      setEditForm(activeUser);
      setLoginForm({ username: '', password: '' });
      if (onTriggerToast) onTriggerToast(`'${activeUser.name}'님 환영합니다! [구분: ${activeUser.role}]`, 'success');
      if (setActiveTab) setActiveTab('entryCheck');
    } else {
      if (onTriggerToast) onTriggerToast('아이디 또는 비밀번호가 일치하지 않습니다.', 'warning');
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
    if (setActiveTab) setActiveTab('entryCheck');
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
    e.preventDefault();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Top Banner Header */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '2px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(14, 165, 233, 0.25)',
              flexShrink: 0
            }}>
              <UserCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                사용자 정보
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {currentUser && (
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
              >
                <LogOut size={14} /> 로그아웃
              </button>
            )}

            {currentUser && (isDevUser || isManagerUser) && (
              <button
                onClick={handleOpenAccountMgmtModal}
                style={{
                  background: 'rgba(14, 165, 233, 0.1)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  color: '#0284c7',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Users size={14} /> 계정 관리
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode 1: Logged In User Profile Console */}
      {currentUser ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active User Card Banner */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '2px', background: 'rgba(0, 242, 254, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#050b14',
                  fontWeight: '900',
                  fontSize: '20px',
                  boxShadow: '0 4px 16px rgba(0, 242, 254, 0.3)'
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
                      background: currentUser.role === '개발자' ? 'rgba(14, 165, 233, 0.15)' : currentUser.role === '관리자' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: currentUser.role === '개발자' ? '#0284c7' : currentUser.role === '관리자' ? '#d97706' : '#059669',
                      border: currentUser.role === '개발자' ? '1px solid rgba(14, 165, 233, 0.3)' : currentUser.role === '관리자' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      구분: {currentUser.role || '일반'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    <span style={{ color: '#0284c7', fontWeight: '700' }}>{currentUser.division}</span> • {currentUser.team} • ID: <strong style={{ color: '#0284c7' }}>{currentUser.username}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '2px', border: '1.5px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={18} color="#0284c7" /> 사용자 상세 정보 수정 및 관리
              </div>

              {/* Edit Mode Toggle / Verify Button */}
              <button
                type="button"
                onClick={handleOpenVerifyModal}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: isEditUnlocked ? '1.5px solid #fda4af' : '1.5px solid #7dd3fc',
                  background: isEditUnlocked ? '#fff1f2' : '#f0f9ff',
                  color: isEditUnlocked ? '#e11d48' : '#0284c7',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isEditUnlocked ? '0 2px 6px rgba(244, 63, 94, 0.15)' : '0 2px 6px rgba(14, 165, 233, 0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isEditUnlocked ? (
                  <>
                    <X size={14} /> 수정 취소 (잠금)
                  </>
                ) : (
                  <>
                    <Edit3 size={14} /> 정보 수정
                  </>
                )}
              </button>
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
                        border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                        background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                        border: isEditUnlocked ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isEditUnlocked ? '#f59e0b' : '#94a3b8',
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
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
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
                      border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                      border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                      border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                      border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                      border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                      border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                background: isEditUnlocked ? '#f0f9ff' : '#f8fafc',
                border: isEditUnlocked ? '1.5px solid #7dd3fc' : '1.5px solid #e2e8f0',
                padding: '16px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: isEditUnlocked ? '#0284c7' : '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={15} color={isEditUnlocked ? '#0284c7' : '#64748b'} /> 계정 비밀번호 변경 (선택 사항)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      변경할 비밀번호
                    </label>
                    <input
                      type="password"
                      disabled={!isEditUnlocked}
                      placeholder={isEditUnlocked ? "새 비밀번호 입력 (미입력 시 기존 유지)" : "수정 모드 해제 시 입력 가능"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                        border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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
                      placeholder={isEditUnlocked ? "변경할 비밀번호 재입력" : "수정 모드 해제 시 입력 가능"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#ffffff' : '#f1f5f9',
                        border: isEditUnlocked ? '1.5px solid #38bdf8' : '1.5px solid #cbd5e1',
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

              {isEditUnlocked ? (
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
                    fontSize: '13px',
                    marginTop: '8px'
                  }}
                >
                  <Save size={16} /> 사용자 정보 업데이트 저장
                </button>
              ) : (
                <div style={{
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: '#64748b',
                  padding: '14px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1.5px dashed #cbd5e1',
                  marginTop: '6px'
                }}>
                  🔒 상단 <strong>[정보 수정]</strong> 버튼을 클릭하여 비밀번호를 인증해야 정보를 수정할 수 있습니다.
                </div>
              )}
            </form>
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
                border: '1.5px solid #38bdf8',
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
                      background: 'rgba(2, 132, 199, 0.15)',
                      border: '1.5px solid #bae6fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Key size={20} color="#0284c7" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                        현재 비밀번호 인증
                      </h3>
                      <p style={{ fontSize: '11.5px', color: '#64748b' }}>
                        사용자 정보 수정을 위해 비밀번호를 입력해 주세요.
                      </p>
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
                        borderRadius: '12px',
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
                        borderRadius: '12px',
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
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      인증 및 수정 해제
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Logged Out State (Login / Signup Tabs) */
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '2px', border: '1.5px solid #cbd5e1' }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px' }}>
            <button
              onClick={() => setAuthMode('login')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: authMode === 'login' ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: authMode === 'login' ? 'rgba(2, 132, 199, 0.1)' : '#ffffff',
                color: authMode === 'login' ? '#0284c7' : '#64748b',
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
                border: authMode === 'signup' ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: authMode === 'signup' ? 'rgba(2, 132, 199, 0.1)' : '#ffffff',
                color: authMode === 'signup' ? '#0284c7' : '#64748b',
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
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '2px', border: isServerLocked ? '1.5px solid #cbd5e1' : '1.5px solid #7dd3fc', background: '#f0f9ff', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                현재 앱은 <strong style={{ color: '#0284c7' }}>{activeServerUrl || '기본 도메인(wblee0703.github.io)'}</strong>으로 안전하게 고정되어 있습니다.<br />
                향후 가비아 호스팅 등으로 서버 도메인을 이전할 때만 <strong>[수정 잠금 해제]</strong>를 진행해 주세요.
              </>
            ) : (
              <>
                모바일 APK 설치 후 맨 처음 접속 시 백엔드 DB 주소를 연결합니다.<br />
                - 가비아 호스팅 이전 기본 주소: <code style={{ color: '#0284c7', background: '#ffffff', padding: '1px 4px', borderRadius: '4px', border: '1px solid #bae6fd' }}>https://wblee0703.github.io/with.security</code><br />
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
                <Server size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#0284c7' }} />
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
                    border: isServerLocked ? '1.5px solid #cbd5e1' : '1.5px solid #7dd3fc',
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
                style={{ padding: '4px 10px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #7dd3fc', color: '#0284c7', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
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
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
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
                  <Users size={20} color="#0284c7" /> 사내 계정 관리 센터
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {isDevUser ? (
                    <span style={{ color: '#0284c7', fontWeight: '700' }}>[전체 사내 계정 조회 및 관리 - 개발자 권한]</span>
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
                        background: u.role === '개발자' ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' :
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
                                background: u.role === '개발자' ? '#f0f9ff' : u.role === '관리자' ? '#fffbeb' : '#ecfdf5',
                                border: u.role === '개발자' ? '1.5px solid #7dd3fc' : u.role === '관리자' ? '1.5px solid #fde68a' : '1.5px solid #a7f3d0',
                                color: u.role === '개발자' ? '#0284c7' : u.role === '관리자' ? '#d97706' : '#059669',
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
                              background: u.role === '개발자' ? 'rgba(2, 132, 199, 0.12)' : u.role === '관리자' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: u.role === '개발자' ? '#0284c7' : u.role === '관리자' ? '#d97706' : '#059669',
                              border: u.role === '개발자' ? '1px solid #7dd3fc' : u.role === '관리자' ? '1px solid #fde68a' : '1px solid #a7f3d0'
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
                          <span>ID: <strong style={{ color: '#0284c7' }}>{u.username}</strong></span>
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
                <Key size={18} color="#0284c7" /> 서버 연동 수정 잠금 해제
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
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  잠금 해제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
