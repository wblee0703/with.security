import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Building2,
  Clock,
  User,
  Plus
} from 'lucide-react';

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
        borderRadius: '20px',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        background: 'rgba(10, 15, 26, 0.85)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        height: 'fit-content',
        minHeight: '580px'
      }}
    >
      {/* Calendar Top Header Bar */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 242, 254, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Title & Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f2fe'
            }}
          >
            <CalendarIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
              {currentYear}년 {currentMonth + 1}월
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              월간 업무 일지 캘린더 <span style={{ color: '#00f2fe', fontWeight: '700' }}>({monthlyLogs.length}건)</span>
            </div>
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
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
              borderRadius: '8px',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              background: 'rgba(0, 242, 254, 0.12)',
              color: '#00f2fe',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="다음 달"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Category Legend & Color Indicators */}
      <div
        style={{
          padding: '8px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe' }} /> 사내 업무
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} /> 출장 업무
          </span>
        </div>
        <div style={{ color: '#64748b', fontSize: '10px' }}>
          날짜 클릭 시 해당 일자 필터링
        </div>
      </div>

      {/* 7-Column Days Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '12px'
        }}
      >
        {weekDays.map((wd, index) => {
          let color = '#94a3b8';
          if (index === 0) color = '#f87171'; // Sun
          if (index === 6) color = '#38bdf8'; // Sat
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
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: 'minmax(84px, 1fr)',
          gap: '1px',
          background: 'rgba(255, 255, 255, 0.06)',
          flex: 1
        }}
      >
        {calendarDays.map((cell, idx) => {
          const isSelected = cell.dateStr && selectedDate === cell.dateStr;
          const isToday = cell.dateStr && cell.dateStr === todayIso;
          const dayLogs = cell.dateStr ? (logsByDate[cell.dateStr] || []) : [];
          const dayOfWeek = idx % 7;

          return (
            <div
              key={idx}
              onClick={() => {
                if (cell.isCurrentMonth && cell.dateStr && onSelectDate) {
                  onSelectDate(cell.dateStr);
                }
              }}
              style={{
                background: cell.isCurrentMonth
                  ? (isSelected ? 'rgba(0, 242, 254, 0.12)' : 'rgba(10, 15, 26, 0.95)')
                  : 'rgba(5, 8, 16, 0.6)',
                opacity: cell.isCurrentMonth ? 1 : 0.4,
                padding: '6px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'relative',
                cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                border: isSelected ? '1px solid rgba(0, 242, 254, 0.6)' : '1px solid transparent'
              }}
            >
              {/* Day Number Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isToday || isSelected ? '800' : '600',
                    color: isToday
                      ? '#00f2fe'
                      : dayOfWeek === 0
                      ? '#f87171'
                      : dayOfWeek === 6
                      ? '#38bdf8'
                      : cell.isCurrentMonth
                      ? '#f1f5f9'
                      : '#64748b',
                    width: isToday ? '22px' : 'auto',
                    height: isToday ? '22px' : 'auto',
                    borderRadius: isToday ? '50%' : '0',
                    background: isToday ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isToday ? '1px solid #00f2fe' : 'none'
                  }}
                >
                  {cell.day}
                </span>

                {cell.isCurrentMonth && dayLogs.length > 0 && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      background: 'rgba(0, 242, 254, 0.15)',
                      color: '#00f2fe'
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
                  scrollbarWidth: 'none'
                }}
              >
                {dayLogs.map((log) => {
                  const isBusinessTrip = log.category === '출장 업무';
                  const bg = isBusinessTrip ? 'rgba(168, 85, 247, 0.18)' : 'rgba(0, 242, 254, 0.15)';
                  const borderColor = isBusinessTrip ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 242, 254, 0.4)';
                  const textColor = isBusinessTrip ? '#d8b4fe' : '#38bdf8';

                  return (
                    <div
                      key={log.id}
                      title={`[${log.category}] ${log.title}\n작성자: ${log.authorName || log.name || ''} (${log.authorTeam || log.team || ''})\n세부내용: ${log.details || '없음'}`}
                      style={{
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        color: textColor,
                        fontSize: '10px',
                        fontWeight: '600',
                        lineHeight: '1.3',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: textColor,
                          flexShrink: 0
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.title}
                      </span>
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
