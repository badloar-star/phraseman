import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { isVipActive, resolvePremiumAccess, resolveIsLifetimePlan } from './premium_status';
import {
  SHARED_POOL_MARKER,
  chooseSharedPoolRoom,
  isSharedPoolEnabled,
  isSharedPoolWeekId,
  leagueRoomMatches,
  sharedPoolDocId,
} from './league_shared_pool';

const GROUP_SIZE = 30;
const MAX_LEAGUE_ID = 11;
const BROAD_GROUP_QUERY_LIMIT = 500;
const LEAGUE_FINALIZATION_GRACE_MS = 15 * 60 * 1000;
const LEAGUE_GROUP_BOOST_COST_SHARDS = 50;
const LEAGUE_GROUP_BOOST_MULTIPLIER = 2;
const LEAGUE_GROUP_BOOST_DURATION_MS = 3 * 60 * 60 * 1000;
const NAME_INDEX = 'name_index';

type MemberData = {
  name: string;
  points: number;
  uid: string;
  avatar?: string | null;
  frame?: string | null;
  aura?: string | null;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  streak?: number;
  totalXp?: number;
  leagueId?: number;
  leagueBoostMultiplier?: number;
  leagueBoostExpiresAt?: number;
};

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeName(value: unknown): { name: string; nameLower: string } {
  const name = sanitizeString(value, 48);
  return { name, nameLower: name.toLowerCase() };
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function readIntOrNull(value: unknown): number | null {
  const raw = typeof value === 'string' ? value.trim() : value;
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) ? n : null;
}

function clampLeagueId(value: unknown, fallback = 0): number {
  return Math.max(0, Math.min(MAX_LEAGUE_ID, readInt(value, fallback)));
}

async function resolveAuthoritativeLeagueId(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  weekId: string,
  leaderboard: FirebaseFirestore.DocumentData | undefined,
  nowMs = Date.now(),
): Promise<number> {
  const leaderboardLeagueId = clampLeagueId(leaderboard?.leagueId, 0);
  if (sanitizeString(leaderboard?.groupWeekId, 16) === weekId) return leaderboardLeagueId;

  const previousWeekId = getWeekId(new Date(nowMs - 7 * 24 * 60 * 60 * 1000));
  const previousWeekNeedsFinalization = sanitizeString(leaderboard?.groupWeekId, 16) === previousWeekId;
  const now = new Date(nowMs);
  const mondayStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
  );
  const finalizationPending = previousWeekNeedsFinalization
    && nowMs >= mondayStartMs
    && nowMs - mondayStartMs < LEAGUE_FINALIZATION_GRACE_MS;
  const resultSnap = await db
    .collection('users')
    .doc(stableUid)
    .collection('league_week_results')
    .doc(previousWeekId)
    .get()
    .catch(() => null);
  if (!resultSnap?.exists) {
    if (finalizationPending) {
      throw new HttpsError('failed-precondition', 'league_finalization_pending');
    }
    return leaderboardLeagueId;
  }

  const result = resultSnap.data() || {};
  const previousLeagueId = clampLeagueId(result.prevLeagueId, leaderboardLeagueId);
  const nextLeagueId = clampLeagueId(result.newLeagueId, previousLeagueId);
  const resultGroupId = sanitizeString(result.groupId, 180);
  const leaderboardGroupId = sanitizeString(leaderboard?.groupId, 180);
  const valid = previousLeagueId === leaderboardLeagueId
    && Math.abs(nextLeagueId - previousLeagueId) <= 1
    && (!leaderboardGroupId || !resultGroupId || resultGroupId === leaderboardGroupId);
  if (!valid && finalizationPending) {
    throw new HttpsError('failed-precondition', 'league_finalization_pending');
  }
  return valid ? nextLeagueId : leaderboardLeagueId;
}

function getCurrentWeekPointsFromV2(progress: Record<string, unknown>, currentWeekId: string): number {
  const raw = progress.week_points_v2;
  if (typeof raw !== 'string') return 0;
  try {
    const parsed = JSON.parse(raw) as { weekKey?: unknown; points?: unknown };
    if (typeof parsed.weekKey !== 'string') return 0;
    if (parsed.weekKey !== currentWeekId) return 0;
    const points = Number(parsed.points);
    if (!Number.isFinite(points) || points < 0 || points > 1_000_000_000) return 0;
    return points;
  } catch {
    return 0;
  }
}

