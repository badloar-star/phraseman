// ════════════════════════════════════════════════════════════════════════════
// firestore_leagues.ts — Реальные лиги через Firestore
//
// Структура Firestore:
//   league_groups/{weekId}_{leagueId}_{groupId} → { members: [...], createdAt }
//   leaderboard/{uid} → { ..., leagueId, weekId, groupId, weekPoints }
//
// Логика:
//   1. При открытии лиги — ищем незаполненную группу своего уровня на этой неделе
//   2. Если нет — создаём новую группу
//   3. Группа фиксируется на неделю (groupId сохраняется локально)
//   4. Очки обновляются в реальном времени через pushMyScore
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLink } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { GroupMember, getWeekId } from './league_engine';
import { getMyWeekPoints } from './hall_of_fame_utils';
import { getVerifiedRealPremiumStatus, getVerifiedVipStatus, isLifetimePlanLocal } from './premium_guard';
import { loadActiveLeagueBoost } from './league_personal_boosts';
import { emitAppEvent } from './events';
import {
  getLeagueStartupRegistrationIntervalMs,
  getLeagueSyncForceIntervalMs,
  getLeagueSyncMinDelta,
  getLeagueSyncMinIntervalMs,
  isLeagueStartupRegistrationEnabled,
} from './remote_flags';
import { USER_AVATAR_AURA_KEY, normalizeAvatarAuraId } from '../constants/avatar_auras';
import {
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

// Дебаунс для updateMyGroupPoints — не чаще 1 раза в 8 сек
let _groupPtsTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingGroupPts: number | null = null;
let _pendingGroupPtsAccountToken: AccountGenerationToken | null = null;
let _pendingGroupPtsResolvers: Array<() => void> = [];

function isJestRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

const FUNCTIONS_REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  // Lazy require keeps Expo Go / disabled cloud sync paths quiet.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name);
  return fn as (data: TReq) => Promise<{ data: TRes }>;
}

const COL_LB = 'leaderboard';
const GROUP_SIZE = 30;
const LEAGUE_STATE_V3_KEY = 'league_state_v3';
const LEAGUE_MEMBER_SYNC_CACHE_KEY = 'league_member_sync_cache_v1';
const LEAGUE_STARTUP_REG_CACHE_KEY = 'league_startup_registration_cache_v1';
const DEFAULT_LEAGUE_MEMBER_SYNC_FORCE_INTERVAL_MS = 6 * 60 * 60_000;
const DEFAULT_LEAGUE_POINTS_SYNC_MIN_DELTA = 75;
const DEFAULT_LEAGUE_POINTS_SYNC_MIN_INTERVAL_MS = 15 * 60_000;
const DEFAULT_LEAGUE_STARTUP_REG_INTERVAL_MS = 24 * 60 * 60_000;
/** Сколько league_groups максимум читаем на неделю+клуб, чтобы не создавать сольные группы из-за .limit(100) */
const BROAD_GROUP_QUERY_LIMIT = 500;

type LeagueMemberSyncCache = {
  weekId: string;
  leagueId: number;
  groupId: string;
  memberHash: string;
  profileHash: string;
  points: number;
  updatedAt: number;
};

type LeagueStartupRegistrationCache = {
  weekId: string;
  leagueId: number;
  points: number;
  registeredAt: number;
};

function countMembersInData(data: any): number {
  const m = data?.members;
  if (!m || typeof m !== 'object') return 0;
  return Object.values(m).filter((member: any) => member?.identityHidden !== true).length;
}

/**
 * Сколько ЖИВЫХ игроков в комнате — вместимость и «одиночество» считаются
 * только по ним.
 *
 * зачем (аудит 2026-08-04): комнаты дозаполняются синтетическими жителями до
 * 28 участников. Если считать их занятыми местами, ломаются сразу два
 * механизма и оба — в сторону возврата болезни, которую жители лечат:
 *   • findGroupIdWithSpace счёл бы комнату «1 живой + 28 жителей» полной и
 *     отправил следующего человека создавать НОВУЮ комнату-одиночку;
 *   • tryRelocateSoloToSharedGroup сравнивает число участников с 1, чтобы
 *     понять «человек сидит один» — с жителями там 29, и переселение
 *     одиночек к людям перестало бы срабатывать вообще.
 * Живые обязаны собираться вместе; жители лишь заполняют фон.
 * Зеркало серверного countLiveMembers (functions/src/league_residents.ts).
 */
function countLiveMembersInData(data: any): number {
  const m = data?.members;
  if (!m || typeof m !== 'object') return 0;
  return Object.entries(m).filter(([uid, member]: [string, any]) => (
    member?.identityHidden !== true
    && member?.isResident !== true
    && !String(uid).startsWith('res_')
  )).length;
}

/** Firestore числа + надёжное сравнение id клуба (избегаем рассинхрона 0 / long / int). */
function normLeagueIdData(v: unknown, defaultValue: number = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.trunc(n);
}

function withoutUndefinedFields<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });
  return out;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

function leagueMemberHash(member: Record<string, unknown>, includePoints = true): string {
  const normalized = { ...member };
  if (!includePoints) delete normalized.points;
  return stableStringify(normalized);
}

async function readLeagueMemberSyncCache(): Promise<LeagueMemberSyncCache | null> {
  try {
    const raw = await AsyncStorage.getItem(LEAGUE_MEMBER_SYNC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeagueMemberSyncCache>;
    if (!parsed || typeof parsed.groupId !== 'string') return null;
    return {
      weekId: String(parsed.weekId || ''),
      leagueId: normLeagueIdData(parsed.leagueId, 0),
      groupId: parsed.groupId,
      memberHash: String(parsed.memberHash || ''),
      profileHash: String(parsed.profileHash || ''),
      points: Math.max(0, Number(parsed.points) || 0),
      updatedAt: Math.max(0, Number(parsed.updatedAt) || 0),
    };
  } catch {
    return null;
  }
}

async function writeLeagueMemberSyncCache(
  cache: Omit<LeagueMemberSyncCache, 'updatedAt'>,
): Promise<void> {
  await AsyncStorage.setItem(LEAGUE_MEMBER_SYNC_CACHE_KEY, JSON.stringify({ ...cache, updatedAt: Date.now() }));
}

function leagueSyncMinDelta(): number {
  const value = getLeagueSyncMinDelta();
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : DEFAULT_LEAGUE_POINTS_SYNC_MIN_DELTA));
}

