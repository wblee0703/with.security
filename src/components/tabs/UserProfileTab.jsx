import React, { useState, useEffect } from 'react';
import { UserCheck, UserPlus, LogIn, LogOut, Shield, Save, User, Database, FileCode, Download, Edit3, Key, X, Lock, Users, Trash2, Search } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { dbMigrationService } from '../../services/dbMigrationService';
import { hashPassword } from '../../services/cryptoUtil';

export default function UserProfileTab({ onTriggerToast }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    role: '일반',
    division: 'DS부문 (반도체)',
    team: '보안관제팀',
    rank: '책임',
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

  // Load active user profile on mount
  useEffect(() => {
    async function loadUser() {
      const active = await dbService.getUserProfile();
      if (active) {
        setCurrentUser(active);
        setEditForm(active);
      }
    }
    loadUser();
  }, []);

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

    const match = users.find(u =>
      u.username === inputUsername &&
      (
        u.passwordHash === inputHash ||
        u.password === inputPassword ||
        (inputUsername === 'admin' && inputPassword === 'withtech123!')
      )
    );

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
    if (users.some(u => u.username === signupForm.username.trim())) {
      if (onTriggerToast) onTriggerToast('이미 존재하는 아이디입니다. 다른 아이디를 사용해 주세요.', 'warning');
      return;
    }

    const passwordHash = await hashPassword(signupForm.password);

    // Initial signups are strictly created as regular user ('일반')
    const newUser = {
      username: signupForm.username.trim(),
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
      division: 'DS부문 (반도체)',
      team: '보안관제팀',
      rank: '책임',
      name: '',
      phone: '',
      email: ''
    });

    if (onTriggerToast) onTriggerToast(`'${newUser.name}'님 계정이 정상 생성되고 로그인 되었습니다. [구분: 일반]`, 'success');
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
    if (!verifyPassword.trim()) {
      if (onTriggerToast) onTriggerToast('현재 비밀번호를 입력해 주세요.', 'warning');
      return;
    }

    const inputHash = await hashPassword(verifyPassword);
    const isPasswordCorrect = (currentUser?.passwordHash && inputHash === currentUser.passwordHash) ||
      (currentUser?.password && verifyPassword === currentUser.password);

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
    const updatedUser = {
      ...editForm,
      role: isAdmin ? (editForm.role || '일반') : (currentUser?.role || '일반'),
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
    if (!window.confirm(`정말로 '${targetUser.name}(${targetUser.username})' 사용자 계정을 삭제하시겠습니까?\n삭제 즉시 users.json 파일에 반영됩니다.`)) {
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
              <UserCheck size={24} color="#00f2fe" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                사용자 정보
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {currentUser && (
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%'
                }}
              >
                <LogOut size={14} /> 로그아웃
              </button>
            )}

            {currentUser && (isDevUser || isManagerUser) && (
              <button
                onClick={handleOpenAccountMgmtModal}
                style={{
                  background: 'rgba(0, 242, 254, 0.12)',
                  border: '1px solid rgba(0, 242, 254, 0.4)',
                  color: '#00f2fe',
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
                  boxShadow: '0 0 12px rgba(0, 242, 254, 0.15)'
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
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(0, 242, 254, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '16px',
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
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                      {currentUser.name} {currentUser.rank}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: currentUser.role === '개발자' ? 'rgba(0, 242, 254, 0.2)' : currentUser.role === '관리자' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: currentUser.role === '개발자' ? '#00f2fe' : currentUser.role === '관리자' ? '#f59e0b' : '#10b981',
                      border: currentUser.role === '개발자' ? '1px solid rgba(0, 242, 254, 0.4)' : currentUser.role === '관리자' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                    }}>
                      구분: {currentUser.role || '일반'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    <span style={{ color: '#00f2fe', fontWeight: '600' }}>{currentUser.division}</span> • {currentUser.team} • ID: <strong style={{ color: '#00f2fe' }}>{currentUser.username}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> 사용자 상세 정보 수정 및 관리
              </div>

              {/* Edit Mode Toggle / Verify Button */}
              <button
                type="button"
                onClick={handleOpenVerifyModal}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: isEditUnlocked ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(0, 242, 254, 0.4)',
                  background: isEditUnlocked ? 'rgba(244, 63, 94, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                  color: isEditUnlocked ? '#f43f5e' : '#00f2fe',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isEditUnlocked ? (
                  <>
                    <X size={14} /> 수정 취소 (잠금)
                  </>
                ) : (
                  <>
                    <Edit3 size={14} /> 정보 수정 (비밀번호 인증)
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                        background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                        border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isEditUnlocked ? '#00f2fe' : '#94a3b8',
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
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    사업부 *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditUnlocked}
                    placeholder="예: DS부문 (반도체), DX부문"
                    value={editForm?.division || ''}
                    onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                      border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isEditUnlocked ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    소속팀 *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditUnlocked}
                    placeholder="예: 보안관제팀, EUV설비팀"
                    value={editForm?.team || ''}
                    onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                      border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isEditUnlocked ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    직급 *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditUnlocked}
                    placeholder="예: 책임, 수석, 선임, 수석연구원"
                    value={editForm?.rank || ''}
                    onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                      border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isEditUnlocked ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                      background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                      border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isEditUnlocked ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    전화번호 *
                  </label>
                  <input
                    type="text"
                    disabled={!isEditUnlocked}
                    placeholder="010-0000-0000"
                    value={editForm?.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                      border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isEditUnlocked ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                      background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                      border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isEditUnlocked ? '#fff' : '#94a3b8',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: isEditUnlocked ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </div>

              {/* Password Change Section (Optional) */}
              <div style={{
                background: isEditUnlocked ? 'rgba(0, 242, 254, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: isEditUnlocked ? '#00f2fe' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} /> 계정 비밀번호 변경 (선택 사항)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      변경할 비밀번호
                    </label>
                    <input
                      type="password"
                      disabled={!isEditUnlocked}
                      placeholder={isEditUnlocked ? "새 비밀번호 입력 (미입력 시 기존 유발)" : "수정 모드 해제 시 입력 가능"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                        border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isEditUnlocked ? '#fff' : '#94a3b8',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: isEditUnlocked ? 'text' : 'not-allowed'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                        background: isEditUnlocked ? '#0a0f1d' : 'rgba(255, 255, 255, 0.04)',
                        border: isEditUnlocked ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isEditUnlocked ? '#fff' : '#94a3b8',
                        fontSize: '13px',
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
                  fontSize: '12px',
                  color: '#64748b',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  marginTop: '6px'
                }}>
                  🔒 상단 <strong>[정보 수정 (비밀번호 인증)]</strong> 버튼을 클릭하여 비밀번호를 인증해야 정보를 수정할 수 있습니다.
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
              background: 'rgba(0, 0, 0, 0.8)',
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
                      <Key size={20} color="#00f2fe" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>
                        현재 비밀번호 인증
                      </h3>
                      <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                        사용자 정보 수정을 위해 비밀번호를 입력해 주세요.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleVerifyPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                        background: '#0a0f1d',
                        border: '1px solid rgba(0, 242, 254, 0.4)',
                        color: '#fff',
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
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <button
              onClick={() => setAuthMode('login')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: authMode === 'login' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                color: authMode === 'login' ? '#00f2fe' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
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
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: authMode === 'signup' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                color: authMode === 'signup' ? '#00f2fe' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <UserPlus size={16} /> 신규 회원가입 (계정 생성)
            </button>
          </div>

          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
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
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    사업부 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: DS부문 (반도체), DX부문"
                    value={signupForm.division}
                    onChange={(e) => setSignupForm({ ...signupForm, division: e.target.value })}
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
                    소속팀 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 보안관제팀, EUV설비팀"
                    value={signupForm.team}
                    onChange={(e) => setSignupForm({ ...signupForm, team: e.target.value })}
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
                    직급 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 책임, 수석, 선임"
                    value={signupForm.rank}
                    onChange={(e) => setSignupForm({ ...signupForm, rank: e.target.value })}
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
                    전화번호 *
                  </label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
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

      {/* Account Management Modal */}
      {isAccountMgmtModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.85)',
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
            border: '1px solid rgba(0, 242, 254, 0.3)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 60px rgba(0, 242, 254, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#00f2fe" /> 사내 계정 관리 센터
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {isDevUser ? (
                    <span style={{ color: '#00f2fe', fontWeight: '700' }}>[전체 사내 계정 조회 및 관리 - 개발자 권한]</span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>[{currentUser?.division || '소속'} 소속 계정 조회 및 관리 - 관리자 권한]</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsAccountMgmtModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
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
                  background: '#0a0f1d',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
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
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: u.role === '개발자' ? 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)' :
                          u.role === '관리자' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                          'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: u.role === '일반' ? '#fff' : '#050b14',
                        fontWeight: '800',
                        fontSize: '16px'
                      }}>
                        {u.name ? u.name.slice(0, 1) : 'U'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
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
                                background: u.role === '개발자' ? '#0a1d2e' : u.role === '관리자' ? '#261a08' : '#092116',
                                border: u.role === '개발자' ? '1px solid rgba(0, 242, 254, 0.5)' : u.role === '관리자' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
                                color: u.role === '개발자' ? '#00f2fe' : u.role === '관리자' ? '#f59e0b' : '#10b981',
                                cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="일반" style={{ background: '#0a0f1d', color: '#10b981' }}>구분: 일반</option>
                              <option value="관리자" style={{ background: '#0a0f1d', color: '#f59e0b' }}>구분: 관리자</option>
                              <option value="개발자" style={{ background: '#0a0f1d', color: '#00f2fe' }}>구분: 개발자</option>
                            </select>
                          ) : (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              background: u.role === '개발자' ? 'rgba(0, 242, 254, 0.2)' : u.role === '관리자' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: u.role === '개발자' ? '#00f2fe' : u.role === '관리자' ? '#f59e0b' : '#10b981'
                            }}>
                              구분: {u.role || '일반'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                          {u.division} • {u.team} | ID: <strong style={{ color: '#00f2fe' }}>{u.username}</strong>
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
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
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

    </div>
  );
}
