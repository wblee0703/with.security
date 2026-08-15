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
  Square
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

  // Hook for back-button popup dismissal
  useModalBack(isModalOpen, () => setIsModalOpen(false), 'worklog-form-modal');
  useModalBack(isPastWorkModalOpen, () => setIsPastWorkModalOpen(false), 'worklog-past-modal');
  const [editingLogId, setEditingLogId] = useState(null);
  const [extraTasks, setExtraTasks] = useState([]); // Multiple tasks state

  // Inline editing state for editing task directly inside list card
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineForm, setInlineForm] = useState({ title: '', details: '' });

  // Inline adding state for adding new task directly inside list card without modal
  const [inlineAddingCardKey, setInlineAddingCardKey] = useState(null);
  const [inlineNewForm, setInlineNewForm] = useState({ title: '', details: '' });

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
      id: `worklog-${Date.now().toString().slice(-6)}`,
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

  // Helper for Korean Date Formatting (e.g. 2026년 08월 11일 (화요일))
  const getFormattedKoreanDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
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
      date: getTodayIsoDate(),
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
    if (currentUser.username && log.authorUsername && currentUser.username === log.authorUsername) {
      return true;
    }
    if (currentUser.name?.trim() === log.authorName?.trim()) {
      return true;
    }
    return false;
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

  // Filter logs by selectedDate (unless viewAllDates is true), category, and search query
  const filteredLogs = workLogs.filter(log => {
    const matchesDate = viewAllDates || log.date === selectedDate;
    const matchesCategory = filterCategory === '전체' || log.category === filterCategory;
    const matchesQuery = !searchQuery.trim() ||
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesCategory && matchesQuery;
  });

  // Group logs by Date (descending)
  const groupedByDate = filteredLogs.reduce((acc, log) => {
    const d = log.date || '기타 날짜';
    if (!acc[d]) acc[d] = [];
    acc[d].push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Filter and sort past logs for the Past Work Copy Modal
  const filteredPastLogs = workLogs
    .filter(log => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Main 2-Column Responsive Layout for Work Log Management & Desktop Calendar */}
      <div className="work-log-desktop-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '24px',
        alignItems: 'start',
        width: '100%'
      }}>
        {/* Left Column: Header Banner, Date Navigation, Search Filter, & Work Log List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '18px', border: '1.5px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  border: '1.5px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 10px rgba(14, 165, 233, 0.25)',
                  flexShrink: 0
                }}>
                  <ClipboardList size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                    업무 일지 관리
                  </div>
                </div>
              </div>

              {/* Action Buttons: Stacked Vertically with Equal Width */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '124px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleOpenPastWorkModal}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    background: '#f0f9ff',
                    border: '1.5px solid #7dd3fc',
                    color: '#0284c7',
                    boxShadow: '0 2px 6px rgba(14, 165, 233, 0.1)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  title="이전에 작성된 업무 일지 목록에서 선택하여 현재 날짜로 복사 등록"
                >
                  <Copy size={13} /> 이전 업무 추가
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="glass-button-primary"
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    border: '1px solid #0284c7',
                    boxShadow: '0 3px 10px rgba(14, 165, 233, 0.22)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={14} /> 업무 추가
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Date Selector Navigation Bar (2-Row Layout) */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            borderRadius: '18px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
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

              {/* Interactive Date Picker Button (Entire Area Clickable -> Triggers Calendar Popup) */}
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: '#f0f9ff',
                  border: '1.5px solid #7dd3fc',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {/* Visual Button Text & Icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0284c7',
                  fontSize: '13px',
                  fontWeight: '800',
                  pointerEvents: 'none'
                }}>
                  <Calendar size={15} color="#0284c7" />
                  <span>{viewAllDates ? '전체 날짜 업무 일지' : getFormattedKoreanDate(selectedDate)}</span>
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

            {/* Line 2 (Below Line): [Today Button] --- [Count Display] --- [View All Toggle Button] */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              paddingTop: '10px',
              borderTop: '1.5px solid #e2e8f0',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={handleToday}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  border: selectedDate === getTodayIsoDate() && !viewAllDates
                    ? '1.5px solid #0284c7'
                    : '1.5px solid #cbd5e1',
                  background: selectedDate === getTodayIsoDate() && !viewAllDates
                    ? 'rgba(2, 132, 199, 0.1)'
                    : '#f8fafc',
                  color: selectedDate === getTodayIsoDate() && !viewAllDates ? '#0284c7' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                오늘
              </button>

              <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {viewAllDates ? '전체 업무 일지:' : '해당 날짜 업무 일지:'} <strong style={{ color: '#0284c7', fontSize: '15px', fontWeight: '800' }}>{filteredLogs.length}건</strong>
              </div>

              <button
                type="button"
                onClick={() => setViewAllDates(!viewAllDates)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  border: viewAllDates ? '1.5px solid #7c3aed' : '1.5px solid #cbd5e1',
                  background: viewAllDates ? 'rgba(124, 58, 237, 0.1)' : '#f8fafc',
                  color: viewAllDates ? '#7c3aed' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {viewAllDates ? '📅 날짜별 보기' : '🌐 전체 보기'}
              </button>
            </div>
          </div>

          {/* Filter Bar & Search (Single Row Matching Layout) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', flexWrap: 'nowrap' }}>
            {/* Category Segmented Control */}
            <div style={{ display: 'flex', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1.5px solid #cbd5e1', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              {['전체', '사내 업무', '출장 업무'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: filterCategory === cat ? '1px solid #e2e8f0' : '1px solid transparent',
                    background: filterCategory === cat ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' : 'transparent',
                    color: filterCategory === cat ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat === '사내 업무' && '🏢 '}
                  {cat === '출장 업무' && '🚗 '}
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
                  borderRadius: '12px',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {sortedDates.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: '20px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ClipboardList size={36} color="#0284c7" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {viewAllDates ? '등록된 업무 일지가 없습니다.' : `${getFormattedKoreanDate(selectedDate)}에 등록된 업무 일지가 없습니다.`}
                </div>
                <div style={{ fontSize: '12px', marginTop: '6px', color: '#64748b' }}>
                  이전에 작성했던 업무를 그대로 가져오거나 새로운 업무를 등록해 보세요.
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
                      background: '#f0f9ff',
                      border: '1.5px solid #7dd3fc',
                      color: '#0284c7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(14, 165, 233, 0.12)'
                    }}
                  >
                    <Copy size={14} /> 이전 업무 가져오기
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    <Plus size={14} /> 신규 업무 등록
                  </button>
                </div>
              </div>
            ) : (
              sortedDates.map(dateStr => (
                <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Date Header (Crisp High-Contrast Colors) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', paddingTop: '4px' }}>
                    <Calendar size={16} color="#0284c7" />
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.2px' }}>
                      {getFormattedKoreanDate(dateStr)}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#0284c7',
                      background: 'rgba(14, 165, 233, 0.1)',
                      border: '1px solid #bae6fd',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      총 {groupedByDate[dateStr].length}건
                    </span>
                  </div>

                  {/* Logs Grid for this date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                      return Object.values(cardGroupsMap).map(group => (
                        <div
                          key={group.key}
                          className="glass-panel"
                          style={{
                            padding: '18px 20px',
                            borderRadius: '16px',
                            border: '1.5px solid #cbd5e1',
                            borderLeft: group.category === '출장 업무' ? '4px solid #7c3aed' : '4px solid #0284c7',
                            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
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
                                background: group.category === '출장 업무' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(14, 165, 233, 0.12)',
                                color: group.category === '출장 업무' ? '#7c3aed' : '#0284c7',
                                border: `1.5px solid ${group.category === '출장 업무' ? '#c4b5fd' : '#7dd3fc'}`
                              }}>
                                {group.category === '출장 업무' ? '🚗 출장 업무' : '🏢 사내 업무'}
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
                                  📍 {group.siteName}
                                </span>
                              )}

                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                                ({group.items.length}건)
                              </span>
                            </div>

                            {/* Action Buttons: Add Task to this Card Group */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleStartInlineAdd(group.primaryLog, group.key)}
                                style={{
                                  background: '#f0f9ff',
                                  border: '1.5px solid #7dd3fc',
                                  color: '#0284c7',
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
                                  boxShadow: '0 2px 6px rgba(14, 165, 233, 0.1)'
                                }}
                                title="이 카드의 업무 분류/날짜/사업장에 새 업무 바로 추가"
                              >
                                <Plus size={13} /> 추가
                              </button>
                            </div>
                          </div>

                          {/* Author & Info Line (Rendered once per card) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap', paddingTop: '2px', paddingBottom: '4px', borderBottom: '1.5px solid #e2e8f0' }}>
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>
                              👤 {group.authorName} {group.authorRank || ''}
                            </span>
                            <span>|</span>
                            <span style={{ color: '#0284c7', fontWeight: '700' }}>
                              {formatOnlyTeam(group.authorTeam)}
                            </span>
                            <span>|</span>
                            <span className="mono-font">🕒 {group.createdAt}</span>
                          </div>

                          {/* Nested List of Tasks (Titles & Details) inside this Card */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[...group.items]
                              .sort((a, b) => (a.createdAt || a.id || '').localeCompare(b.createdAt || b.id || ''))
                              .map((item, itemIdx) => {
                                const isEditingThis = inlineEditingId === item.id;

                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      background: isEditingThis ? '#f0f9ff' : '#f8fafc',
                                      border: `1.5px solid ${isEditingThis ? '#7dd3fc' : '#cbd5e1'}`,
                                      borderRadius: '12px',
                                      padding: '12px 14px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {isEditingThis ? (
                                      /* Inline Editing Mode */
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0284c7' }}>
                                            #{itemIdx + 1}
                                          </span>
                                          <input
                                            type="text"
                                            value={inlineForm.title}
                                            onChange={(e) => setInlineForm({ ...inlineForm, title: e.target.value })}
                                            style={{
                                              flex: 1,
                                              padding: '7px 10px',
                                              borderRadius: '8px',
                                              background: '#ffffff',
                                              border: '1px solid #3b82f6',
                                              color: '#0f172a',
                                              fontSize: '14px',
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
                                            borderRadius: '8px',
                                            background: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            color: '#334155',
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
                                              borderRadius: '6px',
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
                                              borderRadius: '6px',
                                              background: '#0284c7',
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                          <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4' }}>
                                            <span style={{
                                              fontSize: '12px',
                                              fontWeight: '800',
                                              color: group.category === '출장 업무' ? '#7c3aed' : '#0284c7',
                                              paddingTop: '1px'
                                            }}>
                                              #{itemIdx + 1}
                                            </span>
                                            <span>{item.title}</span>
                                          </div>

                                          {canModifyLog(item) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                              <button
                                                type="button"
                                                onClick={() => handleStartInlineEdit(item)}
                                                style={{
                                                  background: '#ffffff',
                                                  border: '1px solid #cbd5e1',
                                                  color: '#0f172a',
                                                  padding: '3px 8px',
                                                  borderRadius: '6px',
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
                                                <Edit3 size={12} /> 수정
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleInitiateDeleteLog(item)}
                                                style={{
                                                  background: '#ffffff',
                                                  border: '1px solid #fecaca',
                                                  color: '#dc2626',
                                                  padding: '3px 8px',
                                                  borderRadius: '6px',
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
                                            border: '1px solid #e2e8f0',
                                            background: '#ffffff',
                                            padding: '11px 13px',
                                            borderRadius: '8px',
                                            fontSize: '13.5px',
                                            color: '#334155',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: '1.6'
                                          }}>
                                            {item.details}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}

                            {/* Inline Adding New Task Box directly inside this Card */}
                            {inlineAddingCardKey === group.key && (
                              <div style={{
                                background: '#f0f9ff',
                                border: '1.5px solid #7dd3fc',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7' }}>
                                    #{group.items.length + 1}
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
                                      borderRadius: '8px',
                                      background: '#ffffff',
                                      border: '1.5px solid #38bdf8',
                                      color: '#0f172a',
                                      fontSize: '14px',
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
                                    borderRadius: '8px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    color: '#334155',
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
                                      borderRadius: '6px',
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
                                      borderRadius: '6px',
                                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                                      border: 'none',
                                      color: '#ffffff',
                                      fontSize: '11.5px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                                    }}
                                  >
                                    추가 완료
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Desktop Calendar Widget */}
        <div className="work-log-calendar-sticky" style={{ position: 'sticky', top: '10px', alignSelf: 'start', height: 'fit-content', minWidth: 0 }}>
          <WorkLogCalendar
            workLogs={workLogs}
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
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: '24px',
            padding: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
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
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
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
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
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
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="사내 업무">🏢 사내 업무</option>
                    <option value="출장 업무">🚗 출장 업무</option>
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
                      borderRadius: '10px',
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
                      borderRadius: '10px',
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
                  placeholder="간단하게 업무명을 입력해 주세요."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
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
                    borderRadius: '10px',
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
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      borderRadius: '10px',
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
                      borderRadius: '10px',
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

              {/* Add Extra Task Button in Modal */}
              {!editingLogId && (
                <button
                  type="button"
                  onClick={() => setExtraTasks([...extraTasks, { title: '', details: '' }])}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      marginTop: '2px'
                    }}
                  >
                    <Plus size={14} /> 업무 항목 추가 (+1개 더 작성)
                  </button>
                )}

                {/* Submit / Cancel Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="glass-button"
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="glass-button-primary"
                    style={{
                      flex: 1.5,
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {editingLogId ? '수정 완료' : '업무 일지 저장'}
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
            <div className="glass-panel" style={{
              width: '100%',
              maxWidth: '620px',
              maxHeight: '85vh',
              padding: '24px',
              borderRadius: '24px',
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
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #bae6fd',
                    color: '#0284c7'
                  }}>
                    <Copy size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>이전 업무 불러오기 & 복사</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>
                        대상일: {selectedDate}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      과거 작성된 업무를 선택하여 <strong>[{selectedDate}]</strong> 일자로 복사 등록합니다.
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
                        borderRadius: '12px',
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
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: isCatActive ? '800' : '600',
                            background: isCatActive ? '#0284c7' : '#f1f5f9',
                            color: isCatActive ? '#ffffff' : '#475569',
                            border: isCatActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Multi Select All Toggle */}
                  {filteredPastLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllPastLogs(filteredPastLogs)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                    >
                      {isAllPastLogsSelected ? <CheckSquare size={16} color="#0284c7" /> : <Square size={16} color="#94a3b8" />}
                      전체 선택 ({filteredPastLogs.length}건)
                    </button>
                  )}
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
                          background: isSelected ? '#f0f9ff' : '#ffffff',
                          border: isSelected ? '1.5px solid #0284c7' : '1.5px solid #e2e8f0',
                          boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleToggleSelectPastLog(item.id)}
                      >
                        {/* Left: Checkbox & Log Content */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div style={{ paddingTop: '2px', color: isSelected ? '#0284c7' : '#94a3b8', flexShrink: 0 }}>
                            {isSelected ? <CheckSquare size={18} color="#0284c7" /> : <Square size={18} />}
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
                                📅 {item.date}
                              </span>

                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                background: isBusinessTrip ? 'rgba(245, 158, 11, 0.12)' : 'rgba(14, 165, 233, 0.12)',
                                color: isBusinessTrip ? '#d97706' : '#0284c7',
                                border: isBusinessTrip ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(14, 165, 233, 0.25)'
                              }}>
                                {isBusinessTrip ? '🚗 출장' : '🏢 사내'}
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
                                  📍 {siteLabel}
                                </span>
                              )}

                              {item.authorName && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  👤 {item.authorName}
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

                        {/* Right: Quick 1-Click Copy Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopySinglePastLog(item);
                          }}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '10px',
                            background: '#f0f9ff',
                            border: '1.5px solid #7dd3fc',
                            color: '#0284c7',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#0284c7';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f0f9ff';
                            e.currentTarget.style.color = '#0284c7';
                          }}
                          title={`'${item.title}' 업무를 [${selectedDate}]로 바로 복사`}
                        >
                          <Copy size={13} /> 복사
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                  선택된 항목: <strong style={{ color: selectedPastLogIds.length > 0 ? '#0284c7' : '#0f172a' }}>{selectedPastLogIds.length}</strong>건
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
                      borderRadius: '12px',
                      background: selectedPastLogIds.length > 0
                        ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                        : '#cbd5e1',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: selectedPastLogIds.length > 0 ? 'pointer' : 'not-allowed',
                      boxShadow: selectedPastLogIds.length > 0 ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Copy size={15} /> 선택한 {selectedPastLogIds.length > 0 ? `${selectedPastLogIds.length}건 ` : ''}복사 등록
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
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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

    </div>
  );
}
