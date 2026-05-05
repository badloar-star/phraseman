import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { generateRandomCode, isValidFriendCode } from './friend_code';

const FRIEND_CODE_CACHE_KEY = 'friend_code_local_v1';

/** Firestore collection name for code → uid reverse index. Indexed by code (doc id). */
export const FRIEND_CODE_INDEX_COLLECTION = 'friend_code_index';

/** Maximum collision retries before throwing. With 31^6 codespace this is astronomically safe. */
const MAX_COLLISION_RETRIES = 10;

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
 * Returns null when Firestore is unavailable (Expo Go, CLOUD_SYNC_ENABLED=false,
 * or canonical UID not yet provisioned).
 *
 * NOTE: Per CLAUDE.md SEC-06, only canonical UID from getCanonicalUserId() is
 * acceptable — never anon_id, never stable_id directly. ALL writes must use
 * the canonical UID returned here as the document key.
 */
export async function ensureMyFriendCode(): Promise<string | null> {
  // Fast path: return from local cache immediately (no network, no auth needed).
  const cached = await AsyncStorage.getItem(FRIEND_CODE_CACHE_KEY);
  if (cached && isValidFriendCode(cached)) return cached;

  const uid = await getCanonicalUserId();
  if (!uid) return null;

  const db = getFirestore();
  if (!db) return null;

  // Check Firestore — code may exist from a previous install or other device.
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const existingCode = userSnap.data?.()?.progress?.friend_code;
    if (typeof existingCode === 'string' && isValidFriendCode(existingCode)) {
      await AsyncStorage.setItem(FRIEND_CODE_CACHE_KEY, existingCode);
      return existingCode;
    }
  } catch {
    // Auth not ready yet — will retry next time screen mounts.
    return null;
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
      await AsyncStorage.setItem(FRIEND_CODE_CACHE_KEY, code);
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
  if (!isValidFriendCode(code)) return null;

  const db = getFirestore();
  if (!db) return null;

  const snap = await db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(code).get();
  if (!snap.exists) return null;

  const uid = snap.data?.()?.uid as string | undefined;
  if (!uid) return null;

  // Silent banned-user filter (SEC-05 / FRIEND-07).
  const banSnap = await db.collection('banned_users').doc(uid).get();
  if (banSnap.exists) return null;

  return { uid };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
