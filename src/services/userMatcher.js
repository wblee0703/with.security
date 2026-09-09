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

  // 1. 고유 계정 ID (username, writer_id 등) 추출
  const getAccount = (p) => {
    if (!p) return '';
    return String(
      p.username ||
      p.writer_id ||
      p.writerId ||
      p.authorUsername ||
      p.author_username ||
      p.userId ||
      p.user_id ||
      ''
    ).trim().toLowerCase();
  };

  const usernameA = getAccount(personA);
  const usernameB = getAccount(personB);

  // ⭐ 핵심 1: 두 대상 모두 고유 계정 ID가 존재하고 완전히 일치하면 -> 해당 계정으로 작성된 데이터 100% 동일인 확정!
  if (usernameA && usernameB && usernameA === usernameB) {
    return true;
  }

  // ⭐ 핵심 2: 계정 ID가 둘 다 존재하는데 서로 다르면 -> 확실히 다른 계정
  if (usernameA && usernameB && usernameA !== usernameB) {
    return false;
  }

  // 2. 계정 ID가 한쪽에 없거나 오프라인 서약 기록인 경우 이름/소속/직급 등 프로필 종합 평가
  const nameA = String(personA.name || personA.authorName || personA.writerName || personA.visitorName || personA.userName || '').trim().toLowerCase();
  const nameB = String(personB.name || personB.authorName || personB.writerName || personB.visitorName || personB.userName || '').trim().toLowerCase();

  // 이름이 둘 다 존재하는데 다르면 -> 다른 사람 (동명이인이 아닌 완전 타인)
  if (nameA && nameB && nameA !== nameB) return false;

  const cleanTeam = (t) => {
    let s = String(t || '').trim().replace(/\s+/g, '').toLowerCase();
    if (s.includes('>')) s = s.split('>').pop().trim();
    return s;
  };
  const teamA = cleanTeam(personA.team || personA.department || personA.visitor_team || personA.belonging);
  const teamB = cleanTeam(personB.team || personB.department || personB.visitor_team || personB.belonging);

  // 소속팀이 둘 다 존재하고 서로 상충되면(포함 관계도 아님) -> 다른 사람 (동명이인 판정)
  if (teamA && teamB && teamA !== teamB && !teamA.includes(teamB) && !teamB.includes(teamA)) {
    return false;
  }

  const rankA = String(personA.rank || personA.authorRank || personA.writerRank || personA.title || personA.visitor_rank || personA.visitorRank || '').trim().toLowerCase();
  const rankB = String(personB.rank || personB.authorRank || personB.writerRank || personB.title || personB.visitor_rank || personB.visitorRank || '').trim().toLowerCase();

  // 직급이 둘 다 존재하는데 다르면 -> 다른 사람 (동명이인 판정)
  if (rankA && rankB && rankA !== rankB) return false;

  const cleanPhone = (ph) => {
    const s = String(ph || '').trim().replace(/[-_\s]/g, '');
    if (!s || s === '01000000000' || s === '00000000000') return '';
    return s;
  };
  const phoneA = cleanPhone(personA.phone || personA.visitorPhone || personA.visitor_phone);
  const phoneB = cleanPhone(personB.phone || personB.visitorPhone || personB.visitor_phone);

  // 연락처가 둘 다 유효하게 존재하는데 다르면 -> 다른 사람 (동명이인 판정)
  if (phoneA && phoneB && phoneA !== phoneB) return false;

  // 이름이 일치하거나, 계정 ID가 일치하면 동일인으로 판정
  if ((nameA && nameB && nameA === nameB) || (usernameA && usernameB && usernameA === usernameB)) {
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
