import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getAuthUserId, getCanonicalUserId } from './user_id_policy';
import { ensureAnonUser } from './cloud_sync';

// ── Types ──────────────────────────────────────────────────────────────────

export type SendRequestResult =
  | 'sent'
  | 'already_sent'
  | 'already_friends'
  | 'self'
  | 'not_found'
  | 'error';

export interface FriendEntry {
  uid: string;
  createdAt: number;
}

export interface FriendRequestEntry {
  fromUid: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}

// ── Firestore accessor (same pattern as firestore_friends.ts) ──────────────

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

// ── sendFriendRequest ──────────────────────────────────────────────────────

/**
 * Send a friend request to another user by their UID (resolved from friend
 * code via lookupUserByFriendCode, which already filters banned users).
 *
 * Returns a typed result rather than throwing so the UI can render
 * appropriate copy without catching.
 *
 * Writes: users/{toUid}/friend_requests/{myUid} = { status: 'pending', createdAt }
 */
export async function sendFriendRequest(toUid: string): Promise<SendRequestResult> {
  const myUid = await ensureAnonUser();
  if (!myUid) return 'error';

  if (toUid === myUid) return 'self';

  const db = getFirestore();
  if (!db) return 'error';

  try {
    const firebaseAuthUid = getAuthUserId();
    if (firebaseAuthUid) {
      await db.collection('users').doc(myUid).set({ firebaseAuthUid }, { merge: true });
    }
    // Check whether we are already friends.
    const friendsSnap = await db
      .collection('users')
      .doc(myUid)
      .collection('friends')
      .doc(toUid)
      .get();
    if (friendsSnap.exists) return 'already_friends';

    // Check whether a pending request is already outstanding.
    const reqSnap = await db
      .collection('users')
      .doc(toUid)
      .collection('friend_requests')
      .doc(myUid)
      .get();
    if (reqSnap.exists && reqSnap.data?.()?.status === 'pending') return 'already_sent';

    // Write the pending request.
    await db
      .collection('users')
      .doc(toUid)
      .collection('friend_requests')
      .doc(myUid)
      .set({ status: 'pending', createdAt: Date.now() });

    return 'sent';
  } catch {
    return 'error';
  }
}

// ── acceptFriendRequest ────────────────────────────────────────────────────

/**
 * Accept an incoming friend request from fromUid.
 *
 * Step 1: Update request status → 'accepted' (separate write BEFORE batch so
 *   security rules see status='accepted' when the batch attempts to create the
 *   reverse friend entry users/{fromUid}/friends/{myUid}).
 * Step 2: Batch-create both friendship entries atomically.
 */
export async function acceptFriendRequest(fromUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) throw new Error('acceptFriendRequest: canonical UID unavailable');

  const db = getFirestore();
  if (!db) throw new Error('acceptFriendRequest: Firestore unavailable');

  // Commit the status update first so the batch can satisfy security rules.
  await db
    .collection('users')
    .doc(myUid)
    .collection('friend_requests')
    .doc(fromUid)
    .update({ status: 'accepted', updatedAt: Date.now() });

  // Now batch-create both friend entries.
  const batch = db.batch();
  const now = Date.now();

  batch.set(
    db.collection('users').doc(myUid).collection('friends').doc(fromUid),
    { createdAt: now },
  );
  batch.set(
    db.collection('users').doc(fromUid).collection('friends').doc(myUid),
    { createdAt: now },
  );

  await batch.commit();
}

// ── declineFriendRequest ───────────────────────────────────────────────────

/**
 * Decline an incoming friend request by DELETING the request document.
 *
 * Deletion (not status update to 'declined') keeps Firestore tidy and
 * avoids stale declined docs that would block future re-requests.
 */
export async function declineFriendRequest(fromUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) return;

  const db = getFirestore();
  if (!db) return;

  await db
    .collection('users')
    .doc(myUid)
    .collection('friend_requests')
    .doc(fromUid)
    .delete();
}

// ── deleteFriend ───────────────────────────────────────────────────────────

/**
 * Remove a friend bidirectionally in a single WriteBatch.
 *
 * Deletes users/{myUid}/friends/{friendUid} AND users/{friendUid}/friends/{myUid}.
 */
export async function deleteFriend(friendUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) return;

  const db = getFirestore();
  if (!db) return;

  const batch = db.batch();

  batch.delete(db.collection('users').doc(myUid).collection('friends').doc(friendUid));
  batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(myUid));

  await batch.commit();
}

/**
 * Записывает firebaseAuthUid в users/{stableId}, чтобы правило canonicalUserMatchesAuth
 * разрешило читать входящие заявки (auth.uid часто ≠ stableId).
 * Вызывать перед подпиской на friend_requests и при фокусе вкладки «Друзья».
 */
export async function ensureFriendRequestViewerAuthLink(): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) return;
  const firebaseAuthUid = getAuthUserId();
  if (!firebaseAuthUid) return;
  const db = getFirestore();
  if (!db) return;
  try {
    await db.collection('users').doc(myUid).set({ firebaseAuthUid }, { merge: true });
  } catch {
    /* ignore */
  }
}

// ── subscribeToFriends ─────────────────────────────────────────────────────

/**
 * Real-time listener for the current user's friends collection.
 *
 * Returns an unsubscribe function. The callback receives the full array of
 * FriendEntry on every snapshot update.
 * If UID is unavailable (Expo Go, CLOUD_SYNC_ENABLED=false), callback([])
 * is called immediately and a no-op unsubscribe is returned.
 */
export function subscribeToFriends(
  callback: (friends: FriendEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  ensureAnonUser()
    .then(myUid => {
      if (cancelled) return;
      if (!myUid) {
        callback([]);
        return;
      }
      const db = getFirestore();
      if (!db) {
        callback([]);
        return;
      }
      unsubscribe = db
        .collection('users')
        .doc(myUid)
        .collection('friends')
        .onSnapshot(
          (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
            if (cancelled) return;
            const friends: FriendEntry[] = snap.docs.map(doc => ({
              uid: doc.id,
              createdAt: (doc.data().createdAt as number) ?? 0,
            }));
            callback(friends);
          },
          (err: Error) => {
            onError?.(err);
          },
        );
    })
    .catch((err: unknown) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// ── subscribeToIncomingRequests ────────────────────────────────────────────

/**
 * Real-time listener for входящих заявок со статусом pending.
 * Слушает всю подколлекцию и фильтрует на клиенте — без query по полю status
 * (меньше сюрпризов с индексами; документы «accepted» просто отбрасываются).
 */
export function subscribeToIncomingRequests(
  callback: (requests: FriendRequestEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  ensureAnonUser()
    .then(myUid => {
      if (cancelled) return;
      if (!myUid) {
        callback([]);
        return;
      }
      const db = getFirestore();
      if (!db) {
        callback([]);
        return;
      }
      unsubscribe = db
        .collection('users')
        .doc(myUid)
        .collection('friend_requests')
        .onSnapshot(
          (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
            if (cancelled) return;
            const requests: FriendRequestEntry[] = snap.docs
              .map(doc => {
                const data = doc.data();
                const st = data.status as string | undefined;
                return {
                  fromUid: doc.id,
                  status: 'pending' as const,
                  createdAt: (data.createdAt as number) ?? 0,
                  _rawStatus: st,
                };
              })
              .filter(r => r._rawStatus === 'pending' || r._rawStatus === undefined)
              .map(({ fromUid, status, createdAt }) => ({ fromUid, status, createdAt }));
            callback(requests);
          },
          (err: Error) => {
            onError?.(err);
          },
        );
    })
    .catch((err: unknown) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