function getCurrentMondayUtcIso(nowMs: number): string {
  const date = new Date(nowMs);
  date.setUTCHours(0, 0, 0, 0);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function getLeagueWeekPoints(progress: Record<string, unknown>, nowMs = Date.now()): number {
  const currentWeekId = getWeekId(new Date(nowMs));
  const weeklyXp = sanitizeString(progress.weekly_xp_period_start, 10) === getCurrentMondayUtcIso(nowMs)
    ? readIntOrNull(progress.weekly_xp)
    : null;
  const currentWeeklyXp = weeklyXp == null
    ? 0
    : Math.max(0, Math.min(1_000_000_000, weeklyXp));
  const currentV2Points = getCurrentWeekPointsFromV2(progress, currentWeekId);
  return Math.max(currentWeeklyXp, currentV2Points);
}

function readNestedString(data: FirebaseFirestore.DocumentData | undefined, path: string[]): string {
  let cur: unknown = data;
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur.trim() : '';
}

function leagueFallbackName(stableUid: string): string {
  const suffix = sanitizeString(stableUid, 180).slice(-4).toUpperCase() || 'USER';
  return `Player ${suffix}`;
}

async function leagueNameOwnerIsLive(db: FirebaseFirestore.Firestore, uid: string): Promise<boolean> {
  const cleanUid = sanitizeString(uid, 180);
  if (!cleanUid) return false;
  const userSnap = await db.collection('users').doc(cleanUid).get().catch(() => null);
  if (!userSnap?.exists) return false;
  const data = userSnap.data() ?? {};
  if (data.identityHidden === true) return false;
  if (data.banned === true) return false;
  return true;
}

async function legacyLeagueNameHasOtherLiveOwner(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  name: string,
  nameLower: string,
): Promise<boolean> {
  const queries = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5),
    db.collection('users').where('progress.user_name', '==', name).limit(5),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5),
  ];
  for (const query of queries) {
    const snap = await query.get().catch(() => null);
    for (const doc of snap?.docs ?? []) {
      const ownerUid = sanitizeString(doc.id, 180);
      if (!ownerUid || ownerUid === stableUid) continue;
      if (await leagueNameOwnerIsLive(db, ownerUid)) return true;
    }
  }
  return false;
}

async function resolveAuthoritativeLeagueMemberName(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  userData: FirebaseFirestore.DocumentData | undefined,
  leaderboardData: FirebaseFirestore.DocumentData | undefined,
  requestedName: unknown,
): Promise<string> {
  // Имя из СОБСТВЕННОГО документа юзера (users/{stableUid}.progress.user_name) —
  // аутентично по определению: это его uid, его имя. Раньше резолвер отвергал
  // его, если name_index не подтверждал владельца (или индекса не было / он
  // указывал на СТАРЫЙ uid после auth-merge), и подставлял «Player XXXX». Индекс
  // предназначен ловить кражу ЧУЖОГО имени (через requestedName/leaderboard), а
  // не отвергать собственное имя из собственного дока. Поэтому доверяем ему сразу,
  // если сам юзер не скрыт. Это чинит массовый «Player XXXX» у людей с именами.
  if (userData && userData.identityHidden !== true) {
    const ownName = normalizeName(readNestedString(userData, ['progress', 'user_name']));
    if (ownName.nameLower) return ownName.name;
  }

  // Остальные источники (leaderboard-снапшот, имя из тела запроса) НЕ являются
  // собственным документом — тут защита от присвоения чужого имени остаётся:
  // разрешаем только если name_index принадлежит этому uid либо имя реально
  // свободно (нет другого живого владельца).
  const candidates = [
    sanitizeString(leaderboardData?.name, 48),
    requestedName,
  ];

  for (const candidate of candidates) {
    const { name, nameLower } = normalizeName(candidate);
    if (!nameLower) continue;

    const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get().catch(() => null);
    const idxData = idxSnap?.data?.() ?? {};
    const indexOwner = sanitizeString(idxData.uid, 180);
    if (idxSnap?.exists && idxData.identityHidden !== true) {
      if (indexOwner === stableUid) return sanitizeString(idxData.name, 48) || name;
      continue;
    }

    if (!(await legacyLeagueNameHasOtherLiveOwner(db, stableUid, name, nameLower))) {
      return name;
    }
  }

  return leagueFallbackName(stableUid);
}

function getWeekId(at = new Date()): string {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function makeGroupDocId(weekId: string, leagueId: number, uid: string): string {
  const safeUid = uid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16) || 'user';
  return `${weekId}_${leagueId}_${Date.now()}_${safeUid}_${Math.random().toString(36).slice(2, 8)}`;
}

function countMembers(data: FirebaseFirestore.DocumentData | undefined): number {
  const members = data?.members;
  return members && typeof members === 'object'
    ? Object.values(members).filter((m) => (m as Record<string, unknown>)?.identityHidden !== true).length
    : 0;
}

