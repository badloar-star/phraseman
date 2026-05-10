import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { generateRandomCode, isValidFriendCode, isValidInviteCodeLookup, normalizeInviteCodeInput } from './friend_code';
import { isReferralCloudEnabled } from './referral_flags';
import { getCanonicalUserId } from './user_id_policy';
import { getStableId } from './stable_id';

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

/** Maximum collision retries before throwing. With 31^6 codespace this is astronomically safe. */
const MAX_COLLISION_RETRIES = 10;

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
  if (isReferralCloudEnabled()) {
    try {
      const { getReferralCode } = await import('./referral_system');
      const ref = await getReferralCode();
      const t = (ref ?? '').trim().toUpperCase();
      if (t.length === 6 && isValidInviteCodeLookup(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Код для экрана «Друзья»: тот же 6-символьный, что и реферальный (если облако + аккаунт привязан),
 * иначе — legacy friend_code / локальная генерация (как ensureMyFriendCode).
 *
 * referral_system подгружается лениво, чтобы тесты без Firebase могли импортировать этот файл.
 */
export async function ensureMyInviteCodeForFriends(displayNameForReferralFallback: string): Promise<string | null> {
  const owner = await resolveOwnerForFriendCodeCache();
  if (isReferralCloudEnabled()) {
    try {
      const { generateReferralCode } = await import('./referral_system');
      const ref = await generateReferralCode(displayNameForReferralFallback || 'Player');
      const t = (ref ?? '').trim().toUpperCase();
      if (t.length > 0 && isValidInviteCodeLookup(t)) {
        await saveOwnerScopedStoredCode(owner, t);
        return t;
      }
    } catch {
      /* нет auth_links / сеть */
    }
  }
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
          await db.runTransaction(async (tx: Record<string, unknown> & { get: (ref: unknown) => Promise<{exists: boolean; data?: () => Record<string, unknown>}>; set: (ref: unknown, data: unknown, opts?: unknown) => void }) => {
            const codeRef = db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(c);
            const snap = await tx.get(codeRef);
            // If taken by someone else (not our old uid), abort — can't reclaim.
            if (snap.exists && snap.data?.()?.uid !== indexUid) throw new Error('CODE_CLAIMED');
            tx.set(codeRef, { uid, createdAt: Date.now() });
            tx.set(
              db.collection('users').doc(uid),
              { progress: { friend_code: c }, updatedAt: Date.now() },
              { merge: true },
            );
          });
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
  // Wait for Firebase Auth before Firestore write (избегаем PERMISSION_DENIED).
  const uid = await withTimeout(ensureAnonUser(), FRIEND_CODE_ENSURE_UID_MS);
  if (!uid) return null;

  // Check Firestore — code may exist from a previous install or other device.
  let existingCode: string | undefined;
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const raw = typeof userSnap.data === 'function' ? userSnap.data() : null;
    existingCode =
      raw && typeof raw === 'object' && raw !== null && 'progress' in raw
        ? (raw as { progress?: { friend_code?: string } }).progress?.friend_code
        : undefined;
  } catch {
    // Сбой чтения (сеть / офлайн) — не выходим: ниже пробуем зарезервировать код транзакцией.
  }
  if (typeof existingCode === 'string' && isValidFriendCode(existingCode)) {
    const c = existingCode.trim().toUpperCase();
    // Verify the index still points to THIS uid (handles uid migration after reinstall).
    try {
      const indexSnap = await db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(c).get();
      const indexUid = indexSnap.exists ? (indexSnap.data?.()?.uid as string | undefined) : undefined;
      if (indexUid === uid) {
        await saveOwnerScopedStoredCode(cacheOwner, c);
        return c;
      }
      // Index points to a different uid — re-register the SAME code under current uid.
      // One code per stable_id, forever — never generate a replacement.
      try {
        await db.runTransaction(async (tx: Record<string, unknown> & { get: (ref: unknown) => Promise<{exists: boolean; data?: () => Record<string, unknown>}>; set: (ref: unknown, data: unknown, opts?: unknown) => void }) => {
          const codeRef = db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(c);
          const snap = await tx.get(codeRef);
          if (snap.exists && snap.data?.()?.uid !== indexUid) throw new Error('CODE_CLAIMED');
          tx.set(codeRef, { uid, createdAt: Date.now() });
          tx.set(
            db.collection('users').doc(uid),
            { progress: { friend_code: c }, updatedAt: Date.now() },
            { merge: true },
          );
        });
      } catch {
        // Re-registration failed — still return the code so UI isn't broken.
      }
      await saveOwnerScopedStoredCode(cacheOwner, c);
      return c;
    } catch {
      // Network error — trust the stored code for now, revalidate next time.
      await saveOwnerScopedStoredCode(cacheOwner, c);
      return c;
    }
  }

  // Generate and transactionally reserve a unique code.
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const code = generateRandomCode();
    try {
      await db.runTransaction(async (tx: Record<string, unknown> & { get: (ref: unknown) => Promise<{exists: boolean}>; set: (ref: unknown, data: unknown, opts?: unknown) => void }) => {
        const codeRef = db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(code);
        const snap = await tx.get(codeRef);
        if (snap.exists) throw new Error('CODE_TAKEN');
        tx.set(codeRef, { uid, createdAt: Date.now() });
        tx.set(
          db.collection('users').doc(uid),
          { progress: { friend_code: code }, updatedAt: Date.now() },
          { merge: true },
        );
      });
      await saveOwnerScopedStoredCode(cacheOwner, code);
      return code;
    } catch (err) {
      if (err instanceof Error && err.message === 'CODE_TAKEN') continue;
      return null;
    }
  }

  return null;
}

/**
 * Look up another user by friend code. Returns { uid } on hit, null on miss
 * (either: code missing from index, or target user is in banned_users/{uid}).
 * Banned-user filter is silent per FRIEND-07 (UI shows generic "Code not found").
 *
 * Performs client-side validation via isValidFriendCode() before any
 * network call (cheap fail-fast on garbage input).
 */
export async function lookupUserByFriendCode(code: string): Promise<{ uid: string } | null> {
  const normalized = normalizeInviteCodeInput(code);
  if (!isValidInviteCodeLookup(normalized)) return null;

  const db = getFirestore();
  if (!db) return null;

  const indexSnap = await db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(normalized).get();
  if (indexSnap.exists) {
    const uid = indexSnap.data?.()?.uid as string | undefined;
    if (uid) {
      // Verify the user document exists — stale index entries point to deleted/migrated accounts.
      const [userSnap, banSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('banned_users').doc(uid).get(),
      ]);
      if (userSnap.exists && !banSnap.exists) return { uid };
    }
  }

  const refSnap = await db.collection('referral_codes').doc(normalized).get();
  if (refSnap.exists) {
    const uid = refSnap.data?.()?.ownerStableId as string | undefined;
    if (typeof uid === 'string' && uid.length > 0) {
      const [userSnap, banSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('banned_users').doc(uid).get(),
      ]);
      if (userSnap.exists && !banSnap.exists) return { uid };
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
      const banSnap = await db.collection('banned_users').doc(uid).get();
      if (!banSnap.exists) return { uid };
    }
  } catch {
    /* Best-effort fallback for old users whose friend_code_index was never backfilled. */
  }

  return null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
