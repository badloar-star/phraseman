import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getAuthUserId } from './user_id_policy';
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

function logFriendsHealth(
  context: string,
  error: unknown,
  tags: Record<string, string | number | boolean | null | undefined> = {},
) {
  void import('./app_health')
    .then(({ logAppWarning }) =>
      logAppWarning(context, error, {
        feature: 'friends',
        screen: 'friends',
        writeToFirestore: true,
        tags,
      }),
    )
    .catch(() => {});
}

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
  if (!myUid) {
    logFriendsHealth('friends:send_request_no_canonical_uid', new Error('canonical uid unavailable'), {
      action: 'send_friend_request',
      targetUid: toUid,
    });
    return 'error';
  }

  if (toUid === myUid) return 'self';

  const db = getFirestore();
  if (!db) {
    logFriendsHealth('friends:send_request_firestore_unavailable', new Error('Firestore unavailable'), {
      action: 'send_friend_request',
      targetUid: toUid,
    });
    return 'error';
  }

  try {
    // Auth must be linked before Firestore writes — security rules check firebaseAuthUid.
    let firebaseAuthUid = getAuthUserId();
    if (!firebaseAuthUid) {
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 800));
        firebaseAuthUid = getAuthUserId();
        if (firebaseAuthUid) break;
      }
    }
    if (!firebaseAuthUid) {
      logFriendsHealth('friends:send_request_auth_uid_missing', new Error('Firebase auth uid unavailable after retry'), {
        action: 'send_friend_request',
        myUid,
        targetUid: toUid,
      });
    }
    if (firebaseAuthUid) {
      await db.collection('users').doc(myUid).set({ firebaseAuthUid }, { merge: true });
    }
    // Читаем friends и request параллельно — быстрее.
    const [friendsSnap, reqSnap] = await Promise.all([
      db.collection('users').doc(myUid).collection('friends').doc(toUid).get(),
      db.collection('users').doc(toUid).collection('friend_requests').doc(myUid).get(),
    ]);

    // Если documents дружбы существуют — это могут быть мусорные остатки от неполного deleteFriend.
    // Проверяем обе стороны: если friends/{toUid} есть, но friends/{myUid} у toUid нет — это мусор, чистим.
    if (friendsSnap.exists) {
      const reverseFriendSnap = await db
        .collection('users').doc(toUid).collection('friends').doc(myUid).get();
      if (reverseFriendSnap.exists) {
        // Оба документа есть — реально друзья.
        return 'already_friends';
      }
      // Односторонний мусор от неполного удаления — чистим и продолжаем.
      await db.collection('users').doc(myUid).collection('friends').doc(toUid).delete();
    }

    if (reqSnap.exists) {
      const reqStatus = reqSnap.data?.()?.status as string | undefined;
      if (reqStatus === 'pending') {
        // Pending request already exists — could be a real pending OR a stale one left
        // after deleteFriend (batch couldn't delete the other user's request due to security rules).
        // Check if they're actually friends: if not, the pending doc is stale garbage — overwrite it.
        const [myFriendSnap, theirFriendSnap] = await Promise.all([
          db.collection('users').doc(myUid).collection('friends').doc(toUid).get(),
          db.collection('users').doc(toUid).collection('friends').doc(myUid).get(),
        ]);
        if (myFriendSnap.exists || theirFriendSnap.exists) {
          // One or both friend docs exist alongside a pending request — stale state,
          // clean own side and fall through to re-send.
          if (myFriendSnap.exists) {
            await db.collection('users').doc(myUid).collection('friends').doc(toUid).delete();
          }
          // Overwrite the stale pending request below (fall through).
        } else {
          // No friend docs on either side and request is pending — genuinely already sent.
          return 'already_sent';
        }
      }
      // Non-pending doc (accepted/declined remnant) or stale pending after deleteFriend — overwrite.
      await db.collection('users').doc(toUid).collection('friend_requests').doc(myUid).delete();
    }

    // Write the pending request.
    await db
      .collection('users')
      .doc(toUid)
      .collection('friend_requests')
      .doc(myUid)
      .set({ status: 'pending', createdAt: Date.now() });

    return 'sent';
  } catch (e) {
    console.warn('[sendFriendRequest] error', String(e));
    logFriendsHealth('friends:send_request_failed', e, {
      action: 'send_friend_request',
      myUid,
      targetUid: toUid,
    });
    return 'error';
  }
}

// ── acceptFriendRequest ────────────────────────────────────────────────────