function leagueSyncMinIntervalMs(): number {
  const value = getLeagueSyncMinIntervalMs();
  return Math.max(10_000, Number.isFinite(value) ? value : DEFAULT_LEAGUE_POINTS_SYNC_MIN_INTERVAL_MS);
}

function leagueSyncForceIntervalMs(): number {
  const value = getLeagueSyncForceIntervalMs();
  return Math.max(60_000, Number.isFinite(value) ? value : DEFAULT_LEAGUE_MEMBER_SYNC_FORCE_INTERVAL_MS);
}

function leagueStartupRegistrationIntervalMs(): number {
  const value = getLeagueStartupRegistrationIntervalMs();
  return Math.max(60_000, Number.isFinite(value) ? value : DEFAULT_LEAGUE_STARTUP_REG_INTERVAL_MS);
}

async function readLeagueStartupRegistrationCache(): Promise<LeagueStartupRegistrationCache | null> {
  try {
    const raw = await AsyncStorage.getItem(LEAGUE_STARTUP_REG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeagueStartupRegistrationCache>;
    return {
      weekId: String(parsed.weekId || ''),
      leagueId: normLeagueIdData(parsed.leagueId, 0),
      points: Math.max(0, Number(parsed.points) || 0),
      registeredAt: Math.max(0, Number(parsed.registeredAt) || 0),
    };
  } catch {
    return null;
  }
}

async function writeLeagueStartupRegistrationCache(weekId: string, leagueId: number, points: number): Promise<void> {
  await AsyncStorage.setItem(LEAGUE_STARTUP_REG_CACHE_KEY, JSON.stringify({
    weekId,
    leagueId: normLeagueIdData(leagueId, 0),
    points: Math.max(0, Math.trunc(points) || 0),
    registeredAt: Date.now(),
  }));
}

function shouldSkipLeagueStartupRegistration(
  cache: LeagueStartupRegistrationCache | null,
  weekId: string,
  leagueId: number,
  points: number,
): boolean {
  if (!cache?.registeredAt) return false;
  if (cache.weekId !== weekId || normLeagueIdData(cache.leagueId, 0) !== normLeagueIdData(leagueId, 0)) return false;
  if (Date.now() - cache.registeredAt > leagueStartupRegistrationIntervalMs()) return false;
  return Math.abs(points - cache.points) < leagueSyncMinDelta();
}

function shouldSkipLeagueMemberCallable(
  cache: LeagueMemberSyncCache | null,
  weekId: string,
  leagueId: number,
  profileHash: string,
  points: number,
): boolean {
  if (!cache?.groupId) return false;
  const now = Date.now();
  if (cache.weekId !== weekId || normLeagueIdData(cache.leagueId, 0) !== normLeagueIdData(leagueId, 0)) return false;
  if (now - cache.updatedAt > leagueSyncForceIntervalMs()) return false;
  if (profileHash !== cache.profileHash) return false;
  if (Math.abs(points - cache.points) >= leagueSyncMinDelta()) return false;
  return true;
}

function shouldSkipLeaguePointsCallable(
  cache: LeagueMemberSyncCache | null,
  weekId: string,
  leagueId: number,
  points: number,
): boolean {
  if (!cache?.groupId) return false;
  const now = Date.now();
  if (cache.weekId !== weekId || normLeagueIdData(cache.leagueId, 0) !== normLeagueIdData(leagueId, 0)) return false;
  if (now - cache.updatedAt > leagueSyncForceIntervalMs()) return false;
  if (now - cache.updatedAt < leagueSyncMinIntervalMs()) return true;
  return Math.abs(points - cache.points) < leagueSyncMinDelta();
}

function makeLeagueGroupDocId(weekId: string, leagueId: number, uid: string): string {
  const safeUid = uid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16) || 'user';
  return `${weekId}_${leagueId}_${Date.now()}_${safeUid}_${Math.random().toString(36).slice(2, 8)}`;
}

async function removeUserFromLeagueGroupBestEffort(
  db: any,
  groupId: string,
  uid: string,
): Promise<void> {
  try {
    await db.runTransaction(async (t: any) => {
      const ref = db.collection('league_groups').doc(groupId);
      const snap = await t.get(ref);
      if (!snap.exists) return;
      const data = snap.data() ?? {};
      const members: Record<string, unknown> = { ...(data.members || {}) };
      if (members[uid] === undefined) return;
      delete members[uid];
      const memberCount = Object.keys(members).length;
      if (memberCount <= 0) {
        t.delete(ref);
        return;
      }
      t.set(ref, { members, memberCount }, { merge: true });
    });
  } catch {}
}

/**
 * Скан `league_groups` на неделю+клуб: в каком документе реально лежит uid в `members`.
 * При нескольких (рассинхрон после миграции) — документ с большим числом участников.
 */
async function findBestLeagueGroupDocIdForUser(
  db: any,
  weekId: string,
  targetLeagueId: number,
  uid: string,
): Promise<string | null> {
  let broad: any;
  try {
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', targetLeagueId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  } catch (e1) {
    if (__DEV__) console.warn('[firestore_leagues] findBest weekId+leagueId query failed', e1);
    try {
      broad = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .limit(BROAD_GROUP_QUERY_LIMIT)
        .get();
    } catch (e2) {
      if (__DEV__) console.warn('[firestore_leagues] findBest weekId-only query failed', e2);
      return null;
    }
  }
  let best: { id: string; n: number } | null = null;
  for (const doc of broad.docs) {
    const d = doc.data();
    if (normLeagueIdData(d?.leagueId) !== targetLeagueId) continue;
    if (!d?.members?.[uid]) continue;
    const n = countMembersInData(d);
    if (!best || n > best.n) best = { id: doc.id, n };
  }
  return best?.id ?? null;
}

