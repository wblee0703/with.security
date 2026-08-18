import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
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
  FileCode
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Capacitor } from '@capacitor/core';
import { shareReportText } from '../../services/appLauncherService';

export default function WorkSummaryTab({ onTriggerToast }) {
  const isNative = Capacitor.isNativePlatform();
  const [isMobile, setIsMobile] = useState(() => {
    if (Capacitor.isNativePlatform()) return true;
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      if (Capacitor.isNativePlatform()) {
        setIsMobile(true);
      } else {
        setIsMobile(window.innerWidth <= 768);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [currentUser, setCurrentUser] = useState(null);
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

  // Load Work Logs & User Profile
  const loadData = async () => {
    setIsLoading(true);
    try {
      const u = await dbService.getUserProfile();
      setCurrentUser(u);
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

    return log.sharedWith.some(target => isSamePerson(target, currentUser));
  };

  // --- Daily Variables ---
  const dailyAllLogs = workLogs.filter(log => (log.date || '').startsWith(dailyDate));
  const dailyOwnLogs = dailyAllLogs.filter(isMyAuthoredLog);
  const dailySharedReceivedLogs = dailyAllLogs.filter(isSharedToMe);
  const dailyMySharedLogs = dailyOwnLogs.filter(l => l.isShared);
  const dailyInternalLogs = dailyOwnLogs.filter(l => l.category === '사내 업무');
  const dailyTripLogs = dailyOwnLogs.filter(l => l.category === '출장 업무');

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
    } catch (err) {
      console.warn('handleShareText error:', err);
      handleCopyText(text, title);
    }
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
    let t = `   [ 일일 업무 일지 ]\n`;
    t += `• 보고 일자: ${getFormattedKoreanDate(dailyDate)}\n`;

    t += `1. 사내 업무\n`;
    if (dailyInternalLogs.length === 0) {
      t += `   - 사내 업무 기록 없음\n`;
    } else {
      t += `   > 담당자: ${dailyInternalAuthorsText}\n`;
      dailyInternalLogs.forEach((l, i) => {
        const shareTag = l.isShared ? ` [공유중${l.sharedWith?.length ? `: ${l.sharedWith.length}명` : ''}]` : '';
        t += `   (${i + 1}) ${l.title}${shareTag}\n`;
        if (l.details && l.details.trim()) {
          const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            t += `       ${line.trim()}\n`;
          });
        }
      });
    }

    t += `\n2. 출장 및 현장 지원\n`;
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
          const shareTag = l.isShared ? ` [공유중${l.sharedWith?.length ? `: ${l.sharedWith.length}명` : ''}]` : '';
          t += `   (${taskIdx + 1}) ${l.title}${shareTag}\n`;
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

    if (dailySharedReceivedLogs.length > 0) {
      t += `\n3. 👥 공유받은 업무 (${dailySharedReceivedLogs.length}건)\n`;
      dailySharedReceivedLogs.forEach((l, i) => {
        const aInfo = `${l.authorName || '작성자'} ${l.authorRank || ''} (${formatOnlyTeam(l.authorTeam)})`;
        t += `   (${i + 1}) [${l.category}${l.siteName ? ` @${l.siteName}` : ''}] ${l.title} (공유자: ${aInfo})\n`;
        if (l.details && l.details.trim()) {
          const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            t += `       ${line.trim()}\n`;
          });
        }
      });
    }

    t += `\n${dailySharedReceivedLogs.length > 0 ? '4' : '3'}. 📋 종합 총평\n`;
    t += `   - 금일 등록된 총 ${dailyTotalInitialCount}건의 안전 관리 및 보안 운영 업무${dailyMySharedLogs.length > 0 ? ` (공유중인 업무 ${dailyMySharedLogs.length}건 포함)` : ''}${dailySharedReceivedLogs.length > 0 ? ` 및 공유받은 업무 ${dailySharedReceivedLogs.length}건` : ''}이 정상 조치 완료되었습니다.\n`;
    return t;
  };

  const generateWeeklyReportText = () => {
    let t = `   [ WithSecurity 주간 업무 일지 ]\n`;
    t += `• 대상 주차: ${getWeekText(weeklyMonday)} (${weeklyRange.monIso} ~ ${weeklyRange.sunIso})\n`;
    t += `• 주간 총 실적: 총 ${weeklyTotalInitialCount}건 (사내 ${weeklyInitialInternalCount}건 / 출장 ${weeklyInitialTripCount}건)${weeklyMySharedLogs.length > 0 ? ` (공유중 ${weeklyMySharedLogs.length}건 포함)` : ''}${weeklySharedReceivedLogs.length > 0 ? ` [공유받음 ${weeklySharedReceivedLogs.length}건]` : ''}\n`;
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
          const shareTag = l.isShared ? ` [공유중${l.sharedWith?.length ? `: ${l.sharedWith.length}명` : ''}]` : '';
          t += `   (${i + 1}) [${l.category}] ${l.title}${l.siteName ? ` @${l.siteName}` : ''}${shareTag}\n`;
          if (l.details && l.details.trim()) {
            const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
            lines.forEach(line => {
              t += `       ${line.trim()}\n`;
            });
          }
        });
      });
    }

    if (weeklySharedReceivedLogs.length > 0) {
      t += `\n\n2. 👥 주간 공유받은 업무 종합 (${weeklySharedReceivedLogs.length}건)\n`;
      weeklySharedReceivedLogs.forEach((l, i) => {
        const aInfo = `${l.authorName || '작성자'} ${l.authorRank || ''} (${formatOnlyTeam(l.authorTeam)})`;
        t += `   (${i + 1}) [${l.date}] [${l.category}${l.siteName ? ` @${l.siteName}` : ''}] ${l.title} (공유자: ${aInfo})\n`;
        if (l.details && l.details.trim()) {
          const lines = l.details.split(/\r?\n/).filter(line => line.trim().length > 0);
          lines.forEach(line => {
            t += `       ${line.trim()}\n`;
          });
        }
      });
    }

    t += `\n\n${weeklySharedReceivedLogs.length > 0 ? '3' : '2'}. 📌 주간 총평 및 특이사항\n`;
    t += `   - 금주 총 ${weeklyTotalInitialCount}건의 보안 및 사업장 관리 업무가 문제없이 완수되었습니다.\n`;
    return t;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', paddingBottom: '30px' }}>

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

      {/* 1:1 Responsive Split Executive Report Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '10px',
        alignItems: 'start'
      }}>

        {/* ========================================================================= */}
        {/* LEFT COLUMN: 일일 업무 보고서 (Unified Daily Report Card) */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{
          padding: '16px 18px',
          borderRadius: '6px',
          border: '1.5px solid #cbd5e1',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          minWidth: 0
        }}>
          {/* Header Bar Row */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {/* Row 1: Title (Icon + 일일 업무) on Left, Action Buttons (복사, 공유) on Right */}
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
                    <CalendarDays size={20} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    일일 업무
                  </div>
                </div>

                {/* Action Buttons: Copy & Share */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generateDailyReportText(), '일일 업무 일지')}
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
                    title="일일 업무 보고서 텍스트 복사"
                  >
                    <Copy size={13} />
                  </button>
                  {isNative && (
                    <button
                      type="button"
                      onClick={() => handleShareText(generateDailyReportText(), '일일 업무 일지')}
                      style={{
                        background: '#1e3a8a',
                        border: '1.5px solid #1e3a8a',
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
                      title="일일 업무 보고서 공유 (카카오톡, 메신저 등)"
                    >
                      <Share2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Daily Date Controller (그 다음 줄에 위치) */}
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
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  일일 업무
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
              </div>

              {/* Action Buttons: Copy & Share */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleCopyText(generateDailyReportText(), '일일 업무 일지')}
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
                  title="일일 업무 보고서 텍스트 복사"
                >
                  <Copy size={13} />
                </button>
                {isNative && (
                  <button
                    type="button"
                    onClick={() => handleShareText(generateDailyReportText(), '일일 업무 일지')}
                    style={{
                      background: '#1e3a8a',
                      border: '1.5px solid #1e3a8a',
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
                    title="일일 업무 보고서 공유 (카카오톡, 메신저 등)"
                  >
                    <Share2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Official Report Summary Table Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: (dailySharedReceivedLogs.length > 0 && dailyMySharedLogs.length > 0) ? 'repeat(5, 1fr)' : (dailySharedReceivedLogs.length > 0 || dailyMySharedLogs.length > 0) ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            overflow: 'hidden',
            width: '100%'
          }}>
            <div className="summary-stat-cell" style={{ borderRight: '1.5px solid #cbd5e1', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>총 수행</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{dailyTotalInitialCount}건</div>
            </div>
            <div className="summary-stat-cell" style={{ borderRight: '1.5px solid #cbd5e1', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>사내</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{dailyInitialInternalCount}건</div>
            </div>
            <div className="summary-stat-cell" style={{ borderRight: (dailySharedReceivedLogs.length > 0 || dailyMySharedLogs.length > 0) ? '1.5px solid #cbd5e1' : 'none', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>출장</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{dailyInitialTripCount}건</div>
            </div>
            {dailySharedReceivedLogs.length > 0 && (
              <div className="summary-stat-cell" style={{ borderRight: dailyMySharedLogs.length > 0 ? '1.5px solid #cbd5e1' : 'none', background: '#eff6ff', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', color: '#1d4ed8', fontWeight: '700', textAlign: 'center' }}>공유받음</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#1d4ed8', textAlign: 'center' }}>{dailySharedReceivedLogs.length}건</div>
              </div>
            )}
            {dailyMySharedLogs.length > 0 && (
              <div className="summary-stat-cell" style={{ background: '#ecfdf5', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', color: '#047857', fontWeight: '700', textAlign: 'center' }}>공유중</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#047857', textAlign: 'center' }}>{dailyMySharedLogs.length}건</div>
              </div>
            )}
          </div>

          {dailyOwnLogs.length === 0 && dailySharedReceivedLogs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#0f172a' }}>
              <Clock size={32} color="#0f172a" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: '700' }}>선택일자에 등록된 업무 기록이 없습니다.</div>
            </div>
          ) : (
            <>
              {/* Section 1: 사내 업무 보고 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                    1. 사내 업무
                  </div>
                  {dailyInternalLogs.length > 0 && (
                    <span style={{ fontSize: '12.5px', color: '#0f172a', paddingRight: '4px' }}>
                      작성자: <strong style={{ color: '#0f172a' }}>{dailyInternalAuthorsText}</strong>
                    </span>
                  )}
                </div>

                {dailyInternalLogs.length === 0 ? (
                  <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '11px 14px', fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>
                    - 해당 내역 없음
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '6px' }}>
                    {dailyInternalLogs.map((item, idx) => (
                      <div key={item.id || idx} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '11px 14px' }}>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', flexWrap: 'wrap' }}>
                          <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '14.5px' }}>{idx + 1})</span>
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
                              공유중{item.sharedWith && item.sharedWith.length > 0 ? ` (${item.sharedWith.length}명)` : ''}
                            </span>
                          )}
                        </div>
                        {item.details && (
                          <div style={{ fontSize: '13.5px', color: '#0f172a', marginTop: '6px', paddingLeft: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {item.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: 출장 업무 보고 (사업장별 그룹화 & 출장자 통합) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                  2. 출장 및 현장 지원
                </div>

                {dailyTripLogs.length === 0 ? (
                  <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '11px 14px', fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>
                    - 해당 내역 없음
                  </div>
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
                        <div key={siteKey || sIdx} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '13px 15px' }}>
                          {/* Site Header & Combined Authors */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                            <span style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: '800', background: '#f1f5f9', border: '1.5px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px' }}>
                              {siteKey}
                            </span>
                            <span style={{ fontSize: '12.5px', color: '#0f172a' }}>
                              출장자: <strong style={{ color: '#0f172a' }}>{authorsText}</strong>
                            </span>
                          </div>

                          {/* Task Items under this Site */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {siteLogs.map((item, tIdx) => (
                              <div key={item.id || tIdx} style={{ paddingLeft: '4px' }}>
                                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', flexWrap: 'wrap' }}>
                                  <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '14.5px' }}>{tIdx + 1})</span>
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
                                      공유중{item.sharedWith && item.sharedWith.length > 0 ? ` (${item.sharedWith.length}명)` : ''}
                                    </span>
                                  )}
                                </div>
                                {item.details && (
                                  <div style={{ fontSize: '13.5px', color: '#0f172a', marginTop: '5px', paddingLeft: '18px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
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

              {/* Section 3: 👥 공유받은 업무 (공유받은 항목이 있는 경우) */}
              {dailySharedReceivedLogs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #2563eb', paddingLeft: '8px' }}>
                    <Users size={16} /> 3. 공유받은 업무 ({dailySharedReceivedLogs.length}건)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '6px' }}>
                    {dailySharedReceivedLogs.map((item, idx) => (
                      <div key={item.id || idx} style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              background: item.category === '출장 업무' ? '#ede9fe' : '#e0e7ff',
                              color: item.category === '출장 업무' ? '#6d28d9' : '#3730a3'
                            }}>
                              {item.category}
                            </span>
                            {item.siteName && (
                              <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: '700' }}>
                                @{item.siteName}
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: '700' }}>
                            👤 공유자: <strong>{item.authorName} {item.authorRank || ''}</strong> ({formatOnlyTeam(item.authorTeam)})
                          </span>
                        </div>

                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4' }}>
                          <span style={{ color: '#0369a1', fontWeight: '800', fontSize: '14.5px' }}>{idx + 1})</span>
                          <span>{item.title}</span>
                        </div>
                        {item.details && (
                          <div style={{ fontSize: '13.5px', color: '#334155', marginTop: '6px', paddingLeft: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {item.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: 📋 종합 총평 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                  {dailySharedReceivedLogs.length > 0 ? '4' : '3'}. 종합 총평
                </div>
                <div style={{ fontSize: '13.5px', color: '#0f172a', lineHeight: '1.6', background: '#f8fafc', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}>
                  ▪ 금일 등록된 총 {dailyTotalInitialCount}건의 사내 및 출장 업무{dailyMySharedLogs.length > 0 ? ` (공유중인 업무 ${dailyMySharedLogs.length}건 포함)` : ''}{dailySharedReceivedLogs.length > 0 ? ` 및 공유받은 업무 ${dailySharedReceivedLogs.length}건` : ''} 조치 사항이 모두 정상적으로 완수되었습니다.
                </div>
              </div>
            </>
          )}
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

                {/* Action Buttons: Copy & Share */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generateWeeklyReportText(), '주간 업무 보고서')}
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
                    title="주간 업무 보고서 텍스트 복사"
                  >
                    <Copy size={13} />
                  </button>
                  {isNative && (
                    <button
                      type="button"
                      onClick={() => handleShareText(generateWeeklyReportText(), '주간 업무 보고서')}
                      style={{
                        background: '#1e3a8a',
                        border: '1.5px solid #1e3a8a',
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
                      title="주간 업무 보고서 공유 (카카오톡, 메신저 등)"
                    >
                      <Share2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Week Controller (그 다음 줄에 위치) */}
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
                  onClick={handlePrevWeek}
                  style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                  title="이전주"
                >
                  <ChevronLeft size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {getWeekText(weeklyMonday)}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>
                    ({weeklyRange.monIso.slice(2)} ~ {weeklyRange.sunIso.slice(2)})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextWeek}
                  style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                  title="다음주"
                >
                  <ChevronRight size={18} />
                </button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', flexWrap: 'wrap' }}>
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

                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', marginLeft: '4px' }}>
                    {weeklyRange.monIso.slice(2)} ~ {weeklyRange.sunIso.slice(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Copy & Share */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleCopyText(generateWeeklyReportText(), '주간 업무 보고서')}
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
                  title="주간 업무 보고서 텍스트 복사"
                >
                  <Copy size={13} />
                </button>
                {isNative && (
                  <button
                    type="button"
                    onClick={() => handleShareText(generateWeeklyReportText(), '주간 업무 보고서')}
                    style={{
                      background: '#1e3a8a',
                      border: '1.5px solid #1e3a8a',
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
                    title="주간 업무 보고서 공유 (카카오톡, 메신저 등)"
                  >
                    <Share2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Official Report Summary Table Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: (weeklySharedReceivedLogs.length > 0 && weeklyMySharedLogs.length > 0) ? 'repeat(5, 1fr)' : (weeklySharedReceivedLogs.length > 0 || weeklyMySharedLogs.length > 0) ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            overflow: 'hidden',
            width: '100%'
          }}>
            <div className="summary-stat-cell" style={{ borderRight: '1.5px solid #cbd5e1', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>총 실적</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{weeklyTotalInitialCount}건</div>
            </div>
            <div className="summary-stat-cell" style={{ borderRight: '1.5px solid #cbd5e1', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>활동 일수</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{weeklyActiveDaysCount}일</div>
            </div>
            <div className="summary-stat-cell" style={{ borderRight: (weeklySharedReceivedLogs.length > 0 || weeklyMySharedLogs.length > 0) ? '1.5px solid #cbd5e1' : 'none', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>참여 인원</div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{weeklyAuthors.length}명</div>
            </div>
            {weeklySharedReceivedLogs.length > 0 && (
              <div className="summary-stat-cell" style={{ borderRight: weeklyMySharedLogs.length > 0 ? '1.5px solid #cbd5e1' : 'none', background: '#eff6ff', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', color: '#1d4ed8', fontWeight: '700', textAlign: 'center' }}>공유받음</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#1d4ed8', textAlign: 'center' }}>{weeklySharedReceivedLogs.length}건</div>
              </div>
            )}
            {weeklyMySharedLogs.length > 0 && (
              <div className="summary-stat-cell" style={{ background: '#ecfdf5', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', color: '#047857', fontWeight: '700', textAlign: 'center' }}>공유중</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#047857', textAlign: 'center' }}>{weeklyMySharedLogs.length}건</div>
              </div>
            )}
          </div>

          {weeklyOwnLogs.length === 0 && weeklySharedReceivedLogs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#0f172a' }}>
              <Clock size={32} color="#0f172a" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: '700' }}>해당 주차에 등록된 업무 기록이 없습니다.</div>
            </div>
          ) : (
            <>
              {/* Section 1: 📅 요일별 상세 보고 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                  1. 요일별 상세 업무 보고
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                  {sortedWeeklyDates.map(dStr => {
                    const dayLogs = weeklyGroupedByDate[dStr] || [];
                    const dayInitialGroups = getInitialWorkGroups(dayLogs);
                    return (
                      <div key={dStr} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '11px 14px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '5px', marginBottom: '8px' }}>
                          ■ {getFormattedKoreanDate(dStr)} (총 {dayInitialGroups.length}건)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {dayLogs.map((item, idx) => (
                            <div key={item.id || idx} style={{ color: '#0f172a', paddingLeft: '4px' }}>
                              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', flexWrap: 'wrap' }}>
                                <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: '800' }}>
                                  {idx + 1}
                                </span>
                                <span>[{item.category}] {item.title}</span>
                                {item.siteName && <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '700' }}>@{item.siteName}</span>}
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
                                    border: '1px solid #6ee7b7'
                                  }}>
                                    <Share2 size={10} color="#059669" />
                                    공유중{item.sharedWith && item.sharedWith.length > 0 ? ` (${item.sharedWith.length}명)` : ''}
                                  </span>
                                )}
                              </div>
                              {item.details && (
                                <div style={{ fontSize: '13px', color: '#0f172a', paddingLeft: '16px', marginTop: '4px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
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

              {/* Section 2: 👥 주간 공유받은 업무 종합 (공유받은 항목이 있는 경우) */}
              {weeklySharedReceivedLogs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #2563eb', paddingLeft: '8px' }}>
                    <Users size={16} /> 2. 주간 공유받은 업무 실적 ({weeklySharedReceivedLogs.length}건)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                    {weeklySharedReceivedLogs.map((item, idx) => (
                      <div key={item.id || idx} style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '8px', padding: '11px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7' }}>
                            📅 {getFormattedKoreanDate(item.date)}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#1e3a8a', fontWeight: '700' }}>
                            👤 공유자: {item.authorName} {item.authorRank || ''} ({formatOnlyTeam(item.authorTeam)})
                          </span>
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                          [{item.category}{item.siteName ? ` @${item.siteName}` : ''}] {item.title}
                        </div>
                        {item.details && (
                          <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '4px', paddingLeft: '8px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {item.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: 📌 주간 종합 총평 및 시사점 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                  {weeklySharedReceivedLogs.length > 0 ? '3' : '2'}. 주간 종합 총평 및 시사점
                </div>
                <div style={{ fontSize: '13.5px', color: '#0f172a', lineHeight: '1.6', background: '#f8fafc', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}>
                  ▪ 금주 총 {weeklyTotalInitialCount}건의 업무(사내 {weeklyInitialInternalCount}건, 출장 {weeklyInitialTripCount}건){weeklyMySharedLogs.length > 0 ? ` (공유중 ${weeklyMySharedLogs.length}건 포함)` : ''}{weeklySharedReceivedLogs.length > 0 ? ` 및 타 담당자 공유 업무 ${weeklySharedReceivedLogs.length}건` : ''}이 안전 규정에 따라 정상적으로 추진되었습니다.
                </div>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
}
