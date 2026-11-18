import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { buildCalendarWidgetData } from '../../services/appLauncherService';
import { getHolidayName } from '../../data/holidays.js';

// 안드로이드 홈 화면 위젯(WorkCalendarWidgetProvider)과 동일한 구성의 앱 내 캘린더
const pad = (n) => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => {
  const n = new Date();
  return fmt(n.getFullYear(), n.getMonth(), n.getDate());
};

const BADGE_TRIP = { color: '#7C3AED', background: '#F5F3FF', border: '0.5px solid #DDD6FE' };
const BADGE_INTERNAL = { color: '#0284C7', background: '#F0F9FF', border: '0.5px solid #BAE6FD' };

const navBtnStyle = {
  height: '30px',
  minWidth: '32px',
  padding: '0 8px',
  borderRadius: '6px',
  border: 'none',
  background: '#F1F5F9',
  color: '#334155',
  fontSize: '13px',
  fontWeight: '800',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const getCellBadges = (item) => {
  if (!item) return [];
  let trip = String(item.tripBadgeText || '').trim();
  let internal = String(item.internalBadgeText || '').trim();
  const single = String(item.cellWorkText || '').trim();
  const cat = String(item.category || '').trim();
  if (!trip && !internal) {
    if (cat === '출장') trip = single;
    else if (cat === '사내') internal = single;
  }
  if (trip.endsWith(' 출장')) trip = trip.slice(0, -3).trim();
  if (trip && internal) return [{ text: trip, style: BADGE_TRIP }, { text: internal, style: BADGE_INTERNAL }];
  if (trip) return [{ text: trip, style: BADGE_TRIP }];
  if (internal) return [{ text: internal, style: BADGE_INTERNAL }];
  if (single) return [{ text: single, style: cat === '출장' ? BADGE_TRIP : BADGE_INTERNAL }];
  return [];
};

const getStatusColor = (status, category) => {
  if (status.includes('완료')) return '#16A34A';
  if (status.includes('진행중') || status.includes('예정')) return '#D97706';
  if (status.includes('출장') && status.includes('사내')) return '#7C3AED';
  if (status === '출장업무' || category === '출장') return '#0284C7';
  if (status === '사내업무' || category === '사내') return '#2563EB';
  return '#0284C7';
};

export default function MobileWidgetCalendar({ workLogs = [], initialDate, onClose, onOpenDate }) {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(initialDate || today);
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = (initialDate || today).split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const workDatesMap = useMemo(() => buildCalendarWidgetData(workLogs), [workLogs]);

  const { year, month } = viewMonth;
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startIdx = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = Math.floor((startIdx + daysInMonth - 1) / 7) + 1;
    const list = [];
    for (let i = 0; i < rows * 7; i++) {
      const d = new Date(year, month, 1 - startIdx + i);
      list.push({
        dateStr: fmt(d.getFullYear(), d.getMonth(), d.getDate()),
        day: d.getDate(),
        inMonth: d.getMonth() === month,
        col: i % 7
      });
    }
    return list;
  }, [year, month]);

  const moveMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const goToday = () => {
    const [y, m] = today.split('-').map(Number);
    setViewMonth({ year: y, month: m - 1 });
    setSelectedDate(today);
  };

  // 선택 날짜 요약 카드
  const sel = workDatesMap[selectedDate];
  const [, selM, selD] = selectedDate.split('-').map(Number);
  const selHoliday = getHolidayName(selectedDate) || (sel && sel.holidayName) || '';
  const dateLabel = selHoliday ? `${selM}월 ${selD}일 [${selHoliday}]` : `${selM}월 ${selD}일 업무 일정`;
  const lines = sel ? [sel.line1, sel.line2].filter(Boolean) : [];
  const hasWork = Boolean(sel && sel.hasWork && (lines.length > 0 || sel.summaryText || sel.title));
  const status = hasWork ? (sel.status || '업무 등록됨') : (selHoliday ? '공휴일 휴무' : '일정 없음');
  const statusColor = hasWork ? getStatusColor(status, sel.category || '') : (selHoliday ? '#DC2626' : '#94A3B8');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '94vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
          padding: '12px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* 헤더: 월 이동 / 오늘 / 닫기 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button type="button" onClick={onClose} style={{ ...navBtnStyle, background: 'transparent', padding: 0 }} title="닫기">
            <X size={18} />
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={() => moveMonth(-1)} style={navBtnStyle} title="이전 달">◀</button>
          <div style={{ fontSize: '16.5px', fontWeight: '800', color: '#0F172A', margin: '0 6px', whiteSpace: 'nowrap' }}>
            {year}년 {month + 1}월
          </div>
          <button type="button" onClick={() => moveMonth(1)} style={navBtnStyle} title="다음 달">▶</button>
          <button type="button" onClick={goToday} style={{ ...navBtnStyle, color: '#0284C7', fontSize: '12px' }}>오늘</button>
        </div>

        {/* 요일 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
            <div key={w} style={{
              textAlign: 'center',
              fontSize: '12.5px',
              fontWeight: '800',
              color: i === 0 ? '#DC2626' : (i === 6 ? '#2563EB' : '#64748B')
            }}>
              {w}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', rowGap: '2px' }}>
          {cells.map(c => {
            const isToday = c.dateStr === today;
            const isSelected = c.dateStr === selectedDate;
            const isHoliday = Boolean(getHolidayName(c.dateStr));
            const isRedDay = c.col === 0 || isHoliday;
            let color;
            if (!c.inMonth) color = isSelected ? '#0284C7' : (isHoliday ? '#F87171' : '#CBD5E1');
            else if (isToday) color = '#FFFFFF';
            else if (isSelected) color = isRedDay ? '#DC2626' : '#0284C7';
            else color = isRedDay ? '#DC2626' : (c.col === 6 ? '#2563EB' : '#334155');

            let circle = {};
            if (c.inMonth && isToday) circle = { background: '#0284C7' };
            else if (isSelected) circle = { background: '#E0F2FE', boxShadow: 'inset 0 0 0 2px #0284C7' };

            const badges = getCellBadges(workDatesMap[c.dateStr]);
            return (
              <button
                key={c.dateStr}
                type="button"
                onClick={() => setSelectedDate(c.dateStr)}
                style={{
                  minWidth: 0,
                  minHeight: '54px',
                  padding: '1px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '1px'
                }}
              >
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: '800',
                  color,
                  ...circle
                }}>
                  {c.day}
                </span>
                {badges.map((b, idx) => (
                  <span key={idx} style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '9px',
                    fontWeight: '800',
                    lineHeight: '1.25',
                    padding: '0.5px 1px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'center',
                    ...b.style
                  }}>
                    {b.text}
                  </span>
                ))}
              </button>
            );
          })}
        </div>

        {/* 선택 날짜 업무 요약 (누르면 해당 날짜 업무 일지로 이동) */}
        <button
          type="button"
          onClick={() => onOpenDate && onOpenDate(selectedDate)}
          style={{
            width: '100%',
            textAlign: 'left',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '9px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
          title="눌러서 해당 날짜의 업무 일지 보기"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0369A1' }}>{dateLabel}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: '13.5px', fontWeight: '800', color: statusColor }}>{status}</span>
          </div>
          {hasWork ? (
            (lines.length > 0 ? lines : [sel.summaryText || sel.title]).map((line, idx) => (
              <div key={idx} style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1E293B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%'
              }}>
                {line}{selHoliday && idx === lines.length - 1 ? ' (공휴일 근무)' : ''}
              </div>
            ))
          ) : (
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
              {selHoliday ? `${selHoliday} (공휴일) - 등록된 업무 일지가 없습니다.` : '해당 일자에 등록된 업무 일지가 없습니다.'}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