/**
 * Тот же поиск, но по всем клубам недели (если leagueId в профиле не совпал с doc в БД).
 */
async function findAnyLeagueGroupDocIdForUser(
  db: any,
  weekId: string,
  uid: string,
): Promise<{ id: string; leagueId: number; n: number } | null> {
  let broad: any;
  try {
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] findAny weekId query failed', e);
    return null;
  }
  let best: { id: string; n: number; leagueId: number } | null = null;
  for (const doc of broad.docs) {
    const d = doc.data();
    if (!d?.members?.[uid]) continue;
    const n = countMembersInData(d);
    if (!best || n > best.n) {
      best = { id: doc.id, n, leagueId: normLeagueIdData(d?.leagueId) };
    }
  }
  return best;
}

/**
 * Находит id группы с местом: сначала по memberCount (индекс), иначе широкий запрос
 * и выбор по фактическому числу ключей в members (источник истины).
 * Предпочитаем самую «полную» незаполненную группу, чтобы не плодить пустые.
 * excludeGroupId — не предлагать этот документ (при «эвакуации» из сольного league_groups).
 */
async function findGroupIdWithSpace(
  db: any,
  weekId: string,
  leagueId: number,
  myUid: string,
  excludeGroupId?: string | null,
): Promise<string | null> {
  const idOk = (docId: string) => !excludeGroupId || docId !== excludeGroupId;

  // 1) Быстрый путь: memberCount < GROUP_SIZE, от большего к меньшему
  try {
    const q = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .where('memberCount', '<', GROUP_SIZE)
      .orderBy('memberCount', 'desc')
      .limit(25)
      .get();
    for (const doc of q.docs) {
      if (!idOk(doc.id)) continue;
      const d = doc.data();
      if (normLeagueIdData(d.leagueId) !== normLeagueIdData(leagueId)) continue;
      // Вместимость — по живым: жители мест не занимают (см. countLiveMembersInData).
      const n = countLiveMembersInData(d);
      if (n >= GROUP_SIZE) continue;
      if (d.members?.[myUid]) return doc.id;
      return doc.id;
    }
  } catch (e) {
    // нет композитного индекса — ниже broad
    if (__DEV__) console.warn('[firestore_leagues] findGroupIdWithSpace fast path failed (likely no index)', e);
  }

  // 2) Все группы этой недели и клуба (до лимита), сортировка в JS по числу участников
  let broad: any;
  try {
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] findGroupIdWithSpace broad weekId+leagueId failed', e);
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  }

  const candidates: { id: string; n: number }[] = [];
  for (const doc of broad.docs) {
    if (!idOk(doc.id)) continue;
    const d = doc.data();
    if (normLeagueIdData(d.leagueId) !== normLeagueIdData(leagueId)) continue;
    // Вместимость — по живым: иначе комната «1 человек + 28 жителей» считалась
    // бы полной и следующий игрок плодил бы новую одиночку.
    const n = countLiveMembersInData(d);
    if (n >= GROUP_SIZE) continue;
    if (d.members?.[myUid]) return doc.id;
    candidates.push({ id: doc.id, n });
  }
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0]?.id ?? null;
}

/**
 * Сольник по документу league_groups — перенести в другую неполную группу, удалив пустой from.
 * Раньше user с уже сохранённым groupId на эту неделю никогда не выходил на поиск.
 */
async function tryRelocateSoloToSharedGroup(
  db: any,
  weekId: string,
  leagueId: number,
  uid: string,
  fromGroupId: string,
  memberData: Record<string, unknown>,
): Promise<string | null> {
  const gRef = (id: string) => db.collection('league_groups').doc(id);
  const fromSnap = await gRef(fromGroupId).get();
  if (!fromSnap.exists) return null;
  const sData = fromSnap.data() ?? {};
  // «Сольник» = один ЖИВОЙ в комнате. С жителями всего участников 29, и старое
  // сравнение с 1 не срабатывало бы никогда — переселение одиночек к людям
  // умерло бы молча, а живые остались размазаны по разным комнатам.
  if (countLiveMembersInData(sData) !== 1 || !sData.members?.[uid]) return null;

  const toId = await findGroupIdWithSpace(db, weekId, leagueId, uid, fromGroupId);
  if (!toId || toId === fromGroupId) return null;

  try {
    await moveUserBetweenGroups(db, fromGroupId, toId, uid, memberData, weekId, leagueId);
    return toId;
  } catch {
    return null;
  }
}

async function moveUserBetweenGroups(
  db: any,
  fromId: string,
  toId: string,
  uid: string,
  memberData: Record<string, unknown>,
  weekId: string,
  leagueId: number,
): Promise<void> {
  if (fromId === toId) throw new Error('relocate');
  const g = (id: string) => db.collection('league_groups').doc(id);
  const lb = db.collection(COL_LB).doc(uid);
  await db.runTransaction(async (t: any) => {
    const sSnap = await t.get(g(fromId));
    const tSnap = await t.get(g(toId));
    if (!sSnap.exists || !tSnap.exists) {
      throw new Error('relocate');
    }
    const sD = sSnap.data() ?? {};
    const tD = tSnap.data() ?? {};
    if ((sD.weekId ?? weekId) !== (tD.weekId ?? weekId) || normLeagueIdData(sD.leagueId) !== normLeagueIdData(tD.leagueId)) {
      throw new Error('relocate');
    }
    const sM: Record<string, unknown> = { ...(sD.members || {}) };
    const tM: Record<string, unknown> = { ...(tD.members || {}) };
    if (Object.keys(sM).length !== 1 || sM[uid] === undefined) {
      throw new Error('relocate');
    }
    if (tM[uid] !== undefined) {
      throw new Error('relocate');
    }
    if (Object.keys(tM).length >= GROUP_SIZE) {
      throw new Error('relocate');
    }
    tM[uid] = { ...(sM[uid] as object), ...memberData };
    delete sM[uid];
    t.set(
      g(toId),
      {
        weekId:      tD.weekId ?? weekId,
        leagueId:    tD.leagueId ?? leagueId,
        members:     tM,
        memberCount: Object.keys(tM).length,
      },
      { merge: true },
    );
    t.delete(g(fromId));
    t.set(lb, { groupId: toId, groupWeekId: weekId, leagueId: tD.leagueId ?? leagueId }, { merge: true });
  });
}

