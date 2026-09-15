import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { generateRandomCode, isValidFriendCode, isValidInviteCodeLookup, normalizeInviteCodeInput } from './friend_code';
import { getCanonicalUserId } from './user_id_policy';
import { getStableId } from './stable_id';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { DebugLogger } from './debug-logger';

/** Устаревший глобальный ключ — без привязки к stableId; мигрируем в v2 при чтении. */
const FRIEND_CODE_LEGACY_KEY = 'friend_code_local_v1';
/** JSON { ownerStableId, code } — код друга только для текущего владельца устройства. */
const FRIEND_CODE_OWNER_JSON_KEY = 'friend_code_owner_v2';

type FriendCodeOwnerRecord = { ownerStableId: string; code: string };

/** Тот же идентификатор, что и `users/{id}` в облаке (canonical / stable). */
async function resolveOwnerForFriendCodeCache(): Promise<string> {
  if (CLOUD_SYNC_ENABLED) {
    const canon = await getCanonicalUserId();
    if (typeof canon === 'string' && canon.length > 0) return canon;
  }
  return getStableId();
}

async function loadOwnerScopedStoredCode(owner: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(FRIEND_CODE_OWNER_JSON_KEY);
    if (raw) {
      const j = JSON.parse(raw) as FriendCodeOwnerRecord;
      if (
        j &&
        j.ownerStableId === owner &&
        typeof j.code === 'string' &&
        isValidInviteCodeLookup(j.code.trim().toUpperCase())
      ) {
        return j.code.trim().toUpperCase();
      }
    }
    const legacy = await AsyncStorage.getItem(FRIEND_CODE_LEGACY_KEY);
    if (legacy && isValidFriendCode(legacy)) {
      const c = legacy.trim().toUpperCase();
      await saveOwnerScopedStoredCode(owner, c);
      return c;
    }
  } catch (e) {
      // ignore
      DebugLogger.error('firestore_friends:c', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return null;
}

async function saveOwnerScopedStoredCode(owner: string, code: string): Promise<void> {
  try {
    const c = code.trim().toUpperCase();
    if (!isValidInviteCodeLookup(c)) return;
    const rec: FriendCodeOwnerRecord = { ownerStableId: owner, code: c };
    await AsyncStorage.setItem(FRIEND_CODE_OWNER_JSON_KEY, JSON.stringify(rec));
  } catch (e) {
      // ignore
      DebugLogger.error('firestore_friends:c', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/** @deprecated Не подставлять в UI до `ensureMyInviteCodeForFriends` — избегаем мигания чужим/старым кодом. */
export function peekMemoryInviteCodeForFriends(): string | null {
  return null;
}

/** Firestore collection name for code → uid reverse index. Indexed by code (doc id). */
export const FRIEND_CODE_INDEX_COLLECTION = 'friend_code_index';

export type InviteCodeLookupSource = 'friend_code_index' | 'legacy_friend_code' | 'name_index' | 'referral_code';
/** Публичный профиль, который сервер возвращает сразу при поиске по нику (из users.progress). */
export type LookupUserProfile = {
  name?: string;
  totalXp?: number;
  level?: number;
  avatar?: string;
  frame?: string;
  aura?: string;
  isPremium?: boolean;
};
export type InviteCodeLookupResult = {
  uid: string;
  source: InviteCodeLookupSource;
  name?: string;
  profile?: LookupUserProfile;
};

/**
 * Firestore: referral_codes/{code} → { ownerStableId }. Читаема auth-клиентом (firestore.rules).
 * Поиск друга ПРИНИМАЕТ и реферальный код: пользователю на виду именно он (кнопки «Пригласить»,
 * карточка «Твой код для друзей» на /referrals, share-ссылка), а friend-код почти не показывается.
 * Люди логично вводят тот код, что видят. friend-код и реферальный оба ведут к одному владельцу.
 */
export const REFERRAL_CODE_INDEX_COLLECTION = 'referral_codes';

/** Maximum collision retries before throwing. With 31^6 codespace this is astronomically safe. */
const FUNCTIONS_REGION = 'us-central1';
// friendLookupUser has a 15 s server budget and may need a cold start plus the
// legacy-name compatibility queries. The former 2.5 s client cutoff converted valid
// late responses into a false "not found" result.
export const FRIEND_NAME_LOOKUP_CALLABLE_MS = 12_000;
const FRIEND_NAME_LOOKUP_ATTEMPTS = 2;

function friendLookupUnavailable(cause?: unknown): Error {
  const error = new Error('friend_lookup_unavailable') as Error & { cause?: unknown };
  error.name = 'FriendLookupUnavailableError';
  error.cause = cause;
  return error;
}

/**
 * Подробная трассировка поиска друга ([FRIEND-SEARCH]) — только в dev.
 *
 * зачем: разбор прод-алерта «friends:search_failed / firestore unavailable» требует
 * видеть ВЕСЬ ход поиска (какая ветка, что вернула сеть, сколько заняла). В проде
 * такой поток шумит, поэтому подробности держим за флагом, а `console.warn` в catch
 * остаются постоянными — именно их отсутствие и рождает немые баги.
 *
 * Читаем через globalThis: голая ссылка на __DEV__ падает в jest (память
 * project_dev_guard_bare_dev_global_jest).
 */
const FRIEND_SEARCH_TRACE = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

/** Не даём облачному пути зависнуть навечно (в UI тогда «Генерируем код…» без счётчика ошибок). */
const FRIEND_CODE_CLOUD_TOTAL_MS = 38_000;
const FRIEND_CODE_ENSURE_UID_MS = 16_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(undefined);
      }
    }, ms);
    promise
      .then((v) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(undefined);
      });
  });
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

