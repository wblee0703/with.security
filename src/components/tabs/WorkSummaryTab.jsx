import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  Building2,
  User,
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
  FileCode
} from 'lucide-react';
import { dbService } from '../../services/dbService';

export default function WorkSummaryTab({ onTriggerToast }) {
  const [workLogs, setWorkLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const dailyDateInputRef = useRef(null);

  // Today local ISO date (YYYY-MM-DD)
  const getTodayIso = () => {
    const d = new Date();
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

  // Load Work Logs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const logs = await dbService.getWorkLogs();
      setWorkLogs(logs || []);
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

  const dailyLogs = workLogs.filter(log => (log.date || '').startsWith(dailyDate));
  const dailyInternalLogs = dailyLogs.filter(l => l.category === '사내 업무');
  const dailyTripLogs = dailyLogs.filter(l => l.category === '출장 업무');

  // Initial work registration counts for daily (처음 등록 기준 건수)
  const dailyInitialGroups = getInitialWorkGroups(dailyLogs);
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
    setWeeklyMonday(formatIso(mon));
  };

  const handleNextWeek = () => {
    const mon = new Date(weeklyMonday);
    mon.setDate(mon.getDate() + 7);
    setWeeklyMonday(formatIso(mon));
  };

  const handleThisWeek = () => {
    setWeeklyMonday(formatIso(getMonday(new Date())));
  };

  const getWeekText = (monIso) => {
    const mon = new Date(monIso);
    const month = mon.getMonth() + 1;
    const date = mon.getDate();
    const weekNum = Math.ceil(date / 7);
    return `${mon.getFullYear()}년 ${month}월 ${weekNum}주차`;
  };

  const weeklyLogs = workLogs.filter(log => {
    const d = log.date || '';
    return d >= weeklyRange.monIso && d <= weeklyRange.sunIso;
  });

  const weeklyInternalLogs = weeklyLogs.filter(l => l.category === '사내 업무');
  const weeklyTripLogs = weeklyLogs.filter(l => l.category === '출장 업무');
  const weeklyActiveDaysCount = Array.from(new Set(weeklyLogs.map(l => l.date))).length;
  const weeklyAuthors = Array.from(new Set(weeklyLogs.map(l => l.authorName || l.name))).filter(Boolean);

  // Initial work registration counts for weekly (처음 등록 기준 건수)
  const weeklyInitialGroups = getInitialWorkGroups(weeklyLogs);
  const weeklyInitialInternalCount = weeklyInitialGroups.filter(g => g.category === '사내 업무').length;
  const weeklyInitialTripCount = weeklyInitialGroups.filter(g => g.category === '출장 업무').length;
  const weeklyTotalInitialCount = weeklyInitialInternalCount + weeklyInitialTripCount;

  // Group weekly logs by date
  const weeklyGroupedByDate = {};
  weeklyLogs.forEach(log => {
    const d = log.date;
    if (!weeklyGroupedByDate[d]) weeklyGroupedByDate[d] = [];
    weeklyGroupedByDate[d].push(log);
  });
  const sortedWeeklyDates = Object.keys(weeklyGroupedByDate).sort();

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
    if (navigator.share) {
      try {
        await navigator.share({
          title: `[with.security] ${title}`,
          text: text,
        });
        if (onTriggerToast) {
          onTriggerToast(`🔗 [${title}] 공유 완료`, 'success');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Fallback to copy if share fails
          handleCopyText(text, title);
        }
      }
    } else {
      // Fallback to copy if Web Share API is not supported
      handleCopyText(text, title);
      if (onTriggerToast) {
        onTriggerToast(`📋 공유 기능 미지원 브라우저입니다. 클립보드에 복사되었습니다.`, 'info');
      }
    }
  };

  // Group daily trip logs by site
  const dailyTripGroupedBySite = {};
  dailyTripLogs.forEach(log => {
    const siteKey = (log.siteName || log.site_name || '기타 사업장').trim();
    if (!dailyTripGroupedBySite[siteKey]) dailyTripGroupedBySite[siteKey] = [];
    dailyTripGroupedBySite[siteKey].push(log);
  });

  // Group daily internal authors
  const dailyInternalAuthorSet = new Set();
  dailyInternalLogs.forEach(l => {
    const a = l.authorName || l.name || '';
    const tm = l.authorTeam || l.team || '';
    const rk = l.authorRank || l.rank || '';
    let nameLabel = a;
    if (rk && !nameLabel.includes(rk)) nameLabel += ` ${rk}`;
    if (tm && !nameLabel.includes(tm)) nameLabel += ` (${tm})`;
    if (nameLabel) dailyInternalAuthorSet.add(nameLabel);
  });
  const dailyInternalAuthorsText = Array.from(dailyInternalAuthorSet).join(', ') || '담당자 미지정';

  const generateDailyReportText = () => {
    let t = `============================================\n`;
    t += `   [ 일일 업무 수행 보고서 ]\n`;
    t += `============================================\n`;
    t += `• 보고 일자: ${getFormattedKoreanDate(dailyDate)}\n`;
    t += `• 총 업무 실적: 총 ${dailyTotalInitialCount}건 (사내 ${dailyInitialInternalCount}건 / 출장 ${dailyInitialTripCount}건)\n\n`;

    t += `1. 🏢 사내 업무 추진 현황\n`;
    if (dailyInternalLogs.length === 0) {
      t += `   - 사내 업무 기록 없음\n`;
    } else {
      t += `   > 담당자: ${dailyInternalAuthorsText}\n`;
      dailyInternalLogs.forEach((l, i) => {
        t += `   (${i + 1}) ${l.title}\n`;
        if (l.details && l.details.trim()) {
          const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            t += `       ${line.trim()}\n`;
          });
        }
      });
    }

    t += `\n2. 🚗 출장 및 현장 지원 현황\n`;
    const siteKeys = Object.keys(dailyTripGroupedBySite);
    if (siteKeys.length === 0) {
      t += `   - 출장 업무 기록 없음\n`;
    } else {
      siteKeys.forEach((siteKey, siteIdx) => {
        const siteLogs = dailyTripGroupedBySite[siteKey];
        const authorSet = new Set();
        siteLogs.forEach(l => {
          const a = l.authorName || l.name || '';
          const tm = l.authorTeam || l.team || '';
          const rk = l.authorRank || l.rank || '';
          let nameLabel = a;
          if (rk && !nameLabel.includes(rk)) nameLabel += ` ${rk}`;
          if (tm && !nameLabel.includes(tm)) nameLabel += ` (${tm})`;
          if (nameLabel) authorSet.add(nameLabel);

          if (l.companionNames && Array.isArray(l.companionNames)) {
            l.companionNames.forEach(c => c && authorSet.add(c));
          } else if (typeof l.companionNames === 'string' && l.companionNames.trim()) {
            l.companionNames.split(',').forEach(c => c.trim() && authorSet.add(c.trim()));
          }
        });
        const authorsText = Array.from(authorSet).join(', ') || '담당자 미지정';

        t += `   > 출장지: ${siteKey}\n`;
        t += `   > 출장자: ${authorsText}\n`;
        siteLogs.forEach((l, taskIdx) => {
          t += `   (${taskIdx + 1}) ${l.title}\n`;
          if (l.details && l.details.trim()) {
            const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
            lines.forEach(line => {
              t += `       ${line.trim()}\n`;
            });
          }
        });
        if (siteIdx < siteKeys.length - 1) t += `\n`;
      });
    }

    t += `\n3. 📋 종합 총평\n`;
    t += `   - 금일 총 ${dailyTotalInitialCount}건의 안전 관리 및 보안 운영 업무가 정상 조치 완료되었습니다.\n`;
    t += `============================================`;
    return t;
  };

  const generateWeeklyReportText = () => {
    let t = `============================================\n`;
    t += `   [ WithSecurity 주간 업무 종합 보고서 ]\n`;
    t += `============================================\n`;
    t += `• 대상 주차: ${getWeekText(weeklyMonday)} (${weeklyRange.monIso} ~ ${weeklyRange.sunIso})\n`;
    t += `• 주간 총 실적: 총 ${weeklyTotalInitialCount}건 (사내 ${weeklyInitialInternalCount}건 / 출장 ${weeklyInitialTripCount}건)\n`;
    t += `• 활동 일수: ${weeklyActiveDaysCount}일 / 참여 인원: ${weeklyAuthors.length}명\n\n`;

    t += `1. 📅 요일별 업무 수행 실적\n`;
    if (sortedWeeklyDates.length === 0) {
      t += `   - 주간 업무 기록 없음\n`;
    } else {
      sortedWeeklyDates.forEach(dStr => {
        const dayLogs = weeklyGroupedByDate[dStr] || [];
        const dayInitialGroups = getInitialWorkGroups(dayLogs);
        t += `\n ■ ${getFormattedKoreanDate(dStr)} (총 ${dayInitialGroups.length}건)\n`;
        dayLogs.forEach((l, i) => {
          t += `   (${i + 1}) [${l.category}] ${l.title}${l.siteName ? ` @${l.siteName}` : ''}\n`;
          if (l.details && l.details.trim()) {
            const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
            lines.forEach(line => {
              t += `       ${line.trim()}\n`;
            });
          }
        });
      });
    }

    t += `\n\n2. 📌 주간 총평 및 특이사항\n`;
    t += `   - 금주 총 ${weeklyTotalInitialCount}건의 보안 및 사업장 관리 업무가 문제없이 완수되었습니다.\n`;
    t += `============================================`;
    return t;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', paddingBottom: '30px' }}>

      {/* Top Main Banner */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
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
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              업무 정리 레포트
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            color: '#0f172a',
            padding: '8px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin-anim' : ''} /> 새로고침
        </button>
      </div>

      {/* 1:1 Responsive Split Executive Report Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
        alignItems: 'start'
      }}>

        {/* ========================================================================= */}
        {/* LEFT COLUMN: 일일 업무 수행 보고서 (Executive Report Layout) */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

          {/* Header Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '46px',
                height: '46px',
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
                <CalendarDays size={24} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  일일 업무 수행 보고
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  일일 단위 업무 추진 실적 및 요약
                </div>
              </div>
            </div>
          </div>

          {/* Daily Date Controller & Copy Report Action Bar (Same Row) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1.5px solid #cbd5e1', padding: '4px 10px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <button
                type="button"
                onClick={handlePrevDay}
                style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
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
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'background 0.2s ease',
                  userSelect: 'none'
                }}
                title="클릭하여 달력에서 날짜 선택"
              >
                <Calendar size={13} color="#0284c7" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0284c7', whiteSpace: 'nowrap' }}>
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
                style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                title="다음일"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleToday}
                style={{
                  background: 'rgba(14, 165, 233, 0.12)',
                  border: '1.5px solid #bae6fd',
                  color: '#0284c7',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginLeft: '2px'
                }}
              >
                오늘
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleCopyText(generateDailyReportText(), '일일 업무 일지')}
                style={{
                  background: '#f0f9ff',
                  border: '1.5px solid #7dd3fc',
                  color: '#0284c7',
                  padding: '6px 11px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.12)'
                }}
                title="일일 업무 보고서 텍스트 복사"
              >
                <Copy size={13} /> 복사
              </button>
              <button
                type="button"
                onClick={() => handleShareText(generateDailyReportText(), '일일 업무 일지')}
                style={{
                  background: '#0284c7',
                  border: '1.5px solid #0284c7',
                  color: '#ffffff',
                  padding: '6px 11px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                }}
                title="일일 업무 보고서 공유 (카카오톡, 메신저 등)"
              >
                <Share2 size={13} /> 공유
              </button>
            </div>
          </div>

          {/* Report Sheet Document Frame */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)'
          }}>
            {/* Report Document Title Header Block */}
            <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                일일 업무 일지
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                작성일: {getFormattedKoreanDate(dailyDate)}
              </div>
            </div>

            {/* Official Report Summary Table Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '8px 10px', borderRight: '1.5px solid #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>총 수행 건수</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>{dailyTotalInitialCount}건</div>
              </div>
              <div style={{ padding: '8px 10px', borderRight: '1.5px solid #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>사내 업무</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>{dailyInitialInternalCount}건</div>
              </div>
              <div style={{ padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>출장 업무</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#7c3aed', marginTop: '2px' }}>{dailyInitialTripCount}건</div>
              </div>
            </div>

            {dailyLogs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: '700' }}>선택일자에 등록된 업무 기록이 없습니다.</div>
              </div>
            ) : (
              <>
                {/* Section 1: 🏢 사내 업무 보고 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                      1. 사내 업무 추진 실적 ({dailyInitialInternalCount}건)
                    </div>
                    {dailyInternalLogs.length > 0 && (
                      <span style={{ fontSize: '11.5px', color: '#475569', paddingRight: '4px' }}>
                        담당자: <strong style={{ color: '#0f172a' }}>{dailyInternalAuthorsText}</strong>
                      </span>
                    )}
                  </div>

                  {dailyInternalLogs.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '12px' }}>- 해당 내역 없음</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '6px' }}>
                      {dailyInternalLogs.map((item, idx) => (
                        <div key={item.id || idx} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '11px' }}>▪ ({idx + 1})</span>
                            <span>{item.title}</span>
                          </div>
                          {item.details && (
                            <div style={{ fontSize: '12px', color: '#334155', marginTop: '6px', paddingLeft: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {item.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: 🚗 출장 업무 보고 (사업장별 그룹화 & 출장자 통합) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #7c3aed', paddingLeft: '8px' }}>
                    2. 출장 및 현장 지원 실적 ({dailyInitialTripCount}건)
                  </div>

                  {dailyTripLogs.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '12px' }}>- 해당 내역 없음</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '6px' }}>
                      {Object.keys(dailyTripGroupedBySite).map((siteKey, sIdx) => {
                        const siteLogs = dailyTripGroupedBySite[siteKey];
                        const authorSet = new Set();
                        siteLogs.forEach(l => {
                          const a = l.authorName || l.name || '';
                          const tm = l.authorTeam || l.team || '';
                          const rk = l.authorRank || l.rank || '';
                          let nameLabel = a;
                          if (rk && !nameLabel.includes(rk)) nameLabel += ` ${rk}`;
                          if (tm && !nameLabel.includes(tm)) nameLabel += ` (${tm})`;
                          if (nameLabel) authorSet.add(nameLabel);

                          if (l.companionNames && Array.isArray(l.companionNames)) {
                            l.companionNames.forEach(c => c && authorSet.add(c));
                          } else if (typeof l.companionNames === 'string' && l.companionNames.trim()) {
                            l.companionNames.split(',').forEach(c => c.trim() && authorSet.add(c.trim()));
                          }
                        });
                        const authorsText = Array.from(authorSet).join(', ') || '담당자 미지정';

                        return (
                          <div key={siteKey || sIdx} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '12px 14px' }}>
                            {/* Site Header & Combined Authors */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                              <span style={{ color: '#6d28d9', fontSize: '12.5px', fontWeight: '800', background: 'rgba(124, 58, 237, 0.1)', border: '1.5px solid #c4b5fd', padding: '3px 8px', borderRadius: '6px' }}>
                                📍 {siteKey}
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#475569' }}>
                                출장자: <strong style={{ color: '#0f172a' }}>{authorsText}</strong>
                              </span>
                            </div>

                            {/* Task Items under this Site */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {siteLogs.map((item, tIdx) => (
                                <div key={item.id || tIdx} style={{ paddingLeft: '4px' }}>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#7c3aed', fontWeight: '800', fontSize: '11px' }}>▪ ({tIdx + 1})</span>
                                    <span>{item.title}</span>
                                  </div>
                                  {item.details && (
                                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px', paddingLeft: '18px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
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

                {/* Section 3: 📋 종합 총평 */}
                <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    3. 종합 총평
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#0f172a', lineHeight: '1.5', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}>
                    ▪ 금일 등록된 총 {dailyTotalInitialCount}건의 사내 및 출장 업무 조치 사항이 모두 정상적으로 완수되었습니다.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: 주간 업무 보고서 (Official Weekly Report Sheet) */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

          {/* Header Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', border: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '46px',
                height: '46px',
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
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  주간 업무 종합 보고
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  주간 단위 업무 추진 실적 및 요약
                </div>
              </div>
            </div>
          </div>

          {/* Date Controls & Copy Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1.5px solid #cbd5e1', padding: '4px 10px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <button
                type="button"
                onClick={handlePrevWeek}
                style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                title="이전주"
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#7c3aed', padding: '0 4px' }}>
                {getWeekText(weeklyMonday)}
              </span>

              <button
                type="button"
                onClick={handleNextWeek}
                style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                title="다음주"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleThisWeek}
                style={{
                  background: 'rgba(124, 58, 237, 0.12)',
                  border: '1.5px solid #e9d5ff',
                  color: '#7c3aed',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginLeft: '2px'
                }}
              >
                이번주
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleCopyText(generateWeeklyReportText(), '주간 업무 보고서')}
                style={{
                  background: '#faf5ff',
                  border: '1.5px solid #c4b5fd',
                  color: '#7c3aed',
                  padding: '6px 11px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.12)'
                }}
                title="주간 업무 보고서 텍스트 복사"
              >
                <Copy size={13} /> 복사
              </button>
              <button
                type="button"
                onClick={() => handleShareText(generateWeeklyReportText(), '주간 업무 보고서')}
                style={{
                  background: '#7c3aed',
                  border: '1.5px solid #7c3aed',
                  color: '#ffffff',
                  padding: '6px 11px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
                }}
                title="주간 업무 보고서 공유 (카카오톡, 메신저 등)"
              >
                <Share2 size={13} /> 공유
              </button>
            </div>
          </div>

          {/* Report Sheet Document Frame */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)'
          }}>
            {/* Report Document Title Header Block */}
            <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                주간 업무 보고서
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                기간: {weeklyRange.monIso} ~ {weeklyRange.sunIso}
              </div>
            </div>

            {/* Official Report Summary Table Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '8px 10px', borderRight: '1.5px solid #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>주간 총 실적</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#7c3aed', marginTop: '2px' }}>{weeklyTotalInitialCount}건</div>
              </div>
              <div style={{ padding: '8px 10px', borderRight: '1.5px solid #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>활동 일수</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>{weeklyActiveDaysCount}일</div>
              </div>
              <div style={{ padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>참여 인원</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>{weeklyAuthors.length}명</div>
              </div>
            </div>

            {weeklyLogs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: '700' }}>해당 주차에 등록된 업무 기록이 없습니다.</div>
              </div>
            ) : (
              <>
                {/* Section 1: 📅 요일별 상세 보고 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#7c3aed', borderLeft: '3px solid #7c3aed', paddingLeft: '8px' }}>
                    1. 요일별 상세 업무 보고
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    {sortedWeeklyDates.map(dStr => {
                      const dayLogs = weeklyGroupedByDate[dStr] || [];
                      const dayInitialGroups = getInitialWorkGroups(dayLogs);
                      return (
                        <div key={dStr} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#6d28d9', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                            ■ {getFormattedKoreanDate(dStr)} (총 {dayInitialGroups.length}건)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dayLogs.map((item, idx) => (
                              <div key={item.id || idx} style={{ fontSize: '12px', color: '#334155', paddingLeft: '4px' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: item.category === '출장 업무' ? '#7c3aed' : '#0284c7', fontSize: '11px', fontWeight: '800' }}>
                                    ({idx + 1})
                                  </span>
                                  <span>[{item.category}] {item.title}</span>
                                  {item.siteName && <span style={{ fontSize: '10.5px', color: '#7c3aed', fontWeight: '700' }}>@{item.siteName}</span>}
                                </div>
                                {item.details && (
                                  <div style={{ fontSize: '11.5px', color: '#475569', paddingLeft: '14px', marginTop: '2px', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
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
                </div>

                {/* Section 2: 📌 주간 종합 총평 및 시사점 */}
                <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    2. 주간 종합 총평 및 시사점
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#0f172a', lineHeight: '1.5', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}>
                    ▪ 금주 총 {weeklyTotalInitialCount}건의 업무(사내 {weeklyInitialInternalCount}건, 출장 {weeklyInitialTripCount}건)가 안전 규정에 따라 정상적으로 추진되었습니다.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