function sanitizeMember(raw: Record<string, unknown>, stableUid: string): MemberData {
  const points = Math.max(0, Math.min(1_000_000_000, readInt(raw.points, 0)));
  const totalXp = Math.max(0, Math.min(1_000_000_000, readInt(raw.totalXp, 0)));
  const streak = Math.max(0, Math.min(100_000, readInt(raw.streak, 0)));
  const multiplier = Number(raw.leagueBoostMultiplier);
  const boostExpiresAt = readInt(raw.leagueBoostExpiresAt, 0);
  const member: MemberData = {
    name: sanitizeString(raw.name, 48) || 'Player',
    points,
    uid: stableUid,
    avatar: sanitizeString(raw.avatar, 64) || null,
    frame: sanitizeString(raw.frame, 64) || null,
    aura: sanitizeString(raw.aura, 64) || null,
    profileCardLevel: Math.max(0, Math.min(1, readInt(raw.profileCardLevel, 0))),
    profileCardTheme: sanitizeString(raw.profileCardTheme, 32) || 'classic',
    profileCardMotion: sanitizeString(raw.profileCardMotion, 32) || 'none',
    profileCardPublicFocus: sanitizeString(raw.profileCardPublicFocus, 32) || 'balanced',
    isPremium: raw.isPremium === true,
    isVip: raw.isVip === true,
    // isLifetime не доверяем телу запроса (анти-чит): серверное значение
    // проставляет leagueJoinOrUpdateGroup через resolveIsLifetimePlan.
    isLifetime: false,
    streak,
    totalXp,
  };
  if (Number.isFinite(multiplier) && multiplier > 1 && boostExpiresAt > Date.now()) {
    member.leagueBoostMultiplier = Math.min(10, multiplier);
    member.leagueBoostExpiresAt = boostExpiresAt;
  }
  return member;
}

type AuthoritativeLeagueFields = {
  points: number;
  streak: number;
  totalXp: number;
  isPremium?: boolean;
  isVip: boolean;
  isLifetime?: boolean;
};

function getAuthoritativeLeagueWeekPoints(
  userData: FirebaseFirestore.DocumentData | undefined,
  leaderboard: FirebaseFirestore.DocumentData | undefined,
  weekId: string,
  nowMs = Date.now(),
): number {
  const progress = userData?.progress && typeof userData.progress === 'object'
    ? userData.progress as Record<string, unknown>
    : {};
  const progressPoints = getLeagueWeekPoints(progress, nowMs);
  const leaderboardPoints = leaderboard?.weekKey === weekId
    ? Math.max(0, Math.min(1_000_000_000, readInt(leaderboard.weekPoints, 0)))
    : 0;
  return Math.max(progressPoints, leaderboardPoints);
}

async function resolveAuthoritativeLeagueFields(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  userData: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
  weekId: string,
  leaderboard: FirebaseFirestore.DocumentData | undefined,
): Promise<AuthoritativeLeagueFields> {
  const progress = userData?.progress && typeof userData.progress === 'object'
    ? userData.progress as Record<string, unknown>
    : {};
  const [isPremium, isLifetime] = await Promise.all([
    resolvePremiumAccess(db, stableUid, Date.now(), authUid).catch(() => undefined),
    resolveIsLifetimePlan(db, stableUid, Date.now(), authUid).catch(() => undefined),
  ]);
  const result: AuthoritativeLeagueFields = {
    points: getAuthoritativeLeagueWeekPoints(userData, leaderboard, weekId),
    streak: Math.max(0, Math.min(100_000, readInt(progress.streak_count, 0))),
    totalXp: Math.max(0, Math.min(1_000_000_000, readInt(progress.user_total_xp, 0))),
    isVip: isVipActive(progress as Parameters<typeof isVipActive>[0]),
  };
  if (typeof isPremium === 'boolean') result.isPremium = isPremium;
  if (typeof isLifetime === 'boolean') result.isLifetime = isLifetime;
  return result;
}

function leaderboardProjectionForMember(
  weekId: string,
  fields: AuthoritativeLeagueFields,
  existing?: FirebaseFirestore.DocumentData,
) {
  const previousCurrentWeekPoints = existing?.weekKey === weekId
    ? Math.max(0, readInt(existing.weekPoints, 0))
    : 0;
  return {
    weekKey: weekId,
    weekPoints: Math.max(previousCurrentWeekPoints, fields.points),
    streak: fields.streak,
    points: fields.totalXp,
  };
}

function mergeCurrentWeekMember(
  existing: FirebaseFirestore.DocumentData | undefined,
  incoming: FirebaseFirestore.DocumentData,
): FirebaseFirestore.DocumentData {
  return {
    ...(existing || {}),
    ...incoming,
    points: Math.max(0, readInt(incoming.points, 0)),
  };
}

async function assertCanUseLeague(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

async function findGroupWithSpace(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  leagueId: number,
  stableUid: string,
): Promise<string | null> {
  try {
    const snap = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .where('memberCount', '<', GROUP_SIZE)
      .orderBy('memberCount', 'desc')
      .limit(25)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (readInt(data.leagueId) !== leagueId) continue;
      const n = countMembers(data);
      if (n >= GROUP_SIZE) continue;
      if (data.members?.[stableUid]) return doc.id;
      return doc.id;
    }
  } catch {
    // Fall through to broad scan if composite index is not ready.
  }

  const broad = await db
    .collection('league_groups')
    .where('weekId', '==', weekId)
    .where('leagueId', '==', leagueId)
    .limit(BROAD_GROUP_QUERY_LIMIT)
    .get();

  const candidates: { id: string; n: number }[] = [];
  for (const doc of broad.docs) {
    const data = doc.data();
    if (readInt(data.leagueId) !== leagueId) continue;
    const n = countMembers(data);
    if (data.members?.[stableUid]) return doc.id;
    if (n < GROUP_SIZE) candidates.push({ id: doc.id, n });
  }
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0]?.id ?? null;
}

