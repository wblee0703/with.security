/**
 * User Identity and Person Matching Utilities
 * 
 * Policy:
 * 동명2인이 존재할 수 있으므로, 아래 항목 중 1개라도 다르면 다른 사람(Different Person)으로 판단함:
 * 1. 사업부 (division / businessUnit / company)
 * 2. 소속 / 팀 (team / department / belonging)
 * 3. 직급 (rank / title)
 * 4. 연락처 (phone)
 * 5. 이름 (name / visitorName)
 * 6. 계정구분 / 권한 (role / accountType)
 * 7. 아이디 (username / userId)
 */

export const DIVISION_LIST = [
  '위드텍',
  '경영기획사업부',
  '품질경영팀',
  '환경안전팀',
  '영업/운영사업부',
  '개발사업부',
  '방사화학연구실',
  '중국법인'
];

export const DIVISION_TEAMS_MAP = {
  '위드텍': ['품질경영팀', '환경안전팀'],
  '경영기획사업부': ['인사총무팀', '회계팀', '구매팀'],
  '품질경영팀': ['품질경영팀'],
  '환경안전팀': ['환경안전팀'],
  '영업/운영사업부': ['영업팀', '글로벌마케팅팀', '운영1팀(본사)', '운영1팀(이천)', '운영1팀(청주)', '운영1팀(삼성)', '운영2팀'],
  '개발사업부': ['모니터링기술팀', '공정기술팀', '분석파트', '환경기술팀', '시스템기술팀', '제어기술팀', '광학파트', '제조기술팀', '설계팀'],
  '방사화학연구실': ['방사화학파트'],
  '중국법인': ['서안', '우시']
};

export function getTeamsForDivision(division) {
  if (!division) return [];
  const normalized = division.trim();
  return DIVISION_TEAMS_MAP[normalized] || [];
}

export const RANK_LIST = [
  '인턴사원',
  '사원',
  '주임',
  '대리',
  '과장',
  '차장',
  '부장',
  '이사'
];

/**
 * Returns true if personA and personB represent the EXACT SAME person.
 * Evaluates ID (username), 소속 (team/department), 직급 (rank), and 이름 (name).
 * If ANY single field differs when present, treats them as DIFFERENT persons.
 */
export function isSamePerson(personA, personB) {
  if (!personA || !personB) return false;

  const usernameA = (personA.username || personA.userId || personA.writer_id || '').trim().toLowerCase();
  const usernameB = (personB.username || personB.userId || personB.writer_id || '').trim().toLowerCase();

  const nameA = (personA.name || personA.visitorName || personA.userName || '').trim().toLowerCase();
  const nameB = (personB.name || personB.visitorName || personB.userName || '').trim().toLowerCase();

  const teamA = (personA.team || personA.department || personA.visitor_team || personA.belonging || '').trim().replace(/\s+/g, '').toLowerCase();
  const teamB = (personB.team || personB.department || personB.visitor_team || personB.belonging || '').trim().replace(/\s+/g, '').toLowerCase();

  const rankA = (personA.rank || personA.title || personA.visitor_rank || '').trim().toLowerCase();
  const rankB = (personB.rank || personB.title || personB.visitor_rank || '').trim().toLowerCase();

  const divisionA = (personA.division || personA.businessUnit || '').trim().replace(/\s+/g, '').toLowerCase();
  const divisionB = (personB.division || personB.businessUnit || '').trim().replace(/\s+/g, '').toLowerCase();

  const phoneA = (personA.phone || personA.visitorPhone || personA.visitor_phone || '').trim().replace(/[-_\s]/g, '');
  const phoneB = (personB.phone || personB.visitorPhone || personB.visitor_phone || '').trim().replace(/[-_\s]/g, '');

  // 1. ID (username)가 둘 다 존재하는데 다르면 -> 다른 사람 (Different Person)
  if (usernameA && usernameB && usernameA !== usernameB) return false;

  // 2. 이름 (name)이 둘 다 존재하는데 다르면 -> 다른 사람 (Different Person)
  if (nameA && nameB && nameA !== nameB) return false;

  // 3. 소속 (team/department)이 둘 다 존재하는데 다르면 -> 다른 사람 (Different Person)
  if (teamA && teamB && teamA !== teamB) return false;

  // 4. 직급 (rank)이 둘 다 존재하는데 다르면 -> 다른 사람 (Different Person)
  if (rankA && rankB && rankA !== rankB) return false;

  // 5. 사업부 (division)가 둘 다 존재하는데 다르면 -> 다른 사람 (Different Person)
  if (divisionA && divisionB && divisionA !== divisionB) return false;

  // 6. 연락처 (phone)가 둘 다 존재하는데 다르면 -> 다른 사람 (Different Person)
  if (phoneA && phoneB && phoneA !== phoneB) return false;

  // ID 또는 이름 중 최소 1개는 일치해야 동일인으로 판단
  if ((usernameA && usernameB && usernameA === usernameB) || (nameA && nameB && nameA === nameB)) {
    return true;
  }

  return false;
}

/**
 * Returns true if personA and personB are DIFFERENT people.
 */
export function isDifferentPerson(personA, personB) {
  return !isSamePerson(personA, personB);
}

/**
 * Generates a full composite identity key string for strict person indexing/deduplication.
 */
export function getPersonIdentityKey(person) {
  if (!person) return '';
  const name = (person.name || person.visitorName || '').trim();
  const phone = (person.phone || '').trim();
  const division = (person.division || person.businessUnit || person.company || '').trim();
  const team = (person.team || person.department || person.belonging || '').trim();
  const rank = (person.rank || person.title || '').trim();
  const role = (person.role || person.accountType || person.category || '').trim();
  const username = (person.username || person.userId || '').trim();

  return `KEY::name=${name}|phone=${phone}|div=${division}|team=${team}|rank=${rank}|role=${role}|user=${username}`;
}