type CallableOptions = { timeout?: number };

function callable<TReq, TRes>(name: string, options?: CallableOptions) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const typedHttpsCallable = httpsCallable as <Req, Res>(
    functionsInstance: unknown,
    callableName: string,
    callableOptions?: CallableOptions,
  ) => (data: Req) => Promise<{ data: Res }>;
  return typedHttpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name, options);
}

/**
 * Ensure the current user has a unique friend code stored in
 * users/{canonicalUid}.progress.friend_code.
 *
 * Idempotent: if a code already exists, returns it without any write.
 * Generates a new code with transactional collision check on
 * friend_code_index/{CODE} (doc id == code), retries on collision up to
 * MAX_COLLISION_RETRIES times.
 *
 * Returns null when Firestore есть, но нет UID после авторизации, сбой записи/чтения
 * без кеша, или исчерпаны попытки транзакции. Если Firestore недоступен (Expo Go,
 * отключён облачный синк, нет нативного модуля) — выдаётся локальный код в кеш:
 * его можно показать и скопировать, но поиск друга по коду в облаке не сработает.
 */

/**
 * Код из кеша устройства — без сети и без «генерации» в UI.
 * Только если JSON v2 совпадает с текущим owner; иначе пусто и рефералок.
 */
export async function readCachedMyInviteCodeForFriends(): Promise<string | null> {
  try {
    const owner = await resolveOwnerForFriendCodeCache();
    const local = await loadOwnerScopedStoredCode(owner);
    if (local) return local;
  } catch (e) {
      // ignore
      DebugLogger.error('firestore_friends:local', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return null;
}

/**
 * FRIEND-код для экрана «Друзья» (добавление в друзья по коду / поиск). Это НЕ реферальный код:
 * friend-код живёт в friend_code_index, а реферальный — в referral_codes (functions/src/referral.ts).
 * Для «Пригласить ради 7 дней» используйте generateReferralCode/getReferralCode (referral_system.ts),
 * иначе друг введёт friend-код, которого нет в referral_codes, и получит «код не найден».
 */
export async function ensureMyInviteCodeForFriends(_displayNameForReferralDefault: string): Promise<string | null> {
  return ensureMyFriendCode();
}

export async function ensureMyFriendCode(): Promise<string | null> {
  const owner = await resolveOwnerForFriendCodeCache();
  const cached = await loadOwnerScopedStoredCode(owner);

  const db = getFirestore();
  if (!db) {
    if (cached && isValidFriendCode(cached)) return cached;
    const code = generateRandomCode();
    await saveOwnerScopedStoredCode(owner, code);
    return code;
  }

  // If we have a cached code, validate it still belongs to this uid in Firestore.
  // This catches the case where the uid changed (reinstall/migration) but the local
  // cache still holds the old code whose index entry points to the previous uid.
  if (cached && isValidFriendCode(cached)) {
    try {
      const uid = await withTimeout(ensureAnonUser(), FRIEND_CODE_ENSURE_UID_MS);
      if (uid) {
        const c = cached.trim().toUpperCase();
        const indexSnap = await db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(c).get();
        const indexUid = indexSnap.exists ? (indexSnap.data?.()?.uid as string | undefined) : undefined;
        if (indexUid === uid) return cached;
        // Index points to different uid (uid migration after reinstall) — re-register
        // the SAME code under current uid. One code per stable_id, forever.
        try {
          await callFriendEnsureMyCode(uid);
          await saveOwnerScopedStoredCode(owner, c);
        } catch (e) {
      // Re-registration failed (network / claimed by someone else) — trust cache, try next time.
      DebugLogger.error('firestore_friends:indexUid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        return cached;
      } else {
        // Auth not ready — trust cache for now.
        return cached;
      }
    } catch {
      // Network error — trust cache.
      return cached;
    }
  }

  const cloudCode = await withTimeout(resolveCloudFriendCode(db, owner), FRIEND_CODE_CLOUD_TOTAL_MS);
  return typeof cloudCode === 'string' ? cloudCode : null;
}

async function resolveCloudFriendCode(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  cacheOwner: string,
): Promise<string | null> {
  return resolveCloudFriendCodeViaCallable(db, cacheOwner);
}

async function resolveCloudFriendCodeViaCallable(
  _db: NonNullable<ReturnType<typeof getFirestore>>,
  cacheOwner: string,
): Promise<string | null> {
  const uid = await withTimeout(ensureAnonUser(), FRIEND_CODE_ENSURE_UID_MS);
  if (!uid) return null;
  try {
    const code = await callFriendEnsureMyCode(uid);
    await saveOwnerScopedStoredCode(cacheOwner, code);
    return code;
  } catch {
    return null;
  }
}

async function callFriendEnsureMyCode(stableId: string): Promise<string> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ stableId: string }, { code: string }>('friendEnsureMyCode');
  const { data } = await fn({ stableId });
  const code = normalizeInviteCodeInput(data?.code);
  if (!isValidFriendCode(code)) throw new Error('INVALID_FRIEND_CODE');
  return code;
}

/**
 * Один тихий повтор для ИДЕМПОТЕНТНОГО чтения Firestore.
 *
 * зачем: [firestore/unavailable] — по формулировке самого SDK «transient condition
 * and may be corrected by retrying with a backoff». Прод-алерт 15.09.2026 показал,
 * что один такой сбой убивал весь поиск друга, хотя повтор через секунду прошёл бы.
 * Чтение ничего не списывает и не пишет, поэтому повтор безвреден по определению.
 *
 * Ровно ОДИН повтор, а не цикл: второй подряд отказ — это уже не «моргнула сеть»,
 * а реальная недоступность, и тянуть ожидание пользователя дальше нельзя.
 * Порог повтора переиспользует isDefinitelyNotStarted() — общий на проект список
 * признаков «сервер гарантированно не начал работу».
 */
const FIRESTORE_READ_RETRY_DELAY_MS = 900;

/**
 * Минимальная форма снапшота документа, которой пользуется поиск.
 *
 * зачем: getFirestore() приходит из require() и не типизирован, поэтому вывод типа
 * через generic давал `unknown` и ломал сборку под ts-jest (проектный tsc это
 * пропускал — расхождение строгости). Явная форма убирает и то и другое.
 */
type FriendDocSnapshot = {
  exists: boolean;
  data?: () => Record<string, unknown> | undefined;
};

/**
 * Признак транзиентного сбоя транспорта: сервер гарантированно не начал работу.
 *
 * зачем: держим локальной чистой функцией, а не тянем через `await import()` из
 * ai_callable_resilience — динамический импорт в этом модуле подтягивал бы
 * незамоканную цепочку в тестах и добавлял работу в рантайме на каждом сбое.
 * Список признаков намеренно совпадает с isDefinitelyNotStarted() там.
 */
export function isTransientFirestoreRead(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  const text = `${code} ${message}`;
  if (text.includes('unavailable')) return true;
  if (text.includes('network request failed')) return true;
  if (text.includes('econnreset') || text.includes('etimedout')) return true;
  if (text.includes('deadline-exceeded')) return true;
  return false;
}

async function withFirestoreReadRetry<T>(read: () => Promise<T>, label: string): Promise<T> {
  try {
    return await read();
  } catch (e) {
    if (!isTransientFirestoreRead(e)) throw e;
    console.warn('[FRIEND-SEARCH] firestore_read:transient_retry', {
      label,
      code: (e as { code?: unknown })?.code,
      message: e instanceof Error ? e.message : String(e),
    });
    await new Promise((resolve) => { setTimeout(resolve, FIRESTORE_READ_RETRY_DELAY_MS); });
    return read();
  }
}

async function isUidBannedBestEffort(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  uid: string,
): Promise<boolean> {
  try {
    const banSnap = await db.collection('banned_users').doc(uid).get();
    return banSnap.exists;
  } catch {
    return false;
  }
}

/**
 * Look up another user by friend code. Returns { uid } on hit, null on miss
 * (either: code missing from index, or target user is in banned_users/{uid}).
 * Banned-user filter is silent per FRIEND-07 (UI shows generic "Code not found").
 *
 * Performs client-side validation via isValidFriendCode() before any
 * network call (cheap fail-fast on garbage input).
 */
export async function lookupUserByFriendCode(code: string): Promise<InviteCodeLookupResult | null> {
  const t0 = Date.now();
  const normalized = normalizeInviteCodeInput(code);
  if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:start', { len: normalized.length });
  if (!isValidInviteCodeLookup(normalized)) {
    if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:exit reason=invalid_code_format', { normalized });
    return null;
  }

  const db = getFirestore();
  if (!db) {
    if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:exit reason=no_firestore_instance');
    return null;
  }

  // friend_code_index is readable only to authenticated clients.
  // Wait for anonymous auth here so every caller has the same cold-start behavior.
  const authUid = await ensureAnonUser();
  if (!authUid) {
    if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:exit reason=no_auth_uid', { ms: Date.now() - t0 });
    return null;
  }

  // зачем: этот .get() был ЕДИНСТВЕННЫМ сетевым чтением поиска без try/catch —
  // транзиентный [firestore/unavailable] (алерт 15.09.2026, OnePlus8Pro) улетал
  // наверх и гасил ВЕСЬ поиск, хотя ниже ещё два рабочих пути (legacy + referral).
  // Чтение идемпотентно, поэтому тихий повтор безопасен и пользователь сбоя не видит.
  let indexSnap: FriendDocSnapshot | null = null;
  try {
    indexSnap = await withFirestoreReadRetry<FriendDocSnapshot>(
      () => db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(normalized).get(),
      'friend_code_index',
    );
  } catch (e) {
    // Индекс недоступен — НЕ роняем поиск: ниже legacy-запрос и referral_codes.
    console.warn('[FRIEND-SEARCH] lookupByCode:index_read_failed', {
      code: (e as { code?: unknown })?.code,
      message: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
    });
    DebugLogger.error('firestore_friends:index', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
  if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:index_read_done', {
    exists: indexSnap?.exists ?? 'read_failed',
    ms: Date.now() - t0,
  });
  if (indexSnap?.exists) {
    const uid = indexSnap.data?.()?.uid as string | undefined;
    if (uid) {
      if (!(await isUidBannedBestEffort(db, uid))) {
        if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:hit source=friend_code_index', { ms: Date.now() - t0 });
        return { uid, source: 'friend_code_index' };
      }
      if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:skip reason=banned source=friend_code_index');
    }
  }

  try {
    const legacySnap = await db
      .collection('users')
      .where('progress.friend_code', '==', normalized)
      .limit(1)
      .get();
    const doc = legacySnap.docs?.[0];
    const uid = doc?.id as string | undefined;
    if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:legacy_read_done', { found: !!uid, ms: Date.now() - t0 });
    if (uid) {
      if (!(await isUidBannedBestEffort(db, uid))) {
        if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:hit source=legacy_friend_code', { ms: Date.now() - t0 });
        return { uid, source: 'legacy_friend_code' };
      }
      if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:skip reason=banned source=legacy_friend_code');
    }
  } catch (e) {
      // Best-effort legacy lookup for old users whose friend_code_index was never backfilled.
      console.warn('[FRIEND-SEARCH] lookupByCode:legacy_read_failed', {
        code: (e as { code?: unknown })?.code,
        message: e instanceof Error ? e.message : String(e),
        ms: Date.now() - t0,
      });
      DebugLogger.error('firestore_friends:uid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  // Реферальный код как код друга. Пользователю на виду именно РЕФЕРАЛЬНЫЙ код (кнопки
  // «Пригласить», карточка «Твой код для друзей» на /referrals, share-ссылка), а friend-код
  // почти не показывается — поэтому люди вводят в поиск реферальный и раньше получали
  // «код не найден» (поиск смотрел только friend_code_index). referral_codes/{code} →
  // { ownerStableId } читаем auth-клиентом (firestore.rules:986). ownerStableId — это тот
  // же users/{uid}. Так любой из двух кодов юзера ведёт к нему же.
  try {
    const refSnap = await withFirestoreReadRetry<FriendDocSnapshot>(
      () => db.collection(REFERRAL_CODE_INDEX_COLLECTION).doc(normalized).get(),
      'referral_codes',
    );
    if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:referral_read_done', { exists: refSnap.exists, ms: Date.now() - t0 });
    if (refSnap.exists) {
      const uid = (refSnap.data?.()?.ownerStableId as string | undefined)?.trim();
      if (uid) {
        if (!(await isUidBannedBestEffort(db, uid))) {
          if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:hit source=referral_code', { ms: Date.now() - t0 });
          return { uid, source: 'referral_code' };
        }
        if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:skip reason=banned source=referral_code');
      }
    }
  } catch (e) {
      // Best-effort: referral_codes может быть недоступен (правила/сеть) — не роняем поиск.
      console.warn('[FRIEND-SEARCH] lookupByCode:referral_read_failed', {
        code: (e as { code?: unknown })?.code,
        message: e instanceof Error ? e.message : String(e),
        ms: Date.now() - t0,
      });
      DebugLogger.error('firestore_friends:uid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  if (FRIEND_SEARCH_TRACE) console.log('[FRIEND-SEARCH] lookupByCode:miss all_sources_exhausted', { ms: Date.now() - t0 });
  return null;
}

export async function lookupUserByNickname(query: string): Promise<InviteCodeLookupResult | null> {
  const normalized = String(query ?? '').normalize('NFKC').trim().replace(/^@+/, '').replace(/\s+/g, ' ').trim();
  if (normalized.length < 2 || normalized.length > 32) return null;
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) throw friendLookupUnavailable();

  // ensureAnonUser already owns the bounded Firebase-auth bootstrap (20 s). A
  // shorter wrapper here used to abort a valid first launch after 1.2 s.
  const stableId = await ensureAnonUser();
  if (!stableId) throw friendLookupUnavailable();

  try {
    const fn = callable<
      { stableId?: string; query: string },
      {
        ok: boolean;
        user: {
          uid: string;
          source?: 'name_index';
          name?: string;
          totalXp?: number;
          level?: number;
          avatar?: string;
          frame?: string;
          aura?: string;
          isPremium?: boolean;
        } | null;
      }
    >('friendLookupUser', { timeout: FRIEND_NAME_LOOKUP_CALLABLE_MS });
    for (let attempt = 0; attempt < FRIEND_NAME_LOOKUP_ATTEMPTS; attempt += 1) {
      // A scale-to-zero cold start can fail the transport once even though the
      // authenticated read is valid. Retry inside the same user action so the
      // user does not have to press Search a second time.
      // eslint-disable-next-line no-await-in-loop
      const res = await withTimeout(fn({ stableId, query: normalized }), FRIEND_NAME_LOOKUP_CALLABLE_MS);
      if (!res) continue;
      const data = res.data;
      const u = data?.user;
      const uid = u?.uid;
      const name = typeof u?.name === 'string'
        ? u.name.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 40).trim()
        : '';
      if (typeof uid !== 'string' || !uid.trim()) return null;
      // Сервер вернул полный профиль из users.progress — прокидываем в UI, чтобы карточка
      // показала имя/уровень/аватар без догрузки из leaderboard (у многих его нет).
      const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
      const strf = (v: unknown, max: number): string =>
        typeof v === 'string' ? v.normalize('NFKC').trim().slice(0, max) : '';
      const profile: LookupUserProfile = {
        ...(name ? { name } : {}),
        totalXp: num(u?.totalXp),
        level: num(u?.level),
        avatar: strf(u?.avatar, 64),
        frame: strf(u?.frame, 64),
        aura: strf(u?.aura, 64),
        isPremium: u?.isPremium === true,
      };
      return { uid: uid.trim(), source: 'name_index', ...(name ? { name } : {}), profile };
    }
    throw friendLookupUnavailable();
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'friend_lookup_unavailable') throw cause;
    throw friendLookupUnavailable(cause);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