type AddMemberResult = 'ok' | 'full';

/** Атомарно вступить в группу; при гонке за последний слот вернёт 'full' */
async function addMemberToLeagueGroup(
  db: any,
  groupId: string,
  uid: string,
  memberData: Record<string, unknown>,
): Promise<AddMemberResult> {
  let out: AddMemberResult = 'ok';
  await db.runTransaction(async (t: any) => {
    const ref = db.collection('league_groups').doc(groupId);
    const snap = await t.get(ref);
    if (!snap.exists) {
      out = 'full';
      return;
    }
    const data = snap.data() ?? {};
    const members: Record<string, unknown> = { ...(data.members || {}) };
    if (members[uid]) {
      t.update(ref, { [`members.${uid}`]: memberData, memberCount: Object.keys(members).length });
      return;
    }
    const n = Object.keys(members).length;
    if (n >= GROUP_SIZE) {
      out = 'full';
      return;
    }
    t.update(ref, {
      [`members.${uid}`]: memberData,
      memberCount: n + 1,
    });
  });
  return out;
}

// ── Получить или создать группу для пользователя на текущей неделе ───────────
// Все пользователи регистрируются в league_groups.
export async function getOrCreateLeagueGroup(
  weekId: string,
  leagueId: number,
  myName: string,
  myWeekPoints: number,
): Promise<GroupMember[] | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  const db = getFirestore();
  if (!db) return null;
  const uid = await ensureAnonUser();
  if (!uid) return null;
  await ensureStableAuthLink().catch(() => false);
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);

  // Читаем аватар и рамку чтобы сохранить их в данных участника
  const [
    [, avatarRaw],
    [, frameRaw],
    [, auraRaw],
    [, streakRaw],
    [, totalXpRaw],
    [, cardLevelRaw],
    [, cardThemeRaw],
    [, cardMotionRaw],
    [, cardFocusRaw],
  ] = await AsyncStorage.multiGet([
    'user_avatar',
    'user_frame',
    USER_AVATAR_AURA_KEY,
    'streak_count',
    'user_total_xp',
    PROFILE_CARD_LEVEL_KEY,
    PROFILE_CARD_THEME_KEY,
    PROFILE_CARD_MOTION_KEY,
    PROFILE_CARD_PUBLIC_FOCUS_KEY,
  ]);
  const memberAvatar   = avatarRaw  ?? undefined;
  const memberFrame    = frameRaw   ?? undefined;
  const memberAura     = normalizeAvatarAuraId(auraRaw);
  const [memberPremium, memberVip, memberLifetimeRaw] = await Promise.all([
    getVerifiedRealPremiumStatus().catch(() => false),
    getVerifiedVipStatus().catch(() => false),
    isLifetimePlanLocal().catch(() => false),
  ]);
  // «Pro» = lifetime только при активном доступе (иначе Plus/без плашки).
  // зачем: доступ бывает и безденежным (сертификат «Pro — навсегда», промокод,
  // бессрочная выдача) — там memberPremium=false, но Pro-аура положена
  // (владелец, 2026-08-03). Истёкший lifetime по-прежнему не даёт плашку.
  const memberLifetime = (memberPremium || memberVip) && memberLifetimeRaw;
  const memberStreak   = streakRaw  ? parseInt(streakRaw, 10) : 0;
  const memberTotalXp  = totalXpRaw ? parseInt(totalXpRaw, 10) || 0 : 0;
  const memberProfileCardLevel = normalizeProfileCardLevel(cardLevelRaw);
  const memberProfileCardTheme = normalizeProfileCardTheme(cardThemeRaw);
  const memberProfileCardMotion = normalizeProfileCardMotion(cardMotionRaw);
  const memberProfileCardPublicFocus = normalizeProfileCardPublicFocus(cardFocusRaw);

  const boost = await loadActiveLeagueBoost();
  const boostFields =
    boost && Date.now() < boost.expiresAt
      ? { leagueBoostMultiplier: boost.multiplier, leagueBoostExpiresAt: boost.expiresAt }
      : {};

  const memberData = withoutUndefinedFields({
    name:      myName,
    points:    myWeekPoints,
    uid,
    avatar:    memberAvatar,
    frame:     memberFrame,
    aura:      memberAura,
    profileCardLevel: memberProfileCardLevel,
    profileCardTheme: memberProfileCardTheme,
    profileCardMotion: memberProfileCardMotion,
    profileCardPublicFocus: memberProfileCardPublicFocus,
    isPremium: memberPremium,
    isVip: memberVip,
    isLifetime: memberLifetime,
    streak:    memberStreak,
    totalXp:   memberTotalXp,
    ...boostFields,
  });
  const memberHash = leagueMemberHash(memberData);
  const profileHash = leagueMemberHash(memberData, false);
  const cachedSync = await readLeagueMemberSyncCache();
  if (cachedSync && shouldSkipLeagueMemberCallable(cachedSync, weekId, leagueId, profileHash, myWeekPoints)) {
    const cachedMembers = await fetchGroupMembers(db, cachedSync.groupId, uid, myName, myWeekPoints).catch(() => []);
    if (cachedMembers.length > 0) return cachedMembers;
  }

  if (appCheckReady) try {
    const fn = callable<
      { weekId: string; leagueId: number; stableId?: string; member: Record<string, unknown> },
      { ok: boolean; groupId: string; weekId: string; leagueId: number }
    >('leagueJoinOrUpdateGroup');
    const res = await fn({ weekId, leagueId: normLeagueIdData(leagueId, 0), stableId: uid, member: memberData });
    const groupId = res.data?.groupId;
    if (groupId) {
      writeLeagueMemberSyncCache({
        weekId,
        leagueId: normLeagueIdData(leagueId, 0),
        groupId,
        memberHash,
        profileHash,
        points: myWeekPoints,
      }).catch(() => {});
      return await fetchGroupMembers(db, groupId, uid, myName, myWeekPoints);
    }
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] leagueJoinOrUpdateGroup failed, falling back', e);
  }

  try {
    // Проверяем — есть ли у нас уже groupId на эту неделю
    const myDoc = await db.collection(COL_LB).doc(uid).get();
    const myData = myDoc.exists ? myDoc.data() : {};
    const savedGroupId: string | undefined = myData?.groupId;
    const savedWeekId: string | undefined  = myData?.groupWeekId;
    // Локальное значение с экрана клуба + нормализация из Firebase (int/long)
    const leagueIdForGroup = normLeagueIdData(leagueId, 0);

    // Источник истины — поле `members` в league_groups, а не только leaderboard.groupId
    // (указатель мог остаться на сольнике после миграции, гонки вступления, ручного правок).
    let canonicalGid   = await findBestLeagueGroupDocIdForUser(db, weekId, leagueIdForGroup, uid);
    let effectiveLeagueId = leagueIdForGroup;
    if (!canonicalGid) {
      const any = await findAnyLeagueGroupDocIdForUser(db, weekId, uid);
      if (any && any.leagueId === leagueIdForGroup) {
        canonicalGid = any.id;
        effectiveLeagueId = any.leagueId;
      } else if (any) {
        removeUserFromLeagueGroupBestEffort(db, any.id, uid).catch(() => {});
      }
    }
    if (canonicalGid) {
      if (canonicalGid !== savedGroupId || savedWeekId !== weekId || normLeagueIdData(myData?.leagueId) !== effectiveLeagueId) {
        await db.collection(COL_LB).doc(uid).set(
          { groupId: canonicalGid, groupWeekId: weekId, leagueId: effectiveLeagueId },
          { merge: true },
        );
      }
      const newGroupId = await tryRelocateSoloToSharedGroup(
        db, weekId, effectiveLeagueId, uid, canonicalGid, memberData,
      );
      const effective = newGroupId ?? canonicalGid;
      await db.collection('league_groups').doc(effective).update({
        [`members.${uid}`]: memberData,
      }).catch(() => {});
      writeLeagueMemberSyncCache({
        weekId,
        leagueId: effectiveLeagueId,
        groupId: effective,
        memberHash,
        profileHash,
        points: myWeekPoints,
      }).catch(() => {});
      return await fetchGroupMembers(db, effective, uid, myName, myWeekPoints);
    }

    // Уже в группе на эту неделю — но сначала проверяем что savedGroupId реально валиден.
    // Раньше слепое доверие к savedGroupId оставляло пользователя в его собственной solo-группе,
    // если ВЕТКА 1 не нашла его в members ни одной группы (например после удаления/слияния).
    if (savedGroupId && savedWeekId === weekId) {
      let savedSnap: any = null;
      try {
        savedSnap = await db.collection('league_groups').doc(savedGroupId).get();
      } catch (e) {
        if (__DEV__) console.warn('[firestore_leagues] read savedGroupId failed', e);
      }
      const savedData = savedSnap?.exists ? savedSnap.data() ?? {} : null;
      const savedMembers: Record<string, unknown> = (savedData?.members as Record<string, unknown>) || {};
      const savedMemberCount = countMembersInData(savedData);
      const iAmInSaved = !!savedMembers[uid];
      const savedLeagueMatches = normLeagueIdData(savedData?.leagueId, leagueIdForGroup) === leagueIdForGroup;

      if (savedData && iAmInSaved && savedLeagueMatches) {
        // Я реально в этой группе. Если она solo — пробуем relocate;
        // если relocate не помог и группа всё ещё solo, проваливаемся в ВЕТКУ 3 (поиск/создание).
        let effective: string | null = savedGroupId;
        if (savedMemberCount <= 1) {
          const newGroupId = await tryRelocateSoloToSharedGroup(
            db, weekId, leagueIdForGroup, uid, savedGroupId, memberData,
          );
          if (newGroupId) effective = newGroupId;
          else effective = null; // остался в solo — пусть ВЕТКА 3 попробует найти/создать общую
        }
        if (effective) {
          await db.collection('league_groups').doc(effective).update({
            [`members.${uid}`]: memberData,
          }).catch((e: unknown) => {
            if (__DEV__) console.warn('[firestore_leagues] update members[uid] failed', e);
          });
          writeLeagueMemberSyncCache({
            weekId,
            leagueId: leagueIdForGroup,
            groupId: effective,
            memberHash,
            profileHash,
            points: myWeekPoints,
          }).catch(() => {});
          return await fetchGroupMembers(db, effective, uid, myName, myWeekPoints);
        }
      } else if (savedData && iAmInSaved && !savedLeagueMatches) {
        removeUserFromLeagueGroupBestEffort(db, savedGroupId, uid).catch(() => {});
      }
      // savedGroupId недействителен (не существует / меня там нет / solo без relocate-цели):
      // обнуляем и идём в ВЕТКУ 3.
    }

    // Подбор группы: не полагаться на memberCount в случайных N документах (плодились
    // сольные группы). Ищем по фактическим members, широкий лимит, приоритет — заполнить
    // самую «полную» незаполненную группу. Вступление — транзакция (последний слот, гонки).
    let groupId: string | null = null;
    const maxJoinAttempts = 4;
    for (let attempt = 0; attempt < maxJoinAttempts; attempt++) {
      const candidate = await findGroupIdWithSpace(db, weekId, leagueIdForGroup, uid);
      if (!candidate) break;
      const res = await addMemberToLeagueGroup(db, candidate, uid, memberData);
      if (res === 'ok') {
        groupId = candidate;
        break;
      }
    }
    if (!groupId) {
      groupId = makeLeagueGroupDocId(weekId, leagueIdForGroup, uid);
      await db.collection('league_groups').doc(groupId).set({
        weekId,
        leagueId: leagueIdForGroup,
        memberCount: 1,
        createdAt: Date.now(),
        members: { [uid]: memberData },
      });
      // Сразу же пробуем переместить в общую группу: за время поиска кто-то мог
      // освободить слот, или появилась группа. Это закрывает гонку
      // «findGroupIdWithSpace вернул full → создал solo» и сразу нашёл свободную.
      const relocatedTo = await tryRelocateSoloToSharedGroup(
        db, weekId, leagueIdForGroup, uid, groupId, memberData,
      );
      if (relocatedTo) groupId = relocatedTo;
    }

    // Сохраняем groupId и leagueId в профиле пользователя
    await db.collection(COL_LB).doc(uid).set(
      { groupId, groupWeekId: weekId, leagueId: leagueIdForGroup },
      { merge: true }
    );

    writeLeagueMemberSyncCache({
      weekId,
      leagueId: leagueIdForGroup,
      groupId,
      memberHash,
      profileHash,
      points: myWeekPoints,
    }).catch(() => {});
    return await fetchGroupMembers(db, groupId, uid, myName, myWeekPoints);
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] getOrCreateLeagueGroup failed', e);
    return null;
  }
}