/**
 * Accept an incoming friend request from fromUid.
 *
 * Batch-create both friendship entries and delete the request atomically.
 * Security rules validate the reverse write against the existing pending request.
 */
export async function acceptFriendRequest(fromUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) {
    const err = new Error('acceptFriendRequest: canonical UID unavailable');
    logFriendsHealth('friends:accept_request_no_canonical_uid', err, { action: 'accept_friend_request', fromUid });
    throw err;
  }

  const db = getFirestore();
  if (!db) {
    const err = new Error('acceptFriendRequest: Firestore unavailable');
    logFriendsHealth('friends:accept_request_firestore_unavailable', err, { action: 'accept_friend_request', myUid, fromUid });
    throw err;
  }

  const firebaseAuthUid = getAuthUserId();
  if (!firebaseAuthUid) {
    const err = new Error('acceptFriendRequest: Firebase auth uid unavailable');
    logFriendsHealth('friends:accept_request_auth_uid_missing', err, { action: 'accept_friend_request', myUid, fromUid });
    throw err;
  }

  // Ensure firebaseAuthUid is written so canonicalUserMatchesAuth passes for the mirror write.
  await db.collection('users').doc(myUid).set({ firebaseAuthUid }, { merge: true });

  // Batch: create both friend entries + delete the request doc.
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
  // Удаляем request-документ после принятия — иначе он висит вечно и может блокировать повторные заявки.
  batch.delete(db.collection('users').doc(myUid).collection('friend_requests').doc(fromUid));

  try {
    await batch.commit();
  } catch (e) {
    logFriendsHealth('friends:accept_request_failed', e, { action: 'accept_friend_request', myUid, fromUid });
    throw e;
  }
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
  if (!myUid) {
    logFriendsHealth('friends:decline_request_no_canonical_uid', new Error('canonical uid unavailable'), {
      action: 'decline_friend_request',
      fromUid,
    });
    return;
  }

  const db = getFirestore();
  if (!db) {
    logFriendsHealth('friends:decline_request_firestore_unavailable', new Error('Firestore unavailable'), {
      action: 'decline_friend_request',
      myUid,
      fromUid,
    });
    return;
  }

  try {
    await db
      .collection('users')
      .doc(myUid)
      .collection('friend_requests')
      .doc(fromUid)
      .delete();
  } catch (e) {
    logFriendsHealth('friends:decline_request_failed', e, { action: 'decline_friend_request', myUid, fromUid });
    throw e;
  }
}

// ── deleteFriend ───────────────────────────────────────────────────────────

/**
 * Remove a friend bidirectionally in a single WriteBatch.
 *
 * Deletes users/{myUid}/friends/{friendUid} AND users/{friendUid}/friends/{myUid}.
 */
export async function deleteFriend(friendUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) {
    logFriendsHealth('friends:delete_friend_no_canonical_uid', new Error('canonical uid unavailable'), {
      action: 'delete_friend',
      friendUid,
    });
    return;
  }

  const db = getFirestore();
  if (!db) {
    logFriendsHealth('friends:delete_friend_firestore_unavailable', new Error('Firestore unavailable'), {
      action: 'delete_friend',
      myUid,
      friendUid,
    });
    return;
  }

  const batch = db.batch();

  batch.delete(db.collection('users').doc(myUid).collection('friends').doc(friendUid));
  batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(myUid));
  // Only delete own request doc — security rules forbid deleting the other user's subcollection.
  // Stale request on their side is handled by sendFriendRequest on next add attempt.
  batch.delete(db.collection('users').doc(myUid).collection('friend_requests').doc(friendUid));

  try {
    await batch.commit();
  } catch (e) {
    logFriendsHealth('friends:delete_friend_failed', e, { action: 'delete_friend', myUid, friendUid });
    throw e;
  }
}

/**
 * Записывает firebaseAuthUid в users/{stableId}, чтобы правило canonicalUserMatchesAuth
 * разрешило читать входящие заявки (auth.uid часто ≠ stableId).
 * Вызывать перед подпиской на friend_requests и при фокусе вкладки «Друзья».
 */
export async function ensureFriendRequestViewerAuthLink(): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) return;
  // Auth может ещё не быть готов — ретраим до 3 раз с интервалом 800мс.
  let firebaseAuthUid = getAuthUserId();
  if (!firebaseAuthUid) {
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 800));
      firebaseAuthUid = getAuthUserId();
      if (firebaseAuthUid) break;
    }
  }
  if (!firebaseAuthUid) return;
  const db = getFirestore();
  if (!db) return;
  try {
    await db.collection('users').doc(myUid).set({ firebaseAuthUid }, { merge: true });
  } catch (e) {
    logFriendsHealth('friends:auth_link_failed', e, { action: 'ensure_friend_auth_link' });
  }
}

