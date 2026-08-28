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
import { CLUBS, GroupMember, getWeekId } from './league_engine';
// зачем (владелец, 2026-08-26: «весь раздел лига переходит на руны, никакого
// ХП, только руны»): очки лиги больше не берутся из общего недельного счётчика
// опыта — у лиги свой источник, руны за ISO-неделю (см. league_week_runes.ts).
// getMyWeekPoints остаётся у Зала славы, друзей и лидербордов: они про опыт.
import { getMyLeagueWeekRunes } from './league_week_runes';
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
let _pendingGroupPtsResolvers: (() => void)[] = [];

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
const LEAGUE_STATE_V3_KEY = 'league_state_v3';
const LEAGUE_MEMBER_SYNC_CACHE_KEY = 'league_member_sync_cache_v1';
const LEAGUE_STARTUP_REG_CACHE_KEY = 'league_startup_registration_cache_v1';
const DEFAULT_LEAGUE_MEMBER_SYNC_FORCE_INTERVAL_MS = 6 * 60 * 60_000;
const DEFAULT_LEAGUE_POINTS_SYNC_MIN_DELTA = 75;
const DEFAULT_LEAGUE_POINTS_SYNC_MIN_INTERVAL_MS = 15 * 60_000;
const DEFAULT_LEAGUE_STARTUP_REG_INTERVAL_MS = 24 * 60 * 60_000;
/** Сколько league_groups максимум читаем на неделю+клуб, чтобы не создавать сольные группы из-за .limit(100) */
const BROAD_GROUP_QUERY_LIMIT = 500;
// Зеркало строгого серверного контракта functions/src/league_residents.ts.
// При < 15 живых сервер обязан материализовать 28 видимых участников.
const LEAGUE_RESIDENT_FILL_THRESHOLD = 15;
const LEAGUE_RESIDENT_TARGET_VISIBLE = 28;

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
  residentFillVerified: boolean;
};

function countMembersInData(data: any): number {
  const m = data?.members;
  if (!m || typeof m !== 'object') return 0;
  return Object.values(m).filter((member: any) => member?.identityHidden !== true).length;
}

function satisfiesLeagueResidentFillContract(members: GroupMember[]): boolean {
  const visible = members.length;
  const live = members.filter((member) => (
    member.isResident !== true && !String(member.uid || '').startsWith('res_')
  )).length;
  // Не принимать старые переполненные комнаты как «уже исправленные».
  // Серверный контракт точный: <15 живых => ровно 28 видимых; >=15 => жители
  // полностью уступают место, значит видимых ровно столько же, сколько живых.
  return live < LEAGUE_RESIDENT_FILL_THRESHOLD
    ? visible === LEAGUE_RESIDENT_TARGET_VISIBLE
    : visible === live;
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
      residentFillVerified: parsed.residentFillVerified === true,
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
    residentFillVerified: true,
  }));
}