/**
 * Комнаты сводного пула недели. Equality-only запрос (weekId + pool) не требует
 * композитного индекса; комнат за неделю единицы, limit — страховка.
 */
async function fetchSharedPoolRooms(
  db: FirebaseFirestore.Firestore,
  weekId: string,
): Promise<{ id: string; data: FirebaseFirestore.DocumentData }[]> {
  const snap = await db
    .collection('league_groups')
    .where('weekId', '==', weekId)
    .where('pool', '==', SHARED_POOL_MARKER)
    .limit(25)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

async function findExistingGroupForUser(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  leagueId: number,
  stableUid: string,
): Promise<string | null> {
  let best: { id: string; n: number } | null = null;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  while (true) {
    let query: FirebaseFirestore.Query = db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .orderBy('__name__')
      .limit(BROAD_GROUP_QUERY_LIMIT);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (readInt(data.leagueId) !== leagueId || !data.members?.[stableUid]) continue;
      const n = countMembers(data);
      if (!best || n > best.n) best = { id: doc.id, n };
    }
    if (snap.docs.length < BROAD_GROUP_QUERY_LIMIT) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }
  return best?.id ?? null;
}

async function hideDuplicateMemberships(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  stableUid: string,
  keepGroupId: string,
): Promise<number> {
  let hidden = 0;
  const now = Date.now();
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  while (true) {
    let query: FirebaseFirestore.Query = db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .orderBy('__name__')
      .limit(BROAD_GROUP_QUERY_LIMIT);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    let pageHidden = 0;
    for (const doc of snap.docs) {
      if (doc.id === keepGroupId) continue;
      const data = doc.data() || {};
      const members = data.members && typeof data.members === 'object'
        ? { ...(data.members as Record<string, Record<string, unknown>>) }
        : {};
      if (!Object.prototype.hasOwnProperty.call(members, stableUid)) continue;
      const member = members[stableUid] && typeof members[stableUid] === 'object'
        ? members[stableUid]
        : {};
      if (member.identityHidden === true && member.canonicalStableId === stableUid) continue;
      members[stableUid] = {
        ...member,
        uid: stableUid,
        identityHidden: true,
        canonicalStableId: stableUid,
        duplicateOfGroupId: keepGroupId,
        identityCanonicalizedAt: now,
      };
      batch.set(doc.ref, {
        members,
        memberCount: countMembers({ members }),
        updatedAt: now,
        identityCanonicalizedAt: now,
      }, { merge: true });
      pageHidden += 1;
    }
    if (pageHidden > 0) await batch.commit();
    hidden += pageHidden;
    if (snap.docs.length < BROAD_GROUP_QUERY_LIMIT) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }
  return hidden;
}

async function cleanupDuplicateMembershipsBestEffort(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  stableUid: string,
  keepGroupId: string,
): Promise<void> {
  try {
    await hideDuplicateMemberships(db, weekId, stableUid, keepGroupId);
  } catch (e: any) {
    console.warn(JSON.stringify({
      event: 'league_duplicate_membership_cleanup_failed',
      weekId,
      keepGroupId,
      message: String(e?.message ?? e).slice(0, 160),
    }));
  }
}