// ── Загрузить топ участников любого клуба ────────────────────────────────────
export async function fetchLeagueTopMembers(
  weekId: string,
  leagueId: number,
  limit = 30,
): Promise<GroupMember[]> {
  if (!CLOUD_SYNC_ENABLED) return [];
  const db = getFirestore();
  if (!db) return [];
  try {
    // Сначала пробуем точный запрос weekId + leagueId.
    // Если индекс не готов, читаем weekId с расширенным лимитом.
    let snap: any;
    try {
      snap = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .where('leagueId', '==', leagueId)
        .limit(100)
        .get();
    } catch {
      snap = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .limit(300)
        .get();
    }

    const all: GroupMember[] = [];

    if (!snap.empty) {
      snap.docs
        .filter((doc: any) => normLeagueIdData(doc.data().leagueId) === normLeagueIdData(leagueId))
        .forEach((doc: any) => {
          const members: Record<string, { name: string; points: number; uid: string; avatar?: string; frame?: string; aura?: string; isPremium?: boolean; isVip?: boolean; isLifetime?: boolean; streak?: number; totalXp?: number }> =
            doc.data()?.members ?? {};
          Object.entries(members).forEach(([uid, m]) => {
            if ((m as any)?.identityHidden === true) return;
            all.push({
              name: m.name,
              points: m.points,
              isMe: false,
              uid: m.uid ?? uid,
              avatar: m.avatar,
              frame: m.frame,
              aura: normalizeAvatarAuraId(m.aura),
              isPremium: m.isPremium,
              isVip: m.isVip,
              isLifetime: m.isLifetime,
              streak: m.streak,
              totalXp: m.totalXp,
            });
          });
        });
    }

    // Строгий фолбэк: leaderboard используем только когда нет ни одной current-week group.
    // Иначе старые leaderboard/{authUid} документы могут выглядеть как живые участники лиги.
    if (all.length === 0) {
      try {
        // Сначала ищем по leagueId (новые пользователи с обновлённым кодом)
        const lbSnap = await db
          .collection('leaderboard')
          .where('leagueId', '==', leagueId)
          .limit(limit)
          .get();

        const existingNames = new Set(all.map((m: GroupMember) => m.name.trim().toLowerCase()));

        if (!lbSnap.empty) {
          lbSnap.docs.forEach((doc: any) => {
            const d = doc.data();
            if (
              d?.name &&
              d?.groupWeekId === weekId &&
              !existingNames.has((d.name as string).trim().toLowerCase())
            ) {
              all.push({
                name: d.name,
                points: d.weekKey === weekId ? (d.weekPoints ?? 0) : 0,
                isMe: false,
                uid: doc.id,
                avatar: d.avatar,
                frame: d.frame,
                aura: normalizeAvatarAuraId(d.aura),
                isPremium: d.isPremium,
                isVip: d.isVip,
                isLifetime: d.isLifetime,
                streak: d.streak,
                totalXp: d.points,
              });
              existingNames.add((d.name as string).trim().toLowerCase());
            }
          });
        }

        // Для клуба 0 — показываем всех пользователей у кого нет leagueId (старые клиенты)
        // Все новые пользователи начинают с leagueId=0
        if (all.length === 0 && leagueId === 0) {
          const allUsersSnap = await db
            .collection('leaderboard')
            .limit(limit)
            .get();

          allUsersSnap.docs.forEach((doc: any) => {
            const d = doc.data();
            const hasLeagueId = d?.leagueId !== undefined && d?.leagueId !== null;
            if (
              d?.name &&
              d?.groupWeekId === weekId &&
              !hasLeagueId &&
              !existingNames.has((d.name as string).trim().toLowerCase())
            ) {
              all.push({
                name: d.name,
                points: d.weekKey === weekId ? (d.weekPoints ?? 0) : 0,
                isMe: false,
                uid: doc.id,
                avatar: d.avatar,
                frame: d.frame,
                aura: normalizeAvatarAuraId(d.aura),
                isPremium: d.isPremium,
                isVip: d.isVip,
                isLifetime: d.isLifetime,
                streak: d.streak,
                totalXp: d.points,
              });
              existingNames.add((d.name as string).trim().toLowerCase());
            }
          });
        }
      } catch {}
    }

    return all
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ── Обновить очки в группе (дебаунс 8с) ────────────────────────────────────
// 8 секунд — компромисс: не спамим Firestore при серии уроков, но не теряем
// очки при закрытии приложения через 10-20 сек после занятия.
export function updateMyGroupPoints(
  weekPoints: number,
  accountToken?: AccountGenerationToken,
): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return Promise.resolve();
  if (isJestRuntime()) return Promise.resolve();
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return Promise.resolve();
  _pendingGroupPts = weekPoints;
  _pendingGroupPtsAccountToken = operationToken;
  if (_groupPtsTimer) clearTimeout(_groupPtsTimer);
  return new Promise(resolve => {
    _pendingGroupPtsResolvers.push(resolve);
    _groupPtsTimer = setTimeout(async () => {
      _groupPtsTimer = null;
      const pts = _pendingGroupPts;
      const token = _pendingGroupPtsAccountToken;
      const resolvers = _pendingGroupPtsResolvers;
      _pendingGroupPts = null;
      _pendingGroupPtsAccountToken = null;
      _pendingGroupPtsResolvers = [];
      try {
        if (pts === null || !token || !isCurrentAccountGeneration(token)) return;
        await _doUpdateGroupPoints(pts, {}, token);
      } finally {
        resolvers.forEach((settle) => settle());
      }
    }, 8_000);
    (_groupPtsTimer as any)?.unref?.();
  });
}

async function _doUpdateGroupPoints(
  weekPoints: number,
  options: { force?: boolean } = {},
  accountToken: AccountGenerationToken,
): Promise<void> {
  const isCurrent = () => isCurrentAccountGeneration(accountToken);
  if (!isCurrent()) return;
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid || !isCurrent()) return;
  try {
    const weekId = getWeekId();
    let leagueId = 0;
    try {
      const leagueRaw = await AsyncStorage.getItem(LEAGUE_STATE_V3_KEY);
      if (!isCurrent()) return;
      const leagueState = leagueRaw ? JSON.parse(leagueRaw) : null;
      leagueId = normLeagueIdData(leagueState?.leagueId, 0);
    } catch {
      leagueId = 0;
    }

    const cachedBeforeAuth = await readLeagueMemberSyncCache();
    if (!isCurrent()) return;
    if (!options.force && shouldSkipLeaguePointsCallable(cachedBeforeAuth, weekId, leagueId, weekPoints)) return;

    await ensureStableAuthLink().catch(() => false);
    if (!isCurrent()) return;
    const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
    if (!appCheckReady || !isCurrent()) return;

    const [
      [, avatarRaw],
      [, frameRaw],
      [, auraRaw],
      [, streakRaw],
      [, totalXpRaw],
      [, nameRaw],
      [, cardLevelRaw],
      [, cardThemeRaw],
      [, cardMotionRaw],
      [, cardFocusRaw],
    ] = await AsyncStorage.multiGet([
      'user_avatar',
      'user_frame',
      USER_AVATAR_AURA_KEY,
      'streak_count',
      'user_total_xp',
      'user_name',
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    if (!isCurrent()) return;
    const [memberPremium, memberVip, memberLifetimeRaw] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
      isLifetimePlanLocal().catch(() => false),
    ]);
    if (!isCurrent()) return;
    // зачем: см. выше — безденежный пожизненный доступ тоже даёт Pro-ауру.
    const memberLifetime = (memberPremium || memberVip) && memberLifetimeRaw;
    const memberTotalXp = totalXpRaw ? parseInt(totalXpRaw, 10) || 0 : 0;
    const memberName = (nameRaw ?? '').trim();
    const member = withoutUndefinedFields({
      name: memberName || undefined,
      points: weekPoints,
      uid,
      avatar: avatarRaw ?? null,
      frame: frameRaw ?? null,
      aura: normalizeAvatarAuraId(auraRaw) ?? null,
      profileCardLevel: normalizeProfileCardLevel(cardLevelRaw),
      profileCardTheme: normalizeProfileCardTheme(cardThemeRaw),
      profileCardMotion: normalizeProfileCardMotion(cardMotionRaw),
      profileCardPublicFocus: normalizeProfileCardPublicFocus(cardFocusRaw),
      isPremium: memberPremium,
      isVip: memberVip,
      isLifetime: memberLifetime,
      streak: streakRaw ? parseInt(streakRaw, 10) : 0,
      totalXp: memberTotalXp,
    });
    const memberHash = leagueMemberHash(member);
    const profileHash = leagueMemberHash(member, false);
    const cachedSync = await readLeagueMemberSyncCache();
    if (!isCurrent()) return;
    if (!options.force && shouldSkipLeagueMemberCallable(cachedSync, weekId, leagueId, profileHash, weekPoints)) return;

    const fn = callable<{ stableId?: string; member: Record<string, unknown> }, { ok: boolean; groupId?: string }>('leagueUpdateMyMember');
    if (!isCurrent()) return;
    await fn({
      stableId: uid,
      member,
    });
    if (!isCurrent()) return;
    if (cachedSync?.groupId && cachedSync.weekId === weekId) {
      writeLeagueMemberSyncCache({
        weekId,
        leagueId,
        groupId: cachedSync.groupId,
        memberHash,
        profileHash,
        points: weekPoints,
      }).catch(() => {});
    }
  } catch {}
}

