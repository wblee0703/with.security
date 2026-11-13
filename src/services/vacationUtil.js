// 휴가 일지 기간 유틸
// 휴가는 시작일(date) ~ 종료일(endDate / end_date) 1건(구글 시트 1줄)으로 저장된다.
// end_date 컬럼이 없는 환경(구 GAS 배포본)을 위해 세부내용의
// "휴가 기간: YYYY-MM-DD ~ YYYY-MM-DD (N일[, 주말 제외])" 표기에서도 기간을 복원한다.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /휴가 기간:\s*(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})\s*\((\d+)일(,\s*주말 제외)?\)/;

const toIsoDate = (val) => {
  const s = String(val || '').trim().slice(0, 10);
  return DATE_RE.test(s) ? s : '';
};

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseLocal = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isVacationLog = (log) => Boolean(log) && String(log.subCategory || log.sub_category || '').trim() === '휴가';

// 기간 내 날짜 목록 (주말 제외 옵션)
export const listDates = (start, end, excludeWeekends = false, maxDays = 400) => {
  if (!start || !end || end < start) return [];
  const cur = parseLocal(start);
  const last = parseLocal(end);
  const out = [];
  while (cur <= last && out.length < maxDays) {
    const dow = cur.getDay();
    if (!(excludeWeekends && (dow === 0 || dow === 6))) out.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

export const formatVacationPeriod = (start, end, dayCount, excludeWeekends) => {
  const range = start === end ? start : `${start} ~ ${end}`;
  return `휴가 기간: ${range} (${dayCount}일${excludeWeekends && start !== end ? ', 주말 제외' : ''})`;
};

/**
 * 휴가 일지의 기간 정보. 휴가가 아니면 null.
 * @returns {{ start: string, end: string, excludeWeekends: boolean, isMultiDay: boolean } | null}
 */
export const getVacationRange = (log) => {
  if (!isVacationLog(log)) return null;
  const start = toIsoDate(log.date || log.log_date);
  if (!start) return null;
  const details = String(log.details || log.tasks_done || log.tasksDone || '');
  const m = details.match(PERIOD_RE);
  let end = toIsoDate(log.endDate || log.end_date);
  // 세부내용 기간 표기는 이 일지가 기간의 시작일일 때만 사용 (과거 날짜별 분할 등록 데이터와 구분)
  if (!end && m && m[1] === start) end = m[2];
  if (!end || end < start) end = start;
  const excludeWeekends = Boolean(m && m[4]);
  return { start, end, excludeWeekends, isMultiDay: end > start };
};

// 휴가 일지가 실제로 차지하는 날짜 목록 (휴가가 아니면 등록일 1일)
export const getVacationDays = (log) => {
  const r = getVacationRange(log);
  if (!r) {
    const d = toIsoDate(log?.date || log?.log_date);
    return d ? [d] : [];
  }
  const days = listDates(r.start, r.end, r.excludeWeekends);
  return days.length > 0 ? days : [r.start];
};

// 해당 날짜가 휴가 기간에 포함되는지
export const vacationCoversDate = (log, date) => {
  const r = getVacationRange(log);
  if (!r || !date || date < r.start || date > r.end) return false;
  if (!r.excludeWeekends || r.start === r.end) return true;
  const dow = parseLocal(date).getDay();
  return dow !== 0 && dow !== 6;
};
