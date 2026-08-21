import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Building2,
  Car,
  User,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  FileText,
  Clock,
  Filter,
  Lock,
  ChevronLeft,
  ChevronRight,
  Copy,
  History,
  RotateCcw,
  CheckSquare,
  Square,
  Share2,
  Users,
  UserCheck
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';
import { useModalBack } from '../../services/modalBackHandler';
import WorkLogCalendar from '../common/WorkLogCalendar';

export default function WorkLogTab({ onTriggerToast }) {
  const [workLogs, setWorkLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterCategory, setFilterCategory] = useState('전체'); // '전체' | '사내 업무' | '출장 업무'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Past Work Copy Modal State
  const [isPastWorkModalOpen, setIsPastWorkModalOpen] = useState(false);
  const [pastSearchQuery, setPastSearchQuery] = useState('');
  const [pastFilterCategory, setPastFilterCategory] = useState('전체');
  const [selectedPastLogIds, setSelectedPastLogIds] = useState([]);

  // Share Target Setting State
  const [isShareTargetModalOpen, setIsShareTargetModalOpen] = useState(false);
  const [shareTargetSearchQuery, setShareTargetSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [shareTargets, setShareTargets] = useState([]); // [{ username, name, team, rank, division }]
  const [pendingShareLogItem, setPendingShareLogItem] = useState(null);

  // Drag & Drop State for Reordering Work Items
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);

  // Hook for back-button popup dismissal
  useModalBack(isModalOpen, () => setIsModalOpen(false), 'worklog-form-modal');
  useModalBack(isPastWorkModalOpen, () => setIsPastWorkModalOpen(false), 'worklog-past-modal');
  useModalBack(isShareTargetModalOpen, () => {
    setIsShareTargetModalOpen(false);
    setPendingShareLogItem(null);
  }, 'worklog-share-target-modal');

  const [editingLogId, setEditingLogId] = useState(null);
  const [extraTasks, setExtraTasks] = useState([]); // Multiple tasks state

  // Inline editing state for editing task directly inside list card
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineForm, setInlineForm] = useState({ title: '', details: '' });

  // Inline adding state for adding new task directly inside list card without modal
  const [inlineAddingCardKey, setInlineAddingCardKey] = useState(null);
  const [inlineNewForm, setInlineNewForm] = useState({ title: '', details: '' });

  // Drag & Drop Task Reorder Handlers
  const handleDragStart = (e, item) => {
    setDraggedTaskId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', item.id);
    } catch (err) {}
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskId !== targetItem.id) {
      setDragOverTaskId(targetItem.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDropTask = async (e, targetItem, groupItems) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetItem.id) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const currentList = [...groupItems];
    const sourceIdx = currentList.findIndex(t => t.id === draggedTaskId);
    const targetIdx = currentList.findIndex(t => t.id === targetItem.id);

    if (sourceIdx === -1 || targetIdx === -1) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const [moved] = currentList.splice(sourceIdx, 1);
    currentList.splice(targetIdx, 0, moved);

    const baseDate = moved.date || getTodayIsoDate();
    const updatedList = currentList.map((item, idx) => {
      const secStr = String(idx).padStart(2, '0');
      const timeStr = `${baseDate} 09:00:${secStr}`;
      return {
        ...item,
        sortOrder: idx,
        createdAt: item.createdAt ? `${item.createdAt.slice(0, 16)}:${secStr}` : timeStr
      };
    });

    setWorkLogs(prev => {
      const updatedMap = new Map(updatedList.map(u => [u.id, u]));
      return prev.map(log => updatedMap.get(log.id) || log);
    });

    setDraggedTaskId(null);
    setDragOverTaskId(null);

    try {
      for (const item of updatedList) {
        await dbService.saveWorkLog(item);
      }
      if (onTriggerToast) onTriggerToast('업무 순서가 변경되었습니다.', 'success');
    } catch (err) {
      console.warn('Reorder save error:', err);
    }
  };

  const handleStartInlineEdit = (item) => {
    setInlineAddingCardKey(null);
    setInlineEditingId(item.id);
    setInlineForm({
      title: item.title || '',
      details: item.details || ''
    });
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineForm({ title: '', details: '' });
  };

  const handleSaveInlineEdit = async (item) => {
    if (!inlineForm.title.trim()) {
      if (onTriggerToast) onTriggerToast('업무명을 입력해 주세요.', 'warning');
      return;
    }

    const updatedLogItem = {
      ...item,
      title: inlineForm.title.trim(),
      details: inlineForm.details.trim()
    };

    const updatedLogs = await dbService.saveWorkLog(updatedLogItem);
    setWorkLogs(updatedLogs);
    setInlineEditingId(null);
    setInlineForm({ title: '', details: '' });

    if (onTriggerToast) {
      onTriggerToast(`'${updatedLogItem.title}' 업무가 수정되었습니다.`, 'success');
    }
  };

  const handleStartInlineAdd = (logItem, cardKey) => {
    setInlineEditingId(null);
    setInlineAddingCardKey(cardKey);
    setInlineNewForm({ title: '', details: '' });
  };

  const handleCancelInlineAdd = () => {
    setInlineAddingCardKey(null);
    setInlineNewForm({ title: '', details: '' });
  };

  const handleSaveInlineAdd = async (primaryLog) => {
    if (!inlineNewForm.title.trim()) {
      if (onTriggerToast) onTriggerToast('추가할 업무명을 입력해 주세요.', 'warning');
      return;
    }

    const now = new Date();
    const timeStr = `${primaryLog.date || getTodayIsoDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLogItem = {
      id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      category: primaryLog.category || '사내 업무',
      date: primaryLog.date || getTodayIsoDate(),
      title: inlineNewForm.title.trim(),
      details: inlineNewForm.details.trim(),
      siteName: primaryLog.siteName || primaryLog.site_name || '',
      site_name: primaryLog.siteName || primaryLog.site_name || '',
      authorName: currentUser?.name || primaryLog.authorName || '작성자',
      authorTeam: currentUser?.team || currentUser?.department || primaryLog.authorTeam || '운영팀',
      authorRank: currentUser?.rank || primaryLog.authorRank || '대리',
      authorUsername: currentUser?.username || primaryLog.authorUsername || '',
      authorDivision: currentUser?.division || primaryLog.authorDivision || '',
      authorRole: currentUser?.role || primaryLog.authorRole || '일반',
      createdAt: timeStr
    };

    const updatedLogs = await dbService.saveWorkLog(newLogItem);
    setWorkLogs(updatedLogs);
    setInlineAddingCardKey(null);
    setInlineNewForm({ title: '', details: '' });

    if (onTriggerToast) {
      onTriggerToast(`'${newLogItem.title}' 업무가 추가되었습니다.`, 'success');
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

  // Share Target Designation Helpers
  const isUserInShareTargets = (user) => {
    return shareTargets.some(t => isSamePerson(t, user));
  };

  const handleToggleUserShareTarget = (user) => {
    if (isSamePerson(currentUser, user)) return;

    setShareTargets(prev => {
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

  const handleSelectAllShareTargets = () => {
    const targets = allUsers
      .filter(u => !isSamePerson(currentUser, u))
      .map(u => ({
        username: u.username || u.id || '',
        name: u.name || '',
        team: u.team || u.department || '',
        rank: u.rank || '',
        division: u.division || ''
      }));
    setShareTargets(targets);
  };

  const handleDeselectAllShareTargets = () => {
    setShareTargets([]);
  };

  const getUserShareTargetsStorageKey = (user) => {
    if (!user) return null;
    const uid = user.username || user.id || `${user.name || ''}_${user.rank || ''}_${user.team || ''}`;
    return `with_security_worklog_share_targets_${uid.trim()}`;
  };

  const handleSaveShareTargetModal = async () => {
    const userKey = getUserShareTargetsStorageKey(currentUser);
    if (userKey) {
      localStorage.setItem(userKey, JSON.stringify(shareTargets));
    }
    // 레거시 전역 키 삭제 (타 사용자 간 강제 동기화 방지)
    try { localStorage.removeItem('with_security_worklog_share_targets'); } catch (e) { }

    setIsShareTargetModalOpen(false);

    if (pendingShareLogItem) {
      const now = new Date();
      const timeStr = `${selectedDate} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const updatedItem = {
        ...pendingShareLogItem,
        isShared: true,
        sharedWith: shareTargets,
        sharedAt: timeStr
      };
      const updatedLogs = await dbService.saveWorkLog(updatedItem);
      setWorkLogs(updatedLogs);
      setPendingShareLogItem(null);
      if (onTriggerToast) {
        onTriggerToast(`공유 대상(${shareTargets.length}명)이 설정되었으며, '${pendingShareLogItem.title}' 업무가 공유되었습니다.`, 'success');
      }
    } else {
      if (onTriggerToast) {
        onTriggerToast(`업무 일지 공유 대상(${shareTargets.length}명)이 저장되었습니다.`, 'success');
      }
    }
  };

  // Toggle Share for a single work log item
  const handleToggleShareLog = async (item) => {
    if (item.isShared) {
      // 1. 공유 해제 시: 기존에 공유되었던 대상자 목록을 완전히 비움
      const updatedItem = {
        ...item,
        isShared: false,
        sharedWith: [],
        sharedAt: ''
      };
      const updatedLogs = await dbService.saveWorkLog(updatedItem);
      setWorkLogs(updatedLogs);
      window.dispatchEvent(new Event('with_security_data_changed'));
      if (onTriggerToast) {
        onTriggerToast(`'${item.title}' 업무 공유가 해제되었습니다.`, 'info');
      }
    } else {
      // 2. 공유 활성화 시: 현재 설정된 최신 공유 대상자 목록을 불러와서 즉시 공유
      const userKey = getUserShareTargetsStorageKey(currentUser);
      let latestTargets = shareTargets;
      if (userKey) {
        try {
          const stored = localStorage.getItem(userKey);
          if (stored) {
            latestTargets = JSON.parse(stored);
            setShareTargets(latestTargets);
          }
        } catch (e) { }
      }

      if (!latestTargets || latestTargets.length === 0) {
        if (onTriggerToast) {
          onTriggerToast('현재 설정된 공유 대상자가 없습니다. 공유할 대상을 먼저 지정해 주세요.', 'warning');
        }
        setPendingShareLogItem(item);
        setIsShareTargetModalOpen(true);
        return;
      }

      const now = new Date();
      const timeStr = `${item.date || selectedDate} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const updatedItem = {
        ...item,
        isShared: true,
        sharedWith: latestTargets,
        sharedAt: timeStr
      };
      const updatedLogs = await dbService.saveWorkLog(updatedItem);
      setWorkLogs(updatedLogs);
      window.dispatchEvent(new Event('with_security_data_changed'));
      if (onTriggerToast) {
        onTriggerToast(`'${item.title}' 업무가 현재 공유 대상(${latestTargets.length}명)에게 공유되었습니다.`, 'success');
      }
    }
  };

  // Past Work Copy Helpers
  const handleOpenPastWorkModal = () => {
    setPastSearchQuery('');
    setPastFilterCategory('전체');
    setSelectedPastLogIds([]);
    setIsPastWorkModalOpen(true);
  };

  const handleToggleSelectPastLog = (logId) => {
    setSelectedPastLogIds(prev =>
      prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
    );
  };

  const handleToggleSelectAllPastLogs = (logsToToggle) => {
    const allIds = logsToToggle.map(l => l.id);
    const isAllSelected = allIds.length > 0 && allIds.every(id => selectedPastLogIds.includes(id));
    if (isAllSelected) {
      setSelectedPastLogIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedPastLogIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleCopySinglePastLog = async (pastLog) => {
    const now = new Date();
    const timeStr = `${selectedDate} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const authorName = currentUser?.name || pastLog.authorName || '작성자';
    const authorTeam = currentUser?.team || currentUser?.department || pastLog.authorTeam || '운영팀';
    const authorRank = currentUser?.rank || pastLog.authorRank || '대리';
    const authorUsername = currentUser?.username || pastLog.authorUsername || '';
    const authorDivision = currentUser?.division || pastLog.authorDivision || '';
    const authorRole = currentUser?.role || pastLog.authorRole || '일반';

    const newLogItem = {
      id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      category: pastLog.category || '사내 업무',
      date: selectedDate,
      title: pastLog.title,
      details: pastLog.details || '',
      siteName: pastLog.category === '출장 업무' ? (pastLog.siteName || pastLog.site_name || '') : '',
      site_name: pastLog.category === '출장 업무' ? (pastLog.siteName || pastLog.site_name || '') : '',
      authorName,
      authorTeam,
      authorRank,
      authorUsername,
      authorDivision,
      authorRole,
      division: authorDivision,
      role: authorRole,
      createdAt: timeStr
    };

    const updated = await dbService.saveWorkLog(newLogItem);
    setWorkLogs(updated);
    setIsPastWorkModalOpen(false);
    setViewAllDates(false);

    if (onTriggerToast) {
      onTriggerToast(`'${pastLog.title}' 업무가 [${selectedDate}] 일자로 복사 등록되었습니다.`, 'success');
    }
  };

  const handleCopySelectedPastLogs = async () => {
    if (selectedPastLogIds.length === 0) {
      if (onTriggerToast) onTriggerToast('복사할 업무를 1건 이상 선택해 주세요.', 'warning');
      return;
    }

    const selectedLogs = workLogs.filter(l => selectedPastLogIds.includes(l.id));
    if (selectedLogs.length === 0) return;

    const now = new Date();
    const timeStr = `${selectedDate} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const authorName = currentUser?.name || '작성자';
    const authorTeam = currentUser?.team || currentUser?.department || '운영팀';
    const authorRank = currentUser?.rank || '대리';
    const authorUsername = currentUser?.username || '';
    const authorDivision = currentUser?.division || '';
    const authorRole = currentUser?.role || '일반';

    let updated = workLogs;
    for (let i = 0; i < selectedLogs.length; i++) {
      const pastLog = selectedLogs[i];
      const newLogItem = {
        id: `LOG-${Date.now() + i + 1}-${Math.floor(100 + Math.random() * 900)}`,
        category: pastLog.category || '사내 업무',
        date: selectedDate,
        title: pastLog.title,
        details: pastLog.details || '',
        siteName: pastLog.category === '출장 업무' ? (pastLog.siteName || pastLog.site_name || '') : '',
        site_name: pastLog.category === '출장 업무' ? (pastLog.siteName || pastLog.site_name || '') : '',
        authorName,
        authorTeam,
        authorRank,
        authorUsername,
        authorDivision,
        authorRole,
        division: authorDivision,
        role: authorRole,
        createdAt: timeStr
      };
      updated = await dbService.saveWorkLog(newLogItem);
    }

    setWorkLogs(updated);
    setIsPastWorkModalOpen(false);
    setSelectedPastLogIds([]);
    setViewAllDates(false);

    if (onTriggerToast) {
      onTriggerToast(`총 ${selectedLogs.length}건의 업무가 [${selectedDate}] 일자로 복사 등록되었습니다.`, 'success');
    }
  };

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState(null);
  useModalBack(isDeleteModalOpen, () => setIsDeleteModalOpen(false), 'worklog-delete-modal');

  // Today local ISO date (YYYY-MM-DD)
  const getTodayIsoDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Team Name Formatter: Strip "사업부" prefix and display only team (e.g. "영업/운영사업부 운영1팀" -> "운영1팀")
  const formatOnlyTeam = (rawTeam) => {
    if (!rawTeam || typeof rawTeam !== 'string') return '운영팀';
    const trimmed = rawTeam.trim();
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(/\s+/);
      return parts[parts.length - 1];
    }
    return trimmed;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());
  const [viewAllDates, setViewAllDates] = useState(false); // false = filter by selectedDate, true = show all dates
  const [siteOptions, setSiteOptions] = useState([]);
  const datePickerRef = useRef(null);

  const [form, setForm] = useState({
    category: '사내 업무',
    date: getTodayIsoDate(),
    title: '',
    details: '',
    siteName: ''
  });

  const loadData = async () => {
    try {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
      const logs = await dbService.getWorkLogs();
      setWorkLogs(logs);
      const sites = await dbService.getSites();
      setSiteOptions(sites || []);
      const users = await dbService.getUsers();
      setAllUsers(users || []);

      // Load saved share targets strictly for current user (개별 일방향 독립 관리)
      try {
        const userKey = getUserShareTargetsStorageKey(u);
        if (userKey) {
          const storedTargets = localStorage.getItem(userKey);
          if (storedTargets) {
            setShareTargets(JSON.parse(storedTargets));
          } else {
            setShareTargets([]);
          }
        } else {
          setShareTargets([]);
        }
      } catch (e) { }
    } catch (err) {
      console.error('Failed to load work logs:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handleDataChange = () => {
      loadData();
    };
    window.addEventListener('with_security_data_changed', handleDataChange);
    return () => window.removeEventListener('with_security_data_changed', handleDataChange);
  }, []);

  // Helper for Korean Date Formatting (e.g. 2026년 08월 11일 (화))
  const getFormattedKoreanDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dateObj.getDay()];
    return `${y}년 ${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일 (${dayName})`;
  };

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const parts = selectedDate.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    dateObj.setDate(dateObj.getDate() - 1);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nd = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
    setViewAllDates(false);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    dateObj.setDate(dateObj.getDate() + 1);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nd = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
    setViewAllDates(false);
  };

  const handleToday = () => {
    setSelectedDate(getTodayIsoDate());
    setViewAllDates(false);
  };

  const handleTriggerDatePicker = () => {
    if (datePickerRef.current) {
      if (typeof datePickerRef.current.showPicker === 'function') {
        try {
          datePickerRef.current.showPicker();
        } catch (e) {
          datePickerRef.current.click();
        }
      } else {
        datePickerRef.current.click();
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingLogId(null);
    setForm({
      category: '사내 업무',
      date: selectedDate || getTodayIsoDate(),
      title: '',
      details: '',
      siteName: ''
    });
    setExtraTasks([]);
    setIsModalOpen(true);
  };

  const handleOpenAddModalForCard = (logItem) => {
    setEditingLogId(null);
    setForm({
      category: logItem.category || '사내 업무',
      date: logItem.date || getTodayIsoDate(),
      title: '',
      details: '',
      siteName: logItem.siteName || logItem.site_name || ''
    });
    setExtraTasks([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (logItem) => {
    setEditingLogId(logItem.id);
    setForm({
      category: logItem.category || '사내 업무',
      date: logItem.date || getTodayIsoDate(),
      title: logItem.title || '',
      details: logItem.details || '',
      siteName: logItem.siteName || logItem.site_name || ''
    });
    setExtraTasks([]);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      if (onTriggerToast) onTriggerToast('업무명을 입력해 주세요.', 'warning');
      return;
    }

    const now = new Date();
    const timeStr = `${form.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const authorName = currentUser?.name || '작성자';
    const authorTeam = currentUser?.team || currentUser?.department || '운영팀';
    const authorRank = currentUser?.rank || '대리';
    const authorUsername = currentUser?.username || '';
    const authorDivision = currentUser?.division || '';
    const authorRole = currentUser?.role || '일반';

    const newLogItem = {
      id: editingLogId || `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      category: form.category,
      date: form.date,
      title: form.title.trim(),
      details: form.details.trim(),
      siteName: form.category === '출장 업무' ? (form.siteName || (siteOptions[0]?.site_name || siteOptions[0]?.name || '')) : '',
      authorName,
      authorTeam,
      authorRank,
      authorUsername,
      authorDivision,
      authorRole,
      division: authorDivision,
      role: authorRole,
      createdAt: editingLogId ? timeStr : `${form.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };

    let updatedLogs = await dbService.saveWorkLog(newLogItem);

    // Save extra task items if added in multi-task mode
    if (!editingLogId && extraTasks.length > 0) {
      for (let i = 0; i < extraTasks.length; i++) {
        const ext = extraTasks[i];
        if (ext.title && ext.title.trim()) {
          const extraLogItem = {
            id: `LOG-${Date.now() + i + 1}-${Math.floor(100 + Math.random() * 900)}`,
            category: form.category,
            date: form.date,
            title: ext.title.trim(),
            details: (ext.details || '').trim(),
            siteName: form.category === '출장 업무' ? (form.siteName || (siteOptions[0]?.site_name || siteOptions[0]?.name || '')) : '',
            authorName,
            authorTeam,
            authorRank,
            authorUsername,
            authorDivision,
            authorRole,
            division: authorDivision,
            role: authorRole,
            createdAt: `${form.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
          };
          updatedLogs = await dbService.saveWorkLog(extraLogItem);
        }
      }
    }

    setWorkLogs(updatedLogs);
    setIsModalOpen(false);
    setExtraTasks([]);

    // Automatically switch selectedDate to the saved log's date
    setSelectedDate(form.date);
    setViewAllDates(false);

    if (onTriggerToast) {
      const validExtras = extraTasks.filter(t => t.title && t.title.trim()).length;
      const msg = editingLogId
        ? `'${newLogItem.title}' 업무 일지가 수정되었습니다.`
        : (validExtras > 0
          ? `총 ${1 + validExtras}건의 업무 일지가 등록되었습니다.`
          : `'${newLogItem.title}' 업무 일지가 등록되었습니다.`);
      onTriggerToast(msg, 'success');
    }
  };

  // Author Permission Helper: Only author or Admin/Dev can edit/delete
  const canModifyLog = (log) => {
    if (!currentUser) return false;
    if (currentUser.role === '개발자' || currentUser.role === '관리자' || currentUser.username === 'admin') {
      return true;
    }
    return isSamePerson(log, currentUser);
  };

  // Open Deletion Modal
  const handleInitiateDeleteLog = (logItem) => {
    if (!canModifyLog(logItem)) {
      if (onTriggerToast) onTriggerToast('❌ 본인이 작성한 업무 일지만 삭제할 수 있습니다.', 'error');
      return;
    }
    setDeleteTargetLog(logItem);
    setIsDeleteModalOpen(true);
  };

  // Confirm Deletion directly without password
  const handleConfirmDelete = async () => {
    if (deleteTargetLog) {
      const updatedLogs = await dbService.deleteWorkLog(deleteTargetLog.id);
      setWorkLogs(updatedLogs);
      setIsDeleteModalOpen(false);
      const title = deleteTargetLog.title;
      setDeleteTargetLog(null);
      if (onTriggerToast) onTriggerToast(`'${title}' 업무 일지가 삭제되었습니다.`, 'info');
    }
  };

  // Filter logs visibility for current user: strictly own authored logs (이름, 직급, 소속, 사업부 기준)
  const isLogVisibleToCurrentUser = (log, user) => {
    if (!user) return true;
    return isSamePerson(log, user);
  };

  // Filter logs by visibility, selectedDate (unless viewAllDates is true), category, and search query
  const filteredLogs = workLogs.filter(log => {
    const matchesUser = isLogVisibleToCurrentUser(log, currentUser);
    const matchesDate = viewAllDates || log.date === selectedDate;
    const matchesCategory = filterCategory === '전체' || log.category === filterCategory;
    const matchesQuery = !searchQuery.trim() ||
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUser && matchesDate && matchesCategory && matchesQuery;
  });

  // Group logs by Date (descending)
  const groupedByDate = filteredLogs.reduce((acc, log) => {
    const d = log.date || '기타 날짜';
    if (!acc[d]) acc[d] = [];
    acc[d].push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Filter and sort past logs for the Past Work Copy Modal (본인 작성 업무만 불러오기)
  const filteredPastLogs = workLogs
    .filter(log => {
      // 1. Strictly own authored logs
      const matchesUser = isLogVisibleToCurrentUser(log, currentUser);
      if (!matchesUser) return false;

      if (pastFilterCategory !== '전체' && log.category !== pastFilterCategory) {
        return false;
      }
      if (pastSearchQuery.trim()) {
        const q = pastSearchQuery.trim().toLowerCase();
        const matchTitle = (log.title || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchSite = (log.siteName || log.site_name || '').toLowerCase().includes(q);
        const matchAuthor = (log.authorName || '').toLowerCase().includes(q);
        const matchDate = (log.date || '').toLowerCase().includes(q);
        return matchTitle || matchDetails || matchSite || matchAuthor || matchDate;
      }
      return true;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const isAllPastLogsSelected = filteredPastLogs.length > 0 && filteredPastLogs.every(l => selectedPastLogIds.includes(l.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Main 2-Column Responsive Layout for Work Log Management & Desktop Calendar */}
      <div className="work-log-desktop-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '10px',
        alignItems: 'start',
        width: '100%'
      }}>
        {/* Left Column: Header Banner, Date Navigation, Search Filter, & Work Log List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '6px', border: '1.5px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Row 1: Title & Icon + Share Target Setting Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
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
                  <ClipboardList size={22} />
                </div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                  업무 일지 관리
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsShareTargetModalOpen(true)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: shareTargets.length > 0 ? '#eff6ff' : '#ffffff',
                  border: shareTargets.length > 0 ? '1.5px solid #93c5fd' : '1.5px solid #cbd5e1',
                  color: shareTargets.length > 0 ? '#1d4ed8' : '#334155',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title="업무 일지를 공유할 대상 사용자 지정"
              >
                <Users size={14} />
                <span>업무 공유</span>
                {shareTargets.length > 0 && (
                  <span style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10.5px',
                    fontWeight: '800'
                  }}>
                    {shareTargets.length}명
                  </span>
                )}
              </button>
            </div>

            {/* Row 2: 1:1 Equal Width Action Buttons (50% : 50%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={handleOpenPastWorkModal}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: '#eff6ff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e3a8a',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                title="이전에 작성된 업무 일지 목록에서 선택하여 현재 날짜로 복사 등록"
              >
                <Copy size={14} /> 불러오기
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="glass-button-primary"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  border: '1px solid #1e3a8a',
                  boxShadow: '0 3px 10px rgba(15, 23, 42, 0.25)',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={15} /> 추가
              </button>
            </div>
          </div>

          {/* Interactive Date Selector Navigation Bar (2-Row Layout) */}
          <div className="glass-panel" style={{
            padding: '14px 16px',
            borderRadius: '6px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)'
          }}>
            {/* Line 1: [Left Arrow] --- [Date Display + Picker] --- [Right Arrow] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={handlePrevDay}
                title="이전 날짜"
                style={{
                  flex: '0 0 38px',
                  height: '38px',
                  borderRadius: '6px',
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

              {/* Interactive Date Picker Button (Entire Area Clickable -> Triggers Calendar Popup) */}
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  flex: 1,
                  maxWidth: '320px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Visual Button Text */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  pointerEvents: 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#1e3a8a', fontSize: '15px', fontWeight: '800' }}>
                      {viewAllDates ? '전체 날짜 업무 일지' : getFormattedKoreanDate(selectedDate)}
                    </span>
                    {!viewAllDates && selectedDate > getTodayIsoDate() && (
                      <span style={{
                        background: '#fff7ed',
                        color: '#c2410c',
                        border: '1.5px solid #fed7aa',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        예정
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                    {viewAllDates ? '전체 업무:' : (selectedDate > getTodayIsoDate() ? '예정 업무:' : '해당 날짜 업무:')} <strong style={{ color: selectedDate > getTodayIsoDate() ? '#c2410c' : '#1e3a8a', fontWeight: '800' }}>{filteredLogs.length}건</strong>
                  </span>
                </div>

                {/* Transparent Calendar Input spanning 100% width & height with full-clickable-datepicker */}
                <input
                  ref={datePickerRef}
                  type="date"
                  className="full-clickable-datepicker"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setViewAllDates(false);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                title="다음 날짜"
                style={{
                  flex: '0 0 38px',
                  height: '38px',
                  borderRadius: '6px',
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

            {/* Line 2 (Below Line): [Today Button] --- [View All Toggle Button] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              paddingTop: '10px',
              borderTop: '1.5px solid #cbd5e1',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={handleToday}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: selectedDate === getTodayIsoDate() && !viewAllDates
                    ? '1.5px solid #1e3a8a'
                    : '1.5px solid #cbd5e1',
                  background: selectedDate === getTodayIsoDate() && !viewAllDates
                    ? 'rgba(30, 58, 138, 0.08)'
                    : '#f8fafc',
                  color: selectedDate === getTodayIsoDate() && !viewAllDates ? '#1e3a8a' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                오늘
              </button>

              <button
                type="button"
                onClick={() => setViewAllDates(!viewAllDates)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: viewAllDates ? '1.5px solid #7c3aed' : '1.5px solid #cbd5e1',
                  background: viewAllDates ? 'rgba(124, 58, 237, 0.1)' : '#f8fafc',
                  color: viewAllDates ? '#7c3aed' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {viewAllDates ? '날짜별 보기' : '전체 보기'}
              </button>
            </div>
          </div>

          {/* Filter Bar & Search (Single Row Matching Layout) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', flexWrap: 'nowrap' }}>
            {/* Category Segmented Control */}
            <div style={{ display: 'flex', background: '#ffffff', padding: '3px', borderRadius: '6px', border: '1.5px solid #cbd5e1', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              {['전체', '사내 업무', '출장 업무'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: filterCategory === cat ? '1px solid #e2e8f0' : '1px solid transparent',
                    background: filterCategory === cat ? '#1e3a8a' : 'transparent',
                    color: filterCategory === cat ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat === '사내 업무'}
                  {cat === '출장 업무'}
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Bar (Auto-expanded to fill remaining right width in single row) */}
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="업무명&내용 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '12px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              />
            </div>
          </div>

          {/* Date-Grouped Work Logs List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedDates.length === 0 ? (
              <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: '6px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ClipboardList size={36} color="#1e3a8a" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {viewAllDates ? '등록된 업무 일지가 없습니다.' : `등록된 업무 일지가 없습니다.`}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleOpenPastWorkModal}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      background: '#eff6ff',
                      border: '1.5px solid #cbd5e1',
                      color: '#1e3a8a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)'
                    }}
                  >
                    <Copy size={14} /> 불러오기
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      background: '#1e3a8a',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                    }}
                  >
                    <Plus size={14} /> 추가
                  </button>
                </div>
              </div>
            ) : (
              sortedDates.map(dateStr => {
                const isDateScheduled = dateStr > getTodayIsoDate();
                return (
                  <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Date Header (Crisp High-Contrast Colors) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', paddingTop: '4px' }}>
                      <Calendar size={16} color={isDateScheduled ? '#c2410c' : '#1e3a8a'} />
                      <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.2px' }}>
                        {getFormattedKoreanDate(dateStr)}
                      </span>
                    </div>

                    {/* Logs Grid for this date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(() => {
                        const logsForDate = groupedByDate[dateStr] || [];
                        const cardGroupsMap = logsForDate.reduce((acc, log) => {
                          const sName = log.siteName || log.site_name || '';
                          const aName = log.authorName || log.name || '작성자';
                          const key = `${log.category}___${sName}___${aName}`;
                          if (!acc[key]) {
                            acc[key] = {
                              key,
                              category: log.category,
                              siteName: sName,
                              authorName: aName,
                              authorRank: log.authorRank || log.rank || '대리',
                              authorTeam: log.authorTeam || log.team || log.department || '보안관제팀',
                              createdAt: log.createdAt || '',
                              date: log.date,
                              primaryLog: log,
                              items: []
                            };
                          }
                          acc[key].items.push(log);
                          return acc;
                        }, {});

                        return Object.values(cardGroupsMap)
                          .sort((a, b) => {
                            const isATrip = a.category === '출장 업무';
                            const isBTrip = b.category === '출장 업무';
                            if (isATrip && !isBTrip) return -1; // 출장 업무 카드가 최상단
                            if (!isATrip && isBTrip) return 1;
                            return (a.createdAt || '').localeCompare(b.createdAt || '');
                          })
                          .map(group => {
                            const isCardScheduled = group.date > getTodayIsoDate();
                            return (
                              <div
                                key={group.key}
                                className="glass-panel"
                                style={{
                                  width: '100%',
                                  minWidth: 0,
                                  boxSizing: 'border-box',
                                  padding: '16px 18px',
                                  borderRadius: '6px',
                                  border: isCardScheduled ? '1.5px solid #fed7aa' : '1.5px solid #cbd5e1',
                                  borderLeft: isCardScheduled
                                    ? '4px solid #ea580c'
                                    : (group.category === '출장 업무' ? '4px solid #7c3aed' : '4px solid #1e3a8a'),
                                  background: isCardScheduled ? '#fffbf5' : '#ffffff',
                                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px'
                                }}
                              >
                                {/* Log Header Row 1: Category Badge + Business Trip Site + Group Action Button */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      background: group.category === '출장 업무' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(30, 58, 138, 0.08)',
                                      color: group.category === '출장 업무' ? '#7c3aed' : '#1e3a8a',
                                      border: `1.5px solid ${group.category === '출장 업무' ? '#c4b5fd' : '#cbd5e1'}`
                                    }}>
                                      {group.category === '출장 업무' ? '출장 업무' : '사내 업무'}
                                    </span>

                                    {group.category === '출장 업무' && group.siteName && (
                                      <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        background: 'rgba(167, 139, 250, 0.12)',
                                        color: '#7c3aed',
                                        border: '1.5px solid #c4b5fd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        {group.siteName}
                                      </span>
                                    )}
                                  </div>

                                  {/* Action Buttons: Add Task to this Card Group */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartInlineAdd(group.primaryLog, group.key)}
                                      style={{
                                        background: '#eff6ff',
                                        border: '1.5px solid #cbd5e1',
                                        color: '#1e3a8a',
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)'
                                      }}
                                      title="이 카드의 업무 분류/날짜/사업장에 새 업무 바로 추가"
                                    >
                                      <Plus size={13} /> 추가
                                    </button>
                                  </div>
                                </div>

                                {/* Nested List of Tasks (Titles & Details) inside this Card */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', minWidth: 0 }}>
                                  {(() => {
                                    const getTaskSortKey = (t) => {
                                      if (t.sortOrder !== undefined && t.sortOrder !== null) {
                                        return String(t.sortOrder).padStart(5, '0');
                                      }
                                      return t.createdAt || t.id || '';
                                    };
                                    const sortedItems = [...group.items].sort((a, b) => getTaskSortKey(a).localeCompare(getTaskSortKey(b)));

                                    return sortedItems.map((item, itemIdx) => {
                                      const isEditingThis = inlineEditingId === item.id;
                                      const isBeingDragged = draggedTaskId === item.id;
                                      const isDragOver = dragOverTaskId === item.id && draggedTaskId !== item.id;

                                      return (
                                        <div
                                          key={item.id}
                                          draggable={!isEditingThis && canModifyLog(item)}
                                          onDragStart={(e) => handleDragStart(e, item)}
                                          onDragOver={(e) => handleDragOver(e, item)}
                                          onDragLeave={handleDragLeave}
                                          onDragEnd={handleDragEnd}
                                          onDrop={(e) => handleDropTask(e, item, sortedItems)}
                                          style={{
                                            width: '100%',
                                            minWidth: 0,
                                            boxSizing: 'border-box',
                                            background: isBeingDragged ? '#eff6ff' : (isEditingThis ? '#ffffff' : '#f8fafc'),
                                            border: isBeingDragged
                                              ? '1.5px dashed #2563eb'
                                              : (isDragOver
                                                  ? '2px solid #2563eb'
                                                  : (isEditingThis ? '1.5px solid #1e3a8a' : '1.5px solid #cbd5e1')),
                                            borderRadius: '6px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            opacity: isBeingDragged ? 0.45 : 1,
                                            transform: isDragOver ? 'translateY(-2px)' : 'none',
                                            boxShadow: isEditingThis
                                              ? '0 0 0 3px rgba(30, 58, 138, 0.15)'
                                              : (isDragOver ? '0 4px 12px rgba(37, 99, 235, 0.18)' : '0 1px 3px rgba(15, 23, 42, 0.04)'),
                                            transition: 'all 0.18s ease',
                                            cursor: (!isEditingThis && canModifyLog(item)) ? 'default' : 'default'
                                          }}
                                        >
                                          {isEditingThis ? (
                                            /* Inline Editing Mode */
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e3a8a' }}>
                                                  {itemIdx + 1}.
                                                </span>
                                                <input
                                                  type="text"
                                                  value={inlineForm.title}
                                                  onChange={(e) => setInlineForm({ ...inlineForm, title: e.target.value })}
                                                  style={{
                                                    flex: 1,
                                                    padding: '7px 10px',
                                                    borderRadius: '4px',
                                                    background: '#ffffff',
                                                    border: '1.5px solid #1e3a8a',
                                                    color: '#0f172a',
                                                    fontSize: '13.5px',
                                                    fontWeight: '700',
                                                    outline: 'none'
                                                  }}
                                                  placeholder="업무명을 입력하세요"
                                                />
                                              </div>

                                              <textarea
                                                rows={2}
                                                value={inlineForm.details}
                                                onChange={(e) => setInlineForm({ ...inlineForm, details: e.target.value })}
                                                style={{
                                                  width: '100%',
                                                  padding: '8px 10px',
                                                  borderRadius: '4px',
                                                  background: '#ffffff',
                                                  border: '1.5px solid #cbd5e1',
                                                  color: '#0f172a',
                                                  fontSize: '13.5px',
                                                  outline: 'none',
                                                  resize: 'vertical',
                                                  lineHeight: '1.5'
                                                }}
                                                placeholder="세부 업무 내용을 입력하세요 (선택)"
                                              />

                                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                                                <button
                                                  type="button"
                                                  onClick={handleCancelInlineEdit}
                                                  style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '4px',
                                                    background: '#ffffff',
                                                    border: '1px solid #cbd5e1',
                                                    color: '#64748b',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  취소
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveInlineEdit(item)}
                                                  style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '4px',
                                                    background: '#1e3a8a',
                                                    border: '1px solid transparent',
                                                    color: '#ffffff',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                  }}
                                                >
                                                  저장
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            /* Normal View Mode */
                                            <>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%', minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                                                  <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', flexShrink: 0, marginTop: '1px' }}>
                                                    {itemIdx + 1}.
                                                  </span>
                                                  <span style={{
                                                    fontSize: '13.5px',
                                                    fontWeight: '800',
                                                    color: '#0f172a',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'anywhere',
                                                    lineHeight: '1.4',
                                                    flex: 1,
                                                    minWidth: 0
                                                  }}>
                                                    {item.title}
                                                  </span>
                                                </div>

                                                {canModifyLog(item) && (
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginTop: '1px' }}>
                                                    {/* 공유 버튼 (수정/삭제 버튼과 100% 동일 크기 및 패딩) */}
                                                    <button
                                                      type="button"
                                                      onClick={() => handleToggleShareLog(item)}
                                                      style={{
                                                        background: item.isShared ? '#16a34a' : '#ffffff',
                                                        border: item.isShared ? '1.5px solid #15803d' : '1.5px solid #cbd5e1',
                                                        color: item.isShared ? '#ffffff' : '#0f172a',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '3px',
                                                        boxShadow: item.isShared ? '0 1px 3px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                        transition: 'all 0.15s ease'
                                                      }}
                                                      title={item.isShared ? "업무 공유 해제 (현재 공유 대상에게 공유중)" : "업무 공유 (지정된 대상에게 공유)"}
                                                    >
                                                      <Share2 size={12} color={item.isShared ? '#ffffff' : '#0f172a'} />
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleStartInlineEdit(item)}
                                                      style={{
                                                        background: '#ffffff',
                                                        border: '1.5px solid #cbd5e1',
                                                        color: '#0f172a',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                      }}
                                                      title="이 업무 바로 수정"
                                                    >
                                                      <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleInitiateDeleteLog(item)}
                                                      style={{
                                                        background: '#ffffff',
                                                        border: '1.5px solid #fca5a5',
                                                        color: '#dc2626',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                      }}
                                                      title="이 업무 삭제"
                                                    >
                                                      <Trash2 size={12} />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Log Details Box (Only rendered if details exist) */}
                                              {item.details && item.details.trim() !== '' && (
                                                <div style={{
                                                  border: 'none',
                                                  background: 'transparent',
                                                  padding: '0px 4px',
                                                  borderRadius: '0px',
                                                  fontSize: '13.5px',
                                                  color: '#0f172a',
                                                  whiteSpace: 'pre-wrap',
                                                  lineHeight: '1.6',
                                                  boxShadow: 'none'
                                                }}>
                                                  {item.details}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}

                                  {/* Inline Adding New Task Box directly inside this Card */}
                                  {inlineAddingCardKey === group.key && (
                                    <div style={{
                                      marginTop: '8px',
                                      padding: '12px',
                                      background: '#ffffff',
                                      border: '1.5px dashed #1e3a8a',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '10px',
                                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e3a8a' }}>
                                          {group.items.length + 1}.
                                        </span>
                                        <input
                                          type="text"
                                          autoFocus
                                          value={inlineNewForm.title}
                                          onChange={(e) => setInlineNewForm({ ...inlineNewForm, title: e.target.value })}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleSaveInlineAdd(group.primaryLog);
                                            }
                                          }}
                                          style={{
                                            flex: 1,
                                            padding: '7px 10px',
                                            borderRadius: '4px',
                                            background: '#ffffff',
                                            border: '1.5px solid #1e3a8a',
                                            color: '#0f172a',
                                            fontSize: '13.5px',
                                            fontWeight: '700',
                                            outline: 'none'
                                          }}
                                          placeholder="추가할 업무명을 입력하세요."
                                        />
                                      </div>

                                      <textarea
                                        rows={2}
                                        value={inlineNewForm.details}
                                        onChange={(e) => setInlineNewForm({ ...inlineNewForm, details: e.target.value })}
                                        style={{
                                          width: '100%',
                                          padding: '8px 10px',
                                          borderRadius: '4px',
                                          background: '#ffffff',
                                          border: '1.5px solid #cbd5e1',
                                          color: '#0f172a',
                                          fontSize: '13.5px',
                                          outline: 'none',
                                          resize: 'vertical',
                                          lineHeight: '1.5'
                                        }}
                                        placeholder="세부 업무 내용을 입력하세요 (선택)"
                                      />

                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                                        <button
                                          type="button"
                                          onClick={handleCancelInlineAdd}
                                          style={{
                                            padding: '5px 10px',
                                            borderRadius: '2px',
                                            background: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            color: '#64748b',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          취소
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveInlineAdd(group.primaryLog)}
                                          style={{
                                            padding: '5px 14px',
                                            borderRadius: '4px',
                                            background: '#1e3a8a',
                                            border: 'none',
                                            color: '#ffffff',
                                            fontSize: '11.5px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)'
                                          }}
                                        >
                                          추가 완료
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Desktop Calendar Widget */}
        <div className="work-log-calendar-sticky" style={{ position: 'sticky', top: '10px', alignSelf: 'start', height: 'fit-content', minWidth: 0 }}>
          <WorkLogCalendar
            workLogs={workLogs.filter(log => isLogVisibleToCurrentUser(log, currentUser))}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setViewAllDates(false);
            }}
            onOpenAddModal={handleOpenAddModal}
          />
        </div>
      </div>

      {/* Modal: Register / Edit Work Log */}
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
          <div className="glass-panel" onClick={e => e.stopPropagation()} style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: '10px',
            padding: '24px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    {editingLogId ? '업무 일지 수정' : '신규 업무 일지 등록'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#1e3a8a', fontWeight: '700' }}>
                    작성자: {currentUser?.name || '사용자'} {currentUser?.rank || '대리'} ({currentUser?.team || '운영팀'})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Category & Date in 1:1 ratio Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#475569', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    업무 분류 *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="사내 업무">사내 업무</option>
                    <option value="출장 업무">출장 업무</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#475569', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    업무 날짜 *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Site Selection Field for Business Trip (출장 업무) */}
              {form.category === '출장 업무' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#7c3aed', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    🚗 출장 방문 사업장 선택 *
                  </label>
                  <select
                    value={form.siteName}
                    onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- 출장 방문 사업장을 선택하세요 --</option>
                    {siteOptions.map(site => {
                      const siteFullName = site.site_name || site.siteName || (site.address ? `${site.name} ${site.address}` : site.name);
                      return (
                        <option key={site.id} value={siteFullName}>
                          {siteFullName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label style={{ fontSize: '12.5px', color: '#475569', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                  업무명 *
                </label>
                <input
                  type="text"
                  placeholder="업무명을 작성해 주세요."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '4px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Details Textarea (Optional) */}
              <div>
                <label style={{ fontSize: '12.5px', color: '#475569', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                  세부 업무 기록 (선택)
                </label>
                <textarea
                  rows={4}
                  placeholder="진행한 업무 내용을 작성해 주세요."
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '4px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13.5px',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: '1.6'
                  }}
                />
              </div>

              {/* Dynamic Extra Tasks List (When adding 2 or more tasks at once) */}
              {!editingLogId && extraTasks.map((tItem, idx) => (
                <div key={idx} style={{
                  background: '#eff6ff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={14} /> 추가 업무 항목 #{idx + 2}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = extraTasks.filter((_, i) => i !== idx);
                        setExtraTasks(updated);
                      }}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }}
                      title="이 항목 삭제"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder={`추가 업무명 입력 (예: ${form.category === '출장 업무' ? '2차 현장점검' : '문서 검토'})`}
                    value={tItem.title}
                    onChange={(e) => {
                      const updated = [...extraTasks];
                      updated[idx].title = e.target.value;
                      setExtraTasks(updated);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />

                  <textarea
                    rows={2}
                    placeholder="추가 업무 세부내용 (선택)"
                    value={tItem.details}
                    onChange={(e) => {
                      const updated = [...extraTasks];
                      updated[idx].details = e.target.value;
                      setExtraTasks(updated);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              ))}


              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="glass-button"
                  style={{ flex: 1, padding: '12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="glass-button-primary"
                  style={{
                    flex: 1.5,
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {editingLogId ? '수정 완료' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Past Work Copy and Import Modal */}
      {isPastWorkModalOpen && (
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
          <div className="glass-panel" onClick={e => e.stopPropagation()} style={{
            width: '100%',
            maxWidth: '620px',
            maxHeight: '85vh',
            padding: '24px',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '4px',
                  background: 'rgba(30, 58, 138, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e3a8a'
                }}>
                  <Copy size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>이전 업무 불러오기</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e3a8a', fontWeight: '700' }}>
                      대상일: {selectedDate}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: '700' }}>
                      {currentUser?.name ? `${currentUser.name} ${currentUser.rank || ''} (본인 작성 업무)` : '본인 작성 업무'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPastWorkModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="업무 제목, 상세 내용, 사업장, 작성자 검색..."
                    value={pastSearchQuery}
                    onChange={(e) => setPastSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '4px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                  {pastSearchQuery && (
                    <button
                      onClick={() => setPastSearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['전체', '사내 업무', '출장 업무'].map(cat => {
                    const isCatActive = pastFilterCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPastFilterCategory(cat)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: isCatActive ? '800' : '600',
                          background: isCatActive ? '#1e3a8a' : '#f1f5f9',
                          color: isCatActive ? '#ffffff' : '#475569',
                          border: isCatActive ? '1px solid #1e3a8a' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scrollable Work Logs List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflowY: 'auto',
              maxHeight: '48vh',
              paddingRight: '4px'
            }}>
              {filteredPastLogs.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1.5px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FileText size={28} color="#94a3b8" />
                  <span>조건에 맞는 이전 업무 일지 내역이 없습니다.</span>
                </div>
              ) : (
                filteredPastLogs.map(item => {
                  const isSelected = selectedPastLogIds.includes(item.id);
                  const isBusinessTrip = item.category === '출장 업무';
                  const siteLabel = item.siteName || item.site_name;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '1.5px solid #1e3a8a' : '1.5px solid #e2e8f0',
                        boxShadow: isSelected ? '0 2px 8px rgba(15, 23, 42, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleToggleSelectPastLog(item.id)}
                    >
                      {/* Left: Checkbox & Log Content */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div style={{ paddingTop: '2px', color: isSelected ? '#1e3a8a' : '#94a3b8', flexShrink: 0 }}>
                          {isSelected ? <CheckSquare size={18} color="#1e3a8a" /> : <Square size={18} />}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                          {/* Badges row: Date, Category, Site, Author */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '5px'
                            }}>
                              {item.date}
                            </span>

                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              background: isBusinessTrip ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 58, 138, 0.08)',
                              color: isBusinessTrip ? '#d97706' : '#1e3a8a',
                              border: isBusinessTrip ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(30, 58, 138, 0.25)'
                            }}>
                              {isBusinessTrip ? '출장' : '사내'}
                            </span>

                            {isBusinessTrip && siteLabel && (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#0f172a',
                                background: '#fef3c7',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {siteLabel}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', lineHeight: '1.4' }}>
                            {item.title}
                          </div>

                          {/* Details snippet */}
                          {item.details && (
                            <div style={{
                              fontSize: '13px',
                              color: '#64748b',
                              lineHeight: '1.45',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                선택된 항목: <strong style={{ color: selectedPastLogIds.length > 0 ? '#1e3a8a' : '#0f172a' }}>{selectedPastLogIds.length}</strong>건
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsPastWorkModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>

                <button
                  type="button"
                  onClick={handleCopySelectedPastLogs}
                  disabled={selectedPastLogIds.length === 0}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    background: selectedPastLogIds.length > 0
                      ? '#1e3a8a'
                      : '#cbd5e1',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: selectedPastLogIds.length > 0 ? 'pointer' : 'not-allowed',
                    boxShadow: selectedPastLogIds.length > 0 ? '0 4px 12px rgba(15, 23, 42, 0.25)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Copy size={15} /> {selectedPastLogIds.length > 0 ? `${selectedPastLogIds.length}건 ` : ''} 등록
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Simple Confirmation for Deletion */}
      {isDeleteModalOpen && (
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
            maxWidth: '400px',
            borderRadius: '24px',
            padding: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={20} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    업무 일지 삭제
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    삭제 확인
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
              '<strong>{deleteTargetLog?.title}</strong>' 업무 일지를 삭제하시겠습니까?<br />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>삭제된 업무 일지는 복구할 수 없습니다.</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="glass-button"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  flex: 1.2,
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '800',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                  cursor: 'pointer'
                }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Share Target Designation */}
      {isShareTargetModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(14px)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)'
                }}>
                  <Users size={18} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                  업무 일지 공유 대상 지정
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsShareTargetModalOpen(false);
                  setPendingShareLogItem(null);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
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
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  gap: '8px'
                }}>
                  <Search size={14} color="#64748b" />
                  <input
                    type="text"
                    value={shareTargetSearchQuery}
                    onChange={(e) => setShareTargetSearchQuery(e.target.value)}
                    placeholder="이름, 소속팀, 직급"
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '12.5px',
                      width: '100%',
                      color: '#0f172a'
                    }}
                  />
                  {shareTargetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setShareTargetSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllShareTargets}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  전체 선택
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllShareTargets}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: '11.5px',
                    fontWeight: '700',
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
                padding: '6px 10px',
                background: '#f1f5f9',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <span style={{ color: '#1e3a8a', fontWeight: '800' }}>
                  선택된 공유 대상: <strong>{shareTargets.length}명</strong>
                </span>
              </div>

              {/* User List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {allUsers
                  .filter(u => {
                    if (isSamePerson(currentUser, u)) return false;

                    if (!shareTargetSearchQuery.trim()) return true;
                    const q = shareTargetSearchQuery.toLowerCase();
                    return (
                      (u.name || '').toLowerCase().includes(q) ||
                      (u.team || u.department || '').toLowerCase().includes(q) ||
                      (u.rank || '').toLowerCase().includes(q) ||
                      (u.username || '').toLowerCase().includes(q) ||
                      (u.division || '').toLowerCase().includes(q)
                    );
                  })
                  .map(u => {
                    const isSelected = isUserInShareTargets(u);

                    return (
                      <div
                        key={u.username || u.id}
                        onClick={() => handleToggleUserShareTarget(u)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(59, 130, 246, 0.12)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div style={{ color: isSelected ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                                {u.name}
                              </span>
                              {u.rank && (
                                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>
                                  {u.rank}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
                              <span style={{ color: '#1e3a8a', fontWeight: '700' }}>
                                {u.team || u.department || '소속 미지정'}
                              </span>
                              {u.division && <span>· {u.division}</span>}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b'
                          }}>
                            {isSelected ? '공유 대상' : '제외'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1.5px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsShareTargetModalOpen(false);
                  setPendingShareLogItem(null);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleSaveShareTargetModal}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={15} />
                <span>업무 공유 ({shareTargets.length}명)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