export async function syncMyLeagueMemberProfileNow(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const accountToken = captureAccountGeneration();
  if (!accountToken.stableId || !isCurrentAccountGeneration(accountToken)) return;
  try {
    const weekPoints = await getMyWeekPoints();
    if (!isCurrentAccountGeneration(accountToken)) return;
    const [[, nameRaw], [, leagueRaw]] = await AsyncStorage.multiGet(['user_name', LEAGUE_STATE_V3_KEY]);
    const name = (nameRaw ?? '').trim();
    if (name) {
      let leagueId = 0;
      try {
        const state = leagueRaw ? JSON.parse(leagueRaw) : null;
        leagueId = normLeagueIdData(state?.leagueId, 0);
      } catch {
        leagueId = 0;
      }
      await getOrCreateLeagueGroup(getWeekId(), leagueId, name, weekPoints).catch(() => null);
    }
    await _doUpdateGroupPoints(weekPoints, { force: true }, accountToken);
  } catch {}
}

// ── Тихая регистрация в группу при старте приложения ────────────────────────
// Вызывается из _layout.tsx чтобы каждый пользователь попал в league_groups
// даже если он никогда не открывал экран клубов.
export async function registerInLeagueGroupSilently(isPremium?: boolean): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  if (!isLeagueStartupRegistrationEnabled()) return;
  try {
    const [[, nameRaw], [, leagueRaw]] =
      await AsyncStorage.multiGet(['user_name', 'league_state_v3']);

    const name = (nameRaw ?? '').trim();
    if (!name) return;

    let leagueState: { leagueId?: number; weekId?: string } | null = null;
    try {
      leagueState = leagueRaw ? JSON.parse(leagueRaw) : null;
    } catch {
      leagueState = null;
    }
    const leagueId: number = normLeagueIdData(leagueState?.leagueId, 0);
    // Всегда текущая ISO-неделя (getWeekId). weekId в league_state_v3 обновляется
    // с экрана клуба — до этого он может отставать, из-за чего тихая регистрация
    // писала в «прошлую» неделю, а UI и leaderboard — в текущую, и указатель
    // groupId указывал на сольник.
    const weekId = getWeekId();
    // Home/league rollover must apply the previous week's authoritative result
    // before startup registration can place the user into the new week's room.
    if (leagueState?.weekId && leagueState.weekId !== weekId) return;

    const weekPoints = await getMyWeekPoints();
    const cachedRegistration = await readLeagueStartupRegistrationCache();
    if (shouldSkipLeagueStartupRegistration(cachedRegistration, weekId, leagueId, weekPoints)) return;

    const group = await getOrCreateLeagueGroup(weekId, leagueId, name, weekPoints);
    if (group && group.length > 0) {
      writeLeagueStartupRegistrationCache(weekId, leagueId, weekPoints).catch(() => {});
    }
    // Первый запуск: пока в multiGet не было league_state_v3, сохраняем снимок группы из облака,
    // чтобы на Главной сразу был виден клуб с другими игроками (без захода на экран клуба).
    const hadLocalLeague = !!(leagueRaw && String(leagueRaw).trim());
    if (group && group.length > 0 && !hadLocalLeague) {
      try {
        const db = getFirestore();
        const uid = await ensureAnonUser();
        if (!db || !uid) return;
        const lb = await db.collection(COL_LB).doc(uid).get();
        const lid = normLeagueIdData(lb.exists ? lb.data()?.leagueId : undefined, leagueId);
        await AsyncStorage.setItem(
          LEAGUE_STATE_V3_KEY,
          JSON.stringify({ leagueId: lid, weekId, group }),
        );
        emitAppEvent('league_local_state_updated');
      } catch {}
    }
  } catch {}
}

