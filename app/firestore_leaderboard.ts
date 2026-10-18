// ════════════════════════════════════════════════════════════════════════════
// firestore_leaderboard.ts — уникальные ники (name_index): проверка, резерв, освобождение.
// (Историческое имя файла: глобального рейтинга в 2.0 нет.)
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// При отключённом флаге все функции возвращают пустые данные.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId, waitForAnonAuth } from './cloud_sync';
import { getAuthUserId, getCanonicalUserId } from './user_id_policy';
import { DebugLogger } from './debug-logger';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее


// зачем (PM-252, координатор 04.10): чтение глобального рейтинга (fetchGlobalLeaderboard,
// prefetchGlobalLeaderboard, fetchMyGlobalRank) и deleteMyLeaderboardEntry удалены — экрана
// рейтинга в 2.0 нет, вызовов не было. Здесь остаются только ники (name_index). Ключ старого
// кэша 'global_lb_cache_v4' по-прежнему стирается в cache_reset.ts.
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
const NAME_CHECK_TIMEOUT_MS = 3_500;
const NAME_CHECK_IDENTITY_TIMEOUT_MS = 3_500;
const NAME_AUTH_LINK_VERIFY_TIMEOUT_MS = 2_500;
const NAME_AUTH_LINK_VERIFIED_TTL_MS = 5 * 60_000;
const NAME_IDENTITY_READY_TTL_MS = 10 * 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
  });
  return Promise.race([
    promise,
    timeout,
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
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
  void ensureAnonUser().catch(noteSwallowedAs('firestore_leaderboard:promise_2', null));
  const authReady = await waitForAnonAuth(timeoutMs);
  return authReady ? stableId : null;
}

async function forceNameStableAuthLink(stableId: string): Promise<boolean> {
  const authUid = getAuthUserId();
  if (!authUid) {
    DebugLogger.warn('firestore_leaderboard:authLink', `link skipped: authUid отсутствует (stableId=${stableId})`);
    return false;
  }
  try {
    const fn = callable<{ stableId: string }, { ok: boolean; stableUid: string; authUid: string }>('authEnsureStableLink');
    await withTimeout(fn({ stableId }), NAME_AUTH_LINK_VERIFY_TIMEOUT_MS, 'name_auth_link_callable');
    return true;
  } catch (callableError) {
    /**
     * зачем (владелец 2026-09-02): здесь стоял fallback, который сам писал
     * `firebaseAuthUid` прямо в users/{stableId}. Это поле server-owned
     * (firestore.rules serverOwnedUserIdentityFields), и правило
     * hasNoServerIdentityWrites запрещает его клиенту БЕЗУСЛОВНО — исключения
     * нет даже для админского токена. То есть fallback не мог сработать
     * никогда: он гарантированно падал с permission-denied, а двойной немой
     * catch (`catch { return false; }`) прятал причину полностью.
     *
     * Авторитетный писатель ровно один — callable authEnsureStableLink на
     * Admin SDK (functions/src/auth_identity.ts). Поэтому вместо запрещённой
     * записи повторяем законный путь через общий помощник: он делит кэш и
     * гонки с остальным приложением, а не заводит свой канал.
     */
    DebugLogger.warn(
      'firestore_leaderboard:authLink',
      `callable authEnsureStableLink failed (${String(callableError)}) — повторяем через общий помощник`,
    );
    try {
      return await ensureStableAuthLinkForStableId(stableId);
    } catch (retryError) {
      DebugLogger.error(
        'firestore_leaderboard:authLink',
        retryError instanceof Error ? retryError : new Error(String(retryError)),
        'warning',
      );
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
  const linkedFromSharedCache = await ensureStableAuthLinkForStableId(stableId).catch(noteSwallowedAs('firestore_leaderboard:promise_3', false));
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
  const stableId = await withTimeout(nameIdentityReadyPromise, timeoutMs, 'name_identity_ready').catch(noteSwallowedAs('firestore_leaderboard:promise_4', null));
  if (stableId) rememberNameReservationIdentity(stableId);
  return stableId;
}

// зачем (координатор 18.10): 'rate_limited' — сервер отказал по лимиту 300 смен ника в час (защита от скрипта); клиент оставляет прежнее имя.
export type ReserveNameStatus = 'ok' | 'taken' | 'cooldown' | 'rate_limited' | 'error';
export type ReserveNameResult = {
  status: ReserveNameStatus;
  nextChangeAt?: number;
};
export type GeneratedNicknameResult = {
  status: 'ok' | 'error';
  name?: string;
  stableId?: string;
};
export type ReserveNameOptions = {
  source?: 'onboarding' | 'settings';
};
export type NameAvailabilityStatus = 'available' | 'taken' | 'error';
export type NameAvailabilityResult = {
  status: NameAvailabilityStatus;
};

/**
 * зачем (владелец 18.10 «ввёл имя — НЕ СОХРАНИЛОСЬ», координатор: СПЕРВА ЛОГИ): проверка и бронь ника отдавали голое 'error'
 * без причины — по журналу нельзя было понять, что упало: нет личности (не вошёл / гость), не поднялся auth, связка stableId,
 * таймаут или отказ сервера. Каждая ветка теперь пишет шаг, значения и время. Имя не пишем (PII) — только длину.
 */
function nickLog(tag: 'NICK-CHECK' | 'NICK-SAVE', step: string, fields: Record<string, unknown> = {}, failure = false): void {
  const line = `[${tag}] ${step} ${JSON.stringify(fields)}`;
  if (failure) DebugLogger.warn(`firestore_leaderboard:${tag}`, line);
  else console.log(line); // guard-ok: одна строка на шаг проверки/брони ника
}

function nickIdentitySnapshot(): Record<string, unknown> {
  return { authUid: getAuthUserId() ? 'есть' : 'нет', cachedIdentity: readCachedNameReservationIdentity() ? 'есть' : 'нет', cloud: CLOUD_SYNC_ENABLED, expoGo: IS_EXPO_GO };
}

function nickErrorFields(e: unknown): Record<string, unknown> {
  const err = e as { code?: unknown; message?: unknown } | null;
  return { code: String(err?.code ?? ''), message: String(err?.message ?? e).slice(0, 160) };
}

export function normalizeNameIndexKey(name: string): string {
  return String(name ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

// ── Атомарно зарезервировать ник через транзакцию ───────────────────────────
// Возвращает 'ok' | 'taken' | 'error'
// oldName — прежний ник пользователя (для освобождения старого слота)
export async function reserveNameDetailed(
  name: string,
  oldName: string,
  options: ReserveNameOptions = {},
): Promise<ReserveNameResult> {
  const startedAt = Date.now();
  const base = { len: name.trim().length, oldLen: oldName.trim().length, source: options.source ?? 'none' };
  nickLog('NICK-SAVE', 'reserve:in', { ...base, ...nickIdentitySnapshot() });
  if (!CLOUD_SYNC_ENABLED) {
    nickLog('NICK-SAVE', 'reserve:out ok reason=cloud_off (локально, без сервера)', base);
    return { status: 'ok' };
  }
  // На холодном старте signInAnonymously может занять >8с (GMS init, slow network).
  // Ждём токен явно перед вызовом CF — иначе callable уходит без auth → 401 →
  // юзер видит ложное «проверь интернет». Таймаут не даёт зависнуть навсегда.
  let stableId = readCachedNameReservationIdentity() || await ensureNameReservationIdentityReady(NAME_RESERVE_TIMEOUT_MS);
  if (!stableId) {
    const authReady = await waitForAnonAuth(NAME_RESERVE_RETRY_TIMEOUT_MS);
    nickLog('NICK-SAVE', 'reserve:identity_retry', { ...base, authReady, ms: Date.now() - startedAt, ...nickIdentitySnapshot() });
    stableId = authReady
      ? readCachedNameReservationIdentity() || await ensureNameReservationIdentityReady(NAME_RESERVE_RETRY_TIMEOUT_MS)
      : null;
  }
  if (!stableId) {
    nickLog('NICK-SAVE', 'reserve:out error reason=no_identity (нет stableId или связки auth)', { ...base, ms: Date.now() - startedAt, ...nickIdentitySnapshot() }, true);
    return { status: 'error' };
  }
  try {
    const fn = callable<{ stableId?: string; name: string; oldName: string; source?: ReserveNameOptions['source'] }, { ok: boolean; status: ReserveNameStatus; nextChangeAt?: number }>('nameReserve');
    const { data } = await withTimeout(
      fn({ stableId, name: name.trim(), oldName: oldName.trim(), source: options.source }),
      NAME_RESERVE_TIMEOUT_MS,
      'name_reserve',
    );
    rememberNameReservationIdentity(stableId);
    nickLog('NICK-SAVE', `reserve:out server status=${data.status}`, { ...base, ok: data.ok, ms: Date.now() - startedAt });
    if (data.status === 'taken') return { status: 'taken' };
    if (data.status === 'cooldown') return { status: 'cooldown', nextChangeAt: data.nextChangeAt };
    if (data.status === 'rate_limited') return { status: 'rate_limited', nextChangeAt: data.nextChangeAt };
    return { status: 'ok', nextChangeAt: data.nextChangeAt };
  } catch (e: any) {
    nickLog('NICK-SAVE', 'reserve:call_failed', { ...base, ...nickErrorFields(e), ms: Date.now() - startedAt }, true);
    if (String(e?.message ?? '').includes('name_taken') || String(e?.code ?? '').includes('already-exists')) return { status: 'taken' };
    const errCode = String(e?.code ?? '');
    const errMsg = String(e?.message ?? '');
    const isAuthError = errCode.includes('unauthenticated') || errMsg.includes('auth_required');
    // CF returns failed-precondition/stable_id_required when users/{stableId} doc
    // doesn't exist yet (first install, ensureStableAuthLinkForStableId was still in flight).
    const isIdentityError = errCode.includes('failed-precondition') || errMsg.includes('stable_id_required');
    if (isAuthError || isIdentityError) {
      const authReady = await waitForAnonAuth(NAME_RESERVE_RETRY_TIMEOUT_MS);
      if (!authReady) {
        nickLog('NICK-SAVE', 'reserve:out error reason=auth_not_ready_after_retry', { ...base, isAuthError, isIdentityError, ms: Date.now() - startedAt }, true);
        return { status: 'error' };
      }
      try {
        const stableId = await ensureNameReservationIdentityReady(NAME_RESERVE_RETRY_TIMEOUT_MS);
        if (!stableId) {
          nickLog('NICK-SAVE', 'reserve:out error reason=no_identity_after_retry', { ...base, ms: Date.now() - startedAt, ...nickIdentitySnapshot() }, true);
          return { status: 'error' };
        }
        // stableId is returned only after the auth link is ready.
        const fn = callable<{ stableId?: string; name: string; oldName: string; source?: ReserveNameOptions['source'] }, { ok: boolean; status: ReserveNameStatus; nextChangeAt?: number }>('nameReserve');
        const { data } = await withTimeout(
          fn({ stableId, name: name.trim(), oldName: oldName.trim(), source: options.source }),
          NAME_RESERVE_RETRY_TIMEOUT_MS,
          'name_reserve',
        );
        rememberNameReservationIdentity(stableId);
        nickLog('NICK-SAVE', `reserve:out server_retry status=${data.status}`, { ...base, ms: Date.now() - startedAt });
        if (data.status === 'taken') return { status: 'taken' };
        if (data.status === 'cooldown') return { status: 'cooldown', nextChangeAt: data.nextChangeAt };
        if (data.status === 'rate_limited') return { status: 'rate_limited', nextChangeAt: data.nextChangeAt };
        return { status: 'ok', nextChangeAt: data.nextChangeAt };
      } catch (retryError) {
        nickLog('NICK-SAVE', 'reserve:out error reason=retry_call_failed', { ...base, ...nickErrorFields(retryError), ms: Date.now() - startedAt }, true);
        return { status: 'error' };
      }
    }
    nickLog('NICK-SAVE', 'reserve:out error reason=call_failed_not_auth', { ...base, ...nickErrorFields(e), ms: Date.now() - startedAt }, true);
    return { status: 'error' };
  }
}

/**
 * @param baseName имя из аккаунта (Apple/Google), если известно. Сервер сделает из него
 *   ник «Имя N» с порядковым номером; без него — случайное «Слово 12345».
 */
export async function generateAndReserveNickname(baseName?: string | null): Promise<GeneratedNicknameResult> {
  if (!CLOUD_SYNC_ENABLED) return { status: 'error' };
  let stableId = readCachedNameReservationIdentity() || await ensureNameReservationIdentityReady(NAME_RESERVE_TIMEOUT_MS);
  if (!stableId) {
    const authReady = await waitForAnonAuth(NAME_RESERVE_RETRY_TIMEOUT_MS);
    stableId = authReady ? await ensureNameReservationIdentityReady(NAME_RESERVE_RETRY_TIMEOUT_MS) : null;
  }
  if (!stableId) return { status: 'error' };
  try {
    const fn = callable<{ stableId?: string; baseName?: string }, { ok: boolean; status: 'ok'; name: string }>('nameGenerateAndReserve');
    const trimmedBase = String(baseName ?? '').trim();
    const { data } = await withTimeout(
      fn(trimmedBase ? { stableId, baseName: trimmedBase } : { stableId }),
      NAME_RESERVE_RETRY_TIMEOUT_MS,
      'name_generate_and_reserve',
    );
    const name = String(data.name ?? '').trim();
    if (!data.ok || data.status !== 'ok' || name.length < 2) return { status: 'error' };
    rememberNameReservationIdentity(stableId);
    return { status: 'ok', name, stableId };
  } catch {
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
  void ensureNameReservationIdentityReady(NAME_RESERVE_TIMEOUT_MS).catch(noteSwallowedAs('firestore_leaderboard:promise_5', null));
}

async function runNameAvailabilityCheck(name: string, readyStableId?: string): Promise<NameAvailabilityResult> {
  const stableId = readyStableId || readCachedNameReservationIdentity() || await ensureNameCallableAuthReady(NAME_CHECK_IDENTITY_TIMEOUT_MS);
  if (!stableId) return { status: 'error' };
  const fn = callable<{ stableId?: string; name: string }, { ok: boolean; available: boolean }>('nameCheckAvailability');
  const { data } = await fn({ stableId, name: name.trim() });
  rememberNameReservationIdentity(stableId);
  return { status: data.available === false ? 'taken' : 'available' };
}

export async function checkNameAvailabilityDetailed(name: string): Promise<NameAvailabilityResult> {
  const startedAt = Date.now();
  const base = { len: name.trim().length };
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
    nickLog('NICK-CHECK', 'check:out available reason=cloud_off', { ...base, ...nickIdentitySnapshot() });
    return { status: 'available' };
  }
  const identityPromise = ensureNameReservationIdentityReady(NAME_CHECK_IDENTITY_TIMEOUT_MS);
  const authPromise = ensureNameCallableAuthReady(NAME_CHECK_IDENTITY_TIMEOUT_MS);
  let stableId = readCachedNameReservationIdentity() || await authPromise;
  if (!stableId) stableId = await identityPromise;
  if (!stableId) {
    // зачем: именно эта ветка давала «Проверим при сохранении» — человек не вошёл / auth не поднялся.
    nickLog('NICK-CHECK', 'check:out error reason=no_identity', { ...base, ms: Date.now() - startedAt, ...nickIdentitySnapshot() }, true);
    return { status: 'error' };
  }
  try {
    const result = await withTimeout(
      runNameAvailabilityCheck(name, stableId),
      NAME_CHECK_TIMEOUT_MS,
      'name_check',
    );
    nickLog('NICK-CHECK', `check:out server status=${result.status}`, { ...base, ms: Date.now() - startedAt });
    return result;
  } catch (e: any) {
    if (String(e?.message ?? '').includes('name_taken') || String(e?.code ?? '').includes('already-exists')) {
      nickLog('NICK-CHECK', 'check:out taken reason=error_name_taken', { ...base, ms: Date.now() - startedAt });
      return { status: 'taken' };
    }
    nickLog('NICK-CHECK', 'check:out error reason=call_failed', { ...base, ...nickErrorFields(e), ms: Date.now() - startedAt }, true);
    return { status: 'error' };
  }
}

// ── Проверить уникальность ника (без резервации, только read-only) ───────────
// Используется для валидации перед показом ошибки. Основная блокировка — reserveName.
export async function isNameAvailable(name: string): Promise<boolean> {
  return (await checkNameAvailabilityDetailed(name)).status !== 'taken';
}

// ── Освободить ник в name_index (вызывается при удалении аккаунта) ───────────
// Без этого следующий онбординг с тем же ником получит 'taken', т.к. документ
// name_index/{nameLower} остаётся с привязкой к старому uid даже после удаления
// users/{uid} и leaderboard/{uid}.
//
// Источники имени (в порядке приоритета):
//   1. leaderboard/{uid}.nameLower — самый достоверный, всегда нормализован.
//   2. AsyncStorage.user_name — если юзер прошёл онбординг, но ещё не получил legacy reward.
//
// ВАЖНО: вызывать ДО deleteCloudData — иначе оба
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
      if (localName && localName.trim()) candidates.add(normalizeNameIndexKey(localName));
    } catch (e) {
      DebugLogger.error('firestore_leaderboard:localName', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

    await ensureStableAuthLinkForStableId(canonicalUid).catch(noteSwallowedAs('firestore_leaderboard:promise_7', false));
    const fn = callable<{ stableId?: string; names: string[] }, { ok: boolean; deleted: number }>('nameReleaseMine');
    await fn({ stableId: canonicalUid, names: Array.from(candidates) });
  } catch (e) {
      DebugLogger.error('firestore_leaderboard:fn', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
