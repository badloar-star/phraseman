import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { generateRandomCode, isValidFriendCode, isValidInviteCodeLookup, normalizeInviteCodeInput } from './friend_code';
import { getCanonicalUserId } from './user_id_policy';
import { getStableId } from './stable_id';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

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
  } catch {
    /* ignore */
  }
  return null;
}

async function saveOwnerScopedStoredCode(owner: string, code: string): Promise<void> {
  try {
    const c = code.trim().toUpperCase();
    if (!isValidInviteCodeLookup(c)) return;
    const rec: FriendCodeOwnerRecord = { ownerStableId: owner, code: c };
    await AsyncStorage.setItem(FRIEND_CODE_OWNER_JSON_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
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
export const FRIEND_NAME_LOOKUP_AUTH_MS = 1_200;
export const FRIEND_NAME_LOOKUP_LINK_MS = 1_200;
export const FRIEND_NAME_LOOKUP_CALLABLE_MS = 2_500;

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
  } catch {
    /* ignore */
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
        } catch {
          // Re-registration failed (network / claimed by someone else) — trust cache, try next time.
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
  const normalized = normalizeInviteCodeInput(code);
  if (!isValidInviteCodeLookup(normalized)) return null;

  const db = getFirestore();
  if (!db) return null;

  // friend_code_index is readable only to authenticated clients.
  // Wait for anonymous auth here so every caller has the same cold-start behavior.
  const authUid = await ensureAnonUser();
  if (!authUid) return null;

  const indexSnap = await db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(normalized).get();
  if (indexSnap.exists) {
    const uid = indexSnap.data?.()?.uid as string | undefined;
    if (uid) {
      if (!(await isUidBannedBestEffort(db, uid))) return { uid, source: 'friend_code_index' };
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
    if (uid) {
      if (!(await isUidBannedBestEffort(db, uid))) return { uid, source: 'legacy_friend_code' };
    }
  } catch {
    /* Best-effort legacy lookup for old users whose friend_code_index was never backfilled. */
  }

  // Реферальный код как код друга. Пользователю на виду именно РЕФЕРАЛЬНЫЙ код (кнопки
  // «Пригласить», карточка «Твой код для друзей» на /referrals, share-ссылка), а friend-код
  // почти не показывается — поэтому люди вводят в поиск реферальный и раньше получали
  // «код не найден» (поиск смотрел только friend_code_index). referral_codes/{code} →
  // { ownerStableId } читаем auth-клиентом (firestore.rules:986). ownerStableId — это тот
  // же users/{uid}. Так любой из двух кодов юзера ведёт к нему же.
  try {
    const refSnap = await db.collection(REFERRAL_CODE_INDEX_COLLECTION).doc(normalized).get();
    if (refSnap.exists) {
      const uid = (refSnap.data?.()?.ownerStableId as string | undefined)?.trim();
      if (uid) {
        if (!(await isUidBannedBestEffort(db, uid))) return { uid, source: 'referral_code' };
      }
    }
  } catch {
    /* Best-effort: referral_codes может быть недоступен (правила/сеть) — не роняем поиск. */
  }

  return null;
}

export async function lookupUserByNickname(query: string): Promise<InviteCodeLookupResult | null> {
  const normalized = String(query ?? '').normalize('NFKC').trim().replace(/^@+/, '').replace(/\s+/g, ' ').trim();
  if (normalized.length < 2 || normalized.length > 32) return null;
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;

  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  const authReady = await withTimeout(ensureAnonUser(), FRIEND_NAME_LOOKUP_AUTH_MS);
  if (!authReady) return null;
  await withTimeout(ensureStableAuthLinkForStableId(stableId), FRIEND_NAME_LOOKUP_LINK_MS);

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
    const res = await withTimeout(fn({ stableId, query: normalized }), FRIEND_NAME_LOOKUP_CALLABLE_MS);
    const data = res?.data;
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
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