// ── Загрузить участников группы ──────────────────────────────────────────────
function mapLeagueMembersToGroupList(
  members: Record<string, any>,
  myUid: string,
  myName: string,
  myWeekPoints: number,
): GroupMember[] {
  return Object.entries(members)
    .filter(([, m]) => m?.identityHidden !== true)
    .map(([key, m]) => {
      const mult = m.leagueBoostMultiplier;
      const until = typeof m.leagueBoostExpiresAt === 'number' ? m.leagueBoostExpiresAt : 0;
      const boostLive = typeof mult === 'number' && mult > 1 && until > Date.now();
      const serverPoints = Number(m.points);
      const memberPoints = Number.isFinite(serverPoints) ? Math.max(0, serverPoints) : 0;
      const localPoints = Number.isFinite(Number(myWeekPoints)) ? Math.max(0, Number(myWeekPoints)) : 0;
      return {
        name: m.name,
        points: key === myUid ? Math.max(memberPoints, localPoints) : memberPoints,
        isMe: key === myUid,
        uid: key,
        isPremium: m.isPremium ?? false,
        isVip: m.isVip ?? false,
        isLifetime: m.isLifetime ?? false,
        avatar: m.avatar ?? undefined,
        frame: m.frame ?? undefined,
        aura: normalizeAvatarAuraId(m.aura),
        profileCardLevel: normalizeProfileCardLevel(m.profileCardLevel),
        profileCardTheme: normalizeProfileCardTheme(m.profileCardTheme),
        profileCardMotion: normalizeProfileCardMotion(m.profileCardMotion),
        profileCardPublicFocus: normalizeProfileCardPublicFocus(m.profileCardPublicFocus),
        streak: m.streak ?? undefined,
        totalXp: m.totalXp ?? undefined,
        // зачем (аудит 2026-08-04): метка синтетического жителя обязана
        // доезжать до движка лиг — по ней calculateResult исключает его из
        // подсчёта ранга и зон перехода, как это делает сервер. Без метки
        // остаётся только префикс uid, а он мог бы не совпасть при смене
        // формата и клиент молча разошёлся бы с сервером в итогах недели.
        isResident: m.isResident === true || String(key).startsWith('res_'),
        leagueBoostMultiplier: boostLive ? mult : undefined,
        leagueBoostExpiresAt: boostLive ? until : undefined,
      } as GroupMember;
    })
    .sort((a, b) => b.points - a.points);
}

async function fetchGroupMembers(
  db: any,
  groupId: string,
  myUid: string,
  myName: string,
  myWeekPoints: number,
): Promise<GroupMember[]> {
  const snap = await db.collection('league_groups').doc(groupId).get();
  if (!snap.exists) return [];
  const members: Record<string, any> = snap.data()?.members ?? {};
  return mapLeagueMembersToGroupList(members, myUid, myName, myWeekPoints);
}

/** Пушит личный буст (×2/×3) в league_groups.members.{uid} — другие участники видят модификатор. */
export async function syncMyLeagueMemberBoostToCloud(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  await ensureStableAuthLink().catch(() => false);
  const appCheckReady = await initFirebaseAppCheckIfAvailable().catch(() => false);
  if (!appCheckReady) return;
  const boost = await loadActiveLeagueBoost();
  try {
    const fn = callable<{ stableId?: string; multiplier?: number; expiresAt?: number }, { ok: boolean }>('leagueSyncMyBoost');
    await fn(boost && Date.now() < boost.expiresAt
      ? { stableId: uid, multiplier: boost.multiplier, expiresAt: boost.expiresAt }
      : { stableId: uid });
  } catch { /* empty */ }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
