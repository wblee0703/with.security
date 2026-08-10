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

/**
 * Returns true if personA and personB represent the EXACT SAME person.
 * Returns false if ANY of the non-empty fields (name, phone, division, team, rank, role, username) differ.
 */
export function isSamePerson(personA, personB) {
  if (!personA || !personB) return false;

  const nameA = (personA.name || personA.visitorName || '').trim();
  const nameB = (personB.name || personB.visitorName || '').trim();

  const phoneA = (personA.phone || '').trim();
  const phoneB = (personB.phone || '').trim();

  const divisionA = (personA.division || personA.businessUnit || personA.company || '').trim();
  const divisionB = (personB.division || personB.businessUnit || personB.company || '').trim();

  const teamA = (personA.team || personA.department || personA.belonging || '').trim();
  const teamB = (personB.team || personB.department || personB.belonging || '').trim();

  const rankA = (personA.rank || personA.title || '').trim();
  const rankB = (personB.rank || personB.title || '').trim();

  const roleA = (personA.role || personA.accountType || personA.category || '').trim();
  const roleB = (personB.role || personB.accountType || personB.category || '').trim();

  const usernameA = (personA.username || personA.userId || '').trim();
  const usernameB = (personB.username || personB.userId || '').trim();

  // 1. If names are present on both and differ -> DIFFERENT
  if (nameA && nameB && nameA !== nameB) return false;

  // 2. If phones are present on both and differ -> DIFFERENT
  if (phoneA && phoneB && phoneA !== phoneB) return false;

  // 3. If divisions are present on both and differ -> DIFFERENT
  if (divisionA && divisionB && divisionA !== divisionB) return false;

  // 4. If teams are present on both and differ -> DIFFERENT
  if (teamA && teamB && teamA !== teamB) return false;

  // 5. If ranks are present on both and differ -> DIFFERENT
  if (rankA && rankB && rankA !== rankB) return false;

  // 6. If roles are present on both and differ -> DIFFERENT
  if (roleA && roleB && roleA !== roleB) return false;

  // 7. If usernames are present on both and differ -> DIFFERENT
  if (usernameA && usernameB && usernameA !== usernameB) return false;

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
