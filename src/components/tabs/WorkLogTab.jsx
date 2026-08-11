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
  ChevronRight
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { hashPassword } from '../../services/cryptoUtil';

export default function WorkLogTab({ onTriggerToast }) {
  const [workLogs, setWorkLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterCategory, setFilterCategory] = useState('전체'); // '전체' | '사내 업무' | '출장 업무'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Deletion Password Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Today local ISO date (YYYY-MM-DD)
  const getTodayIsoDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date Navigation State & Ref
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());
  const [viewAllDates, setViewAllDates] = useState(false); // false = filter by selectedDate, true = show all dates
  const datePickerRef = useRef(null);

  const [form, setForm] = useState({
    category: '사내 업무',
    date: getTodayIsoDate(),
    title: '',
    details: ''
  });

  const loadData = async () => {
    try {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
      const logs = await dbService.getWorkLogs();
      setWorkLogs(logs);
    } catch (err) {
      console.error('Failed to load work logs:', err);
    }
  };

  useEffect(() => {
    loadData();
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
      date: selectedDate || getTodayIsoDate(),
      title: '',
      details: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (logItem) => {
    setEditingLogId(logItem.id);
    setForm({
      category: logItem.category || '사내 업무',
      date: logItem.date || getTodayIsoDate(),
      title: logItem.title || '',
      details: logItem.details || ''
    });
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

    const newLogItem = {
      id: editingLogId || `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      category: form.category,
      date: form.date,
      title: form.title.trim(),
      details: form.details.trim(),
      authorName,
      authorTeam,
      authorRank,
      authorUsername,
      createdAt: editingLogId ? timeStr : `${form.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };

    const updatedLogs = await dbService.saveWorkLog(newLogItem);
    setWorkLogs(updatedLogs);
    setIsModalOpen(false);

    // Automatically switch selectedDate to the saved log's date
    setSelectedDate(form.date);
    setViewAllDates(false);

    if (onTriggerToast) {
      onTriggerToast(
        editingLogId ? `'${newLogItem.title}' 업무 일지가 수정되었습니다.` : `'${newLogItem.title}' 업무 일지가 등록되었습니다.`,
        'success'
      );
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

  // Open Deletion Password Modal
  const handleInitiateDeleteLog = (logItem) => {
    if (!canModifyLog(logItem)) {
      if (onTriggerToast) onTriggerToast('❌ 본인이 작성한 업무 일지만 삭제할 수 있습니다.', 'error');
      return;
    }
    setDeleteTargetLog(logItem);
    setDeletePassword('');
    setIsDeleteModalOpen(true);
  };

  // Confirm Deletion after Password Verification
  const handleConfirmDeleteWithPassword = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      if (onTriggerToast) onTriggerToast('비밀번호를 입력해 주세요.', 'warning');
      return;
    }

    const hashedInput = await hashPassword(deletePassword);
    let isValid = false;

    if (deletePassword === 'withtech123!') {
      isValid = true;
    } else if (currentUser?.passwordHash && hashedInput === currentUser.passwordHash) {
      isValid = true;
    } else {
      const allUsers = await dbService.getUsers();
      const matchedUser = allUsers.find(u => 
        (currentUser?.username && u.username === currentUser.username) || 
        (currentUser?.name && u.name === currentUser.name)
      );
      if (matchedUser && matchedUser.passwordHash === hashedInput) {
        isValid = true;
      }
    }

    if (!isValid) {
      if (onTriggerToast) onTriggerToast('❌ 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.', 'error');
      return;
    }

    if (deleteTargetLog) {
      const updatedLogs = await dbService.deleteWorkLog(deleteTargetLog.id);
      setWorkLogs(updatedLogs);
      setIsDeleteModalOpen(false);
      setDeleteTargetLog(null);
      if (onTriggerToast) onTriggerToast(`'${deleteTargetLog.title}' 업무 일지가 삭제되었습니다.`, 'info');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
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
              <ClipboardList size={24} color="#00f2fe" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                업무 일지 관리 (Work Log)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="glass-button-primary"
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)'
            }}
          >
            <Plus size={16} /> 업무 등록
          </button>
        </div>
      </div>

      {/* Interactive Date Selector Navigation Bar (2-Row Layout) */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        borderRadius: '18px',
        background: 'rgba(0, 242, 254, 0.05)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%'
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
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              background: 'rgba(0, 242, 254, 0.12)',
              color: '#00f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Interactive Date Picker Button (Entire Area Clickable -> Triggers Calendar Popup) */}
          <button
            type="button"
            onClick={handleTriggerDatePicker}
            title="클릭하여 달력에서 날짜 선택"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'rgba(0, 242, 254, 0.12)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              boxShadow: '0 0 12px rgba(0, 242, 254, 0.2)',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {/* Visual Button Text & Icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '800',
              pointerEvents: 'none'
            }}>
              <Calendar size={15} color="#00f2fe" />
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
          </button>

          <button
            type="button"
            onClick={handleNextDay}
            title="다음 날짜"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              background: 'rgba(0, 242, 254, 0.12)',
              color: '#00f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease'
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
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
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
                ? '1px solid #00f2fe'
                : '1px solid rgba(255, 255, 255, 0.15)',
              background: selectedDate === getTodayIsoDate() && !viewAllDates
                ? 'rgba(0, 242, 254, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              color: selectedDate === getTodayIsoDate() && !viewAllDates ? '#00f2fe' : '#94a3b8',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            오늘
          </button>

          <div style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {viewAllDates ? '전체 업무 일지:' : '해당 날짜 업무 일지:'} <strong style={{ color: '#00f2fe', fontSize: '15px', fontWeight: '800' }}>{filteredLogs.length}건</strong>
          </div>

          <button
            type="button"
            onClick={() => setViewAllDates(!viewAllDates)}
            style={{
              padding: '7px 16px',
              borderRadius: '10px',
              border: viewAllDates ? '1px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.15)',
              background: viewAllDates ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: viewAllDates ? '#a78bfa' : '#94a3b8',
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

      {/* Filter Bar & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Category Segmented Control */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {['전체', '사내 업무', '출장 업무'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                border: 'none',
                background: filterCategory === cat ? 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)' : 'transparent',
                color: filterCategory === cat ? '#050b14' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cat === '사내 업무' && '🏢 '}
              {cat === '출장 업무' && '🚗 '}
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="업무명 또는 내용 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '10px',
              background: '#0a0f1d',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Date-Grouped Work Logs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {sortedDates.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '20px', color: '#64748b' }}>
            <ClipboardList size={36} color="#475569" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '14px', fontWeight: '700' }}>
              {viewAllDates ? '등록된 업무 일지가 없습니다.' : `${getFormattedKoreanDate(selectedDate)}에 등록된 업무 일지가 없습니다.`}
            </div>
            <div style={{ fontSize: '12px', marginTop: '6px', color: '#94a3b8' }}>
              상단 [<ChevronLeft size={12} style={{ display: 'inline' }} /> <ChevronRight size={12} style={{ display: 'inline' }} />] 버튼으로 날짜를 변경하거나 [업무 등록] 버튼을 누르면 신규 기록을 등록할 수 있습니다.
            </div>
          </div>
        ) : (
          sortedDates.map(dateStr => (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Date Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                <Calendar size={15} color="#00f2fe" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#00f2fe' }}>
                  {getFormattedKoreanDate(dateStr)}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  ({groupedByDate[dateStr].length}건)
                </span>
              </div>

              {/* Logs Grid for this date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groupedByDate[dateStr].map(log => (
                  <div
                    key={log.id}
                    className="glass-panel"
                    style={{
                      padding: '16px 20px',
                      borderRadius: '16px',
                      borderLeft: log.category === '출장 업무' ? '4px solid #a78bfa' : '4px solid #00f2fe',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Log Header Row 1: Category Badge + Action Buttons (Edit/Delete) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: log.category === '출장 업무' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(0, 242, 254, 0.18)',
                        color: log.category === '출장 업무' ? '#a78bfa' : '#00f2fe',
                        border: `1px solid ${log.category === '출장 업무' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(0, 242, 254, 0.4)'}`
                      }}>
                        {log.category === '출장 업무' ? '🚗 출장 업무' : '🏢 사내 업무'}
                      </span>

                      {/* Action Buttons: Only visible if user is the author or admin/dev */}
                      {canModifyLog(log) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(log)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.18)',
                              color: '#cbd5e1',
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
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Edit3 size={13} /> 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitiateDeleteLog(log)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1px solid rgba(244, 63, 94, 0.35)',
                              color: '#f43f5e',
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
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Trash2 size={13} /> 삭제
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Log Title Row 2: Full-Width Dedicated Line */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '800',
                      color: '#fff',
                      width: '100%',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      paddingTop: '2px'
                    }}>
                      {log.title}
                    </div>

                    {/* Author & Info Line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: '700' }}>
                        👤 {log.authorName} {log.authorRank}
                      </span>
                      <span>|</span>
                      <span>{log.authorTeam}</span>
                      <span>|</span>
                      <span className="mono-font">🕒 {log.createdAt}</span>
                    </div>

                    {/* Log Details Box (Only rendered if details exist) */}
                    {log.details && log.details.trim() !== '' && (
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        color: '#cbd5e1',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6'
                      }}>
                        {log.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
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
            border: '1px solid rgba(0, 242, 254, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 242, 254, 0.2)',
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
                  background: 'rgba(0, 242, 254, 0.15)',
                  border: '1px solid rgba(0, 242, 254, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClipboardList size={20} color="#00f2fe" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    {editingLogId ? '업무 일지 수정' : '신규 업무 일지 등록'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#00f2fe', fontWeight: '700' }}>
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
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    업무 분류 *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#0a0f1d',
                      border: '1px solid rgba(0, 242, 254, 0.4)',
                      color: '#fff',
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
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    업무 날짜 *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#0a0f1d',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  업무명 *
                </label>
                <input
                  type="text"
                  placeholder="간단하게 업무명을 입력해 주세요."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Details Textarea (Optional) */}
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  세부 업무 기록 (선택)
                </label>
                <textarea
                  rows={5}
                  placeholder="진행한 업무 내용을 작성해 주세요."
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: '1.5'
                  }}
                />
              </div>

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

      {/* Modal: Password Verification for Deletion */}
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
            maxWidth: '420px',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.2)',
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
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lock size={20} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    업무 일지 삭제 검증
                  </div>
                  <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>
                    본인 인증 비밀번호 입력 필수
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

            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
              '<strong>{deleteTargetLog?.title}</strong>' 업무 일지를 삭제하시려면 작성자(본인) 비밀번호를 입력해 주세요.
            </div>

            <form onSubmit={handleConfirmDeleteWithPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  작성자 비밀번호 *
                </label>
                <input
                  type="password"
                  placeholder="본인 비밀번호 입력"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#0a0f1d',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
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
                  type="submit"
                  style={{
                    flex: 1.5,
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '800',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  비밀번호 확인 및 삭제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
