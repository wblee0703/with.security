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
 * Returns false if ANY of the non-empty fields (name, phone, division, team, rank, role, username) differ.
 */
export function isSamePerson(personA, personB) {
  if (!personA || !personB) return false;

  const nameA = (personA.name || personA.visitorName || '').trim();
  const nameB = (personB.name || personB.visitorName || '').trim();

  const phoneA = (personA.phone || '').trim().replace(/[-_\s]/g, '');
  const phoneB = (personB.phone || '').trim().replace(/[-_\s]/g, '');

  const divisionA = (personA.division || personA.businessUnit || personA.divisionName || '').trim();
  const divisionB = (personB.division || personB.businessUnit || personB.divisionName || '').trim();

  const teamA = (personA.team || personA.department || personA.belonging || '').trim();
  const teamB = (personB.team || personB.department || personB.belonging || '').trim();

  const rankA = (personA.rank || personA.title || '').trim();
  const rankB = (personB.rank || personB.title || '').trim();

  const roleA = (personA.role || personA.accountType || personA.category || '').trim();
  const roleB = (personB.role || personB.accountType || personB.category || '').trim();

  const usernameA = (personA.username || personA.userId || '').trim();
  const usernameB = (personB.username || personB.userId || '').trim();

  // Normalize whitespace for robust identity checking
  const normDivA = divisionA.replace(/\s+/g, '');
  const normDivB = divisionB.replace(/\s+/g, '');

  const normTeamA = teamA.replace(/\s+/g, '');
  const normTeamB = teamB.replace(/\s+/g, '');

  // 1. If usernames are present on both and differ -> DIFFERENT PERSON
  if (usernameA && usernameB && usernameA !== usernameB) return false;

  // 2. If names are present on both and differ -> DIFFERENT PERSON
  if (nameA && nameB && nameA !== nameB) return false;

  // 3. CRITICAL: If divisions (사업부) are present on both and differ -> DIFFERENT PERSON
  if (normDivA && normDivB && normDivA !== normDivB) return false;

  // 4. If teams (소속/팀) are present on both and differ -> DIFFERENT PERSON
  if (normTeamA && normTeamB && normTeamA !== normTeamB) return false;

  // 5. If phones are present on both and differ -> DIFFERENT PERSON
  if (phoneA && phoneB && phoneA !== phoneB) return false;

  // 6. If ranks are present on both and differ -> DIFFERENT PERSON
  if (rankA && rankB && rankA !== rankB) return false;

  // 7. If roles are present on both and differ -> DIFFERENT PERSON
  if (roleA && roleB && roleA !== roleB) return false;

  // Minimum identity requirement: must match on username OR name
  if (usernameA && usernameB && usernameA === usernameB) return true;
  if (nameA && nameB && nameA === nameB) return true;

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
