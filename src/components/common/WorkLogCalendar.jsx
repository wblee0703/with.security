import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Building2,
  Clock,
  User,
  Plus,
  Share2
} from 'lucide-react';
import { getHolidayName } from '../../data/holidays.js';

export default function WorkLogCalendar({
  workLogs = [],
  selectedDate,
  onSelectDate,
  onOpenAddModal
}) {
  // Current view year & month state (default to selectedDate or current date)
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (onSelectDate) onSelectDate(todayStr);
  };

  // Generate calendar days matrix
  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthDays = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        dateStr: null
      });
    }

    // Current month days
    const currentMonthDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      currentMonthDays.push({
        day: d,
        isCurrentMonth: true,
        dateStr
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const totalSlots = prevMonthDays.length + currentMonthDays.length;
    const nextMonthSlots = (totalSlots > 35 ? 42 : 35) - totalSlots;
    const nextMonthDays = [];
    for (let n = 1; n <= nextMonthSlots; n++) {
      nextMonthDays.push({
        day: n,
        isCurrentMonth: false,
        isNextMonth: true,
        dateStr: null
      });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  // Helper for today's ISO date string
  const getTodayIsoDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayIso = getTodayIsoDate();
  const calendarDays = getCalendarDays();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // Map work logs by date for O(1) cell lookup
  const logsByDate = workLogs.reduce((acc, log) => {
    const d = log.date;
    if (d) {
      if (!acc[d]) acc[d] = [];
      acc[d].push(log);
    }
    return acc;
  }, {});

  // Monthly stats
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthlyLogs = workLogs.filter(log => log.date && log.date.startsWith(currentMonthPrefix));

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: '6px',
        border: '1.5px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        height: 'fit-content',
        minHeight: '680px'
      }}
    >
      {/* Calendar Top Header Bar (Year/Month + Color Legends on Left, Controls on Right) */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1.5px solid #cbd5e1',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Title & Month Selector + Category Color Legends */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                border: '1.5px solid #1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
                flexShrink: 0
              }}
            >
              <CalendarIcon size={18} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              {currentYear}년 {currentMonth + 1}월
            </div>
          </div>

          {/* Category Color Legends placed directly next to Year/Month */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1e3a8a', boxShadow: '0 0 0 1px rgba(30, 58, 138, 0.3)' }} /> 사내 업무
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.3)' }} /> 출장 업무
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: '700', whiteSpace: 'nowrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.3)' }} /> 공휴일
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c2410c', fontWeight: '700', whiteSpace: 'nowrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ea580c', boxShadow: '0 0 0 1px rgba(234, 88, 12, 0.3)' }} /> 예정
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1d4ed8', fontWeight: '700', whiteSpace: 'nowrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.3)' }} /> 오늘
            </span>
          </div>
        </div>

        {/* Controls: Prev / Today / Next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
            title="이전 달"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={handleToday}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              background: '#eff6ff',
              color: '#1e3a8a',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
            title="다음 달"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 7-Column Days Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          background: '#ffffff',
          borderBottom: '1.5px solid #cbd5e1',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '12px'
        }}
      >
        {weekDays.map((wd, index) => {
          let color = '#64748b';
          if (index === 0) color = '#ef4444'; // Sun
          if (index === 6) color = '#2563eb'; // Sat
          return (
            <div key={wd} style={{ padding: '10px 0', color }}>
              {wd}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gridAutoRows: 'minmax(110px, 1fr)',
          gap: '1.5px',
          background: '#cbd5e1',
          flex: 1,
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {calendarDays.map((cell, idx) => {
          const isSelected = cell.dateStr && selectedDate === cell.dateStr;
          const isToday = cell.dateStr && cell.dateStr === todayIso;
          const dayLogs = cell.dateStr ? (logsByDate[cell.dateStr] || []) : [];
          const dayOfWeek = idx % 7;
          const holidayName = cell.dateStr ? getHolidayName(cell.dateStr) : null;
          const isHolidayDay = Boolean(holidayName);
          const isRedDay = dayOfWeek === 0 || isHolidayDay;

          return (
            <div
              key={idx}
              onClick={() => {
                if (cell.isCurrentMonth && cell.dateStr && onSelectDate) {
                  onSelectDate(cell.dateStr);
                }
              }}
              style={{
                background: isToday
                  ? '#f0f7ff'
                  : cell.isCurrentMonth
                    ? (isSelected ? '#eff6ff' : (isHolidayDay ? '#fffbfb' : '#ffffff'))
                    : '#f8fafc',
                opacity: cell.isCurrentMonth ? 1 : 0.4,
                padding: '6px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'relative',
                cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                outline: isToday
                  ? '2px solid #2563eb'
                  : (isSelected ? '2px solid #0f172a' : 'none'),
                outlineOffset: '-2px',
                boxShadow: isToday ? 'inset 0 0 0 1px #93c5fd' : 'none',
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              {/* Day Number & Holiday / Today Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                  minWidth: 0,
                  width: '100%',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isToday || isSelected || isRedDay ? '800' : '600',
                      color: isToday
                        ? '#ffffff'
                        : isRedDay
                          ? '#ef4444'
                          : dayOfWeek === 6
                            ? '#2563eb'
                            : cell.isCurrentMonth
                              ? '#0f172a'
                              : '#94a3b8',
                      padding: isToday ? '1px 5px' : '0',
                      borderRadius: isToday ? '4px' : '0',
                      background: isToday
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1.2',
                      boxShadow: isToday ? '0 1px 3px rgba(37, 99, 235, 0.25)' : 'none',
                      flexShrink: 0
                    }}
                  >
                    {cell.day}
                  </span>

                  {/* Holiday Badge (공휴일 명칭) */}
                  {cell.isCurrentMonth && holidayName && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: '800',
                        color: '#dc2626',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '68px',
                        flexShrink: 0
                      }}
                      title={holidayName}
                    >
                      {holidayName}
                    </span>
                  )}

                  {/* Today Badge */}
                  {cell.isCurrentMonth && isToday && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: '800',
                        color: '#1d4ed8',
                        background: '#dbeafe',
                        border: '1px solid #bfdbfe',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    >
                      오늘
                    </span>
                  )}

                  {/* Scheduled Badge for Future Dates */}
                  {cell.isCurrentMonth && cell.dateStr && cell.dateStr > todayIso && dayLogs.length > 0 && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        color: '#c2410c',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    >
                      예정
                    </span>
                  )}
                </div>

                {cell.isCurrentMonth && dayLogs.length > 0 && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '1px 5px',
                      borderRadius: '6px',
                      background: cell.dateStr > todayIso ? '#fff7ed' : '#eff6ff',
                      border: cell.dateStr > todayIso ? '1px solid #fed7aa' : '1px solid #cbd5e1',
                      color: cell.dateStr > todayIso ? '#c2410c' : '#1e3a8a',
                      flexShrink: 0
                    }}
                  >
                    {dayLogs.length}건
                  </span>
                )}
              </div>

              {/* Work Log Titles List inside Calendar Day Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  overflowY: 'auto',
                  maxHeight: '76px',
                  scrollbarWidth: 'none',
                  minWidth: 0,
                  width: '100%',
                  overflowX: 'hidden'
                }}
              >
                {[...dayLogs]
                  .sort((a, b) => {
                    const isATrip = a.category === '출장 업무';
                    const isBTrip = b.category === '출장 업무';
                    if (isATrip && !isBTrip) return -1; // 출장 업무가 최상단으로 이동
                    if (!isATrip && isBTrip) return 1;
                    return (a.createdAt || a.id || '').localeCompare(b.createdAt || b.id || '');
                  })
                  .map((log) => {
                  const isBusinessTrip = log.category === '출장 업무';
                  const bg = isBusinessTrip ? '#faf5ff' : '#eff6ff';
                  const borderColor = isBusinessTrip ? '#e9d5ff' : '#cbd5e1';
                  const textColor = isBusinessTrip ? '#7c3aed' : '#1e3a8a';

                  // Format display text: For 출장 업무, show Site Name and Location
                  const displayText = (() => {
                    if (isBusinessTrip) {
                      const sName = (log.siteName || log.site_name || '').trim();
                      const sAddr = (log.siteAddress || log.site_address || log.location || '').trim();
                      if (sName && sAddr && !sName.includes(sAddr)) {
                        return `${sName} (${sAddr})`;
                      }
                      if (sName) return sName;
                      if (sAddr) return sAddr;
                      return log.title || '출장 업무';
                    }
                    return log.title;
                  })();

                  return (
                    <div
                      key={log.id}
                      title={`[${log.category}] ${isBusinessTrip ? `사업장: ${displayText} / 업무명: ${log.title}` : log.title}\n작성자: ${log.authorName || log.name || ''} (${log.authorTeam || log.team || ''})\n세부내용: ${log.details || '없음'}`}
                      style={{
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        color: textColor,
                        fontSize: '10px',
                        fontWeight: '700',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        minWidth: 0,
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <span
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: log.isShared ? '#16a34a' : textColor,
                          flexShrink: 0
                        }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          flex: 1,
                          display: 'block'
                        }}
                      >
                        {displayText}
                      </span>
                      {log.isShared && (
                        <Share2
                          size={11}
                          color="#16a34a"
                          style={{ flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