export const leagueJoinOrUpdateGroup = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const weekId = sanitizeString(request.data?.weekId, 16) || getWeekId();
  if (weekId !== getWeekId()) throw new HttpsError('failed-precondition', 'stale_week');
  const rawMember = (request.data?.member || {}) as Record<string, unknown>;
  const lbRef = db.collection('leaderboard').doc(stableUid);
  const [userSnap, lbSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    lbRef.get().catch(() => null),
  ]);
  const leagueId = await resolveAuthoritativeLeagueId(db, stableUid, weekId, lbSnap?.data());
  const member = sanitizeMember(rawMember, stableUid);
  // Premium/lifetime are server-owned. If their resolver is temporarily unavailable,
  // omit them so an existing true value is not downgraded to false.
  delete (member as unknown as Record<string, unknown>).isPremium;
  delete (member as unknown as Record<string, unknown>).isLifetime;
  member.name = await resolveAuthoritativeLeagueMemberName(
    db,
    stableUid,
    userSnap?.data(),
    lbSnap?.data(),
    rawMember.name,
  );
  const authoritativeFields = await resolveAuthoritativeLeagueFields(
    db,
    stableUid,
    userSnap?.data(),
    authUid,
    weekId,
    lbSnap?.data(),
  );
  Object.assign(member, authoritativeFields);
  // зачем: в сводном пуле комната общая на все лиги, поэтому личная лига живёт
  // в записи участника. Пишет её только сервер из авторитетного резолва —
  // телу запроса это поле не доверяем (sanitizeMember его не пропускает).
  member.leagueId = leagueId;
  const leaderboardProjection = leaderboardProjectionForMember(weekId, authoritativeFields, lbSnap?.data());

  let groupId: string | null = null;
  let shouldCleanupDuplicates = false;
  const savedGroupId = lbSnap?.data()?.groupId;
  if (typeof savedGroupId === 'string' && lbSnap?.data()?.groupWeekId === weekId && readInt(lbSnap?.data()?.leagueId) === leagueId) {
    const savedSnap = await db.collection('league_groups').doc(savedGroupId).get().catch(() => null);
    if (savedSnap?.exists && savedSnap.data()?.members?.[stableUid]) groupId = savedGroupId;
  }

  // зачем: с недели SHARED_POOL_START_WEEK все реальные игроки собираются в
  // общий пул недели (решение владельца 2026-08-03: ~18 активных на 12 лиг,
  // полупустые комнаты и «одни и те же лица»). Kill-switch в remote_config
  // выключает только НОВУЮ расстановку — уже сидящие в пуле продолжают
  // обновляться через pool-aware leagueRoomMatches ниже.
  const sharedPool = isSharedPoolWeekId(weekId) && await isSharedPoolEnabled(db);

  if (!groupId) {
    groupId = sharedPool
      ? chooseSharedPoolRoom(await fetchSharedPoolRooms(db, weekId), stableUid)
      : await findExistingGroupForUser(db, weekId, leagueId, stableUid);
    shouldCleanupDuplicates = Boolean(groupId);
  }

  if (groupId) {
    await db.runTransaction(async (tx) => {
      const ref = db.collection('league_groups').doc(groupId as string);
      const [snap, freshLbSnap] = await Promise.all([tx.get(ref), tx.get(lbRef)]);
      if (!snap.exists) throw new HttpsError('not-found', 'league_group_not_found');
      const data = snap.data() || {};
      if (!leagueRoomMatches(data, weekId, leagueId)) throw new HttpsError('permission-denied', 'room_mismatch');
      const currentWeekPoints = getAuthoritativeLeagueWeekPoints(userSnap?.data(), freshLbSnap.data(), weekId);
      const currentMember = { ...member, points: currentWeekPoints };
      const members = { ...(data.members || {}) };
      members[stableUid] = mergeCurrentWeekMember(members[stableUid], currentMember);
      tx.set(ref, { members, memberCount: countMembers({ members }), updatedAt: Date.now() }, { merge: true });
      tx.set(lbRef, {
        groupId,
        groupWeekId: weekId,
        leagueId,
        ...leaderboardProjectionForMember(weekId, { ...authoritativeFields, points: currentWeekPoints }, freshLbSnap.data()),
      }, { merge: true });
    });
    if (shouldCleanupDuplicates) {
      await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, groupId);
    }
    return { ok: true, groupId, weekId, leagueId };
  }

  if (sharedPool) {
    // Пула ещё нет — создаём с детерминированным id: гонка двух создателей
    // упирается в tx.create (ALREADY_EXISTS), проигравший на следующем круге
    // находит комнату победителя и вступает в неё.
    const isAlreadyExists = (e: unknown): boolean =>
      (e as { code?: number | string })?.code === 6
      || /already.?exists/i.test(String((e as Error)?.message ?? ''));
    for (let attempt = 0; attempt < 4; attempt++) {
      const rooms = await fetchSharedPoolRooms(db, weekId);
      const candidate = chooseSharedPoolRoom(rooms, stableUid);
      if (candidate) {
        let joined = false;
        await db.runTransaction(async (tx) => {
          const ref = db.collection('league_groups').doc(candidate);
          const [snap, freshLbSnap] = await Promise.all([tx.get(ref), tx.get(lbRef)]);
          if (!snap.exists) return;
          const data = snap.data() || {};
          if (!leagueRoomMatches(data, weekId, leagueId)) return;
          const currentWeekPoints = getAuthoritativeLeagueWeekPoints(userSnap?.data(), freshLbSnap.data(), weekId);
          const members = { ...(data.members || {}) };
          members[stableUid] = mergeCurrentWeekMember(members[stableUid], { ...member, points: currentWeekPoints });
          tx.set(ref, { members, memberCount: countMembers({ members }), updatedAt: Date.now() }, { merge: true });
          tx.set(lbRef, {
            groupId: candidate,
            groupWeekId: weekId,
            leagueId,
            ...leaderboardProjectionForMember(weekId, { ...authoritativeFields, points: currentWeekPoints }, freshLbSnap.data()),
          }, { merge: true });
          joined = true;
        });
        if (joined) {
          await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, candidate);
          return { ok: true, groupId: candidate, weekId, leagueId };
        }
        continue;
      }
      const poolRoomId = attempt < 3
        ? sharedPoolDocId(weekId, rooms.length + 1)
        : makeGroupDocId(weekId, 0, stableUid); // страховка от вечного конфликта id
      try {
        await db.runTransaction(async (tx) => {
          const ref = db.collection('league_groups').doc(poolRoomId);
          const freshLbSnap = await tx.get(lbRef);
          const currentWeekPoints = getAuthoritativeLeagueWeekPoints(userSnap?.data(), freshLbSnap.data(), weekId);
          const seeded = { [stableUid]: { ...member, points: currentWeekPoints } };
          tx.create(ref, {
            weekId,
            leagueId: 0,
            pool: SHARED_POOL_MARKER,
            memberCount: countMembers({ members: seeded }),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            members: seeded,
          });
          tx.set(lbRef, {
            groupId: poolRoomId,
            groupWeekId: weekId,
            leagueId,
            ...leaderboardProjectionForMember(weekId, { ...authoritativeFields, points: currentWeekPoints }, freshLbSnap.data()),
          }, { merge: true });
        });
        await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, poolRoomId);
        return { ok: true, groupId: poolRoomId, weekId, leagueId };
      } catch (e: unknown) {
        if (!isAlreadyExists(e)) throw e;
      }
    }
    throw new HttpsError('aborted', 'shared_pool_join_conflict');
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = await findGroupWithSpace(db, weekId, leagueId, stableUid);
    if (!candidate) break;
    let joined = false;
    await db.runTransaction(async (tx) => {
      const ref = db.collection('league_groups').doc(candidate);
      const [snap, freshLbSnap] = await Promise.all([tx.get(ref), tx.get(lbRef)]);
      if (!snap.exists) return;
      const data = snap.data() || {};
      if (!leagueRoomMatches(data, weekId, leagueId)) return;
      const currentWeekPoints = getAuthoritativeLeagueWeekPoints(userSnap?.data(), freshLbSnap.data(), weekId);
      const currentMember = { ...member, points: currentWeekPoints };
      const members = { ...(data.members || {}) };
      if (!members[stableUid] && countMembers({ members }) >= GROUP_SIZE) return;
      members[stableUid] = mergeCurrentWeekMember(members[stableUid], currentMember);
      tx.set(ref, { members, memberCount: countMembers({ members }), updatedAt: Date.now() }, { merge: true });
      tx.set(lbRef, {
        groupId: candidate,
        groupWeekId: weekId,
        leagueId,
        ...leaderboardProjectionForMember(weekId, { ...authoritativeFields, points: currentWeekPoints }, freshLbSnap.data()),
      }, { merge: true });
      joined = true;
    });
    if (joined) {
      await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, candidate);
      return { ok: true, groupId: candidate, weekId, leagueId };
    }
  }

  const newGroupId = makeGroupDocId(weekId, leagueId, stableUid);
  await db.runTransaction(async (tx) => {
    const ref = db.collection('league_groups').doc(newGroupId);
    tx.create(ref, {
      weekId,
      leagueId,
      memberCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      members: { [stableUid]: member },
    });
    tx.set(lbRef, { groupId: newGroupId, groupWeekId: weekId, leagueId, ...leaderboardProjection }, { merge: true });
  });
  await cleanupDuplicateMembershipsBestEffort(db, weekId, stableUid, newGroupId);
  return { ok: true, groupId: newGroupId, weekId, leagueId };
});

