import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Building2,
  User,
  Users,
  Filter,
  PieChart,
  Clock,
  Sparkles,
  RefreshCw,
  Layers,
  Briefcase,
  CalendarDays,
  FileSpreadsheet,
  Copy,
  Share2,
  Printer,
  Award,
  CheckSquare,
  Bookmark,
  FileCode,
  Search,
  X,
  Check,
  Save
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Capacitor } from '@capacitor/core';
import { shareReportText } from '../../services/appLauncherService';

export default function WorkSummaryTab({ onTriggerToast }) {
  const isNative = Capacitor.isNativePlatform();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    handleResize();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, []);

  const isMobile = isNative || (containerWidth > 0 ? containerWidth < 760 : (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  const [currentUser, setCurrentUser] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [sharedWeeklyReports, setSharedWeeklyReports] = useState([]);
  const [collapsedSharedCards, setCollapsedSharedCards] = useState({});
  const [collapsedDailySharedCards, setCollapsedDailySharedCards] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const dailyDateInputRef = useRef(null);

  // Weekly In-App Share Modal State (사내 사용자 주간 업무 공유 모달)
  const [isWeeklyShareModalOpen, setIsWeeklyShareModalOpen] = useState(false);
  const [weeklyShareTargets, setWeeklyShareTargets] = useState([]);
  const [weeklyShareSearchQuery, setWeeklyShareSearchQuery] = useState('');

  // Today local ISO date (YYYY-MM-DD)
  const getTodayIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tomorrow local ISO date (YYYY-MM-DD)
  const getTomorrowIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Daily Filter State
  const [dailyDate, setDailyDate] = useState(getTodayIso());

  // Weekly Filter State (Stores Monday ISO date of the selected week)
  const getMonday = (dateObj) => {
    const d = new Date(dateObj);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const formatIso = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [weeklyMonday, setWeeklyMonday] = useState(formatIso(getMonday(new Date())));

  // Weekly Custom Section State (주차별 1. 주요 내용, 2. 정보 공유, 3. 업무 지원, 4. 기타 업무)
  const [weeklyCustomReports, setWeeklyCustomReports] = useState(() => {
    try {
      const saved = localStorage.getItem('with_sec_weekly_custom_reports');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isWeeklyDirty, setIsWeeklyDirty] = useState(false);

  // 미저장 변경사항 이동 안내 모달 상태
  const [isUnsavedPromptOpen, setIsUnsavedPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const currentWeeklyCustom = weeklyCustomReports[weeklyMonday] || {
    mainTasks: '',
    infoSharing: '',
    teamCoop: '',
    workSupport: '',
    etcTasks: ''
  };

  // 입력 시에는 오직 React State만 업데이트하고 자동 저장은 하지 않음 (저장 버튼 누를 때만 저장)
  const handleWeeklyCustomChange = (field, value) => {
    setIsWeeklyDirty(true);
    setWeeklyCustomReports(prev => ({
      ...prev,
      [weeklyMonday]: {
        ...(prev[weeklyMonday] || { mainTasks: '', infoSharing: '', teamCoop: '', workSupport: '', etcTasks: '' }),
        [field]: value
      }
    }));
  };

  // 새로고침 및 창 닫기 시 저장되지 않은 수정사항 브라우저 경고 & 전역 탭 이동 감지
  useEffect(() => {
    window.__WITH_SECURITY_UNSAVED_CHANGES__ = isWeeklyDirty;

    const handleBeforeUnload = (e) => {
      if (isWeeklyDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handleTabChangePrompt = (e) => {
      const targetTab = e.detail?.targetTab;
      const performTabSwitch = e.detail?.performTabSwitch;
      if (isWeeklyDirty && (targetTab || performTabSwitch)) {
        setPendingAction(() => () => {
          if (typeof performTabSwitch === 'function') performTabSwitch();
        });
        setIsUnsavedPromptOpen(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('with_security_prompt_unsaved_tab', handleTabChangePrompt);

    return () => {
      window.__WITH_SECURITY_UNSAVED_CHANGES__ = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('with_security_prompt_unsaved_tab', handleTabChangePrompt);
    };
  }, [isWeeklyDirty]);

  // Weekly Textarea Auto-Resize Refs & Helpers
  const mainTasksRef = useRef(null);
  const infoSharingRef = useRef(null);
  const teamCoopRef = useRef(null);
  const etcTasksRef = useRef(null);

  const autoResizeTextarea = (element) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    [mainTasksRef, infoSharingRef, teamCoopRef, etcTasksRef].forEach(ref => {
      if (ref.current) {
        autoResizeTextarea(ref.current);
      }
    });
  }, [weeklyMonday, currentWeeklyCustom]);

  // 주간 업무 보고(1~4번) 명시적 저장 핸들러 (저장 버튼 누를 때 사내공유 대상자에게도 즉시 자동 공유)
  const handleSaveWeeklyCustomReport = async () => {
    const timeStr = `${formatIso(new Date())} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

    // 1. 사내 공유 대상자 조회 (한 번 지정해둔 대상자 목록 자동 불러오기)
    const userKey = getUserShareTargetsStorageKey(currentUser);
    let autoTargets = [];
    if (userKey) {
      try {
        const saved = localStorage.getItem(userKey);
        if (saved) autoTargets = JSON.parse(saved);
      } catch (e) { }
    }

    // 대상자들을 '이름 직급 (소속)' 형식으로 정제
    const formattedTargets = (autoTargets || []).map(t => {
      if (typeof t === 'string') return t.trim();
      const name = (t.name || t.authorName || '').trim();
      const rank = (t.rank || t.authorRank || '').trim();
      const team = formatOnlyTeam(t.team || t.department || '');
      let label = name;
      if (rank && !label.includes(rank)) label += ` ${rank}`;
      if (team && !label.includes(team)) label += ` (${team})`;
      return label;
    }).filter(Boolean);

    const payload = {
      id: `weekly-rep-${currentUser?.username || currentUser?.id || currentUser?.name || 'user'}-${weeklyMonday}`,
      weeklyMonday: weeklyMonday,
      weekText: getWeekText(weeklyMonday),
      authorUsername: currentUser?.username || currentUser?.id || '',
      authorName: currentUser?.name || '작성자',
      authorTeam: currentUser?.team || currentUser?.department || '운영팀',
      authorRank: currentUser?.rank || '대리',
      authorDivision: currentUser?.division || '',
      authorRole: currentUser?.role || '일반',
      mainTasks: currentWeeklyCustom.mainTasks || '',
      infoSharing: currentWeeklyCustom.infoSharing || '',
      workSupport: currentWeeklyCustom.workSupport || currentWeeklyCustom.teamCoop || '',
      teamCoop: currentWeeklyCustom.workSupport || currentWeeklyCustom.teamCoop || '',
      etcTasks: currentWeeklyCustom.etcTasks || '',
      sharedWith: formattedTargets,
      sharedAt: formattedTargets.length > 0 ? timeStr : '',
      createdAt: timeStr
    };

    // 2. LocalStorage 명시적 저장
    try {
      localStorage.setItem('with_sec_weekly_custom_reports', JSON.stringify(weeklyCustomReports));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }

    // 3. Database 동기화
    await dbService.saveWeeklyReport(payload);

    // 4. 사내 공유 대상자가 설정되어 있다면 이번 주 일일 업무들도 자동 공유 동기화
    if (formattedTargets.length > 0 && weeklyOwnLogs.length > 0) {
      for (const logItem of weeklyOwnLogs) {
        const updated = {
          ...logItem,
          isShared: true,
          sharedWith: formattedTargets,
          sharedAt: timeStr
        };
        await dbService.saveWorkLog(updated);
      }
    }

    await loadData();
    window.dispatchEvent(new Event('with_security_data_changed'));
    setIsWeeklyDirty(false);

    if (onTriggerToast) {
      if (formattedTargets.length > 0) {
        onTriggerToast(`주간 업무 보고가 저장 및 지정된 사내 동료(${formattedTargets.length}명)에게 공유되었습니다.`, 'success');
      } else {
        onTriggerToast('주간 업무 보고서 내용이 안전하게 저장되었습니다.', 'success');
      }
    }
  };

  // 미저장 팝업 - 저장 후 이동
  const handleConfirmSaveAndNavigate = async () => {
    await handleSaveWeeklyCustomReport();
    setIsUnsavedPromptOpen(false);
    if (typeof pendingAction === 'function') {
      pendingAction();
      setPendingAction(null);
    }
  };

  // 미저장 팝업 - 저장하지 않고 그냥 이동 (원래 저장본으로 롤백)
  const handleDiscardAndNavigate = () => {
    try {
      const saved = localStorage.getItem('with_sec_weekly_custom_reports');
      setWeeklyCustomReports(saved ? JSON.parse(saved) : {});
    } catch (e) { }
    setIsWeeklyDirty(false);
    setIsUnsavedPromptOpen(false);
    if (typeof pendingAction === 'function') {
      pendingAction();
      setPendingAction(null);
    }
  };

  // 미저장 팝업 - 취소하고 계속 작성
  const handleCancelNavigate = () => {
    setIsUnsavedPromptOpen(false);
    setPendingAction(null);
  };

  // Load Work Logs & User Profile
  const loadData = async () => {
    setIsLoading(true);
    try {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
      const logs = await dbService.getWorkLogs();
      setWorkLogs(logs || []);
      const users = await dbService.getAllUsers();
      setAllUsers(users || []);
      const weeklyReps = await dbService.getWeeklyReports();
      setSharedWeeklyReports(weeklyReps || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDataChange = () => loadData();
    window.addEventListener('with_security_data_changed', handleDataChange);
    return () => window.removeEventListener('with_security_data_changed', handleDataChange);
  }, []);

  // --- Weekly Share Target Helpers ---
  const getUserShareTargetsStorageKey = (user) => {
    if (!user) return null;
    const uid = user.username || user.id || `${user.name || ''}_${user.rank || ''}_${user.team || ''}`;
    return `with_security_worklog_share_targets_${uid.trim()}`;
  };

  const handleOpenWeeklyShareModal = () => {
    const userKey = getUserShareTargetsStorageKey(currentUser);
    let initialTargets = [];
    if (userKey) {
      try {
        const saved = localStorage.getItem(userKey);
        if (saved) initialTargets = JSON.parse(saved);
      } catch (e) { }
    }
    setWeeklyShareTargets(initialTargets);
    setWeeklyShareSearchQuery('');
    setIsWeeklyShareModalOpen(true);
  };

  const handleToggleWeeklyShareTarget = (user) => {
    if (isSamePerson(currentUser, user)) return;
    setWeeklyShareTargets(prev => {
      const exists = prev.some(t => isSamePerson(t, user));
      if (exists) {
        return prev.filter(t => !isSamePerson(t, user));
      } else {
        return [...prev, {
          username: user.username || user.id || '',
          name: user.name || '',
          team: user.team || user.department || '',
          rank: user.rank || '',
          division: user.division || ''
        }];
      }
    });
  };

  const isSameTeamUser = (u, my) => {
    if (!u || !my) return false;
    const myT = (my.team || my.department || '').trim().toLowerCase();
    const uT = (u.team || u.department || '').trim().toLowerCase();
    if (myT && uT && (myT === uT || myT.includes(uT) || uT.includes(myT))) return true;
    const myD = (my.division || '').trim().toLowerCase();
    const uD = (u.division || '').trim().toLowerCase();
    if (myD && uD && myD === uD) return true;
    return false;
  };

  const handleSelectAllWeeklyShareTargets = () => {
    const targets = allUsers
      .filter(u => !isSamePerson(currentUser, u) && isSameTeamUser(u, currentUser))
      .map(u => ({
        username: u.username || u.id || '',
        name: u.name || '',
        team: u.team || u.department || '',
        rank: u.rank || '',
        division: u.division || ''
      }));
    setWeeklyShareTargets(targets);
  };

  const handleDeselectAllWeeklyShareTargets = () => {
    setWeeklyShareTargets([]);
  };

  // 주간 공유받은 업무 카드 개별 접기/펼치기 토글 (기본값: 접힘)
  const toggleSharedCard = (cardKey) => {
    setCollapsedSharedCards(prev => ({
      ...prev,
      [cardKey]: prev[cardKey] === false ? true : false
    }));
  };

  // 주간 공유받은 업무 카드 전체 접기/펼치기 토글
  const handleToggleAllSharedCards = (collapseAll) => {
    const updated = {};
    (receivedWeeklyCustomReports || []).forEach((rep, idx) => {
      const cardKey = rep.id || `shared-rep-${idx}`;
      updated[cardKey] = collapseAll;
    });
    setCollapsedSharedCards(updated);
  };

  // 일일 공유받은 업무 카드 개별 접기/펼치기 토글 (기본값: 접힘)
  const toggleDailySharedCard = (cardKey) => {
    setCollapsedDailySharedCards(prev => ({
      ...prev,
      [cardKey]: prev[cardKey] === false ? true : false
    }));
  };

  // 일일 공유받은 업무 카드 전체 접기/펼치기 토글
  const handleToggleAllDailySharedCards = (collapseAll) => {
    const updated = {};
    Object.keys(dailySharedGroupedByAuthor || {}).forEach((authorKey, idx) => {
      const cardKey = authorKey || `daily-shared-${idx}`;
      updated[cardKey] = collapseAll;
    });
    setCollapsedDailySharedCards(updated);
  };

  const handleConfirmWeeklyShare = async () => {
    // 기본 대상자 저장 (0명이면 빈 배열 저장)
    const userKey = getUserShareTargetsStorageKey(currentUser);
    if (userKey) {
      localStorage.setItem(userKey, JSON.stringify(weeklyShareTargets));
    }

    const hasCustomText = Boolean(
      (currentWeeklyCustom.mainTasks && currentWeeklyCustom.mainTasks.trim()) ||
      (currentWeeklyCustom.infoSharing && currentWeeklyCustom.infoSharing.trim()) ||
      (currentWeeklyCustom.teamCoop && currentWeeklyCustom.teamCoop.trim()) ||
      (currentWeeklyCustom.etcTasks && currentWeeklyCustom.etcTasks.trim())
    );

    if (!hasCustomText && weeklyOwnLogs.length === 0) {
      if (onTriggerToast) onTriggerToast('공유할 주간 업무 내용(1~4번) 또는 등록된 업무가 없습니다.', 'warning');
      return;
    }

    const now = new Date();
    const timeStr = `${formatIso(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // ⭐ '이름 직급 (소속)' 형식으로만 매핑 (예: "홍길동 대리 (운영1팀)")
    const formattedTargets = (weeklyShareTargets || []).map(t => {
      const name = (t.name || t.authorName || '').trim();
      const rank = (t.rank || t.authorRank || '').trim();
      const team = formatOnlyTeam(t.team || t.department || '');
      let label = name;
      if (rank && !label.includes(rank)) label += ` ${rank}`;
      if (team && !label.includes(team)) label += ` (${team})`;
      return label;
    }).filter(Boolean);

    const isSharingActive = formattedTargets.length > 0;

    // 1. 주간 직접 입력 1~4번 보고서 객체 저장 (사내 공유)
    const weeklyReportPayload = {
      id: `weekly-rep-${currentUser?.username || currentUser?.id || currentUser?.name}-${weeklyMonday}`,
      weeklyMonday: weeklyMonday,
      weekText: getWeekText(weeklyMonday),
      authorUsername: currentUser?.username || currentUser?.id || '',
      authorName: currentUser?.name || '작성자',
      authorTeam: currentUser?.team || currentUser?.department || '운영팀',
      authorRank: currentUser?.rank || '대리',
      authorDivision: currentUser?.division || '',
      authorRole: currentUser?.role || '일반',
      mainTasks: currentWeeklyCustom.mainTasks || '',
      infoSharing: currentWeeklyCustom.infoSharing || '',
      workSupport: currentWeeklyCustom.workSupport || currentWeeklyCustom.teamCoop || '',
      teamCoop: currentWeeklyCustom.workSupport || currentWeeklyCustom.teamCoop || '',
      etcTasks: currentWeeklyCustom.etcTasks || '',
      sharedWith: formattedTargets,
      sharedAt: isSharingActive ? timeStr : '',
      createdAt: timeStr
    };

    await dbService.saveWeeklyReport(weeklyReportPayload);

    // 2. 이번 주 내 일일 업무들(weeklyOwnLogs)도 함께 공유 상태로 업데이트
    for (const logItem of weeklyOwnLogs) {
      const updated = {
        ...logItem,
        isShared: isSharingActive,
        sharedWith: formattedTargets,
        sharedAt: isSharingActive ? timeStr : ''
      };
      await dbService.saveWorkLog(updated);
    }

    await loadData();
    window.dispatchEvent(new Event('with_security_data_changed'));
    setIsWeeklyShareModalOpen(false);

    if (onTriggerToast) {
      if (isSharingActive) {
        onTriggerToast(`이번 주 주간 업무가 ${formattedTargets.length}명에게 공유 등록되었습니다.`, 'success');
      } else {
        onTriggerToast('주간 업무 공유 대상자가 0명으로 등록(공유 해제)되었습니다.', 'success');
      }
    }
  };

  // User Identity Comparison Rule (동일인 및 동명이인 식별 기준):
  // 이름(name), 직급(rank), 소속(team), 사업부(division), 아이디(username) 중 1개라도 다르면 서로 다른 사람(동명이인)으로 판단
  const isSamePerson = (u1, u2) => {
    if (!u1 || !u2) return false;
    const name1 = (u1.name || u1.authorName || u1.writerName || u1.visitorName || '').trim();
    const name2 = (u2.name || u2.authorName || u2.writerName || u2.visitorName || '').trim();
    const rank1 = (u1.rank || u1.authorRank || u1.writerRank || '').trim();
    const rank2 = (u2.rank || u2.authorRank || u2.writerRank || '').trim();
    const team1 = (u1.team || u1.authorTeam || u1.writerTeam || u1.department || '').trim();
    const team2 = (u2.team || u2.authorTeam || u2.writerTeam || u2.department || '').trim();
    const div1 = (u1.division || u1.authorDivision || '').trim();
    const div2 = (u2.division || u2.authorDivision || '').trim();
    const id1 = (u1.username || u1.writerId || u1.authorUsername || u1.id || '').trim();
    const id2 = (u2.username || u2.writerId || u2.authorUsername || u2.id || '').trim();

    // 1. ID가 둘 다 존재하고 다르면 다른 사람
    if (id1 && id2 && id1 !== id2) return false;

    // 2. 이름, 직급, 소속, 사업부 중 1개라도 다르면 다른 사람 (동명이인 판정)
    if (name1 && name2 && name1 !== name2) return false;
    if (rank1 && rank2 && rank1 !== rank2) return false;
    if (team1 && team2 && team1 !== team2) return false;
    if (div1 && div2 && div1 !== div2) return false;

    // 3. 이름이나 ID가 일치하고 상충되는 필드가 없으면 동일인
    if (name1 && name2 && name1 === name2) return true;
    if (id1 && id2 && id1 === id2) return true;

    return false;
  };

  // '이름 직급 (소속)' 문자열 또는 사용자 객체와 현재 사용자 매칭 검사기
  const isTargetMatchingMe = (target, my) => {
    if (!target || !my) return false;
    if (typeof target === 'string') {
      const myName = (my.name || '').trim();
      const myRank = (my.rank || '').trim();
      const myTeam = formatOnlyTeam(my.team || my.department || '');
      let expectedFull = myName;
      if (myRank && !expectedFull.includes(myRank)) expectedFull += ` ${myRank}`;
      if (myTeam && !expectedFull.includes(myTeam)) expectedFull += ` (${myTeam})`;
      const targetStr = target.trim();
      return targetStr === expectedFull || (myName && targetStr.includes(myName));
    }
    return isSamePerson(target, my);
  };

  // --- Helpers for User Filtering & Shared Task Detection ---
  const isMyAuthoredLog = (log) => {
    if (!currentUser) return true;
    return isSamePerson(log, currentUser);
  };

  const formatOnlyTeam = (rawTeam) => {
    if (!rawTeam || typeof rawTeam !== 'string') return '운영팀';
    const trimmed = rawTeam.trim();
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(/\s+/);
      return parts[parts.length - 1];
    }
    return trimmed;
  };

  // --- Daily Helpers ---
  const handlePrevDay = () => {
    const d = new Date(dailyDate);
    d.setDate(d.getDate() - 1);
    setDailyDate(formatIso(d));
  };

  const handleNextDay = () => {
    const d = new Date(dailyDate);
    d.setDate(d.getDate() + 1);
    setDailyDate(formatIso(d));
  };

  const handleToday = () => {
    setDailyDate(getTodayIso());
  };

  const getFormattedKoreanDate = (isoStr) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${y}년 ${m}월 ${d}일 (${dayNames[dateObj.getDay()]})`;
  };

  // Grouping helper: calculates unique initial work cards (excludes extra tasks attached to the same card)
  const getInitialWorkGroups = (logs) => {
    const groups = {};
    (logs || []).forEach(log => {
      const sName = (log.siteName || log.site_name || '').trim();
      const aName = (log.authorName || log.name || '작성자').trim();
      const d = (log.date || '').trim();
      const cat = (log.category || '사내 업무').trim();
      const key = `${d}___${cat}___${sName}___${aName}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          date: d,
          category: cat,
          siteName: sName,
          authorName: aName,
          items: []
        };
      }
      groups[key].items.push(log);
    });
    return Object.values(groups);
  };

  // Work logs shared TO the current user from someone else (공유받은 업무)
  const isSharedToMe = (log) => {
    if (!currentUser || !log || !log.isShared || !Array.isArray(log.sharedWith)) return false;
    if (isSamePerson(log, currentUser)) return false;

    return log.sharedWith.some(target => isTargetMatchingMe(target, currentUser));
  };

  // --- Daily & Tomorrow Variables ---
  const todayIso = getTodayIso();
  const tomorrowIso = getTomorrowIso();
  const isToday = dailyDate === todayIso;
  const isTomorrow = dailyDate === tomorrowIso;
  const isFuture = dailyDate > todayIso;

  const dailyAllLogs = workLogs.filter(log => (log.date || '').startsWith(dailyDate));
  const dailyOwnLogs = dailyAllLogs.filter(isMyAuthoredLog);
  const dailySharedReceivedLogs = dailyAllLogs.filter(isSharedToMe);
  const dailyMySharedLogs = dailyOwnLogs.filter(l => l.isShared);
  const dailyInternalLogs = dailyOwnLogs.filter(l => l.category === '사내 업무');
  const dailyTripLogs = dailyOwnLogs.filter(l => l.category === '출장 업무');

  // Group daily shared-received logs by author (동일 공유자별 카드 묶음)
  const dailySharedGroupedByAuthor = dailySharedReceivedLogs.reduce((acc, log) => {
    const aName = log.authorName || log.name || '작성자';
    const aRank = log.authorRank || log.rank || '';
    const aTeam = log.authorTeam || log.team || log.department || '';
    const aDivision = log.authorDivision || log.division || '';
    const aUser = log.authorUsername || log.username || '';
    const key = `${aName}___${aRank}___${aTeam}___${aDivision}___${aUser}`;

    if (!acc[key]) {
      let authorLabel = aName;
      if (aRank && !authorLabel.includes(aRank)) authorLabel += ` ${aRank}`;
      if (aTeam && !authorLabel.includes(aTeam)) authorLabel += ` (${formatOnlyTeam(aTeam)})`;

      acc[key] = {
        key,
        authorName: aName,
        authorRank: aRank,
        authorTeam: aTeam,
        authorDivision: aDivision,
        authorUsername: aUser,
        authorLabel,
        items: []
      };
    }
    acc[key].items.push(log);
    return acc;
  }, {});

  // Tomorrow's logs for quick reference / preview
  const tomorrowAllLogs = workLogs.filter(log => (log.date || '').startsWith(tomorrowIso));
  const tomorrowOwnLogs = tomorrowAllLogs.filter(isMyAuthoredLog);
  const tomorrowInitialGroups = getInitialWorkGroups(tomorrowOwnLogs);

  // Initial work registration counts for daily (처음 등록 기준 건수)
  const dailyInitialGroups = getInitialWorkGroups(dailyOwnLogs);
  const dailyInitialInternalCount = dailyInitialGroups.filter(g => g.category === '사내 업무').length;
  const dailyInitialTripCount = dailyInitialGroups.filter(g => g.category === '출장 업무').length;
  const dailyTotalInitialCount = dailyInitialInternalCount + dailyInitialTripCount;

  // --- Weekly Helpers ---
  const getWeeklyDateRange = (monIso) => {
    const mon = new Date(monIso);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    return {
      monIso: formatIso(mon),
      sunIso: formatIso(sun),
      monObj: mon,
      sunObj: sun
    };
  };

  const weeklyRange = getWeeklyDateRange(weeklyMonday);

  const handlePrevWeek = () => {
    const mon = new Date(weeklyMonday);
    mon.setDate(mon.getDate() - 7);
    const targetIso = formatIso(mon);
    if (isWeeklyDirty) {
      setPendingAction(() => () => setWeeklyMonday(targetIso));
      setIsUnsavedPromptOpen(true);
    } else {
      setWeeklyMonday(targetIso);
    }
  };

  const handleNextWeek = () => {
    const mon = new Date(weeklyMonday);
    mon.setDate(mon.getDate() + 7);
    const targetIso = formatIso(mon);
    if (isWeeklyDirty) {
      setPendingAction(() => () => setWeeklyMonday(targetIso));
      setIsUnsavedPromptOpen(true);
    } else {
      setWeeklyMonday(targetIso);
    }
  };

  const handleThisWeek = () => {
    const targetIso = formatIso(getMonday(new Date()));
    if (isWeeklyDirty) {
      setPendingAction(() => () => setWeeklyMonday(targetIso));
      setIsUnsavedPromptOpen(true);
    } else {
      setWeeklyMonday(targetIso);
    }
  };

  const getWeekText = (monIso) => {
    const mon = new Date(monIso);
    const month = mon.getMonth() + 1;
    const date = mon.getDate();
    const weekNum = Math.ceil(date / 7);
    return `${mon.getFullYear()}년 ${month}월 ${weekNum}주차`;
  };

  const weeklyAllLogs = workLogs.filter(log => {
    const d = log.date || '';
    return d >= weeklyRange.monIso && d <= weeklyRange.sunIso;
  });
  const weeklyOwnLogs = weeklyAllLogs.filter(isMyAuthoredLog);
  const weeklySharedReceivedLogs = weeklyAllLogs.filter(isSharedToMe);
  const weeklyMySharedLogs = weeklyOwnLogs.filter(l => l.isShared);
  const weeklyInternalLogs = weeklyOwnLogs.filter(l => l.category === '사내 업무');
  const weeklyTripLogs = weeklyOwnLogs.filter(l => l.category === '출장 업무');
  const weeklyActiveDaysCount = Array.from(new Set(weeklyOwnLogs.map(l => l.date))).length;
  const weeklyAuthors = Array.from(new Set(weeklyOwnLogs.map(l => l.authorName || l.name))).filter(Boolean);

  // Group weekly shared-received logs by author (동일 공유자별 카드 묶음)
  const weeklySharedGroupedByAuthor = weeklySharedReceivedLogs.reduce((acc, log) => {
    const aName = log.authorName || log.name || '작성자';
    const aRank = log.authorRank || log.rank || '';
    const aTeam = log.authorTeam || log.team || log.department || '';
    const aDivision = log.authorDivision || log.division || '';
    const aUser = log.authorUsername || log.username || '';
    const key = `${aName}___${aRank}___${aTeam}___${aDivision}___${aUser}`;

    if (!acc[key]) {
      let authorLabel = aName;
      if (aRank && !authorLabel.includes(aRank)) authorLabel += ` ${aRank}`;
      if (aTeam && !authorLabel.includes(aTeam)) authorLabel += ` (${formatOnlyTeam(aTeam)})`;

      acc[key] = {
        key,
        authorName: aName,
        authorRank: aRank,
        authorTeam: aTeam,
        authorDivision: aDivision,
        authorUsername: aUser,
        authorLabel,
        items: []
      };
    }
    acc[key].items.push(log);
    return acc;
  }, {});

  // 이번 주에 다른 동료로부터 사내 공유받은 주간 직접 입력 1~4번 보고서 목록
  const receivedWeeklyCustomReports = (sharedWeeklyReports || []).filter(rep => {
    if (!currentUser || !rep || rep.weeklyMonday !== weeklyMonday) return false;
    if (isSamePerson(rep, currentUser)) return false;
    if (!Array.isArray(rep.sharedWith)) return false;
    return rep.sharedWith.some(target => isTargetMatchingMe(target, currentUser));
  });

  // Initial work registration counts for weekly (처음 등록 기준 건수)
  const weeklyInitialGroups = getInitialWorkGroups(weeklyOwnLogs);
  const weeklyInitialInternalCount = weeklyInitialGroups.filter(g => g.category === '사내 업무').length;
  const weeklyInitialTripCount = weeklyInitialGroups.filter(g => g.category === '출장 업무').length;
  const weeklyTotalInitialCount = weeklyInitialInternalCount + weeklyInitialTripCount;

  // Group weekly logs by date
  const weeklyGroupedByDate = {};
  weeklyOwnLogs.forEach(log => {
    const d = log.date;
    if (!weeklyGroupedByDate[d]) weeklyGroupedByDate[d] = [];
    weeklyGroupedByDate[d].push(log);
  });
  const sortedWeeklyDates = Object.keys(weeklyGroupedByDate).sort();

  // 월~금요일 5일간의 날짜 및 일일 업무 목록 생성
  const getWeeklyWorkDays = (monIso) => {
    const days = [];
    const dayLabels = ['월', '화', '수', '목', '금'];
    const mon = new Date(monIso);
    for (let i = 0; i < 5; i++) {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      const iso = formatIso(d);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dayLogs = weeklyOwnLogs.filter(l => (l.date || '').startsWith(iso));
      const dayInitialGroups = getInitialWorkGroups(dayLogs);

      days.push({
        iso,
        dayLabel: dayLabels[i],
        shortDate: `${month}/${date}`,
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
        isSelected: iso === dailyDate,
        logs: dayLogs,
        totalCount: dayInitialGroups.length
      });
    }
    return days;
  };
  const weeklyWorkDays = getWeeklyWorkDays(weeklyMonday);

  // --- Copy & Share Report Helpers ---
  const handleCopyText = (text, title) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (onTriggerToast) {
        onTriggerToast(`📋 [${title}] 텍스트 보고서가 클립보드에 복사되었습니다.`, 'success');
      }
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (onTriggerToast) {
        onTriggerToast(`📋 [${title}] 텍스트 보고서가 복사되었습니다.`, 'success');
      }
    }
  };

  const handleShareText = async (text, title) => {
    try {
      const res = await shareReportText({ title, text });
      if (res && res.success) {
        if (onTriggerToast) {
          onTriggerToast(`🔗 [${title}] 공유창이 열렸습니다.`, 'success');
        }
      } else if (!res?.aborted) {
        handleCopyText(text, title);
      }
    } catch (e) {
      handleCopyText(text, title);
    }
  };

  // 개별 업무 상세 내용 복사 헬퍼
  const handleCopySingleItem = (e, item) => {
    e.stopPropagation();
    const siteLoc = item.siteLocation || item.siteAddress || item.location || '';
    const isTrip = item.category === '출장 업무' || item.siteName || siteLoc;
    const siteTag = isTrip ? ` [출장] ${item.siteName || ''}${siteLoc ? ` (${siteLoc})` : ''}` : '';

    let text = `• ${item.title}${siteTag}`;
    if (item.details && item.details.trim()) {
      text += `\n  - ${item.details.trim()}`;
    }
    handleCopyText(text, '업무 내용');
  };

  // 요일별 전체 업무 복사 헬퍼
  const handleCopyDayLogs = (e, day) => {
    e.stopPropagation();
    if (!day.logs || day.logs.length === 0) {
      if (onTriggerToast) {
        onTriggerToast('해당 요일에 등록된 업무가 없습니다.', 'warning');
      } else {
        alert('해당 요일에 등록된 업무가 없습니다.');
      }
      return;
    }
    let text = '';
    day.logs.forEach((item, idx) => {
      const siteLoc = item.siteLocation || item.siteAddress || item.location || '';
      const isTrip = item.category === '출장 업무' || item.siteName || siteLoc;
      const siteTag = isTrip ? ` [출장] ${item.siteName || ''}${siteLoc ? ` (${siteLoc})` : ''}` : '';
      text += `${idx + 1}. ${item.title}${siteTag}\n`;
      if (item.details && item.details.trim()) {
        text += `   ${item.details.trim().replace(/\n/g, '\n   ')}\n`;
      }
    });
    handleCopyText(text.trim(), `${day.dayLabel}요일 업무 전체`);
  };

  // Group daily trip logs by site
  const dailyTripGroupedBySite = {};
  dailyTripLogs.forEach(log => {
    const siteKey = (log.siteName || log.site_name || '기타 사업장').trim();
    if (!dailyTripGroupedBySite[siteKey]) dailyTripGroupedBySite[siteKey] = [];
    dailyTripGroupedBySite[siteKey].push(log);
  });

  // Group daily internal authors (처음 등록된 작업의 담당자 기준)
  let dailyInternalAuthorsText = '담당자 미지정';
  if (dailyInternalLogs.length > 0) {
    const sortedInternal = [...dailyInternalLogs].sort((a, b) => {
      const timeA = a.createdAt || '';
      const timeB = b.createdAt || '';
      return timeA.localeCompare(timeB);
    });
    const firstLog = sortedInternal[0];
    const a = firstLog.authorName || firstLog.name || '';
    const tm = firstLog.authorTeam || firstLog.team || '';
    const rk = firstLog.authorRank || firstLog.rank || '';
    let nameLabel = a;
    if (rk && !nameLabel.includes(rk)) nameLabel += ` ${rk}`;
    if (tm && !nameLabel.includes(tm)) nameLabel += ` (${tm})`;
    dailyInternalAuthorsText = nameLabel || '담당자 미지정';
  }

  const generateDailyReportText = () => {
    const reportTitle = isTomorrow
      ? `[ 내일 예정 업무 일지 ]`
      : (isFuture ? `[ ${getFormattedKoreanDate(dailyDate)} 예정 업무 일지 ]` : `[ 일일 업무 일지 ]`);

    let t = `${reportTitle}\n`;
    t += `• ${isFuture ? '예정 일자' : '보고 일자'}: ${getFormattedKoreanDate(dailyDate)}${isFuture ? ' (예정)' : ''}\n`;

    t += `\n사내 업무${isFuture ? ' (예정)' : ''}\n`;
    if (dailyInternalLogs.length === 0) {
      t += `  - 사내 ${isFuture ? '예정 ' : ''}업무 기록 없음\n`;
    } else {
      dailyInternalLogs.forEach((l, i) => {
        const shareTag = l.isShared ? ` [공유중${l.sharedWith?.length ? `: ${l.sharedWith.length}명` : ''}]` : '';
        t += ` ${i + 1}. ${l.title}${shareTag}\n`;
        if (l.details && l.details.trim()) {
          const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            t += `    ${line.trim()}\n`;
          });
        }
      });
    }

    t += `\n출장 및 현장 지원${isFuture ? ' (예정)' : ''}\n`;
    const siteKeys = Object.keys(dailyTripGroupedBySite);
    if (siteKeys.length === 0) {
      t += `  - 출장 ${isFuture ? '예정 ' : ''}업무 기록 없음\n`;
    } else {
      siteKeys.forEach((siteKey, siteIdx) => {
        const siteLogs = dailyTripGroupedBySite[siteKey];
        t += `  > 출장지: ${siteKey}\n`;
        siteLogs.forEach((l, taskIdx) => {
          const shareTag = l.isShared ? ` [공유중${l.sharedWith?.length ? `: ${l.sharedWith.length}명` : ''}]` : '';
          t += ` ${taskIdx + 1}. ${l.title}${shareTag}\n`;
          if (l.details && l.details.trim()) {
            const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
            lines.forEach(line => {
              t += `    ${line.trim()}\n`;
            });
          }
        });
        if (siteIdx < siteKeys.length - 1) t += `\n`;
      });
    }

    // 오늘 업무 보고서 작성 시 내일 예정 업무가 있으면 자동으로 하단에 첨부
    if (isToday && tomorrowOwnLogs.length > 0) {
      t += `\n----------------------------------------\n`;
      t += `📌 [ 내일 예정 업무 (${tomorrowInitialGroups.length}건) ]\n`;
      tomorrowOwnLogs.forEach((tl, ti) => {
        const siteLoc = tl.siteLocation || tl.siteAddress || tl.location || '';
        const isTrip = tl.category === '출장 업무' || tl.siteName || siteLoc;
        const siteTag = isTrip ? ` [출장] ${tl.siteName || ''}${siteLoc ? ` (${siteLoc})` : ''}` : '';
        t += `  ${ti + 1}. ${tl.title}${siteTag}\n`;
        if (tl.details && tl.details.trim()) {
          t += `     ${tl.details.trim()}\n`;
        }
      });
    }

    return t;
  };

  const generateWeeklyReportText = () => {
    let t = `[ 주간 업무 일지 ]\n`;
    t += `• ${getWeekText(weeklyMonday)} (${weeklyRange.monIso} ~ ${weeklyRange.sunIso})\n`;

    const custom = currentWeeklyCustom;

    t += `1. 주요 내용\n`;
    if (custom.mainTasks && custom.mainTasks.trim()) {
      t += `  ${custom.mainTasks.trim()}\n\n`;
    } else {
      t += `  - 해당 내역 없음\n\n`;
    }

    t += `2. 정보 공유\n`;
    if (custom.infoSharing && custom.infoSharing.trim()) {
      t += `  ${custom.infoSharing.trim()}\n\n`;
    } else {
      t += `  - 해당 내역 없음\n\n`;
    }

    t += `3. 업무 지원\n`;
    if (custom.teamCoop && custom.teamCoop.trim()) {
      t += `  ${custom.teamCoop.trim()}\n\n`;
    } else {
      t += `  - 해당 내역 없음\n\n`;
    }

    t += `4. 기타 업무\n`;
    if (custom.etcTasks && custom.etcTasks.trim()) {
      t += `  ${custom.etcTasks.trim()}\n\n`;
    } else {
      t += `  - 해당 내역 없음\n\n`;
    }

    return t;
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', paddingBottom: '30px' }}>

      {/* Top Main Banner */}
      <div className="glass-panel" style={{
        padding: '14px 18px',
        borderRadius: '6px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
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
            <FileSpreadsheet size={22} />
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
            업무 정리 보고서
          </div>
        </div>
      </div>

      {/* Vertical Stack Layout (Top: Daily Report, Bottom: Weekly Report) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%'
      }}>

        {/* ========================================================================= */}
        {/* TOP: 일일 업무 보고서 (Unified Daily Report Card - Fixed Height & Scrollable) */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{
          padding: '16px 18px',
          borderRadius: '6px',
          border: '1.5px solid #cbd5e1',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          minWidth: 0,
          height: isMobile ? '520px' : '600px',
          boxSizing: 'border-box'
        }}>
          {/* Header Bar Row */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {/* Row 1: Title (Icon + 일일 업무 / 내일 예정 업무) on Left, Action Buttons (복사, 공유) on Right */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '6px',
                    background: '#475569',
                    border: '1.5px solid #475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(71, 85, 105, 0.2)',
                    flexShrink: 0
                  }}>
                    <CalendarDays size={20} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {isTomorrow ? '내일 업무' : (isFuture ? '예정 업무' : '일일 업무')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Copy & Share */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generateDailyReportText(), isFuture ? '예정 업무 보고서' : '일일 업무 일지')}
                    style={{
                      background: '#eff6ff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)'
                    }}
                    title="업무 보고서 텍스트 복사"
                  >
                    <Copy size={13} />
                  </button>
                  {isNative && (
                    <button
                      type="button"
                      onClick={() => handleShareText(generateDailyReportText(), isFuture ? '예정 업무 보고서' : '일일 업무 일지')}
                      style={{
                        background: isFuture ? '#ea580c' : '#1e3a8a',
                        border: isFuture ? '1.5px solid #ea580c' : '1.5px solid #1e3a8a',
                        color: '#ffffff',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)'
                      }}
                      title="업무 보고서 공유 (카카오톡, 메신저 등)"
                    >
                      <Share2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Daily Date Controller & Quick Today/Tomorrow Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                    title="이전일"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div
                    onClick={() => {
                      if (dailyDateInputRef.current) {
                        if (typeof dailyDateInputRef.current.showPicker === 'function') {
                          dailyDateInputRef.current.showPicker();
                        } else {
                          dailyDateInputRef.current.focus();
                          dailyDateInputRef.current.click();
                        }
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '2px',
                      userSelect: 'none'
                    }}
                    title="클릭하여 달력에서 날짜 선택"
                  >
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {getFormattedKoreanDate(dailyDate)}
                    </span>
                    <input
                      ref={dailyDateInputRef}
                      type="date"
                      value={dailyDate}
                      onChange={(e) => e.target.value && setDailyDate(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        pointerEvents: 'none',
                        border: 'none',
                        outline: 'none',
                        padding: 0,
                        margin: 0
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleNextDay}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                    title="다음일"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Quick Date Switcher Button (오늘) */}
                <div style={{ display: 'flex', width: '100%' }}>
                  <button
                    type="button"
                    onClick={handleToday}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '800',
                      border: isToday ? '1.5px solid #1e3a8a' : '1px solid #cbd5e1',
                      background: isToday ? 'rgba(30, 58, 138, 0.08)' : '#ffffff',
                      color: isToday ? '#1e3a8a' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    오늘 일일 업무
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Web Browser Mode: Current Horizontal Layout Preserved */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  background: '#475569',
                  border: '1.5px solid #475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(71, 85, 105, 0.2)',
                  flexShrink: 0
                }}>
                  <CalendarDays size={22} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {isTomorrow ? '내일 업무' : (isFuture ? '예정 업무' : '일일 업무')}
                  </span>
                </div>

                {/* Daily Date Controller (Right next to 일일 업무) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    title="이전일"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div
                    onClick={() => {
                      if (dailyDateInputRef.current) {
                        if (typeof dailyDateInputRef.current.showPicker === 'function') {
                          dailyDateInputRef.current.showPicker();
                        } else {
                          dailyDateInputRef.current.focus();
                          dailyDateInputRef.current.click();
                        }
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '2px',
                      userSelect: 'none'
                    }}
                    title="클릭하여 달력에서 날짜 선택"
                  >
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {getFormattedKoreanDate(dailyDate)}
                    </span>
                    <input
                      ref={dailyDateInputRef}
                      type="date"
                      value={dailyDate}
                      onChange={(e) => e.target.value && setDailyDate(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        pointerEvents: 'none',
                        border: 'none',
                        outline: 'none',
                        padding: 0,
                        margin: 0
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleNextDay}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    title="다음일"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Quick Date Switcher Button (오늘) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleToday}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '800',
                      border: isToday ? '1.5px solid #1e3a8a' : '1px solid #cbd5e1',
                      background: isToday ? 'rgba(30, 58, 138, 0.08)' : '#ffffff',
                      color: isToday ? '#1e3a8a' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    오늘
                  </button>
                </div>

                {/* Action Buttons: Copy (placed directly right of 오늘 button) & Share */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generateDailyReportText(), isFuture ? '예정 업무 보고서' : '일일 업무 일지')}
                    style={{
                      background: '#eff6ff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                    }}
                    title="일일 업무 보고서 텍스트 복사"
                  >
                    <Copy size={13} />
                  </button>
                  {isNative && (
                    <button
                      type="button"
                      onClick={() => handleShareText(generateDailyReportText(), isFuture ? '예정 업무 보고서' : '일일 업무 일지')}
                      style={{
                        background: '#1e3a8a',
                        border: '1.5px solid #1e3a8a',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)'
                      }}
                      title="업무 보고서 공유 (카카오톡, 메신저 등)"
                    >
                      <Share2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Daily Content Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {dailyOwnLogs.length === 0 && dailySharedReceivedLogs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#0f172a' }}>
                <Clock size={32} color="#0f172a" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                  {isFuture ? '선택일자에 등록된 예정 업무가 없습니다.' : '선택일자에 등록된 업무 기록이 없습니다.'}
                </div>
              </div>
            ) : (
              <>
                {/* Daily Content Grid: Split into Left (Own Internal/Trip Tasks) & Right (Shared Tasks) */}
                <div
                  className="work-summary-responsive-grid"
                  style={{
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '14px',
                    alignItems: 'start',
                    width: '100%'
                  }}
                >
                  {/* LEFT: 사내 업무 & 출장 및 현장 지원 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                    {/* Section 1: 사내 업무 보고 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                          사내 업무
                        </div>
                      </div>

                      {dailyInternalLogs.length === 0 ? (
                        <div style={{ paddingLeft: '6px' }}>
                          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '13px 15px', fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>
                            - 해당 내역 없음
                          </div>
                        </div>
                      ) : (
                        <div style={{ paddingLeft: '6px' }}>
                          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '13px 15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {dailyInternalLogs.map((item, idx) => (
                                <div key={item.id || idx} style={{ paddingLeft: '4px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '14px' }}>{idx + 1}.</span>
                                    <span>{item.title}</span>
                                    {item.isShared && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10.5px',
                                        fontWeight: '800',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1.5px solid #6ee7b7'
                                      }}>
                                        <Share2 size={11} color="#059669" />
                                        공유중
                                      </span>
                                    )}
                                  </div>
                                  {item.details && (
                                    <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '5px', paddingLeft: '18px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                      {item.details}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 2: 출장 업무 보고 (사업장별 그룹화 & 출장자 통합) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                        출장 및 현장 지원
                      </div>

                      {dailyTripLogs.length === 0 ? (
                        <div style={{ paddingLeft: '6px' }}>
                          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '13px 15px', fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>
                            - 해당 내역 없음
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '6px' }}>
                          {Object.keys(dailyTripGroupedBySite).map((siteKey, sIdx) => {
                            const siteLogs = dailyTripGroupedBySite[siteKey];

                            return (
                              <div key={siteKey || sIdx} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '13px 15px' }}>
                                {/* Site Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '800', background: '#f1f5f9', border: '1.5px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px' }}>
                                      {siteKey}
                                    </span>
                                  </div>
                                </div>

                                {/* Task Items under this Site */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {siteLogs.map((item, tIdx) => (
                                    <div key={item.id || tIdx} style={{ paddingLeft: '4px' }}>
                                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '14px' }}>{tIdx + 1}.</span>
                                        <span>{item.title}</span>
                                        {item.isShared && (
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            padding: '2px 7px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            background: '#ecfdf5',
                                            color: '#047857',
                                            border: '1.5px solid #6ee7b7'
                                          }}>
                                            <Share2 size={11} color="#059669" />
                                            공유중
                                          </span>
                                        )}
                                      </div>
                                      {item.details && (
                                        <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '5px', paddingLeft: '18px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                          {item.details}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section: 오늘 일일 업무 화면일 때 내일 예정 업무 박스 (왼쪽 컬럼 정렬) */}
                    {isToday && (
                      <div style={{ paddingLeft: '6px', marginTop: '6px' }}>
                        <div style={{
                          padding: '13px 15px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                              <span>📅 내일 예정 업무</span>
                            </div>
                          </div>

                          {tomorrowOwnLogs.length === 0 ? (
                            <div style={{ fontSize: '12.5px', color: '#64748b', padding: '6px 2px' }}>
                              내일 등록된 예정 업무가 없습니다.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {tomorrowOwnLogs.slice(0, 5).map((tl, ti) => {
                                const siteLoc = tl.siteLocation || tl.siteAddress || tl.location || '';
                                const isTrip = tl.category === '출장 업무' || tl.siteName || siteLoc;
                                return (
                                  <div key={tl.id || ti} style={{ fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#0f172a', fontWeight: '800' }}>•</span>
                                    <span style={{ fontWeight: '700' }}>{tl.title}</span>
                                    {isTrip && (
                                      <>
                                        <span style={{
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          fontSize: '10.5px',
                                          fontWeight: '800',
                                          background: '#ede9fe',
                                          color: '#6d28d9',
                                          border: '1px solid #ddd6fe'
                                        }}>
                                          출장
                                        </span>
                                        <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: '700' }}>
                                          {tl.siteName || ''}
                                          {siteLoc ? ` (${siteLoc})` : ''}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                              {tomorrowOwnLogs.length > 5 && (
                                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', paddingLeft: '10px' }}>
                                  외 {tomorrowOwnLogs.length - 5}건
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: 공유받은 업무 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      borderLeft: '3px solid #2563eb',
                      paddingLeft: '8px'
                    }}>
                      <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Share2 size={16} color="#2563eb" />
                        <span>공유받은 업무 ({Object.keys(dailySharedGroupedByAuthor).length}건)</span>
                      </div>
                      {Object.keys(dailySharedGroupedByAuthor).length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleAllDailySharedCards(true)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '5px',
                              padding: '3px 7px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                            title="모든 공유 카드 접기"
                          >
                            모두 접기
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAllDailySharedCards(false)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '5px',
                              padding: '3px 7px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#0f172a',
                              cursor: 'pointer'
                            }}
                            title="모든 공유 카드 펼치기"
                          >
                            모두 펼치기
                          </button>
                        </div>
                      )}
                    </div>

                    {dailySharedReceivedLogs.length === 0 ? (
                      <div style={{ paddingLeft: '4px' }}>
                        <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '11px 14px', fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>
                          - 공유받은 내역 없음
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' }}>
                        {Object.keys(dailySharedGroupedByAuthor).map((authorKey, gIdx) => {
                          const group = dailySharedGroupedByAuthor[authorKey];
                          const cardKey = authorKey || `daily-shared-${gIdx}`;
                          const isCollapsed = collapsedDailySharedCards[cardKey] !== false;

                          return (
                            <div
                              key={cardKey}
                              style={{
                                background: '#f8fafc',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: isCollapsed ? '0px' : '10px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {/* Author Header (클릭 시 접기/펼치기 토글) */}
                              <div
                                onClick={() => toggleDailySharedCard(cardKey)}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '8px',
                                  borderBottom: isCollapsed ? 'none' : '1.5px solid #e2e8f0',
                                  paddingBottom: isCollapsed ? '0px' : '8px',
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}
                                title={isCollapsed ? '클릭하여 내용 펼치기' : '클릭하여 내용 접기'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                    👤 공유자: <strong style={{ color: '#0f172a', marginLeft: '2px' }}>{group.authorLabel}</strong>
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontSize: '11.5px',
                                    fontWeight: '800',
                                    background: isCollapsed ? '#ffffff' : '#f1f5f9',
                                    color: '#0f172a',
                                    border: '1px solid #cbd5e1',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    {isCollapsed ? (
                                      <><ChevronDown size={14} /></>
                                    ) : (
                                      <><ChevronUp size={14} /></>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Items under this Author (펼쳐졌을 때만 렌더링) */}
                              {!isCollapsed && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                                  {[...group.items]
                                    .sort((a, b) => {
                                      const isATrip = a.category === '출장 업무' || Boolean(a.siteName || a.siteLocation || a.location);
                                      const isBTrip = b.category === '출장 업무' || Boolean(b.siteName || b.siteLocation || b.location);
                                      if (isATrip && !isBTrip) return -1; // 출장 업무 최상단 정렬
                                      if (!isATrip && isBTrip) return 1;
                                      return (a.createdAt || a.id || '').localeCompare(b.createdAt || b.id || '');
                                    })
                                    .map((item, idx) => {
                                      const siteLoc = item.siteLocation || item.siteAddress || item.location || '';
                                      return (
                                        <div key={item.id || idx} style={{ paddingLeft: '2px' }}>
                                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', flexWrap: 'wrap' }}>
                                            <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '14px' }}>{idx + 1}.</span>
                                            <span>{item.title}</span>
                                            {(item.category === '출장 업무' || item.siteName || siteLoc) && (
                                              <>
                                                <span style={{
                                                  padding: '1px 6px',
                                                  borderRadius: '4px',
                                                  fontSize: '10.5px',
                                                  fontWeight: '800',
                                                  background: '#ede9fe',
                                                  color: '#6d28d9',
                                                  border: '1px solid #ddd6fe'
                                                }}>
                                                  출장
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>
                                                  {item.siteName || ''}
                                                  {siteLoc ? ` (${siteLoc})` : ''}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          {item.details && (
                                            <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', paddingLeft: '18px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                              {item.details}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: 주간 업무 보고서 (Unified Weekly Report Card) */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{
          padding: '16px 18px',
          borderRadius: '6px',
          border: '1.5px solid #cbd5e1',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flex: 1,
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          minWidth: 0
        }}>
          {/* Header Bar Row */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {/* Row 1: Title (Icon + 주간 업무) on Left, Action Buttons (복사, 공유) on Right */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '6px',
                    background: '#475569',
                    border: '1.5px solid #475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(71, 85, 105, 0.2)',
                    flexShrink: 0
                  }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    주간 업무
                  </div>
                </div>

                {/* Action Button: In-App Share */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* 사내 사용자 주간 업무 공유 버튼 (인앱 공유) */}
                  <button
                    type="button"
                    onClick={handleOpenWeeklyShareModal}
                    style={{
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      color: '#047857',
                      padding: '7px 11px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(5, 150, 105, 0.1)'
                    }}
                    title="주간 업무를 사내 동료에게 공유하기"
                  >
                    <Users size={13} color="#059669" />
                    <span>사내 공유</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Week Controller + Date Range outside */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                boxSizing: 'border-box',
                gap: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  padding: '5px 8px',
                  borderRadius: '6px'
                }}>
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    title="이전주"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {getWeekText(weeklyMonday)}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextWeek}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    title="다음주"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>
                  ({weeklyRange.monIso.slice(2)} ~ {weeklyRange.sunIso.slice(2)})
                </span>
              </div>
            </div>
          ) : (
            /* Web Browser Mode: Current Horizontal Layout Preserved */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  background: '#475569',
                  border: '1.5px solid #475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(71, 85, 105, 0.2)',
                  flexShrink: 0
                }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  주간 업무
                </div>

                {/* Week Controls (Right next to 주간 업무) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    title="이전주"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', padding: '0 2px', whiteSpace: 'nowrap' }}>
                    {getWeekText(weeklyMonday)}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextWeek}
                    style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                    title="다음주"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Date Range outside the box */}
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {weeklyRange.monIso.slice(2)} ~ {weeklyRange.sunIso.slice(2)}
                </span>
              </div>

              {/* Action Button: In-App Share */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* 사내 사용자 주간 업무 공유 버튼 (인앱 공유) */}
                <button
                  type="button"
                  onClick={handleOpenWeeklyShareModal}
                  style={{
                    background: '#ecfdf5',
                    border: '1.5px solid #a7f3d0',
                    color: '#047857',
                    padding: '7px 11px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.1)'
                  }}
                  title="주간 업무를 사내 동료에게 공유하기"
                >
                  <Users size={13} color="#059669" />
                  <span>사내 공유</span>
                </button>
              </div>
            </div>
          )}

          {/* Top 5 Workday Cards: 월~금요일 일일 업무 현황 카드 (5열 그리드) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(5, 1fr)',
            gap: '10px',
            width: '100%',
            marginBottom: '4px'
          }}>
            {weeklyWorkDays.map((day) => {
              const isCurrentSelected = day.iso === dailyDate;
              return (
                <div
                  key={day.iso}
                  onClick={() => setDailyDate(day.iso)}
                  style={{
                    background: day.isToday ? '#eff6ff' : '#f8fafc',
                    border: isCurrentSelected
                      ? '2px solid #1e3a8a'
                      : (day.isToday ? '1.5px solid #93c5fd' : '1.5px solid #cbd5e1'),
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrentSelected ? '0 2px 10px rgba(30, 58, 138, 0.15)' : 'none',
                    minHeight: '120px'
                  }}
                  title={`${day.dayLabel}요일(${day.shortDate}) 일일 업무로 이동`}
                >
                  {/* Day Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(203, 213, 225, 0.8)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: day.isToday ? '#1e3a8a' : '#0f172a'
                      }}>
                        {day.dayLabel} ({day.shortDate})
                      </span>
                      {day.isToday && (
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: '800',
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '1px 4px',
                          borderRadius: '4px'
                        }}>
                          오늘
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {day.totalCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyDayLogs(e, day)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1e40af',
                            borderRadius: '4px',
                            padding: '1.5px 5px',
                            fontSize: '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            lineHeight: '1'
                          }}
                          title={`${day.dayLabel}요일 업무 전체 복사`}
                        >
                          <Copy size={9.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day Task List Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    {day.logs.length === 0 ? (
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '6px 2px' }}>
                        - 등록된 업무 없음
                      </div>
                    ) : (
                      day.logs.slice(0, 4).map((item, idx) => (
                        <div key={item.id || idx} style={{
                          fontSize: '12px',
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px',
                          lineHeight: '1.3',
                          padding: '1px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>•</span>
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: '700'
                            }} title={item.title}>
                              {item.title}
                            </span>
                            {item.category === '출장 업무' && (
                              <span style={{
                                fontSize: '9.5px',
                                fontWeight: '800',
                                background: '#ede9fe',
                                color: '#6d28d9',
                                padding: '0 4px',
                                borderRadius: '3px',
                                flexShrink: 0
                              }}>
                                출장
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCopySingleItem(e, item)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              borderRadius: '3px',
                              padding: '1px 4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              flexShrink: 0,
                              lineHeight: '1'
                            }}
                            title="이 업무 상세 내용 복사"
                          >
                            <Copy size={9} />
                          </button>
                        </div>
                      ))
                    )}
                    {day.logs.length > 4 && (
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', paddingLeft: '6px' }}>
                        +{day.logs.length - 4}건 더보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly Content Grid: Split into Left (Own Weekly Tasks) & Right (Shared Weekly Tasks) */}
          <div
            className="work-summary-responsive-grid"
            style={{
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '14px',
              alignItems: 'start',
              width: '100%',
              marginTop: '6px'
            }}
          >
            {/* LEFT: 직접 입력 주간 업무 보고 (1. 주요 내용, 2. 정보 공유, 3. 업무 지원, 4. 기타 업무) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

              {/* 주간 업무 보고 헤더 바 (저장, 복사, 다른 앱 공유 버튼 통합) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '2px',
                flexWrap: 'wrap'
              }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                  <FileText size={17} color="#0f172a" />
                  <span>주간 업무 보고</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* 저장 버튼 (수정사항이 있을 때만 활성화) */}
                  <button
                    type="button"
                    disabled={!isWeeklyDirty}
                    onClick={handleSaveWeeklyCustomReport}
                    style={{
                      background: isWeeklyDirty ? '#ecfdf5' : '#f1f5f9',
                      border: isWeeklyDirty ? '1.5px solid #a7f3d0' : '1.5px solid #cbd5e1',
                      color: isWeeklyDirty ? '#047857' : '#94a3b8',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: isWeeklyDirty ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: isWeeklyDirty ? 1 : 0.7,
                      transition: 'all 0.2s ease',
                      boxShadow: isWeeklyDirty ? '0 2px 6px rgba(5, 150, 105, 0.15)' : 'none'
                    }}
                    title={isWeeklyDirty ? '주간 업무 보고 내용 저장' : '수정된 내용이 없습니다'}
                  >
                    <Save size={13} color={isWeeklyDirty ? '#059669' : '#94a3b8'} />
                    <span>저장</span>
                  </button>

                  {/* 텍스트 복사 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleCopyText(generateWeeklyReportText(), '주간 업무 보고서')}
                    style={{
                      background: '#eff6ff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)'
                    }}
                    title="주간 업무 보고서 텍스트 복사"
                  >
                    <Copy size={13} />
                  </button>

                  {/* 다른 앱 공유 버튼 (네이티브 모바일 환경) */}
                  {isNative && (
                    <button
                      type="button"
                      onClick={() => handleShareText(generateWeeklyReportText(), '주간 업무 보고서')}
                      style={{
                        background: '#1e3a8a',
                        border: '1.5px solid #1e3a8a',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)'
                      }}
                      title="주간 업무 보고서 공유 (카카오톡, 메신저 등)"
                    >
                      <Share2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* 1. 주요 내용 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
                  <span>1. 주요 내용</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px' }}>
                  <textarea
                    ref={mainTasksRef}
                    className="borderless-textarea"
                    value={currentWeeklyCustom.mainTasks}
                    onInput={(e) => autoResizeTextarea(e.target)}
                    onChange={(e) => {
                      handleWeeklyCustomChange('mainTasks', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    placeholder="이번 주 핵심 업무 내용을 입력하세요."
                    rows={4}
                    style={{
                      width: '100%',
                      minHeight: '70px',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      background: 'transparent',
                      resize: 'none',
                      overflow: 'hidden',
                      fontSize: '13.5px',
                      color: '#0f172a',
                      lineHeight: '1.6',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* 2. 정보 공유 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
                  <span>2. 정보 공유</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px' }}>
                  <textarea
                    ref={infoSharingRef}
                    className="borderless-textarea"
                    value={currentWeeklyCustom.infoSharing}
                    onInput={(e) => autoResizeTextarea(e.target)}
                    onChange={(e) => {
                      handleWeeklyCustomChange('infoSharing', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    placeholder="예) ISO 내부심사 : 2026.08.19"
                    rows={2}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      background: 'transparent',
                      resize: 'none',
                      overflow: 'hidden',
                      fontSize: '13.5px',
                      color: '#0f172a',
                      lineHeight: '1.5',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* 3. 업무 지원 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
                  <span>3. 업무 지원</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px' }}>
                  <textarea
                    ref={teamCoopRef}
                    className="borderless-textarea"
                    value={currentWeeklyCustom.teamCoop}
                    onInput={(e) => autoResizeTextarea(e.target)}
                    onChange={(e) => {
                      handleWeeklyCustomChange('teamCoop', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    placeholder="예) 영업팀 지원 : SEC 평택 장비 납품"
                    rows={2}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      background: 'transparent',
                      resize: 'none',
                      overflow: 'hidden',
                      fontSize: '13.5px',
                      color: '#0f172a',
                      lineHeight: '1.5',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* 4. 기타 업무 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
                  <span>4. 기타 업무</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px' }}>
                  <textarea
                    ref={etcTasksRef}
                    className="borderless-textarea"
                    value={currentWeeklyCustom.etcTasks}
                    onInput={(e) => autoResizeTextarea(e.target)}
                    onChange={(e) => {
                      handleWeeklyCustomChange('etcTasks', e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    placeholder="예) 업무 전&후 TBM 진행"
                    rows={2}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      background: 'transparent',
                      resize: 'none',
                      overflow: 'hidden',
                      fontSize: '13.5px',
                      color: '#0f172a',
                      lineHeight: '1.5',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

            </div>

            {/* RIGHT: 2. 주간 공유받은 업무 실적 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                borderLeft: '3px solid #2563eb',
                paddingLeft: '8px'
              }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={16} color="#2563eb" />
                  <span>주간 업무 공유 ({receivedWeeklyCustomReports.length}건)</span>
                </div>
                {receivedWeeklyCustomReports.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAllSharedCards(true)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                      title="모든 공유 카드 접기"
                    >
                      모두 접기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllSharedCards(false)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                      title="모든 공유 카드 펼치기"
                    >
                      모두 펼치기
                    </button>
                  </div>
                )}
              </div>

              {receivedWeeklyCustomReports.length === 0 ? (
                <div style={{ paddingLeft: '4px' }}>
                  <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '11px 14px', fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>
                    - 공유받은 내역 없음
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' }}>
                  {/* 공유받은 주간 보고서 카드 (1. 주요 내용, 2. 정보 공유, 3. 업무 지원, 4. 기타 업무) */}
                  {receivedWeeklyCustomReports.map((rep, rIdx) => {
                    const authorLabel = `${rep.authorName || '동료'}${rep.authorRank ? ` ${rep.authorRank}` : ''}${rep.authorTeam ? ` (${formatOnlyTeam(rep.authorTeam)})` : ''}`;
                    const cardKey = rep.id || `shared-rep-${rIdx}`;
                    const isCollapsed = collapsedSharedCards[cardKey] !== false;

                    const hasMain = Boolean(rep.mainTasks && rep.mainTasks.trim());
                    const hasInfo = Boolean(rep.infoSharing && rep.infoSharing.trim());
                    const hasTeam = Boolean(rep.teamCoop && rep.teamCoop.trim());
                    const hasEtc = Boolean(rep.etcTasks && rep.etcTasks.trim());

                    return (
                      <div key={cardKey} style={{
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isCollapsed ? '0px' : '10px',
                        transition: 'all 0.2s ease'
                      }}>
                        {/* Author Header (클릭 시 접기/펼치기 토글) */}
                        <div
                          onClick={() => toggleSharedCard(cardKey)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                            borderBottom: isCollapsed ? 'none' : '1.5px solid #e2e8f0',
                            paddingBottom: isCollapsed ? '0px' : '8px',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                          title={isCollapsed ? '클릭하여 내용 펼치기' : '클릭하여 내용 접기'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              👤 공유자: <strong style={{ color: '#0f172a' }}>{authorLabel}</strong>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: '800',
                              background: isCollapsed ? '#ffffff' : '#f1f5f9',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {isCollapsed ? (
                                <><ChevronDown size={14} /></>
                              ) : (
                                <><ChevronUp size={14} /></>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* 4 Custom Sections inside Shared Card (펼쳐졌을 때만 렌더링) */}
                        {!isCollapsed && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* 1. 주요 내용 */}
                            {hasMain && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                                  1. 주요 내용
                                </div>
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                  {rep.mainTasks}
                                </div>
                              </div>
                            )}

                            {/* 2. 정보 공유 */}
                            {hasInfo && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                                  2. 정보 공유
                                </div>
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                  {rep.infoSharing}
                                </div>
                              </div>
                            )}

                            {/* 3. 업무 지원 */}
                            {hasTeam && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                                  3. 업무 지원
                                </div>
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                  {rep.teamCoop}
                                </div>
                              </div>
                            )}

                            {/* 4. 기타 업무 */}
                            {hasEtc && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                                  4. 기타 업무
                                </div>
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                  {rep.etcTasks}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 주간 업무 사내 공유 대상 지정 모달 (In-App Weekly Share Modal) */}
      {/* ========================================================================= */}
      {isWeeklyShareModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 10px 15px -3px rgba(15, 23, 42, 0.15)',
            overflow: 'hidden',
            border: '2px solid #94a3b8'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: '#ecfdf5',
                  border: '1.5px solid #6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    주간 업무 공유
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    {getWeekText(weeklyMonday)} ({weeklyRange.monIso.slice(2)} ~ {weeklyRange.sunIso.slice(2)})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWeeklyShareModalOpen(false)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #94a3b8',
                  borderRadius: '6px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
              {/* Search & Quick Controls */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1.5px solid #94a3b8',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  gap: '8px'
                }}>
                  <Search size={14} color="#64748b" />
                  <input
                    type="text"
                    className="borderless-input"
                    value={weeklyShareSearchQuery}
                    onChange={(e) => setWeeklyShareSearchQuery(e.target.value)}
                    placeholder="이름, 소속팀, 직급으로 검색"
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '12.5px',
                      width: '100%',
                      color: '#0f172a'
                    }}
                  />
                  {weeklyShareSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWeeklyShareSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllWeeklyShareTargets}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    border: '1.5px solid #60a5fa',
                    color: '#1d4ed8',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  전체 선택
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllWeeklyShareTargets}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1.5px solid #94a3b8',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  선택 해제
                </button>
              </div>

              {/* Status Indicator */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 12px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#334155'
              }}>
                <span>선택된 대상자: <strong style={{ color: '#047857', fontWeight: '800' }}>{weeklyShareTargets.length}명</strong></span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>내 소속: {currentUser?.division ? `${currentUser.division} ` : ''}{currentUser?.team || currentUser?.department || '미지정'}</span>
              </div>

              {/* User List (같은 소속 인원만 필터링) */}
              {(() => {
                const sameTeamFiltered = allUsers.filter(u => {
                  if (isSamePerson(currentUser, u)) return false; // 본인 제외
                  if (!isSameTeamUser(u, currentUser)) return false; // 같은 소속 인원만 필터링
                  if (!weeklyShareSearchQuery.trim()) return true;
                  const q = weeklyShareSearchQuery.toLowerCase();
                  const n = (u.name || '').toLowerCase();
                  const t = (u.team || u.department || '').toLowerCase();
                  const r = (u.rank || '').toLowerCase();
                  return n.includes(q) || t.includes(q) || r.includes(q);
                });

                if (sameTeamFiltered.length === 0) {
                  return (
                    <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      {weeklyShareSearchQuery.trim() ? '검색 조건과 일치하는 같은 소속 인원이 없습니다.' : '등록된 같은 소속 동료가 없습니다.'}
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {sameTeamFiltered.map((user) => {
                      const isSelected = weeklyShareTargets.some(t => isSamePerson(t, user));
                      const uKey = user.username || user.id || `${user.name}_${user.rank}_${user.team}`;

                      return (
                        <div
                          key={uKey}
                          onClick={() => handleToggleWeeklyShareTarget(user)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #059669' : '1.5px solid #94a3b8',
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 1px 3px rgba(5, 150, 105, 0.12)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              border: isSelected ? '1.5px solid #059669' : '1.5px solid #cbd5e1',
                              background: isSelected ? '#059669' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff'
                            }}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                              <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                                {user.name}
                              </span>
                              {user.rank && (
                                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px', fontWeight: '700' }}>
                                  {user.rank}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {user.division ? `${user.division} · ` : ''}{user.team || user.department || '소속 미지정'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1.5px solid #cbd5e1',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setIsWeeklyShareModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1.5px solid #94a3b8',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmWeeklyShare}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={14} />
                <span>공유등록</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 주간 업무 미저장 수정사항 안내 모달 (Unsaved Changes Confirmation Modal) */}
      {/* ========================================================================= */}
      {isUnsavedPromptOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '2px solid #94a3b8'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1.5px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#fff7ed',
                border: '1.5px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea580c'
              }}>
                <Save size={17} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                주간 업무 저장 안내
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', fontWeight: '600' }}>
                주간 업무 보고에 아직 저장되지 않은 수정사항이 있습니다.
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1.5px solid #cbd5e1',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              background: '#f8fafc',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={handleCancelNavigate}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDiscardAndNavigate}
                style={{
                  padding: '8px 13px',
                  borderRadius: '6px',
                  border: '1.5px solid #94a3b8',
                  background: '#ffffff',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                저장 안 함
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAndNavigate}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Save size={13} />
                <span>저장 후 이동</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
