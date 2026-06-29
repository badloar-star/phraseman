// ════════════════════════════════════════════════════════════════════════════
// firestore_leaderboard.ts — Глобальный рейтинг через Firestore
//
// Структура Firestore:
//   leaderboard/{uid}  → { name, points, lang, avatar, weekKey, weekPoints, updatedAt }
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// При отключённом флаге все функции возвращают пустые данные.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId, waitForAnonAuth } from './cloud_sync';
import { getAuthUserId, getCanonicalUserId } from './user_id_policy';
import { normalizeAvatarAuraId } from '../constants/avatar_auras';
import {
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';
import type { LeagueCrown } from './services/league_chest_rewards';

function isJestRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
}

// ── Кэш глобального рейтинга — читаем Firestore не чаще 1 раза в 10 минут ──
/** Экспорт для сброса при pull-to-refresh в Зале славы. */
export const GLOBAL_LB_ASYNC_CACHE_KEY = 'global_lb_cache_v4';
const LB_CACHE_KEY = GLOBAL_LB_ASYNC_CACHE_KEY;
const LB_CACHE_TTL = 3 * 60 * 1000; // 3 минуты

/** Прогрев кэша глобального топа при старте — экран «Зал славы» открывается без ожидания сети. */
export function prefetchGlobalLeaderboard(): void {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || isJestRuntime()) return;
  void fetchGlobalLeaderboard().catch(() => {});
}

/** Сколько строк набрать из Firestore до остановки (запас под дедуп на клиенте). */
const LEADERBOARD_FETCH_GOAL = 130;
const LEADERBOARD_PAGE = 60;
const LEADERBOARD_MAX_PAGES = 8;
const LEADERBOARD_MAX_RETURN = 220;