export const leagueUpdateMyMember = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const lbRef = db.collection('leaderboard').doc(stableUid);
  const lbSnap = await lbRef.get();
  const groupId = String(lbSnap.data()?.groupId || '');
  const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
  if (!groupId || groupWeekId !== getWeekId()) return { ok: false, status: 'no_current_group' };

  const raw = (request.data?.member || {}) as Record<string, unknown>;
  const userSnap = await db.collection('users').doc(stableUid).get().catch(() => null);
  const userData = userSnap?.data();
  const updates: Record<string, unknown> = {
    [`members.${stableUid}.uid`]: stableUid,
    [`members.${stableUid}.name`]: await resolveAuthoritativeLeagueMemberName(
      db,
      stableUid,
      userData,
      lbSnap.data(),
      raw.name,
    ),
    updatedAt: Date.now(),
  };
  // H6 (account-security): points/streak/totalXp/isPremium/isVip раньше принимались от
  // клиента → любой авторизованный запрос ставил себе 999M очков в лиге, фейковый
  // премиум-значок, фейковый стрик. Теперь читаем эти поля СЕРВЕРНО из users/{stableUid}
  // (weekly_xp, streak_count, user_total_xp) и резолвим premium/VIP через
  // resolvePremiumAccess. Косметика (avatar/frame/aura/карточка) — это user-choice,
  // её клиент по-прежнему передаёт.
  if (Object.prototype.hasOwnProperty.call(raw, 'avatar')) updates[`members.${stableUid}.avatar`] = sanitizeString(raw.avatar, 64) || null;
  if (Object.prototype.hasOwnProperty.call(raw, 'frame')) updates[`members.${stableUid}.frame`] = sanitizeString(raw.frame, 64) || null;
  if (Object.prototype.hasOwnProperty.call(raw, 'aura')) updates[`members.${stableUid}.aura`] = sanitizeString(raw.aura, 64) || null;
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardLevel')) updates[`members.${stableUid}.profileCardLevel`] = Math.max(0, Math.min(1, readInt(raw.profileCardLevel, 0)));
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardTheme')) updates[`members.${stableUid}.profileCardTheme`] = sanitizeString(raw.profileCardTheme, 32) || 'classic';
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardMotion')) updates[`members.${stableUid}.profileCardMotion`] = sanitizeString(raw.profileCardMotion, 32) || 'none';
  if (Object.prototype.hasOwnProperty.call(raw, 'profileCardPublicFocus')) updates[`members.${stableUid}.profileCardPublicFocus`] = sanitizeString(raw.profileCardPublicFocus, 32) || 'balanced';

  const authoritativeFields = await resolveAuthoritativeLeagueFields(
    db,
    stableUid,
    userData,
    authUid,
    groupWeekId,
    lbSnap.data(),
  );
  const weekPointsServer = authoritativeFields.points;
  updates[`members.${stableUid}.streak`] = authoritativeFields.streak;
  updates[`members.${stableUid}.totalXp`] = authoritativeFields.totalXp;
  updates[`members.${stableUid}.isVip`] = authoritativeFields.isVip;
  if (typeof authoritativeFields.isPremium === 'boolean') {
    updates[`members.${stableUid}.isPremium`] = authoritativeFields.isPremium;
  }
  if (typeof authoritativeFields.isLifetime === 'boolean') {
    updates[`members.${stableUid}.isLifetime`] = authoritativeFields.isLifetime;
  }

  const groupRef = db.collection('league_groups').doc(groupId);
  let appliedWeekPoints = weekPointsServer;
  await db.runTransaction(async (tx) => {
    const [groupSnap, freshLbSnap] = await Promise.all([tx.get(groupRef), tx.get(lbRef)]);
    if (!groupSnap.exists || groupSnap.data()?.weekId !== groupWeekId) {
      throw new HttpsError('failed-precondition', 'league_group_not_current');
    }
    appliedWeekPoints = getAuthoritativeLeagueWeekPoints(userData, freshLbSnap.data(), groupWeekId);
    updates[`members.${stableUid}.points`] = appliedWeekPoints;
    tx.set(groupRef, updates, { merge: true });
    tx.set(lbRef, leaderboardProjectionForMember(groupWeekId, {
      ...authoritativeFields,
      points: appliedWeekPoints,
    }, freshLbSnap.data()), { merge: true });
  });
  return { ok: true, groupId, weekPoints: appliedWeekPoints };
});