// ── subscribeToFriends ─────────────────────────────────────────────────────

/** Второй аргумент `subscribeToFriends`: снимок с устройства до ответа сервера (`fromCache: true`). */
export type SubscribeFriendsSnapshotMeta = { fromCache: boolean };

/**
 * Real-time listener for the current user's friends collection.
 *
 * Returns an unsubscribe function. The callback receives the full array of
 * FriendEntry on every snapshot update.
 * `meta.fromCache === true` — данные только с локального кеша Firestore (первый колбэк может быть пустым, затем придёт сервер).
 * If UID is unavailable (Expo Go, CLOUD_SYNC_ENABLED=false), callback([])
 * is called immediately and a no-op unsubscribe is returned.
 */
export function subscribeToFriends(
  callback: (friends: FriendEntry[], meta?: SubscribeFriendsSnapshotMeta) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  ensureAnonUser()
    .then(myUid => {
      if (cancelled) return;
      if (!myUid) {
        callback([], { fromCache: false });
        return;
      }
      const db = getFirestore();
      if (!db) {
        callback([], { fromCache: false });
        return;
      }
      unsubscribe = db
        .collection('users')
        .doc(myUid)
        .collection('friends')
        .onSnapshot(
          (snap: {
            docs: Array<{ id: string; data: () => Record<string, unknown> }>;
            metadata?: { fromCache?: boolean };
          }) => {
            if (cancelled) return;
            const fromCache = snap.metadata?.fromCache === true;
            const friends: FriendEntry[] = snap.docs.map(doc => ({
              uid: doc.id,
              createdAt: (doc.data().createdAt as number) ?? 0,
            }));
            callback(friends, { fromCache });
          },
          (err: Error) => {
            logFriendsHealth('friends:subscribe_friends_failed', err, { action: 'subscribe_friends' });
            onError?.(err);
          },
        );
    })
    .catch((err: unknown) => {
      logFriendsHealth('friends:subscribe_friends_setup_failed', err, { action: 'subscribe_friends' });
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
            logFriendsHealth('friends:subscribe_incoming_requests_failed', err, { action: 'subscribe_incoming_requests' });
            onError?.(err);
          },
        );
    })
    .catch((err: unknown) => {
      logFriendsHealth('friends:subscribe_incoming_requests_setup_failed', err, { action: 'subscribe_incoming_requests' });
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// ── cleanupStaleFriendData ─────────────────────────────────────────────────

/**
 * Удаляет мусорные данные которые могли остаться после неполных операций:
 * - accepted request-документы (должны были удалиться при acceptFriendRequest)
 * - Односторонние friends-документы (должны были удалиться при deleteFriend)
 * Вызывается один раз при открытии вкладки. Fire-and-forget.
 */
export async function cleanupStaleFriendData(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  try {
    const myUid = await ensureAnonUser();
    if (!myUid) return;
    const db = getFirestore();
    if (!db) return;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_MAX = 400;

    // 1. Удаляем accepted request-документы (мусор от accept без cleanup).
    const reqSnap = await db
      .collection('users').doc(myUid).collection('friend_requests').get();
    for (const doc of reqSnap.docs as Array<{ id: string; data: () => Record<string, unknown>; ref: unknown }>) {
      if (batchCount >= BATCH_MAX) break;
      const st = doc.data().status as string | undefined;
      if (st === 'accepted') {
        batch.delete(doc.ref);
        batchCount++;
      }
    }

    // 2. Проверяем односторонние friends-документы (есть у меня, нет у друга).
    // Лимит до 20 reverse-reads за один запуск — защита от N reads при большом списке.
    const friendsSnap = await db
      .collection('users').doc(myUid).collection('friends').get();
    const friendDocs = friendsSnap.docs as Array<{ id: string; ref: unknown }>;
    const toCheck = friendDocs.slice(0, 20);
    const reverseSnaps = await Promise.all(
      toCheck.map(doc =>
        db.collection('users').doc(doc.id).collection('friends').doc(myUid).get(),
      ),
    );
    for (let i = 0; i < toCheck.length; i++) {
      if (batchCount >= BATCH_MAX) break;
      if (!reverseSnaps[i].exists) {
        batch.delete(toCheck[i].ref);
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  } catch {
    /* ignore — cleanup is best-effort */
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