export interface RemoteLeaderEntry {
  uid: string;
  name: string;
  points: number;
  lang: string;
  avatar?: string;
  frame?: string;
  aura?: string;
  weekPoints?: number;
  weekKey?: string;
  streak?: number;
  leagueId?: number;
  isPremium?: boolean;
  isVip?: boolean;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  leagueCrown?: LeagueCrown;
  daily7xp?: number;
  daily7time_ms?: number;
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

const FUNCTIONS_REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

// Бьёт по зависанию онбординга (audit C2): httpsCallable не имеет клиентского
// таймаута, поэтому на плохой сети «Продолжить» висит до серверного дефолта (~70с).
// Гонка с таймаутом → reserveName отдаёт 'error' за разумное время, а онбординг
// уже показывает «проверь интернет» и снимает busy.
const NAME_RESERVE_TIMEOUT_MS = 6_000;
const NAME_RESERVE_RETRY_TIMEOUT_MS = 4_000;
const NAME_CHECK_TIMEOUT_MS = 1_500;
const NAME_CHECK_AUTH_TIMEOUT_MS = 800;
const NAME_CHECK_IDENTITY_TIMEOUT_MS = 3_500;
const NAME_AUTH_LINK_VERIFY_TIMEOUT_MS = 2_500;
const NAME_AUTH_LINK_VERIFIED_TTL_MS = 5 * 60_000;
const NAME_IDENTITY_READY_TTL_MS = 10 * 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}_timeout`)), ms),
    ),
  ]);
}

let nameAuthLinkVerifiedKey = '';
let nameAuthLinkVerifiedAt = 0;
let nameIdentityReadyStableId = '';
let nameIdentityReadyAuthUid = '';
let nameIdentityReadyAt = 0;
let nameIdentityReadyPromise: Promise<string | null> | null = null;

function readCachedNameReservationIdentity(): string | null {
  const authUid = getAuthUserId();
  if (!authUid || !nameIdentityReadyStableId || nameIdentityReadyAuthUid !== authUid) return null;
  if (Date.now() - nameIdentityReadyAt > NAME_IDENTITY_READY_TTL_MS) return null;
  return nameIdentityReadyStableId;
}

function rememberNameReservationIdentity(stableId: string): void {
  const authUid = getAuthUserId();
  if (!stableId || !authUid) return;
  nameIdentityReadyStableId = stableId;
  nameIdentityReadyAuthUid = authUid;
  nameIdentityReadyAt = Date.now();
}

async function ensureNameCallableAuthReady(timeoutMs: number): Promise<string | null> {
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  if (getAuthUserId()) return stableId;
  void ensureAnonUser().catch(() => null);
  const authReady = await waitForAnonAuth(timeoutMs);
  return authReady ? stableId : null;
}

async function forceNameStableAuthLink(stableId: string): Promise<boolean> {
  const authUid = getAuthUserId();
  if (!authUid) return false;
  try {
    const fn = callable<{ stableId: string }, { ok: boolean; stableUid: string; authUid: string }>('authEnsureStableLink');
    await withTimeout(fn({ stableId }), NAME_AUTH_LINK_VERIFY_TIMEOUT_MS, 'name_auth_link_callable');
    return true;
  } catch {
    const db = getFirestore();
    if (!db) return false;
    try {
      await withTimeout(
        db.collection('users').doc(stableId).set({ firebaseAuthUid: authUid, updatedAt: Date.now() }, { merge: true }),
        NAME_AUTH_LINK_VERIFY_TIMEOUT_MS,
        'name_auth_link_firestore',
      );
      return true;
    } catch {
      return false;
    }
  }
}

async function ensureNameStableAuthLinkVerified(stableId: string): Promise<boolean> {
  const authUid = getAuthUserId();
  if (!authUid) return false;
  const key = `${stableId}:${authUid}`;
  if (nameAuthLinkVerifiedKey === key && Date.now() - nameAuthLinkVerifiedAt < NAME_AUTH_LINK_VERIFIED_TTL_MS) {
    return true;
  }
  const linked = await forceNameStableAuthLink(stableId);
  if (linked) {
    nameAuthLinkVerifiedKey = key;
    nameAuthLinkVerifiedAt = Date.now();
    rememberNameReservationIdentity(stableId);
  }
  return linked;
}

async function resolveNameReservationIdentity(): Promise<string | null> {
  const cached = readCachedNameReservationIdentity();
  if (cached) return cached;
  const stableId = await ensureNameCallableAuthReady(NAME_RESERVE_TIMEOUT_MS);
  if (!stableId) return null;
  const linkedFromSharedCache = await ensureStableAuthLinkForStableId(stableId).catch(() => false);
  const linked = linkedFromSharedCache || await ensureNameStableAuthLinkVerified(stableId);
  if (!linked) return null;
  rememberNameReservationIdentity(stableId);
  return stableId;
}

async function ensureNameReservationIdentityReady(timeoutMs: number): Promise<string | null> {
  const cached = readCachedNameReservationIdentity();
  if (cached) return cached;
  if (!nameIdentityReadyPromise) {
    nameIdentityReadyPromise = resolveNameReservationIdentity().finally(() => {
      nameIdentityReadyPromise = null;
    });
  }
  const stableId = await withTimeout(nameIdentityReadyPromise, timeoutMs, 'name_identity_ready').catch(() => null);
  if (stableId) rememberNameReservationIdentity(stableId);
  return stableId;
}

const COL = 'leaderboard';

export type ReserveNameStatus = 'ok' | 'taken' | 'cooldown' | 'error';
export type ReserveNameResult = {
  status: ReserveNameStatus;
  nextChangeAt?: number;
};
export type ReserveNameOptions = {
  source?: 'onboarding' | 'settings';
};
export type NameAvailabilityStatus = 'available' | 'taken' | 'error';
export type NameAvailabilityResult = {
  status: NameAvailabilityStatus;
};
type NameIndexSnapshot = {
  exists?: boolean;
  data?: () => Record<string, unknown>;
};

// ── Атомарно зарезервировать ник через транзакцию ───────────────────────────
// Возвращает 'ok' | 'taken' | 'error'
// oldName — прежний ник пользователя (для освобождения старого слота)
export async function reserveNameDetailed(
  name: string,
  oldName: string,
  options: ReserveNameOptions = {},
): Promise<ReserveNameResult> {
  if (!CLOUD_SYNC_ENABLED) return { status: 'ok' };
  // На холодном старте signInAnonymously может занять >8с (GMS init, slow network).
  // Ждём токен явно перед вызовом CF — иначе callable уходит без auth → 401 →
  // юзер видит ложное «проверь интернет». Таймаут не даёт зависнуть навсегда.
  let stableId = readCachedNameReservationIdentity() || await ensureNameReservationIdentityReady(NAME_RESERVE_TIMEOUT_MS);
  if (!stableId) {
    const authReady = await waitForAnonAuth(NAME_RESERVE_RETRY_TIMEOUT_MS);
    stableId = authReady
      ? readCachedNameReservationIdentity() || await ensureNameReservationIdentityReady(NAME_RESERVE_RETRY_TIMEOUT_MS)
      : null;
  }
  if (!stableId) return { status: 'error' };
  try {
    const fn = callable<{ stableId?: string; name: string; oldName: string; source?: ReserveNameOptions['source'] }, { ok: boolean; status: ReserveNameStatus; nextChangeAt?: number }>('nameReserve');
    const { data } = await withTimeout(
      fn({ stableId, name: name.trim(), oldName: oldName.trim(), source: options.source }),
      NAME_RESERVE_TIMEOUT_MS,
      'name_reserve',
    );
    rememberNameReservationIdentity(stableId);
    if (data.status === 'taken') return { status: 'taken' };
    if (data.status === 'cooldown') return { status: 'cooldown', nextChangeAt: data.nextChangeAt };
    return { status: 'ok', nextChangeAt: data.nextChangeAt };
  } catch (e: any) {
    if (String(e?.message ?? '').includes('name_taken') || String(e?.code ?? '').includes('already-exists')) return { status: 'taken' };
    const errCode = String(e?.code ?? '');
    const errMsg = String(e?.message ?? '');
    const isAuthError = errCode.includes('unauthenticated') || errMsg.includes('auth_required');
    // CF returns failed-precondition/stable_id_required when users/{stableId} doc
    // doesn't exist yet (first install, ensureStableAuthLinkForStableId was still in flight).
    const isIdentityError = errCode.includes('failed-precondition') || errMsg.includes('stable_id_required');
    if (isAuthError || isIdentityError) {
      const authReady = await waitForAnonAuth(NAME_RESERVE_RETRY_TIMEOUT_MS);
      if (!authReady) return { status: 'error' };
      try {
        const stableId = await ensureNameReservationIdentityReady(NAME_RESERVE_RETRY_TIMEOUT_MS);
        if (!stableId) return { status: 'error' };
        // stableId is returned only after the auth link is ready.
        const fn = callable<{ stableId?: string; name: string; oldName: string; source?: ReserveNameOptions['source'] }, { ok: boolean; status: ReserveNameStatus; nextChangeAt?: number }>('nameReserve');
        const { data } = await withTimeout(
          fn({ stableId, name: name.trim(), oldName: oldName.trim(), source: options.source }),
          NAME_RESERVE_RETRY_TIMEOUT_MS,
          'name_reserve',
        );
        rememberNameReservationIdentity(stableId);
        if (data.status === 'taken') return { status: 'taken' };
        if (data.status === 'cooldown') return { status: 'cooldown', nextChangeAt: data.nextChangeAt };
        return { status: 'ok', nextChangeAt: data.nextChangeAt };
      } catch {
        return { status: 'error' };
      }
    }
    return { status: 'error' };
  }
}

export async function reserveName(
  name: string,
  oldName: string,
  options?: ReserveNameOptions,
): Promise<ReserveNameStatus> {
  return (await reserveNameDetailed(name, oldName, options)).status;
}

export function warmNameAvailabilityAuth(): void {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  void ensureNameReservationIdentityReady(NAME_RESERVE_TIMEOUT_MS).catch(() => null);
}

async function runNameAvailabilityCheck(name: string, readyStableId?: string): Promise<NameAvailabilityResult> {
  const stableId = readyStableId || readCachedNameReservationIdentity() || await ensureNameCallableAuthReady(NAME_CHECK_IDENTITY_TIMEOUT_MS);
  if (!stableId) return { status: 'error' };
  const fn = callable<{ stableId?: string; name: string }, { ok: boolean; available: boolean }>('nameCheckAvailability');
  const { data } = await fn({ stableId, name: name.trim() });
  rememberNameReservationIdentity(stableId);
  return { status: data.available === false ? 'taken' : 'available' };
}

async function checkNameIndexAvailabilityFast(name: string, readyStableId?: string | null): Promise<NameAvailabilityResult | null> {
  const db = getFirestore();
  if (!db) return null;
  const nameLower = name.trim().toLowerCase();
  if (!nameLower) return { status: 'available' };
  const authReady = await waitForAnonAuth(NAME_CHECK_AUTH_TIMEOUT_MS);
  if (!authReady) return null;
  try {
    const snap = await withTimeout<NameIndexSnapshot>(
      db.collection('name_index').doc(nameLower).get() as Promise<NameIndexSnapshot>,
      NAME_CHECK_TIMEOUT_MS,
      'name_index_check',
    );
    if (!snap.exists) return { status: 'available' };
    const data = snap.data?.() ?? {};
    if (data.identityHidden === true) return { status: 'available' };
    const ownerUid = String(data.uid ?? '').trim();
    if (ownerUid && !readyStableId) return null;
    return ownerUid && ownerUid === readyStableId ? { status: 'available' } : { status: 'taken' };
  } catch {
    return null;
  }
}

export async function checkNameAvailabilityDetailed(name: string): Promise<NameAvailabilityResult> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { status: 'available' };
  const identityPromise = ensureNameReservationIdentityReady(NAME_CHECK_IDENTITY_TIMEOUT_MS);
  const authPromise = ensureNameCallableAuthReady(NAME_CHECK_IDENTITY_TIMEOUT_MS);
  const fastResult = await checkNameIndexAvailabilityFast(name, readCachedNameReservationIdentity());
  if (fastResult) return fastResult;
  let stableId = readCachedNameReservationIdentity() || await authPromise;
  if (!stableId) stableId = await identityPromise;
  if (!stableId) return { status: 'error' };
  try {
    return await withTimeout(
      runNameAvailabilityCheck(name, stableId),
      NAME_CHECK_TIMEOUT_MS,
      'name_check',
    );
  } catch (e: any) {
    if (String(e?.message ?? '').includes('name_taken') || String(e?.code ?? '').includes('already-exists')) {
      return { status: 'taken' };
    }
    return { status: 'error' };
  }
}

// ── Проверить уникальность ника (без резервации, только read-only) ───────────
// Используется для валидации перед показом ошибки. Основная блокировка — reserveName.
export async function isNameAvailable(name: string): Promise<boolean> {
  return (await checkNameAvailabilityDetailed(name)).status !== 'taken';
}

// ── Загрузить топ-100 глобального рейтинга (кэш 15 минут) ───────────────────
export async function fetchGlobalLeaderboard(): Promise<RemoteLeaderEntry[]> {
  if (!CLOUD_SYNC_ENABLED) return [];

  // Проверяем кэш — экономит 200 чтений при каждом открытии вкладки
  try {
    const raw = await AsyncStorage.getItem(LB_CACHE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      // Без Array.isArray-проверки старый кэш (другая форма) или повреждённая
      // запись отдавали `data === undefined` → потребители .map/.length падали
      // на вкладке лидерборда.
      if (
        parsed
        && typeof parsed === 'object'
        && Array.isArray((parsed as { data?: unknown }).data)
        && typeof (parsed as { ts?: unknown }).ts === 'number'
      ) {
        const { ts, data } = parsed as { ts: number; data: RemoteLeaderEntry[] };
        if (Date.now() - ts < LB_CACHE_TTL) return data;
      }
    }
  } catch {}

  const db = getFirestore();
  if (!db) return [];
  try {
    const mapDoc = (doc: any): RemoteLeaderEntry => {
      const data = doc.data();
      const leagueCrownCount = Math.max(0, Math.floor(Number(data.leagueCrownCount) || 0));
      const hasLeagueCrown = leagueCrownCount > 0 || data.leagueCrownActive === true || Number(data.leagueCrownExpiresAt) > Date.now();
      return {
        uid: doc.id,
        name: data.name ?? '',
        points: data.points ?? 0,
        lang: data.lang ?? 'ru',
        avatar: data.avatar ?? undefined,
        frame: data.frame ?? undefined,
        aura: normalizeAvatarAuraId(data.aura) ?? undefined,
        weekPoints: data.weekPoints ?? 0,
        weekKey: data.weekKey ?? '',
        streak: data.streak ?? undefined,
        leagueId: data.leagueId ?? undefined,
        isPremium: data.isPremium ?? false,
        isVip: data.isVip ?? false,
        profileCardLevel: normalizeProfileCardLevel(data.profileCardLevel),
        profileCardTheme: normalizeProfileCardTheme(data.profileCardTheme),
        profileCardMotion: normalizeProfileCardMotion(data.profileCardMotion),
        profileCardPublicFocus: normalizeProfileCardPublicFocus(data.profileCardPublicFocus),
        leagueCrown: hasLeagueCrown
          ? {
              uid: doc.id,
              name: data.name ?? '',
              weekId: String(data.leagueCrownWeekId ?? ''),
              groupId: String(data.leagueCrownGroupId ?? ''),
              leagueId: Math.max(0, Math.floor(Number(data.leagueId) || 0)),
              expiresAt: Number(data.leagueCrownExpiresAt),
              crownCount: Math.max(1, leagueCrownCount),
              aura: 'league_chest_crown',
            }
          : undefined,
        daily7xp: typeof data.daily7xp === 'number' ? data.daily7xp : undefined,
        daily7time_ms: typeof data.daily7time_ms === 'number' ? data.daily7time_ms : undefined,
      };
    };

    const passesFilter = (doc: any, e: RemoteLeaderEntry) =>
      doc.data()?.identityHidden !== true &&
      e.points >= 50 &&
      e.name.trim() !== '' &&
      !(e as any).banned;

    const collected: RemoteLeaderEntry[] = [];
    let lastDoc: any = null;

    for (let page = 0; page < LEADERBOARD_MAX_PAGES; page++) {
      let q = db.collection(COL).orderBy('points', 'desc').limit(LEADERBOARD_PAGE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const e = mapDoc(doc);
        if (passesFilter(doc, e)) collected.push(e);
      }

      lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      if (collected.length >= LEADERBOARD_FETCH_GOAL) break;
      if (snap.size < LEADERBOARD_PAGE) break;
    }

    const result = collected.slice(0, LEADERBOARD_MAX_RETURN);
    await AsyncStorage.setItem(LB_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
    return result;
  } catch {
    return [];
  }
}

// ── Получить глобальный ранг пользователя (сколько людей с XP > моего) ───────
export async function fetchMyGlobalRank(myPoints: number): Promise<number | null> {
  if (!CLOUD_SYNC_ENABLED || myPoints <= 0) return null;
  const db = getFirestore();
  if (!db) return null;
  try {
    // Считаем количество документов с points > myPoints
    const snap = await db
      .collection(COL)
      .where('points', '>', myPoints)
      .count()
      .get();
    return (snap.data().count ?? 0) + 1; // ранг = кол-во лучших + 1
  } catch {
    // Фолбэк: если count() не поддерживается — запрашиваем без лимита (дорого, только если нет другого пути)
    try {
      const snap2 = await db.collection(COL).where('points', '>', myPoints).get();
      return snap2.size + 1;
    } catch {
      return null;
    }
  }
}

// ── Удалить запись пользователя из рейтинга (вызывается при удалении аккаунта)
export async function deleteMyLeaderboardEntry(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  try {
    const canonicalUid = await getCanonicalUserId();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    const authUid = auth.currentUser?.uid ?? null;
    const docIds = Array.from(new Set([canonicalUid, authUid].filter(Boolean) as string[]));
    await Promise.all(docIds.map((id) => db.collection(COL).doc(id).delete().catch(() => {})));
  } catch {}
}

// ── Освободить ник в name_index (вызывается при удалении аккаунта) ───────────
// Без этого следующий онбординг с тем же ником получит 'taken', т.к. документ
// name_index/{nameLower} остаётся с привязкой к старому uid даже после удаления
// users/{uid} и leaderboard/{uid}.
//
// Источники имени (в порядке приоритета):
//   1. leaderboard/{uid}.nameLower — самый достоверный, всегда нормализован.
//   2. AsyncStorage.user_name — если юзер прошёл онбординг, но ещё не получил XP.
//
// ВАЖНО: вызывать ДО deleteMyLeaderboardEntry/deleteCloudData — иначе оба
// источника будут уже стёрты.
export async function deleteMyNameReservation(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  try {
    const canonicalUid = await getCanonicalUserId();
    if (!canonicalUid) return;

    // Собираем nameLower из всех возможных источников.
    const candidates = new Set<string>();
    try {
      const localName = await AsyncStorage.getItem('user_name');
      if (localName && localName.trim()) candidates.add(localName.trim().toLowerCase());
    } catch {}

    await ensureStableAuthLinkForStableId(canonicalUid).catch(() => false);
    const fn = callable<{ stableId?: string; names: string[] }, { ok: boolean; deleted: number }>('nameReleaseMine');
    await fn({ stableId: canonicalUid, names: Array.from(candidates) });
  } catch {}
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
