// ═══════════════════════════════════════════════════════════════════════════
// league_shared_pool.ts — сводный недельный пул лиги (константы и чистые хелперы).
//
// зачем (владелец, 2026-08-03): активных игроков лиг осталось ~18 в неделю на
// 12 лиг — комнаты по (неделя, лига) выродились в сольники, люди неделями
// видели одних и тех же соседей, а одиночки высших лиг сидели в пустоте.
// С недели SHARED_POOL_START_WEEK все реальные игроки собираются в ОДНУ
// комнату недели (переполнение сверх 30 владелец разрешил явно). Личная лига
// каждого хранится в его записи участника (members.{uid}.leagueId) и живёт
// по старым правилам ±1 за неделю. Пустоту до полной комнаты добивают
// «жители» (league_ghosts.ts).
//
// Kill-switch: remote_config/app → bools.league_shared_pool_enabled=false
// выключает НОВУЮ расстановку в пул без деплоя. Уже сидящие в пуле продолжают
// обновляться: проверка соответствия комнаты (leagueRoomMatches) всегда
// pool-aware, поэтому выключение флага посреди недели никого не ломает.
// ═══════════════════════════════════════════════════════════════════════════

export const SHARED_POOL_MARKER = 'shared_v1';
export const SHARED_POOL_START_WEEK = '2026-W33';
/** Мягкий лимит РЕАЛЬНЫХ игроков в пуле; сверх него открывается вторая комната. */
export const SHARED_POOL_REAL_SOFT_CAP = 50;
/** До скольких видимых участников (реальные + жители) дозаполняется комната. */
export const SHARED_POOL_TARGET_VISIBLE = 28;
export const GHOST_UID_PREFIX = 'ghost_';

const SHARED_POOL_FLAG_TTL_MS = 5 * 60 * 1000;

export function getLeagueWeekId(at = new Date()): string {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Понедельник 00:00 UTC недели `YYYY-W##` (ISO: неделя 1 содержит 4 января). */
export function isoWeekStartMs(weekId: string): number {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) return 0;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Day = new Date(jan4).getUTCDay() || 7;
  const week1Monday = jan4 - (jan4Day - 1) * 86400000;
  return week1Monday + (week - 1) * 7 * 86400000;
}

export function compareWeekIds(a: string, b: string): number {
  const parse = (v: string): number | null => {
    const m = /^(\d{4})-W(\d{2})$/.exec(v);
    return m ? Number(m[1]) * 100 + Number(m[2]) : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (pa != null && pb != null) return pa - pb;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isSharedPoolWeekId(weekId: string): boolean {
  return compareWeekIds(weekId, SHARED_POOL_START_WEEK) >= 0;
}

export function isSharedPoolRoomData(data: FirebaseFirestore.DocumentData | undefined | null): boolean {
  return (data as Record<string, unknown> | null | undefined)?.pool === SHARED_POOL_MARKER;
}

export function sharedPoolDocId(weekId: string, index1based: number): string {
  return `pool_${weekId}_${String(Math.max(1, Math.trunc(index1based))).padStart(2, '0')}`;
}

export function isGhostMemberEntry(uid: string, member: unknown): boolean {
  if (uid.startsWith(GHOST_UID_PREFIX)) return true;
  return !!member && typeof member === 'object' && (member as Record<string, unknown>).isGhost === true;
}

type MembersMap = Record<string, Record<string, unknown>> | undefined | null;

function memberEntries(members: MembersMap): Array<[string, Record<string, unknown>]> {
  if (!members || typeof members !== 'object') return [];
  return Object.entries(members).filter(([, m]) => m?.identityHidden !== true);
}

/** Видимые участники: реальные + жители (для memberCount и отображения). */
export function countVisibleMembers(members: MembersMap): number {
  return memberEntries(members).length;
}

/** Только реальные игроки — по ним считается soft cap и зоны повышения. */
export function countRealMembers(members: MembersMap): number {
  return memberEntries(members).filter(([uid, m]) => !isGhostMemberEntry(uid, m)).length;
}

/**
 * Комната подходит участнику: неделя совпадает, и либо это сводный пул
 * (личная лига участника не обязана совпадать с leagueId документа),
 * либо легаси-комната его лиги.
 */
export function leagueRoomMatches(
  data: FirebaseFirestore.DocumentData | undefined | null,
  weekId: string,
  personalLeagueId: number,
): boolean {
  if (!data || data.weekId !== weekId) return false;
  if (isSharedPoolRoomData(data)) return true;
  const roomLeague = Math.trunc(Number(data.leagueId));
  return Number.isFinite(roomLeague) && roomLeague === personalLeagueId;
}

/**
 * Выбор пула из списка комнат недели: сперва комната, где я уже есть,
 * затем первая по порядку id с реальными < soft cap, иначе null (создать новую).
 */
export function chooseSharedPoolRoom(
  rooms: Array<{ id: string; data: FirebaseFirestore.DocumentData }>,
  stableUid: string,
): string | null {
  const sorted = [...rooms].sort((a, b) => a.id.localeCompare(b.id));
  for (const room of sorted) {
    const members = room.data?.members as MembersMap;
    if (members && Object.prototype.hasOwnProperty.call(members, stableUid)) return room.id;
  }
  for (const room of sorted) {
    if (countRealMembers(room.data?.members as MembersMap) < SHARED_POOL_REAL_SOFT_CAP) return room.id;
  }
  return null;
}

let _flagCache: { value: boolean; ts: number } | null = null;

/** Только для тестов. */
export function __resetSharedPoolFlagCacheForTests(): void {
  _flagCache = null;
}

/**
 * Kill-switch из remote_config/app (bools.league_shared_pool_enabled).
 * Отсутствие поля/дока = ВКЛЮЧЕНО (активация в SHARED_POOL_START_WEEK без
 * ручной работы в консоли). Кэш на 5 минут на инстанс — Firebase-экономия:
 * join-callable и так делает несколько чтений, лишнее на каждый вызов не нужно.
 */
export async function isSharedPoolEnabled(db: FirebaseFirestore.Firestore): Promise<boolean> {
  const now = Date.now();
  if (_flagCache && now - _flagCache.ts < SHARED_POOL_FLAG_TTL_MS) return _flagCache.value;
  let value = true;
  try {
    const snap = await db.collection('remote_config').doc('app').get(); // guard-ok: чтение одного дока, не коллекции
    const bools = snap.exists ? (snap.data()?.bools as Record<string, unknown> | undefined) : undefined;
    value = bools?.league_shared_pool_enabled !== false;
  } catch {
    value = _flagCache?.value ?? true;
  }
  _flagCache = { value, ts: now };
  return value;
}