function shouldSkipLeagueStartupRegistration(
  cache: LeagueStartupRegistrationCache | null,
  weekId: string,
  leagueId: number,
  points: number,
): boolean {
  if (!cache?.registeredAt) return false;
  // Старый кэш мог быть записан после ответа из одного человека и блокировал
  // повторный server join на сутки. Только проверенная комната имеет право
  // пропустить фоновую регистрацию.
  if (!cache.residentFillVerified) return false;
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
  // App Check здесь best-effort, а не шлагбаум. Серверная функция сама решает,
  // требуется ли токен. Если клиент ждёт appCheckReady=true, preview/internal
  // сборки вообще не вызывают сервер и остаются с локальной группой из одного.
  await initFirebaseAppCheckIfAvailable().catch(() => false);

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
    // Не кэшируем нарушение «<15 живых → 28 видимых»: такая комната должна
    // немедленно попасть в server join и починиться в той же транзакции.
    if (satisfiesLeagueResidentFillContract(cachedMembers)) return cachedMembers;
  }

  try {
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
    if (__DEV__) console.warn('[firestore_leagues] leagueJoinOrUpdateGroup failed, using read-only fallback', e);
  }

  // Без сервера клиент может только показать уже существующую группу. Создание,
  // переселение и обновление league_groups принадлежат Cloud Function: только она
  // применяет жителей, авторитетные очки и атомарное правило 15 → 28. Старый
  // write-fallback обходил это правило (и всё равно блокировался Firestore Rules).
  try {
    const myDoc = await db.collection(COL_LB).doc(uid).get();
    const myData = myDoc.exists ? myDoc.data() : {};
    const savedGroupId: string | undefined = myData?.groupId;
    const savedWeekId: string | undefined  = myData?.groupWeekId;
    const leagueIdForGroup = normLeagueIdData(leagueId, 0);

    let canonicalGid = await findBestLeagueGroupDocIdForUser(db, weekId, leagueIdForGroup, uid);
    if (!canonicalGid) {
      const any = await findAnyLeagueGroupDocIdForUser(db, weekId, uid);
      if (any?.leagueId === leagueIdForGroup) canonicalGid = any.id;
    }
    if (canonicalGid) {
      const members = await fetchGroupMembers(db, canonicalGid, uid, myName, myWeekPoints);
      return members.length > 0 ? members : null;
    }

    if (savedGroupId && savedWeekId === weekId) {
      const savedSnap = await db.collection('league_groups').doc(savedGroupId).get();
      const savedData = savedSnap?.exists ? savedSnap.data() ?? {} : null;
      if (
        savedData?.weekId === weekId
        && normLeagueIdData(savedData?.leagueId, leagueIdForGroup) === leagueIdForGroup
        && savedData?.members?.[uid]
      ) {
        const members = await fetchGroupMembers(db, savedGroupId, uid, myName, myWeekPoints);
        return members.length > 0 ? members : null;
      }
    }
    return null;
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
    const weekPoints = await getMyLeagueWeekRunes();
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

    const weekPoints = await getMyLeagueWeekRunes();
    const cachedRegistration = await readLeagueStartupRegistrationCache();
    if (shouldSkipLeagueStartupRegistration(cachedRegistration, weekId, leagueId, weekPoints)) return;

    const group = await getOrCreateLeagueGroup(weekId, leagueId, name, weekPoints);
    if (group && satisfiesLeagueResidentFillContract(group)) {
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
        // зачем (владелец, 2026-08-28: «минут пять назад Цель лиги поменялась с
        // медной на эфирную»): между чтением leagueRaw в начале функции и этой
        // записью успевают отработать четыре await (руны, группа, ensureAnonUser,
        // чтение leaderboard). За это время ролловер league_engine или экран
        // клуба уже могли записать НАСТОЯЩЕЕ состояние — и мы затирали его
        // снимком, собранным из устаревшего leagueRaw. Отсюда и подмена лиги
        // «сама собой» через несколько минут после запуска. Ветка задумана
        // только под ПЕРВЫЙ запуск (локального состояния нет), поэтому
        // перечитываем ключ непосредственно перед записью и уступаем дорогу.
        // Событие НЕ шлём: мы ничего не записали, а победившая сторона
        // (ролловер/восстановление из облака) уже сообщила о себе сама —
        // лишний перечит состояния на старте Главной ничего не даёт.
        const freshLocalRaw = await AsyncStorage.getItem(LEAGUE_STATE_V3_KEY);
        if (freshLocalRaw && freshLocalRaw.trim()) return;
        // зачем: leagueId из leaderboard приходит как есть — normLeagueIdData
        // не ограничивает диапазон, и мусорный/чужой номер (например 10 при
        // медной лиге 0) прописывался в состояние, минуя capLeagueStep. Здесь
        // мы НЕ решаем исход недели — это делает ролловер league_engine, — а
        // лишь берём стартовый снимок, поэтому достаточно удержать номер в
        // границах существующих лиг; всё за их пределами читаем как «не знаю»
        // и остаёмся на лиге из локального расчёта.
        const rawLid = normLeagueIdData(lb.exists ? lb.data()?.leagueId : undefined, leagueId);
        const lid = rawLid >= 0 && rawLid < CLUBS.length ? rawLid : leagueId;
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
        // Метка синтетического жителя обязана доезжать до движка лиг:
        // житель участвует в total, ранге и зонах как видимый соперник, но не
        // должен становиться получателем награды. Явная метка сохраняет этот
        // контракт даже при будущей смене формата uid.
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
