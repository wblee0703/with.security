import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Car,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  Trash2,
  Copy,
  Pencil,
  UserPlus,
  Users,
  Building2,
  MapPin,
  Search,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { getHolidayName } from '../../data/holidays';
import { useModalBack } from '../../services/modalBackHandler';

// ---------------------------------------------------------------------------
// 날짜 유틸 (YYYY-MM-DD 문자열 기준, 로컬 날짜)
// ---------------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};
const addDays = (iso, n) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const diffDays = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
const todayIso = () => toIso(new Date());
const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const fmtShort = (iso) => {
  const d = fromIso(iso);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEK_LABELS[d.getDay()]})`;
};
const fmtPeriod = (t) => {
  if (!t.end_date || t.end_date === t.start_date) return `${fmtShort(t.start_date)} · 당일`;
  return `${fmtShort(t.start_date)} ~ ${fmtShort(t.end_date)} · ${diffDays(t.start_date, t.end_date) + 1}일`;
};

// 사업장 구분 색상 팔레트 (서로 잘 구분되는 색상)
const PALETTE = [
  '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2',
  '#db2777', '#ca8a04', '#4f46e5', '#059669', '#dc2626',
  '#0d9488', '#7c3aed', '#c2410c', '#475569'
];

const STATUS_OPTIONS = [
  { id: '확정', desc: '확정된 출장' },
  { id: '가예정', desc: '일정 미확정' },
  { id: '취소', desc: '취소된 출장' }
];

const travelerLabel = (tr) => `${tr.name}${tr.rank ? ` ${tr.rank}` : ''}`;

// 동일인 판별: 아이디가 둘 다 있으면 아이디로, 없으면 이름 + (직급·소속팀이 있을 때 일치)
const samePerson = (a, b) => {
  if (!a || !b) return false;
  if (a.username && b.username) return String(a.username).toLowerCase() === String(b.username).toLowerCase();
  if (String(a.name || '').trim() !== String(b.name || '').trim()) return false;
  if (a.rank && b.rank && a.rank !== b.rank) return false;
  if (a.team && b.team && a.team !== b.team) return false;
  return true;
};
const toMember = (u) => ({ name: String(u.name || '').trim(), rank: u.rank || '', team: u.team || '', division: u.division || '', username: u.username || '' });

// 세부 위치 (site_address 컬럼에 저장, 예: "M15 3층")
const detailOf = (t) => String(t?.site_address || '').trim();
// 캘린더 표시용 사업장명: "LGD(구미)" → "LGD 구미" (괄호를 띄어쓰기로)
const siteDisplayName = (name) => String(name || '')
  .replace(/\s*[(（]\s*([^)）]*?)\s*[)）]\s*/g, ' $1 ')
  .replace(/\s+/g, ' ')
  .trim();


const emptyForm = (date, user) => ({
  id: '',
  site_id: '',
  site_name: '',
  site_address: '',
  title: '',
  start_date: date || todayIso(),
  end_date: date || todayIso(),
  travelers: user?.name ? [{ name: user.name, rank: user.rank || '', team: user.team || '', division: user.division || '', username: user.username || '' }] : [],
  status: '확정',
  memo: '',
  color: ''
});

export default function TripCalendarTab({ onTriggerToast }) {
  const isNative = Capacitor.isNativePlatform();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isMobile = isNative || (containerWidth > 0 ? containerWidth < 760 : (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  const [trips, setTrips] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 등록/수정 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [siteMode, setSiteMode] = useState('select'); // 'select' | 'manual'
  const [travelerInput, setTravelerInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useModalBack(isModalOpen, () => setIsModalOpen(false), 'trip-calendar-modal');
  // 이전 출장 불러오기 (등록 팝업 위 목록)
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [loadQuery, setLoadQuery] = useState('');
  useModalBack(isLoadOpen, () => setIsLoadOpen(false), 'trip-load-modal');

  // 가용 인원 설정
  const [pool, setPool] = useState([]);
  // 소속팀별 관리: 조회 중인 팀 키 ("사업부|소속팀", 'ALL' = 전체 팀)
  const [viewTeamKey, setViewTeamKey] = useState('');
  const [personalPool, setPersonalPool] = useState([]);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [poolDraft, setPoolDraft] = useState([]);
  const [poolInput, setPoolInput] = useState('');
  const [isPoolSaving, setIsPoolSaving] = useState(false);
  // 출장 등록 팝업: 가용 인원 드롭다운 (복수 선택)
  const [isPoolPickerOpen, setIsPoolPickerOpen] = useState(false);
  const [poolPick, setPoolPick] = useState([]); // 선택된 가용 인원 index 목록
  // 사업장 검색 드롭다운
  const [siteQuery, setSiteQuery] = useState('');
  const [isSiteListOpen, setIsSiteListOpen] = useState(false);
  useModalBack(isPoolModalOpen, () => setIsPoolModalOpen(false), 'trip-pool-modal');

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 로딩 순서: 저장된 출장 일정(캐시)을 먼저 그리고, 서버 최신 목록은 뒤에서 받아 갱신
  const loadData = async () => {
    setIsLoading(true);
    // 서버 조회는 바로 시작하되 화면 표시는 기다리지 않음
    const remoteTrips = dbService.getBusinessTrips().catch(() => null);
    try {
      setTrips(dbService.getCachedBusinessTrips());
      const [u, s, us] = await Promise.all([
        dbService.getUserProfile(),
        dbService.getSites(),
        dbService.getUsers()
      ]);
      setCurrentUser(u || null);
      setSites(Array.isArray(s) ? s : []);
      setUsers(Array.isArray(us) ? us : []);
      setPersonalPool(dbService.getTripPool(u));
    } catch (e) {
      console.warn('Failed to load trip calendar:', e);
    }
    try {
      const t = await remoteTrips;
      if (Array.isArray(t)) setTrips(t);
    } catch (e) {
      console.warn('Failed to refresh trip calendar:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------------------------
  // 사업장 색상 매핑 (등록 사업장 순서 고정 → 항상 같은 색)
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // 사업장 식별: 등록 사업장은 사업장명 + 위치(address) 조합 (예: LGD + 구미 → "LGD(구미)")
  // ---------------------------------------------------------------------------
  const siteRegionOf = (t) => {
    if (!t) return '';
    let found = t.site_id ? sites.find(x => String(x.id) === String(t.site_id)) : null;
    if (!found) {
      const same = sites.filter(x => String(x.name || x.siteName || '').trim() === String(t.site_name || '').trim());
      if (same.length === 1) found = same[0];
    }
    return found ? String(found.address || '').trim() : '';
  };
  const siteKeyName = (t) => {
    const name = String(t?.site_name || '').trim();
    const region = siteRegionOf(t);
    return region && !name.includes(region) ? `${name}(${region})` : name;
  };
  // 세부 위치 (사업장 위치와 같은 값이면 중복 표시하지 않음)
  const detailText = (t) => {
    const d = detailOf(t);
    return d && d !== siteRegionOf(t) ? d : '';
  };
  // 캘린더 표시용 출장지 라벨: "LGD 구미 (세부위치)"
  const placeLabel = (t) => {
    const detail = detailText(t);
    return `${siteDisplayName(siteKeyName(t)) || '미지정'}${detail ? ` (${detail})` : ''}`;
  };

  const siteColorMap = useMemo(() => {
    const names = [];
    sites.forEach(s => {
      const n = String(s.name || s.siteName || '').trim();
      const a = String(s.address || '').trim();
      const key = a && !n.includes(a) ? `${n}(${a})` : n;
      if (key && !names.includes(key)) names.push(key);
    });
    trips.forEach(t => {
      const key = siteKeyName(t);
      if (key && !names.includes(key)) names.push(key);
    });
    const map = {};
    names.forEach((n, i) => { map[n] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [sites, trips]);

  const colorOf = (t) => t.color || siteColorMap[siteKeyName(t)] || '#475569';

  // ---------------------------------------------------------------------------
  // 필터링
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // 소속팀별 관리
  //  - 출장은 등록한 팀(team, division)에 속함. 예전 출장은 등록자의 소속팀으로 판단
  //  - 일반 사용자: 자기 소속팀만 / 사업부장: 같은 사업부 팀 / 개발자·관리자: 전체 팀
  // ---------------------------------------------------------------------------
  const teamKeyOf = (division, team) => `${String(division || '').trim()}|${String(team || '').trim()}`;
  const myTeamKey = teamKeyOf(currentUser?.division, currentUser?.team);
  const teamAccess = (currentUser?.role === '개발자' || currentUser?.role === '관리자' || currentUser?.username === 'admin')
    ? 'all' : (currentUser?.role === '사업부장' ? 'division' : 'team');

  const tripTeamKey = (t) => {
    if (t.team) return teamKeyOf(t.division, t.team);
    const author = users.find(u => t.author_username && u.username === t.author_username);
    if (author) return teamKeyOf(author.division, author.team);
    return '|';
  };

  const teamOptions = useMemo(() => {
    const map = new Map();
    const add = (division, team) => {
      if (!String(team || '').trim()) return;
      const key = teamKeyOf(division, team);
      if (!map.has(key)) map.set(key, { key, team: String(team).trim(), division: String(division || '').trim() });
    };
    users.forEach(u => add(u.division, u.team));
    trips.forEach(t => { const [d, tm] = tripTeamKey(t).split('|'); add(d, tm); });
    let list = Array.from(map.values());
    if (teamAccess === 'division') list = list.filter(o => o.division === String(currentUser?.division || '').trim());
    if (teamAccess === 'team') list = list.filter(o => o.key === myTeamKey);
    return list.sort((a, b) => (a.key === myTeamKey ? -1 : b.key === myTeamKey ? 1 : (a.division + a.team).localeCompare(b.division + b.team)));
  }, [users, trips, teamAccess, myTeamKey, currentUser]);

  // 조회 팀 결정: 권한 밖이면 내 팀으로
  const activeTeamKey = (() => {
    if (teamAccess === 'all' && viewTeamKey === 'ALL') return 'ALL';
    if (viewTeamKey && teamOptions.some(o => o.key === viewTeamKey)) return viewTeamKey;
    return myTeamKey;
  })();
  const activeTeam = activeTeamKey === 'ALL'
    ? { team: currentUser?.team || '', division: currentUser?.division || '' }
    : (() => { const [division, team] = activeTeamKey.split('|'); return { team, division }; })();

  const teamTrips = useMemo(
    () => (activeTeamKey === 'ALL' ? trips : trips.filter(t => tripTeamKey(t) === activeTeamKey)),
    [trips, users, activeTeamKey]
  );

  // 가용 인원: 조회 중인 팀 공유 목록 (팀 목록이 없으면 기존 개인 설정을 초기값으로 사용)
  useEffect(() => {
    const teamPool = dbService.getTeamTripPool(activeTeam.division, activeTeam.team);
    setPool(teamPool.length > 0 ? teamPool : (activeTeamKey === myTeamKey ? personalPool : []));
  }, [activeTeamKey, personalPool, trips]);

  const isMine = (t) => {
    if (!currentUser) return false;
    return t.travelers.some(tr =>
      (tr.username && tr.username === currentUser.username) ||
      (tr.name === currentUser.name && (!tr.rank || !currentUser.rank || tr.rank === currentUser.rank))
    );
  };

  const filteredTrips = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return teamTrips.filter(t => {
      if (siteFilter !== 'ALL' && siteKeyName(t) !== siteFilter) return false;
      if (onlyMine && !isMine(t)) return false;
      if (q) {
        const hay = [siteKeyName(t), t.site_address, t.title, t.memo, ...t.travelers.map(tr => `${tr.name} ${tr.rank} ${tr.team}`)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [teamTrips, sites, siteFilter, onlyMine, searchText, currentUser]);

  // 달력 범위 (일요일 시작 ~ 토요일 끝)
  const monthIso = toIso(monthStart);
  const monthEndIso = toIso(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
  const gridStart = addDays(monthIso, -monthStart.getDay());
  const weeks = useMemo(() => {
    const list = [];
    let cur = gridStart;
    while (cur <= monthEndIso || list.length < 5) {
      const days = [];
      for (let i = 0; i < 7; i++) days.push(addDays(cur, i));
      list.push(days);
      cur = addDays(cur, 7);
      if (list.length >= 6) break;
    }
    return list;
  }, [gridStart, monthEndIso]);

  const monthTrips = useMemo(
    () => filteredTrips.filter(t => t.start_date <= monthEndIso && (t.end_date || t.start_date) >= monthIso),
    [filteredTrips, monthIso, monthEndIso]
  );

  // 사업장 범례 / 필터 칩 (이번 달 기준 건수, 필터 전 데이터 사용)
  const siteChips = useMemo(() => {
    const counts = {};
    teamTrips.forEach(t => {
      if (t.start_date <= monthEndIso && (t.end_date || t.start_date) >= monthIso) {
        const key = siteKeyName(t) || '미지정';
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
      .map(name => ({ name, count: counts[name], color: siteColorMap[name] || '#475569' }));
  }, [teamTrips, monthIso, monthEndIso, siteColorMap]);

  // ---------------------------------------------------------------------------
  // 주 단위 막대 배치 (여러 날짜 연속 막대 + 레인 배정)
  // ---------------------------------------------------------------------------
  const maxLanes = isMobile ? 3 : 4;
  // 막대 높이: 1줄(출장지) + 출장자 전체 이름 줄 수만큼 자동 증가
  const placeLineH = isMobile ? 13 : 15;
  const peopleLineH = isMobile ? 12 : 14;
  const barPad = isMobile ? 4 : 6;
  const lineGap = isMobile ? 3 : 4; // 출장지 줄과 출장자 줄 사이 여백
  const peopleFontPx = isMobile ? 9.5 : 11;
  // 달력 한 칸 너비 추정 (데스크톱: 우측 상세 목록 420px 제외)
  const calendarWidth = containerWidth > 0
    ? (isMobile ? containerWidth - 14 : containerWidth - 420 - 10 - 28)
    : (isMobile ? 360 : 700);
  const cellW = Math.max(36, calendarWidth / 7);

  // 출장지 라벨이 막대 너비를 넘을 때의 줄 수 계산
  const placeFontPx = isMobile ? 10 : 11.5;
  const countTextLines = (text, span) => {
    const avail = Math.max(20, span * cellW - (isMobile ? 10 : 14));
    let w = 0;
    for (const ch of String(text || '')) w += /[\u3131-\uD79D]/.test(ch) ? placeFontPx * 1.05 : placeFontPx * 0.62;
    return Math.max(1, Math.ceil(w / avail));
  };

  // 출장자 이름을 막대 너비에 맞춰 줄바꿈했을 때의 줄 수 계산
  //  - 실제 글꼴로 글자 폭을 측정해 브라우저 줄바꿈과 맞춤 (추정치가 크면 줄바꿈 전에 칸이 먼저 늘어남)
  //  - 막대 안쪽 너비 = 칸 너비 - 좌우 여백(2+2) - 왼쪽 색 띠(4) - 좌우 패딩
  const measureText = useMemo(() => {
    let ctx = null;
    try { ctx = document.createElement('canvas').getContext('2d'); } catch { ctx = null; }
    const family = (typeof window !== 'undefined' && window.getComputedStyle)
      ? window.getComputedStyle(document.body).fontFamily : 'sans-serif';
    const cache = new Map();
    return (text, px, weight) => {
      const key = `${weight}|${px}|${text}`;
      if (cache.has(key)) return cache.get(key);
      let w;
      if (ctx) {
        ctx.font = `${weight} ${px}px ${family}`;
        w = ctx.measureText(text).width;
      } else {
        w = 0;
        for (const ch of String(text)) w += /[ㄱ-힝]/.test(ch) ? px : px * 0.55;
      }
      cache.set(key, w);
      return w;
    };
  }, []);
  const countPeopleLines = (names, span) => {
    if (names.length === 0) return 0;
    const avail = Math.max(20, span * cellW - 4 - 4 - (isMobile ? 8 : 12) - 1);
    const spaceW = measureText(' ', peopleFontPx, 600);
    let lines = 1;
    let used = 0;
    names.forEach((n, i) => {
      // 줄바꿈 단위: "이름," (마지막은 "이름"), 단어 사이에는 공백 1칸
      const w = measureText(i < names.length - 1 ? `${n},` : n, peopleFontPx, 600);
      if (used > 0 && used + spaceW + w > avail) { lines += 1; used = w; }
      else { used += (used > 0 ? spaceW : 0) + w; }
    });
    return lines;
  };
  const headH = isMobile ? 20 : 24;

  const weekLayouts = useMemo(() => weeks.map(days => {
    const wStart = days[0];
    const wEnd = days[6];
    const segs = filteredTrips
      .filter(t => t.start_date <= wEnd && (t.end_date || t.start_date) >= wStart)
      .map(t => {
        const s = t.start_date < wStart ? wStart : t.start_date;
        const e = (t.end_date || t.start_date) > wEnd ? wEnd : (t.end_date || t.start_date);
        return { trip: t, col: diffDays(wStart, s), span: diffDays(s, e) + 1, contLeft: t.start_date < wStart, contRight: (t.end_date || t.start_date) > wEnd };
      })
      .sort((a, b) => a.col - b.col || b.span - a.span || (a.trip.site_name || '').localeCompare(b.trip.site_name || ''));
    const laneEnds = [];
    segs.forEach(seg => {
      let lane = laneEnds.findIndex(end => end < seg.col);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
      laneEnds[lane] = seg.col + seg.span - 1;
      seg.lane = lane;
    });
    const hiddenPerDay = Array(7).fill(0);
    segs.forEach(seg => {
      if (seg.lane >= maxLanes) {
        for (let c = seg.col; c < seg.col + seg.span; c++) hiddenPerDay[c] += 1;
      }
    });
    const usedLanes = Math.min(laneEnds.length, maxLanes);
    const hasHidden = hiddenPerDay.some(n => n > 0);
    // 레인별 높이 = 해당 레인 막대 중 가장 많은 출장자 줄 수 기준
    const laneHeights = Array(usedLanes).fill(placeLineH + barPad);
    segs.forEach(seg => {
      if (seg.lane >= maxLanes) return;
      seg.placeText = `${placeLabel(seg.trip)}${!isMobile && seg.trip.title && seg.span >= 3 ? ` · ${seg.trip.title}` : ''}`;
      const placeLines = countTextLines(seg.placeText, seg.span);
      const lines = countPeopleLines(seg.trip.travelers.map(tr => tr.name), seg.span);
      const h = placeLines * placeLineH + (lines > 0 ? lineGap : 0) + lines * peopleLineH + barPad;
      if (h > laneHeights[seg.lane]) laneHeights[seg.lane] = h;
    });
    const laneTops = [];
    let acc = headH;
    laneHeights.forEach((h, i) => { laneTops[i] = acc; acc += h + 3; });
    const height = Math.max(isMobile ? 84 : 124, acc + (hasHidden ? 16 : 0) + 6);
    return { days, segs: segs.filter(s => s.lane < maxLanes), hiddenPerDay, height, laneTops, laneHeights };
  }), [weeks, filteredTrips, sites, maxLanes, headH, isMobile, cellW]);

  // 하단 상세 목록: 선택 날짜 or 이번 달 전체
  const detailTrips = useMemo(() => {
    const base = selectedDate
      ? filteredTrips.filter(t => t.start_date <= selectedDate && (t.end_date || t.start_date) >= selectedDate)
      : monthTrips;
    return [...base].sort((a, b) => a.start_date.localeCompare(b.start_date) || (a.site_name || '').localeCompare(b.site_name || ''));
  }, [selectedDate, filteredTrips, monthTrips]);

  // ---------------------------------------------------------------------------
  // 모달 핸들러
  // ---------------------------------------------------------------------------
  const siteOptions = useMemo(() => sites
    .map(s => ({ id: String(s.id || ''), name: String(s.name || s.siteName || '').trim(), address: String(s.address || '').trim() }))
    .filter(s => s.name), [sites]);

  const openCreate = (date) => {
    const f = emptyForm(date || selectedDate || todayIso(), currentUser);
    setForm(f);
    setSiteMode(siteOptions.length > 0 ? 'select' : 'manual');
    setTravelerInput('');
    setConfirmDelete(false);
    setIsSiteListOpen(false);
    setSiteQuery('');
    // 신규 등록 시 출장자는 가용 인원 드롭다운을 먼저 펼쳐서 보여줌 (기본 출장자는 체크 상태)
    setPoolPick(pool.map((m, i) => (f.travelers.some(tr => samePerson(tr, m)) ? i : -1)).filter(i => i >= 0));
    setIsPoolPickerOpen(pool.length > 0);
    setIsModalOpen(true);
  };

  const openEdit = (trip) => {
    const [tDiv, tTeam] = tripTeamKey(trip).split('|');
    setForm({ ...emptyForm(), ...trip, team: trip.team || tTeam || '', division: trip.team ? trip.division : (tDiv || ''), travelers: [...trip.travelers], status: trip.status || '확정' });
    const registered = siteOptions.some(s => s.name === trip.site_name);
    setSiteMode(registered || !trip.site_name ? 'select' : 'manual');
    setTravelerInput('');
    setConfirmDelete(false);
    setIsPoolPickerOpen(false);
    setIsSiteListOpen(false);
    setSiteQuery('');
    setIsModalOpen(true);
  };

  // 이전 출장 불러오기: 날짜는 지금 입력한 값을 유지하고 사업장·세부 위치·업무·출장자·메모·색상만 가져옴
  const loadableTrips = useMemo(() => {
    const q = loadQuery.trim().toLowerCase();
    return [...teamTrips]
      .filter(t => !q || [siteKeyName(t), detailText(t), t.title, t.memo, ...t.travelers.map(travelerLabel)]
        .some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '') || (b.updated_at || '').localeCompare(a.updated_at || ''));
  }, [teamTrips, loadQuery, sites]);

  const applyLoadedTrip = (trip) => {
    setForm(prev => ({
      ...prev,
      site_id: trip.site_id || '',
      site_name: trip.site_name || '',
      site_address: trip.site_address || '',
      title: trip.title || '',
      travelers: trip.travelers.map(tr => ({ ...tr })),
      memo: trip.memo || '',
      color: trip.color || ''
    }));
    const registered = siteOptions.some(x => x.name === trip.site_name);
    setSiteMode(registered || !trip.site_name ? 'select' : 'manual');
    setTravelerInput('');
    setIsPoolPickerOpen(false);
    setIsSiteListOpen(false);
    setSiteQuery('');
    setIsLoadOpen(false);
    if (onTriggerToast) onTriggerToast('이전 출장 내용을 불러왔습니다. 날짜를 확인한 뒤 저장하세요.', 'info');
  };

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const setStartDate = (val) => setForm(prev => {
    if (!val) return { ...prev, start_date: val };
    const len = prev.start_date && prev.end_date ? Math.max(0, diffDays(prev.start_date, prev.end_date)) : 0;
    return { ...prev, start_date: val, end_date: addDays(val, len) };
  });

  const setDuration = (days) => setForm(prev => ({ ...prev, end_date: addDays(prev.start_date || todayIso(), days - 1) }));

  const shiftDates = (n) => setForm(prev => ({
    ...prev,
    start_date: addDays(prev.start_date, n),
    end_date: addDays(prev.end_date || prev.start_date, n)
  }));

  const addTraveler = (tr) => {
    const name = String(tr.name || '').trim();
    if (!name) return;
    setForm(prev => {
      const exists = prev.travelers.some(x =>
        (tr.username && x.username === tr.username) ||
        (x.name === name && x.rank === (tr.rank || '') && x.team === (tr.team || ''))
      );
      if (exists) return prev;
      return { ...prev, travelers: [...prev.travelers, { name, rank: tr.rank || '', team: tr.team || '', division: tr.division || '', username: tr.username || '' }] };
    });
    setTravelerInput('');
  };

  const removeTraveler = (idx) => setForm(prev => ({ ...prev, travelers: prev.travelers.filter((_, i) => i !== idx) }));

  const userSuggestions = useMemo(() => {
    const q = travelerInput.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(u => u && u.name && !form.travelers.some(x => (u.username && x.username === u.username)))
      .filter(u => `${u.name} ${u.rank || ''} ${u.team || ''} ${u.division || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [travelerInput, users, form.travelers]);

  // ---------------------------------------------------------------------------
  // 가용 인원: 해당 날짜에 출장(취소 제외)이 없는 인원
  // ---------------------------------------------------------------------------
  const availabilityOn = (date) => {
    const active = trips.filter(t => t.status !== '취소' && t.start_date <= date && (t.end_date || t.start_date) >= date);
    const available = [];
    const busy = [];
    pool.forEach(m => {
      const trip = active.find(t => t.travelers.some(tr => samePerson(tr, m)));
      if (trip) busy.push({ member: m, trip }); else available.push(m);
    });
    return { available, busy };
  };

  const availCountByDay = useMemo(() => {
    const map = {};
    if (pool.length === 0) return map;
    weeks.forEach(days => days.forEach(d => { map[d] = availabilityOn(d).available.length; }));
    return map;
  }, [weeks, trips, pool]);

  const availDate = selectedDate || todayIso();
  const availInfo = useMemo(() => availabilityOn(availDate), [availDate, trips, pool]);

  // 가용 인원 설정 팝업
  const openPoolModal = () => {
    setPoolDraft(pool.map(m => ({ ...m })));
    setPoolInput('');
    setIsPoolModalOpen(true);
  };

  const addPoolMembers = (list) => {
    setPoolDraft(prev => {
      const next = [...prev];
      list.forEach(u => {
        const m = toMember(u);
        if (m.name && !next.some(x => samePerson(x, m))) next.push(m);
      });
      return next;
    });
    setPoolInput('');
  };

  const poolSuggestions = useMemo(() => {
    const q = poolInput.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(u => u && u.name && !poolDraft.some(x => samePerson(x, toMember(u))))
      .filter(u => `${u.name} ${u.rank || ''} ${u.team || ''} ${u.division || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [poolInput, users, poolDraft]);

  const myTeamUsers = useMemo(() => users.filter(u => u && u.name && activeTeam.team && u.team === activeTeam.team && (!activeTeam.division || !u.division || u.division === activeTeam.division)), [users, activeTeamKey]);
  const myDivisionUsers = useMemo(() => users.filter(u => u && u.name && activeTeam.division && u.division === activeTeam.division), [users, activeTeamKey]);

  const handlePoolKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (poolSuggestions.length > 0) { addPoolMembers([poolSuggestions[0]]); return; }
    const parts = poolInput.trim().split(/\s+/);
    if (parts[0]) addPoolMembers([{ name: parts[0], rank: parts.slice(1).join(' ') }]);
  };

  const handleSavePool = async () => {
    if (isPoolSaving) return;
    setIsPoolSaving(true);
    try {
      const { members, synced } = await dbService.saveTeamTripPool(activeTeam.division, activeTeam.team, currentUser, poolDraft);
      setPool(members);
      setIsPoolModalOpen(false);
      if (onTriggerToast) onTriggerToast(synced ? `${activeTeam.team} 가용 인원 ${members.length}명이 저장되었습니다.` : '가용 인원이 기기에 저장되었습니다. 서버 연결 시 자동으로 전송됩니다.', synced ? 'success' : 'warning');
    } catch (e) {
      if (onTriggerToast) onTriggerToast(e?.message || '가용 인원 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsPoolSaving(false);
    }
  };

  // 가용 인원 드롭다운: 출장 기간 중 다른 출장(취소 제외)이 있는 인원 확인
  const busyTripOf = (m) => {
    if (!form.start_date) return null;
    const fs = form.start_date;
    const fe = form.end_date || form.start_date;
    return trips.find(t => t.id !== form.id && t.status !== '취소' && t.start_date <= fe && (t.end_date || t.start_date) >= fs && t.travelers.some(tr => samePerson(tr, m))) || null;
  };

  const togglePoolPicker = () => {
    if (isPoolPickerOpen) { setIsPoolPickerOpen(false); return; }
    // 이미 출장자로 들어간 가용 인원은 체크된 상태로 시작
    setPoolPick(pool.map((m, i) => (form.travelers.some(tr => samePerson(tr, m)) ? i : -1)).filter(i => i >= 0));
    setIsPoolPickerOpen(true);
  };

  const togglePick = (i) => setPoolPick(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));

  const confirmPoolPick = () => {
    setForm(prev => {
      // 가용 인원이 아닌 출장자(직접 입력/검색 추가)는 유지하고, 가용 인원은 체크 상태대로 반영
      const others = prev.travelers.filter(tr => !pool.some(m => samePerson(tr, m)));
      const keptPool = prev.travelers.filter(tr => pool.some((m, i) => poolPick.includes(i) && samePerson(tr, m)));
      const added = pool.filter((m, i) => poolPick.includes(i) && !prev.travelers.some(tr => samePerson(tr, m))).map(m => ({ ...m }));
      return { ...prev, travelers: [...others, ...keptPool, ...added] };
    });
    setIsPoolPickerOpen(false);
  };

  // 사업장 검색 드롭다운
  const selectedSiteIdx = (() => {
    const byId = form.site_id ? siteOptions.findIndex(x => x.id === form.site_id) : -1;
    return byId !== -1 ? byId : siteOptions.findIndex(x => x.name === form.site_name);
  })();
  const siteOptionLabel = (x) => `${x.name}${x.address ? ` (${x.address})` : ''}`;
  const filteredSiteOptions = (() => {
    const q = siteQuery.trim().toLowerCase().replace(/\s+/g, '');
    const list = siteOptions.map((x, i) => ({ ...x, idx: i }));
    if (!q) return list;
    return list.filter(x => `${x.name}${x.address}`.toLowerCase().replace(/\s+/g, '').includes(q));
  })();
  const pickSite = (x) => {
    setForm(prev => ({ ...prev, site_id: x.id, site_name: x.name }));
    setSiteQuery('');
    setIsSiteListOpen(false);
  };

  const handleTravelerKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (userSuggestions.length > 0) {
        addTraveler(userSuggestions[0]);
      } else {
        // 직접 입력: "이름 직급" 형식 허용
        const parts = travelerInput.trim().split(/\s+/);
        addTraveler({ name: parts[0], rank: parts.slice(1).join(' ') });
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    const site = String(form.site_name || '').trim();
    if (!site) { onTriggerToast && onTriggerToast('사업장을 선택하거나 입력해 주세요.', 'warning'); return; }
    if (!form.start_date) { onTriggerToast && onTriggerToast('출장 시작일을 입력해 주세요.', 'warning'); return; }
    if (form.end_date && form.end_date < form.start_date) { onTriggerToast && onTriggerToast('종료일이 시작일보다 빠릅니다.', 'warning'); return; }
    let travelers = form.travelers;
    if (travelerInput.trim()) {
      const parts = travelerInput.trim().split(/\s+/);
      travelers = [...travelers, { name: parts[0], rank: parts.slice(1).join(' '), team: '', division: '', username: '' }];
    }
    if (travelers.length === 0) { onTriggerToast && onTriggerToast('출장자를 1명 이상 추가해 주세요.', 'warning'); return; }

    setIsSaving(true);
    try {
      const owner = form.team ? { team: form.team, division: form.division } : activeTeam;
      const { trip, synced } = await dbService.saveBusinessTrip({ ...form, team: owner.team, division: owner.division, site_name: site, travelers, end_date: form.end_date || form.start_date }, currentUser);
      setTrips(prev => {
        const next = prev.filter(t => t.id !== trip.id);
        next.push(trip);
        return next.sort((a, b) => a.start_date.localeCompare(b.start_date));
      });
      setIsModalOpen(false);
      setTravelerInput('');
      // 저장한 출장이 보이도록 해당 월로 이동
      const sd = fromIso(trip.start_date);
      setMonthStart(new Date(sd.getFullYear(), sd.getMonth(), 1));
      if (onTriggerToast) {
        onTriggerToast(synced
          ? `'${siteKeyName(trip)}' 출장 일정이 저장되었습니다.`
          : '출장 일정이 기기에 저장되었습니다. 서버 연결 시 자동으로 전송됩니다.', synced ? 'success' : 'warning');
      }
    } catch (e) {
      if (onTriggerToast) onTriggerToast(e?.message || '출장 일정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await dbService.deleteBusinessTrip(form.id);
    setTrips(prev => prev.filter(t => t.id !== form.id));
    setIsModalOpen(false);
    if (onTriggerToast) onTriggerToast('출장 일정이 삭제되었습니다.', 'success');
  };

  const goMonth = (n) => {
    setMonthStart(prev => new Date(prev.getFullYear(), prev.getMonth() + n, 1));
    setSelectedDate(null);
  };

  const goToday = () => {
    const d = new Date();
    setMonthStart(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(todayIso());
  };

  // ---------------------------------------------------------------------------
  // 렌더링 헬퍼
  // ---------------------------------------------------------------------------
  const statusBadge = (t) => {
    const today = todayIso();
    let label = t.status || '확정';
    let bg = '#eff6ff', fg = '#1d4ed8', bd = '#bfdbfe';
    if (label === '취소') { bg = '#f1f5f9'; fg = '#64748b'; bd = '#cbd5e1'; }
    else if (label === '가예정') { bg = '#fffbeb'; fg = '#b45309'; bd = '#fde68a'; }
    else if ((t.end_date || t.start_date) < today) { return null; } // 지난 출장은 상태 표시 없음
    else if (t.start_date <= today) { label = '진행중'; bg = '#fef2f2'; fg = '#b91c1c'; bd = '#fecaca'; }
    else { label = '예정'; }
    return (
      <span style={{ fontSize: '10.5px', fontWeight: '800', padding: '2px 7px', borderRadius: '10px', background: bg, color: fg, border: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    );
  };

  const cardStyle = {
    padding: isMobile ? '12px 14px' : '14px 18px',
    borderRadius: '6px',
    background: '#ffffff',
    border: '1.5px solid #cbd5e1',
    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.02)'
  };

  const iconBtn = {
    width: '34px',
    height: '34px',
    borderRadius: '6px',
    border: '1.5px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: '6px',
    border: '1.5px solid #cbd5e1',
    fontSize: '13.5px',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = { fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' };

  const chipBtn = (active, color) => ({
    padding: '5px 10px',
    borderRadius: '14px',
    border: active ? `1.5px solid ${color || '#1e3a8a'}` : '1.5px solid #e2e8f0',
    background: active ? (color ? `${color}18` : 'rgba(30, 58, 138, 0.08)') : '#ffffff',
    color: active ? (color || '#1e3a8a') : '#475569',
    fontSize: '12px',
    fontWeight: active ? '800' : '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap'
  });

  const renderTripCard = (t) => {
    const color = colorOf(t);
    const cancelled = t.status === '취소';
    return (
      <div
        key={t.id}
        onClick={() => openEdit(t)}
        style={{
          display: 'flex',
          gap: '10px',
          padding: '11px 12px',
          borderRadius: '6px',
          border: '1.5px solid #e2e8f0',
          borderLeft: `5px solid ${color}`,
          background: cancelled ? '#f8fafc' : '#ffffff',
          opacity: cancelled ? 0.7 : 1,
          cursor: 'pointer'
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color, textDecoration: cancelled ? 'line-through' : 'none' }}>
              {siteKeyName(t) || '사업장 미지정'}
              {detailText(t) && <span style={{ fontWeight: '700' }}> ({detailText(t)})</span>}
            </span>
            {statusBadge(t)}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap', marginRight: '2px' }}>
                {fmtPeriod(t)}
              </span>
              <button type="button" title="수정" onClick={(e) => { e.stopPropagation(); openEdit(t); }} style={{ ...iconBtn, width: '24px', height: '24px', borderWidth: '1px', borderRadius: '5px' }}><Pencil size={12} /></button>
            </span>
          </div>
          {t.title && (
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', textDecoration: cancelled ? 'line-through' : 'none' }}>{t.title}</div>
          )}
          {/* 출장자: 1줄에 2명씩 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '4px' }}>
            {t.travelers.map((tr, i) => (
              <span key={i} style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={`${travelerLabel(tr)}${tr.team ? ` · ${tr.team}` : ''}`}>
                {travelerLabel(tr)}{tr.team ? <span style={{ color: '#94a3b8', fontWeight: '600' }}> · {tr.team}</span> : null}
              </span>
            ))}
          </div>
          {t.memo && (
            <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.memo}</div>
          )}
        </div>
      </div>
    );
  };

  const today = todayIso();
  const curMonth = monthStart.getMonth();

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', paddingBottom: '30px' }}>
      {/* 상단 타이틀 카드 */}
      <div className="glass-panel" style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
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
            <Car size={isMobile ? 20 : 22} />
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>업무 관리</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={openPoolModal}
            title="가용 인원 설정"
            style={{ ...iconBtn, width: 'auto', padding: '0 10px', gap: '5px', fontSize: '12.5px', fontWeight: '800', color: '#15803d', borderColor: '#86efac', background: '#f0fdf4', whiteSpace: 'nowrap' }}
          >
            <UserCheck size={15} /> {isMobile ? '가용' : '가용 인원'}
            {pool.length > 0 && <span style={{ background: '#16a34a', color: '#ffffff', borderRadius: '10px', padding: '0 6px', fontSize: '10.5px' }}>{pool.length}</span>}
          </button>
        </div>
      </div>

      {/* 월 이동 + 보기 전환 + 검색/필터 */}
      <div className="glass-panel" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {teamAccess !== 'team' && (teamOptions.length > 1 || teamAccess === 'all') && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', paddingBottom: '2px', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}><Users size={13} /> 소속팀</span>
            {teamAccess === 'all' && (
              <button type="button" onClick={() => setViewTeamKey('ALL')} style={chipBtn(activeTeamKey === 'ALL')}>전체 팀</button>
            )}
            {teamOptions.map(o => (
              <button key={o.key} type="button" onClick={() => setViewTeamKey(o.key)} style={chipBtn(activeTeamKey === o.key)} title={o.division ? `${o.division} / ${o.team}` : o.team}>
                {o.team}{teamOptions.some(x => x !== o && x.team === o.team) ? ` · ${o.division || '사업부 미지정'}` : ''}{o.key === myTeamKey ? ' (내 팀)' : ''}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => goMonth(-1)} style={iconBtn} title="이전 달"><ChevronLeft size={18} /></button>
          <div style={{ flex: 1, height: '34px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {monthStart.getFullYear()}년 {monthStart.getMonth() + 1}월
          </div>
          <button type="button" onClick={() => goMonth(1)} style={iconBtn} title="다음 달"><ChevronRight size={18} /></button>
          <button type="button" onClick={goToday} style={{ ...iconBtn, width: 'auto', padding: '0 10px', fontSize: '12px', fontWeight: '800' }}>오늘</button>
        </div>

        {/* 사업장별 구분 (범례 + 필터) */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
          <button type="button" onClick={() => setSiteFilter('ALL')} style={chipBtn(siteFilter === 'ALL')}>
            <Building2 size={12} /> 전체 사업장
          </button>
          {siteChips.map(c => (
            <button key={c.name} type="button" onClick={() => setSiteFilter(siteFilter === c.name ? 'ALL' : c.name)} style={chipBtn(siteFilter === c.name, c.color)}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              {c.name}
              <span style={{ fontSize: '11px', fontWeight: '800', color: c.color }}>{c.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="출장자, 사업장, 세부 위치, 업무 검색"
              style={{ ...inputStyle, padding: '7px 10px 7px 30px', fontSize: '12.5px' }}
            />
          </div>
          <button type="button" onClick={() => setOnlyMine(v => !v)} style={{ ...chipBtn(onlyMine), borderRadius: '6px', padding: '7px 10px' }}>
            <Users size={13} /> 내 출장
          </button>
        </div>
      </div>

      {/* 본문: 달력 + 상세 */}
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: isMobile ? undefined : 'minmax(0, 1fr) 420px', gap: '10px', alignItems: isMobile ? 'stretch' : 'start', width: '100%' }}>
          <div className="glass-panel" style={{ ...cardStyle, padding: isMobile ? '8px 6px' : '12px', minWidth: 0 }}>
            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
              {WEEK_LABELS.map((w, i) => (
                <div key={w} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '800', padding: '4px 0', color: i === 0 ? '#dc2626' : (i === 6 ? '#2563eb' : '#475569') }}>{w}</div>
              ))}
            </div>

            {weekLayouts.map((wk, wi) => (
              <div key={wi} style={{ position: 'relative', height: `${wk.height}px`, borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: wi === weekLayouts.length - 1 ? '1px solid #cbd5e1' : 'none' }}>
                {/* 날짜 셀 */}
                <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {wk.days.map((d, di) => {
                    const inMonth = fromIso(d).getMonth() === curMonth;
                    const holiday = getHolidayName(d);
                    const isSel = selectedDate === d;
                    const isToday = d === today;
                    const dayColor = holiday || di === 0 ? '#dc2626' : (di === 6 ? '#2563eb' : '#0f172a');
                    return (
                      <div
                        key={d}
                        onClick={() => setSelectedDate(isSel ? null : d)}
                        onDoubleClick={() => openCreate(d)}
                        style={{
                          borderLeft: di === 0 ? 'none' : '1px solid #cbd5e1',
                          background: isSel ? 'rgba(30, 58, 138, 0.07)' : (inMonth ? 'transparent' : '#f8fafc'),
                          cursor: 'pointer',
                          position: 'relative',
                          boxShadow: isSel ? 'inset 0 0 0 1.5px #1e3a8a' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: isMobile ? '2px 3px' : '4px 6px', height: `${headH}px`, boxSizing: 'border-box', overflow: 'hidden' }}>
                          <span style={{
                            fontSize: isMobile ? '11px' : '12.5px',
                            fontWeight: '800',
                            color: inMonth ? dayColor : '#cbd5e1',
                            ...(isToday ? { background: '#1e3a8a', color: '#ffffff', borderRadius: '10px', padding: '0 6px' } : {})
                          }}>
                            {fromIso(d).getDate()}
                          </span>
                          {holiday && !isMobile && inMonth && (
                            <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{holiday}</span>
                          )}
                          {inMonth && pool.length > 0 && availCountByDay[d] !== undefined && (
                            <span
                              title={`출장 없는 인원 ${availCountByDay[d]}명 / 가용 인원 ${pool.length}명`}
                              style={{
                                marginLeft: 'auto',
                                flexShrink: 0,
                                fontSize: isMobile ? '9.5px' : '10.5px',
                                fontWeight: '800',
                                padding: isMobile ? '0 4px' : '0 6px',
                                borderRadius: '8px',
                                lineHeight: isMobile ? '14px' : '16px',
                                background: availCountByDay[d] === 0 ? '#fef2f2' : '#f0fdf4',
                                color: availCountByDay[d] === 0 ? '#dc2626' : '#15803d',
                                border: `1px solid ${availCountByDay[d] === 0 ? '#fecaca' : '#bbf7d0'}`
                              }}
                            >
                              {isMobile ? availCountByDay[d] : `가용 ${availCountByDay[d]}`}
                            </span>
                          )}
                        </div>
                        {wk.hiddenPerDay[di] > 0 && (
                          <div style={{ position: 'absolute', bottom: '3px', left: 0, right: 0, textAlign: 'center', fontSize: '10.5px', fontWeight: '800', color: '#475569' }}>
                            +{wk.hiddenPerDay[di]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 출장 막대 */}
                {wk.segs.map(seg => {
                  const t = seg.trip;
                  const color = colorOf(t);
                  const cancelled = t.status === '취소';
                  const tentative = t.status === '가예정';
                  const names = t.travelers.map(tr => tr.name);
                  // 출장자 전체 표시 (막대 너비를 넘으면 다음 줄로 줄바꿈)
                  const people = names.join(', ');
                  // 1줄: 출장지 (사업장 + 위치 요약 + 업무)
                  const placeLine = seg.placeText || placeLabel(t);
                  return (
                    <div
                      key={`${t.id}-${seg.col}`}
                      onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                      title={`${siteKeyName(t)}${t.title ? ` - ${t.title}` : ''}${detailText(t) ? `\n세부 위치: ${detailText(t)}` : ''}\n${fmtPeriod(t)}\n출장자: ${t.travelers.map(travelerLabel).join(', ')}`}
                      style={{
                        position: 'absolute',
                        top: `${wk.laneTops[seg.lane]}px`,
                        left: `calc(${(seg.col / 7) * 100}% + ${seg.contLeft ? 0 : 2}px)`,
                        width: `calc(${(seg.span / 7) * 100}% - ${(seg.contLeft ? 0 : 2) + (seg.contRight ? 0 : 2)}px)`,
                        height: `${wk.laneHeights[seg.lane]}px`,
                        // 글자는 검은색, 배경은 사업장 색상의 연한 톤 + 왼쪽 사업장 색상 띠로 구분
                        background: cancelled ? '#e2e8f0' : (tentative ? `${color}1a` : `${color}3d`),
                        color: cancelled ? '#64748b' : '#0f172a',
                        border: tentative ? `1.5px dashed ${color}` : 'none',
                        borderLeft: cancelled ? 'none' : (seg.contLeft ? (tentative ? `1.5px dashed ${color}` : 'none') : `4px solid ${color}`),
                        borderRadius: `${seg.contLeft ? 0 : 4}px ${seg.contRight ? 0 : 4}px ${seg.contRight ? 0 : 4}px ${seg.contLeft ? 0 : 4}px`,
                        fontSize: isMobile ? '10px' : '11.5px',
                        fontWeight: '700',
                        lineHeight: 1.25,
                        padding: isMobile ? '1px 4px' : '2px 6px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        overflow: 'hidden',
                        textDecoration: cancelled ? 'line-through' : 'none',
                        cursor: 'pointer',
                        zIndex: 1
                      }}
                    >
                      <div style={{ fontWeight: '800', fontSize: `${placeFontPx}px`, lineHeight: `${placeLineH}px`, whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{placeLine}</div>
                      {people && (
                        <div style={{ marginTop: `${lineGap}px`, fontWeight: '600', fontSize: `${peopleFontPx}px`, lineHeight: `${peopleLineH}px`, whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{people}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '8px', textAlign: 'center' }}>
              날짜를 누르면 해당일 출장이 아래에 표시됩니다{isMobile ? '' : ' · 날짜를 두 번 누르면 바로 등록'} · 막대를 누르면 수정
            </div>
          </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
        {/* 가용 인원 현황 (선택 날짜 또는 오늘) */}
        <div className="glass-panel" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} color="#15803d" />
              {fmtShort(availDate)}{!selectedDate ? '(오늘)' : ''} 가용 인원
              {pool.length > 0 && <span style={{ fontSize: '12px', color: '#15803d' }}>{availInfo.available.length}/{pool.length}명</span>}
            </div>
            <button type="button" onClick={openPoolModal} style={{ ...chipBtn(false), borderRadius: '6px', border: '1.5px solid #cbd5e1' }}>설정</button>
          </div>
          {pool.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', lineHeight: 1.5 }}>
              가용 인원을 설정하면 날짜별로 출장이 없는 인원을 확인할 수 있습니다.
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#15803d', marginBottom: '4px' }}>출장 없음 {availInfo.available.length}명</div>
                {availInfo.available.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>모든 인원이 출장 중입니다.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '4px' }}>
                    {availInfo.available.map((m, i) => (
                      <span key={i} title={`${travelerLabel(m)}${m.team ? ` · ${m.team}` : ''}`} style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: 'transparent', color: '#0f172a', border: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                        {travelerLabel(m)}{m.team ? <span style={{ color: '#94a3b8', fontWeight: '600' }}> · {m.team}</span> : null}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 상세 목록 */}
        <div className="glass-panel" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={16} color="#1e3a8a" />
              {selectedDate ? `${fmtShort(selectedDate)} 출장` : `${monthStart.getMonth() + 1}월 전체 출장`}
              <span style={{ fontSize: '12px', color: '#1e3a8a' }}>{detailTrips.length}건</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {selectedDate && (
                <button type="button" onClick={() => setSelectedDate(null)} style={{ ...chipBtn(false), borderRadius: '6px' }}>월 전체</button>
              )}
              <button type="button" onClick={() => openCreate(selectedDate || undefined)} style={{ ...chipBtn(true), borderRadius: '6px' }}>
                <Plus size={13} /> 등록
              </button>
            </div>
          </div>

          {detailTrips.length === 0 ? (
            <div style={{ padding: '26px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
              <Car size={28} color="#cbd5e1" style={{ marginBottom: '6px' }} />
              <div>등록된 출장이 없습니다.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: !isMobile ? '70vh' : 'none', overflowY: !isMobile ? 'auto' : 'visible' }}>
              {detailTrips.map(renderTripCard)}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 가용 인원 설정 모달 (닫기/취소/저장 버튼으로만 닫힘) */}
      {isPoolModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3, 6, 13, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '10px', padding: isMobile ? '16px' : '22px', background: '#ffffff', border: '1.5px solid #cbd5e1', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'linear-gradient(135deg, #15803d 0%, #14532d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <UserCheck size={19} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>가용 인원 설정</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>날짜별로 출장 없는 인원을 확인할 대상</div>
                </div>
              </div>
              <button type="button" onClick={() => setIsPoolModalOpen(false)} style={{ ...iconBtn, border: 'none' }}><X size={20} /></button>
            </div>

            {/* 빠른 추가 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {myTeamUsers.length > 0 && (
                <button type="button" onClick={() => addPoolMembers(myTeamUsers)} style={{ ...chipBtn(false), borderRadius: '6px' }}>
                  <Users size={13} /> 우리 팀 전체 ({myTeamUsers.length})
                </button>
              )}
              {myDivisionUsers.length > 0 && (
                <button type="button" onClick={() => addPoolMembers(myDivisionUsers)} style={{ ...chipBtn(false), borderRadius: '6px' }}>
                  <Building2 size={13} /> 우리 사업부 전체 ({myDivisionUsers.length})
                </button>
              )}
            </div>

            {/* 검색 / 직접 입력 */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <UserPlus size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input value={poolInput} onChange={e => setPoolInput(e.target.value)} onKeyDown={handlePoolKey} placeholder="이름 검색 또는 직접 입력 후 Enter" style={{ ...inputStyle, paddingLeft: '30px' }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const parts = poolInput.trim().split(/\s+/);
                    if (parts[0]) addPoolMembers([{ name: parts[0], rank: parts.slice(1).join(' ') }]);
                  }}
                  style={{ ...iconBtn, width: 'auto', height: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: '800' }}
                >
                  추가
                </button>
              </div>
              {poolSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)', zIndex: 5, maxHeight: '220px', overflowY: 'auto' }}>
                  {poolSuggestions.map(u => (
                    <button key={u.username || `${u.name}-${u.team}`} type="button" onClick={() => addPoolMembers([u])} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#ffffff', cursor: 'pointer', fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>
                      {u.name} {u.rank}
                      <span style={{ color: '#94a3b8', fontWeight: '600', fontSize: '11.5px' }}> · {[u.division, u.team].filter(Boolean).join(' / ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 설정된 인원 */}
            <div>
              <div style={{ ...labelStyle, justifyContent: 'space-between' }}>
                <span>가용 인원 <span style={{ color: '#15803d' }}>{poolDraft.length}명</span></span>
                {poolDraft.length > 0 && (
                  <button type="button" onClick={() => setPoolDraft([])} style={{ ...chipBtn(false), padding: '2px 8px', fontSize: '11px', color: '#dc2626' }}>전체 삭제</button>
                )}
              </div>
              {poolDraft.length === 0 ? (
                <div style={{ padding: '18px 10px', textAlign: 'center', fontSize: '12.5px', color: '#94a3b8', fontWeight: '600', border: '1.5px dashed #e2e8f0', borderRadius: '6px' }}>
                  설정된 인원이 없습니다. 위에서 인원을 추가하세요.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '5px', maxHeight: '320px', overflowY: 'auto' }}>
                  {poolDraft.map((m, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 4px 4px 10px', borderRadius: '14px', background: 'transparent', border: 'none', color: '#0f172a', fontSize: '12.5px', fontWeight: '700', minWidth: 0 }}>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${travelerLabel(m)}${m.team ? ` · ${m.team}` : ''}`}>
                        {travelerLabel(m)}{m.team && <span style={{ color: '#64748b', fontWeight: '600', fontSize: '11px' }}> · {m.team}</span>}
                      </span>
                      <button type="button" onClick={() => setPoolDraft(prev => prev.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '0 2px', flexShrink: 0 }} title="제외"><X size={13} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsPoolModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                취소
              </button>
              <button type="button" onClick={handleSavePool} disabled={isPoolSaving} className="glass-button-primary" style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #1e3a8a', fontSize: '13px', fontWeight: '800', cursor: isPoolSaving ? 'wait' : 'pointer', opacity: isPoolSaving ? 0.7 : 1 }}>
                {isPoolSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 / 수정 모달 */}
      {isModalOpen && isLoadOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(3, 6, 13, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px' }}>
          <div style={{ width: '100%', maxWidth: '500px', maxHeight: '84vh', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '10px', padding: isMobile ? '14px' : '18px', background: '#ffffff', border: '1.5px solid #cbd5e1', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}><Copy size={16} /> 이전 출장 불러오기</div>
              <button type="button" onClick={() => setIsLoadOpen(false)} style={{ ...iconBtn, border: 'none' }}><X size={20} /></button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={loadQuery}
                onChange={e => setLoadQuery(e.target.value)}
                placeholder="사업장, 업무, 출장자 검색"
                style={{ ...inputStyle, paddingLeft: '32px' }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>선택한 출장의 사업장·세부 위치·업무·출장자·메모를 가져옵니다. 날짜는 지금 입력한 값이 유지됩니다.</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {loadableTrips.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>불러올 출장 일정이 없습니다.</div>
              ) : loadableTrips.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyLoadedTrip(t)}
                  style={{ textAlign: 'left', padding: '9px 11px', border: '1.5px solid #e2e8f0', borderLeft: `4px solid ${colorOf(t)}`, borderRadius: '6px', background: '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{placeLabel(t)}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', flexShrink: 0 }}>{fmtPeriod(t)}</span>
                  </div>
                  {t.title && <div style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>{t.title}</div>}
                  {t.travelers.length > 0 && <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: '600' }}>{t.travelers.map(travelerLabel).join(', ')}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3, 6, 13, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px' }}
        >
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '10px', padding: isMobile ? '16px' : '22px', background: '#ffffff', border: '1.5px solid #cbd5e1', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Car size={19} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{form.id ? '출장 일정 수정' : '출장 일정 등록'}</div>
                  {form.id && (form.author_name || form.updated_by) && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                      {form.author_name && `등록 ${form.author_name}`}{form.updated_by && ` · 최종 수정 ${form.updated_by}`}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!form.id && (
                  <button
                    type="button"
                    onClick={() => { setLoadQuery(''); setIsLoadOpen(true); }}
                    style={{ ...iconBtn, width: 'auto', padding: '0 10px', gap: '5px', fontSize: '12px', fontWeight: '800', color: '#1e3a8a' }}
                    title="이전 출장 일정 불러오기"
                  >
                    <Copy size={14} /> 불러오기
                  </button>
                )}
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ ...iconBtn, border: 'none' }}><X size={20} /></button>
              </div>
            </div>

            {/* 사업장 + 세부 위치 (같은 줄) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', alignItems: 'end' }}>
            {/* 사업장 */}
            <div style={{ minWidth: 0 }}>
              <div style={{ ...labelStyle, justifyContent: 'space-between', flexWrap: 'wrap', rowGap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={14} /> 사업장 <span style={{ color: '#dc2626' }}>*</span></span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[{ id: 'select', label: '선택' }, { id: 'manual', label: '직접 입력' }].map(m => (
                    <button key={m.id} type="button" onClick={() => setSiteMode(m.id)} style={{ ...chipBtn(siteMode === m.id), padding: '2px 8px', fontSize: '11px' }}>{m.label}</button>
                  ))}
                </div>
              </div>
              {siteMode === 'select' ? (
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    value={isSiteListOpen ? siteQuery : (selectedSiteIdx !== -1 ? siteOptionLabel(siteOptions[selectedSiteIdx]) : '')}
                    onChange={e => { setSiteQuery(e.target.value); setIsSiteListOpen(true); }}
                    onFocus={() => { setSiteQuery(''); setIsSiteListOpen(true); }}
                    onBlur={() => setTimeout(() => setIsSiteListOpen(false), 150)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); if (filteredSiteOptions.length > 0) pickSite(filteredSiteOptions[0]); }
                      if (e.key === 'Escape') { e.preventDefault(); setIsSiteListOpen(false); e.currentTarget.blur(); }
                    }}
                    placeholder={isSiteListOpen && selectedSiteIdx !== -1 ? siteOptionLabel(siteOptions[selectedSiteIdx]) : '사업장 검색'}
                    style={{ ...inputStyle, paddingLeft: '30px', paddingRight: '28px', minWidth: 0 }}
                  />
                  <ChevronDown size={15} color="#64748b" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  {isSiteListOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 25, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)', maxHeight: '240px', overflowY: 'auto' }}>
                      {filteredSiteOptions.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>검색 결과가 없습니다.</div>
                      ) : filteredSiteOptions.map(x => (
                        <button
                          key={`${x.id}-${x.idx}`}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => pickSite(x)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', padding: '9px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', background: x.idx === selectedSiteIdx ? '#eff6ff' : '#ffffff', cursor: 'pointer', fontSize: '13px', color: '#0f172a', fontWeight: '700' }}
                        >
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0, background: siteColorMap[x.address && !x.name.includes(x.address) ? `${x.name}(${x.address})` : x.name] || '#475569' }} />
                          <span>{x.name}</span>
                          {x.address && <span style={{ color: '#64748b', fontWeight: '600' }}>({x.address})</span>}
                          {x.idx === selectedSiteIdx && <Check size={14} color="#1e3a8a" style={{ marginLeft: 'auto' }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <input value={form.site_name} onChange={e => setForm(prev => ({ ...prev, site_id: '', site_name: e.target.value }))} placeholder="사업장명" style={inputStyle} />
              )}
            </div>

            {/* 세부 위치 (예: M15 3층) */}
            <div style={{ minWidth: 0 }}>
              <div style={labelStyle}><MapPin size={14} /> 세부 위치</div>
              <input value={form.site_address} onChange={e => setField('site_address', e.target.value)} placeholder="예) M15 3층, 클린룸 A동" style={{ ...inputStyle, minWidth: 0 }} />
            </div>
            </div>

            {/* 기간 */}
            <div>
              <div style={labelStyle}><CalendarDays size={14} /> 출장 기간 <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#1e3a8a' }}>
                  {form.start_date && form.end_date && form.end_date >= form.start_date ? `${diffDays(form.start_date, form.end_date) + 1}일` : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px', alignItems: 'center' }}>
                <input type="date" value={form.start_date} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                <span style={{ color: '#94a3b8', fontWeight: '800' }}>~</span>
                <input type="date" value={form.end_date} min={form.start_date} onChange={e => setField('end_date', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                {[{ d: 1, l: '당일' }, { d: 2, l: '1박2일' }, { d: 3, l: '2박3일' }, { d: 5, l: '5일' }, { d: 7, l: '1주' }].map(o => (
                  <button key={o.d} type="button" onClick={() => setDuration(o.d)} style={{ ...chipBtn(form.start_date && form.end_date && diffDays(form.start_date, form.end_date) + 1 === o.d), padding: '3px 9px', fontSize: '11px' }}>{o.l}</button>
                ))}
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => shiftDates(-1)} style={{ ...chipBtn(false), padding: '3px 9px', fontSize: '11px' }} title="일정 전체를 하루 앞당기기">◀ 하루 당기기</button>
                <button type="button" onClick={() => shiftDates(1)} style={{ ...chipBtn(false), padding: '3px 9px', fontSize: '11px' }} title="일정 전체를 하루 미루기">하루 미루기 ▶</button>
              </div>
            </div>

            {/* 출장자 */}
            <div>
              <div style={labelStyle}><Users size={14} /> 출장자 <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#1e3a8a' }}>{form.travelers.length}명</span>
              </div>

              {/* 가용 인원 드롭다운 (복수 선택 + 선택 완료) */}
              <div style={{ marginBottom: '8px', position: 'relative' }}>
                <button
                  type="button"
                  onClick={togglePoolPicker}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 11px', border: `1.5px solid ${isPoolPickerOpen ? '#86efac' : '#cbd5e1'}`, borderRadius: '6px', background: isPoolPickerOpen ? '#f0fdf4' : '#ffffff', color: '#166534', fontSize: '13px', fontWeight: '800', cursor: 'pointer', textAlign: 'left' }}
                >
                  <UserCheck size={15} />
                  <span>가용 인원에서 선택</span>
                  <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>({pool.length}명)</span>
                  <span style={{ marginLeft: 'auto', display: 'flex' }}>{isPoolPickerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </button>
                {isPoolPickerOpen && (
                  // 아래 입력 항목 위로 겹쳐서 표시 (팝업 창 높이는 그대로)
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '6px', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)', overflow: 'hidden' }}>
                    {pool.length === 0 ? (
                      <div style={{ padding: '14px 12px', fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>
                        설정된 가용 인원이 없습니다. 업무 관리 상단의 [가용 인원] 버튼에서 먼저 인원을 등록하세요.
                      </div>
                    ) : (
                      <>
                        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                          {pool.map((m, i) => {
                            const checked = poolPick.includes(i);
                            const busy = busyTripOf(m);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => togglePick(i)}
                                title={busy ? `${travelerLabel(m)} - 해당 기간 ${placeLabel(busy)} 출장` : travelerLabel(m)}
                                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', border: 'none', borderBottom: '1px solid #f1f5f9', background: checked ? '#eff6ff' : '#ffffff', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
                              >
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: checked ? '1.5px solid #1e3a8a' : '1.5px solid #94a3b8', background: checked ? '#1e3a8a' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {checked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                </span>
                                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: '800', color: busy ? '#94a3b8' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {travelerLabel(m)}{m.team && <span style={{ fontWeight: '600', color: '#94a3b8', fontSize: '11px' }}> · {m.team}</span>}
                                  </span>
                                  {busy && (
                                    <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      출장 중 · {placeLabel(busy)}
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '8px 10px', borderTop: '1px solid #f1f5f9' }}>
                          <button type="button" onClick={() => setIsPoolPickerOpen(false)} style={{ padding: '7px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                            닫기
                          </button>
                          <button type="button" onClick={confirmPoolPick} className="glass-button-primary" style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #1e3a8a', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={13} /> 선택 완료 ({poolPick.length}명)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <UserPlus size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      value={travelerInput}
                      onChange={e => setTravelerInput(e.target.value)}
                      onKeyDown={handleTravelerKey}
                      placeholder="이름 검색 또는 직접 입력 후 Enter"
                      style={{ ...inputStyle, paddingLeft: '30px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!travelerInput.trim()) return;
                      const parts = travelerInput.trim().split(/\s+/);
                      addTraveler({ name: parts[0], rank: parts.slice(1).join(' ') });
                    }}
                    style={{ ...iconBtn, width: 'auto', height: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: '800' }}
                  >
                    추가
                  </button>
                </div>
                {userSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)', zIndex: 5, maxHeight: '220px', overflowY: 'auto' }}>
                    {userSuggestions.map(u => (
                      <button
                        key={u.username || `${u.name}-${u.team}`}
                        type="button"
                        onClick={() => addTraveler(u)}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#ffffff', cursor: 'pointer', fontSize: '13px', color: '#0f172a', fontWeight: '700' }}
                      >
                        {u.name} {u.rank}
                        <span style={{ color: '#94a3b8', fontWeight: '600', fontSize: '11.5px' }}> · {[u.division, u.team].filter(Boolean).join(' / ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.travelers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                  {form.travelers.map((tr, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 6px 4px 10px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: '12.5px', fontWeight: '700' }}>
                      {travelerLabel(tr)}{tr.team && <span style={{ color: '#64748b', fontWeight: '600', fontSize: '11px' }}>· {tr.team}</span>}
                      <button type="button" onClick={() => removeTraveler(i)} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '0 2px' }} title="제외"><X size={13} /></button>
                    </span>
                  ))}
                </div>
              )}
              {currentUser?.name && !form.travelers.some(x => x.username === currentUser.username) && (
                <button type="button" onClick={() => addTraveler(currentUser)} style={{ ...chipBtn(false), marginTop: '6px', padding: '3px 9px', fontSize: '11px' }}>
                  + 나({currentUser.name}) 추가
                </button>
              )}
            </div>

            {/* 상태 */}
            <div>
              <div style={labelStyle}>상태</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {STATUS_OPTIONS.map(o => (
                  <button key={o.id} type="button" onClick={() => setField('status', o.id)} title={o.desc} style={{ ...chipBtn(form.status === o.id), flex: 1, justifyContent: 'center', borderRadius: '6px', padding: '7px 10px' }}>
                    {o.id}
                  </button>
                ))}
              </div>
            </div>

            {/* 색상 */}
            <div>
              <div style={labelStyle}>표시 색상</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" onClick={() => setField('color', '')} style={{ ...chipBtn(!form.color, siteColorMap[siteKeyName(form)]), padding: '3px 9px', fontSize: '11px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: siteColorMap[siteKeyName(form)] || '#475569' }} /> 사업장 기본색
                </button>
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setField('color', c)}
                    style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: form.color === c ? '3px solid #0f172a' : '2px solid #ffffff', boxShadow: '0 0 0 1px #cbd5e1', cursor: 'pointer', padding: 0 }}
                  />
                ))}
              </div>
            </div>

            {/* 출장 업무 */}
            <div>
              <div style={labelStyle}>출장 업무 / 목적</div>
              <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="예) 설비 정기점검, 셋업 지원" style={inputStyle} />
            </div>

            {/* 메모 */}
            <div>
              <div style={labelStyle}>메모</div>
              <textarea value={form.memo} onChange={e => setField('memo', e.target.value)} rows={3} placeholder="예) 업무 특이사항 기입" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {/* 하단 버튼 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {form.id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1.5px solid #fecaca', background: confirmDelete ? '#dc2626' : '#fef2f2', color: confirmDelete ? '#ffffff' : '#dc2626', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Trash2 size={14} /> {confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}
                  </button>
              )}
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="glass-button-primary"
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #1e3a8a', fontSize: '13px', fontWeight: '800', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