export const leagueSyncMyBoost = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  await assertCanUseLeague(db, stableUid);

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
  const groupId = String(lbSnap.data()?.groupId || '');
  const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
  if (!groupId || groupWeekId !== getWeekId()) return { ok: false, status: 'no_current_group' };

  const multiplier = Number(request.data?.multiplier);
  const expiresAt = readInt(request.data?.expiresAt, 0);
  const ref = db.collection('league_groups').doc(groupId);
  if (!Number.isFinite(multiplier) || multiplier <= 1 || expiresAt <= Date.now()) {
    await ref.set({
      [`members.${stableUid}.leagueBoostMultiplier`]: admin.firestore.FieldValue.delete(),
      [`members.${stableUid}.leagueBoostExpiresAt`]: admin.firestore.FieldValue.delete(),
      updatedAt: Date.now(),
    }, { merge: true });
    return { ok: true, groupId, status: 'cleared' };
  }
  await ref.set({
    [`members.${stableUid}.leagueBoostMultiplier`]: Math.min(10, multiplier),
    [`members.${stableUid}.leagueBoostExpiresAt`]: expiresAt,
    updatedAt: Date.now(),
  }, { merge: true });
  return { ok: true, groupId, status: 'active' };
});

async function activateLeagueGroupBoostForStableUid(db: FirebaseFirestore.Firestore, stableUid: string) {
  await assertCanUseLeague(db, stableUid);

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get();
  const groupId = String(lbSnap.data()?.groupId || '');
  const groupWeekId = String(lbSnap.data()?.groupWeekId || '');
  const leagueId = readInt(lbSnap.data()?.leagueId, 0);
  if (!groupId || groupWeekId !== getWeekId()) throw new HttpsError('failed-precondition', 'no-current-group');

  const groupRef = db.collection('league_groups').doc(groupId);
  const userRef = db.collection('users').doc(stableUid);
  const logRef = userRef.collection('shard_log').doc();
  const now = Date.now();
  let createdBoost: Record<string, unknown> | null = null;
  let shardsBalance = 0;
  let usedGiftVoucher = false;

  await db.runTransaction(async (tx) => {
    const [groupSnap, userSnap] = await Promise.all([tx.get(groupRef), tx.get(userRef)]);
    if (!groupSnap.exists) throw new HttpsError('not-found', 'league-group-not-found');
    const groupData = groupSnap.data() || {};
    // зачем: в сводном пуле leagueId документа (0) ≠ личной лиге покупателя —
    // сверяем комнату pool-aware, иначе буст в пуле был бы невозможен.
    if (!leagueRoomMatches(groupData, groupWeekId, leagueId)) {
      throw new HttpsError('permission-denied', 'room-mismatch');
    }
    const members = groupData.members && typeof groupData.members === 'object'
      ? groupData.members as Record<string, Record<string, unknown>>
      : {};
    const buyer = members[stableUid];
    if (!buyer || buyer.identityHidden === true) throw new HttpsError('permission-denied', 'not-group-member');

    const active = groupData.groupBoost && typeof groupData.groupBoost === 'object'
      ? groupData.groupBoost as Record<string, unknown>
      : null;
    if (active && readInt(active.expiresAt, 0) > now) {
      if (String(active.buyerUid || '') === stableUid) {
        createdBoost = active;
        shardsBalance = Math.max(0, readInt(userSnap.data()?.shards, 0));
        return;
      }
      throw new HttpsError('failed-precondition', 'already-active');
    }

    const userData = userSnap.data() || {};
    const userProgress = userData.progress && typeof userData.progress === 'object' && !Array.isArray(userData.progress)
      ? userData.progress as Record<string, unknown>
      : {};
    // Подарок уровня «Буст лиги бесплатно»: клиент хранит флаг в AsyncStorage
    // (club_gift_free_boost_v1), cloud_sync зеркалит его в progress. Если ваучер
    // есть — активация бесплатна, ваучер гасится в этой же транзакции, чтобы
    // нельзя было использовать дважды.
    usedGiftVoucher = userData.club_gift_free_boost_v1 === '1' || userProgress.club_gift_free_boost_v1 === '1';
    const boostCost = usedGiftVoucher ? 0 : LEAGUE_GROUP_BOOST_COST_SHARDS;
    const before = Math.max(0, readInt(userData.shards, 0));
    if (before < boostCost) {
      throw new HttpsError('failed-precondition', 'insufficient-shards');
    }
    const after = before - boostCost;
    const startedAt = now;
    const expiresAt = now + LEAGUE_GROUP_BOOST_DURATION_MS;
    const likeEventId = `league_group_boost_${groupWeekId}_${groupId}_${startedAt}`;
    createdBoost = {
      groupId,
      weekId: groupWeekId,
      leagueId,
      multiplier: LEAGUE_GROUP_BOOST_MULTIPLIER,
      startedAt,
      expiresAt,
      buyerUid: stableUid,
      buyerName: sanitizeString(buyer.name, 48) || 'Player',
      buyerAvatar: sanitizeString(buyer.avatar, 64) || null,
      buyerFrame: sanitizeString(buyer.frame, 64) || null,
      buyerAura: sanitizeString(buyer.aura, 64) || null,
      buyerTotalXp: Math.max(0, readInt(buyer.totalXp, 0)),
      buyerProfileCardLevel: Math.max(0, Math.min(1, readInt(buyer.profileCardLevel, 0))),
      buyerProfileCardTheme: sanitizeString(buyer.profileCardTheme, 32) || 'classic',
      buyerProfileCardMotion: sanitizeString(buyer.profileCardMotion, 32) || 'none',
      buyerProfileCardPublicFocus: sanitizeString(buyer.profileCardPublicFocus, 32) || 'balanced',
      likeEventId,
      likeCount: 0,
    };
    shardsBalance = after;

    const userPatch: Record<string, unknown> = {
      shards: after,
      shards_updated_at_ms: now,
      shards_updated_op: 'spend',
      shards_updated_reason: usedGiftVoucher ? 'league_group_boost_gift' : 'league_group_boost',
    };
    if (usedGiftVoucher) {
      userPatch.club_gift_free_boost_v1 = admin.firestore.FieldValue.delete();
      userPatch.progress = { club_gift_free_boost_v1: admin.firestore.FieldValue.delete() };
    }
    tx.set(userRef, userPatch, { merge: true });
    tx.create(logRef, {
      type: 'spend',
      amount: usedGiftVoucher ? 0 : LEAGUE_GROUP_BOOST_COST_SHARDS,
      reason: usedGiftVoucher ? 'league_group_boost_gift' : 'league_group_boost',
      balanceBefore: before,
      balanceAfter: after,
      ts: new Date(now).toISOString(),
    });
    tx.set(userRef.collection('my_events').doc(likeEventId), {
      uid: stableUid,
      type: 'league_group_boost',
      title: 'League XP boost',
      activityLikeCount: 0,
      createdAt: now,
      createdAtIso: new Date(now).toISOString(),
      groupId,
      weekId: groupWeekId,
      leagueId,
      multiplier: LEAGUE_GROUP_BOOST_MULTIPLIER,
      expiresAt,
    }, { merge: true });
    tx.set(groupRef, {
      groupBoost: createdBoost,
      updatedAt: now,
    }, { merge: true });
  });

  return { ok: true, groupId, boost: createdBoost, shardsBalance, shardsUpdatedAtMs: now, usedGiftVoucher };
}

// БЫЛО: onRequest с invoker:'public' и stableId из тела — кто угодно мог POST-запросом
// списать 50 shards у ЛЮБОГО аккаунта (griefing) в обход App Check. Переведено на onCall:
// uid берётся из request.auth, stableId резолвится через resolveStableUidForAuth — списать
// можно только со своего аккаунта. Клиент уже зовёт это как callable (league_group_boosts.ts),
// поэтому сигнатура вызова не меняется; поля ответа (ok/groupId/boost/shardsBalance) теперь
// корректно ложатся в res.data (раньше клиент читал их из обёртки {result} и получал undefined).
export const leagueActivateGroupBoost = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true, repairLinks: false });
  return activateLeagueGroupBoostForStableUid(db, stableUid);
});
