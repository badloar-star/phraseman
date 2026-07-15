import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import {
  ensureAnonUser,
  ensureStableAuthLinkForStableIdDetailed,
  type StableAuthLinkEnsureResult,
} from './cloud_sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthUserId } from './user_id_policy';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

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
  displayName?: string;
}

export interface FriendRequestEntry {
  fromUid: string;
  fromName?: string;
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

/** Текущий firebase auth uid (для удаления своего friend_auth_edges при разрыве дружбы). */
function getCurrentAuthUidForFriends(): string | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

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

function cleanFriendRequestDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 40).trim();
}

async function readUserDisplayNameFromFirestore(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  uid: string,
): Promise<string> {
  try {
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.exists ? snap.data?.() ?? {} : {};
    const progress = data && typeof data.progress === 'object' && data.progress !== null
      ? data.progress as Record<string, unknown>
      : {};
    return cleanFriendRequestDisplayName(progress.user_name)
      || cleanFriendRequestDisplayName(data.displayName)
      || cleanFriendRequestDisplayName(data.name);
  } catch {
    return '';
  }
}

async function readMyFriendRequestDisplayName(
  myUid?: string,
  db?: NonNullable<ReturnType<typeof getFirestore>>,
): Promise<string> {
  try {
    const localName = cleanFriendRequestDisplayName(await AsyncStorage.getItem('user_name'));
    if (localName) return localName;
  } catch {}
  if (!myUid || !db) return '';
  return readUserDisplayNameFromFirestore(db, myUid);
}

async function resolveFriendsCanonicalUid(
  requestedStableId: string,
  action: string,
  tags: Record<string, string | number | boolean | null | undefined> = {},
): Promise<string | null> {
  const accountToken = captureAccountGeneration();
  const result = await prepareFriendRequestViewerAuthLink(requestedStableId);
  if (!isViewerAuthProofCurrent(result, requestedStableId, accountToken)) {
    logFriendsHealth('friends:auth_link_failed', new Error('stable auth link unavailable'), { action, ...tags });
    return null;
  }
  return result.stableUid;
}

export const FRIEND_REQUEST_VIEWER_AUTH_LINK_TIMEOUT_MS = 15_000;
export const FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS = 60_000;
export const FRIEND_CLEANUP_TTL_MS = 6 * 60 * 60_000;
const FRIEND_CLEANUP_ACCOUNT_CACHE_MAX = 2;

let friendRequestViewerAuthLinkInFlight: {
  scopeKey: string;
  promise: Promise<StableAuthLinkEnsureResult | null>;
} | null = null;
let friendRequestViewerAuthLinkSuccess: {
  scopeKey: string;
  expiresAt: number;
  result: StableAuthLinkEnsureResult;
} | null = null;
const friendCleanupCompletedAtByUid = new Map<string, number>();
const friendCleanupCursorByUid = new Map<string, unknown>();

function rememberFriendCleanup(uid: string, completedAt: number): void {
  friendCleanupCompletedAtByUid.delete(uid);
  friendCleanupCompletedAtByUid.set(uid, completedAt);
  while (friendCleanupCompletedAtByUid.size > FRIEND_CLEANUP_ACCOUNT_CACHE_MAX) {
    const oldest = friendCleanupCompletedAtByUid.keys().next().value as string | undefined;
    if (!oldest) break;
    friendCleanupCompletedAtByUid.delete(oldest);
  }
}

function rememberFriendCleanupCursor(uid: string, cursor: unknown | null): void {
  friendCleanupCursorByUid.delete(uid);
  if (cursor) friendCleanupCursorByUid.set(uid, cursor);
  while (friendCleanupCursorByUid.size > FRIEND_CLEANUP_ACCOUNT_CACHE_MAX) {
    const oldest = friendCleanupCursorByUid.keys().next().value as string | undefined;
    if (!oldest) break;
    friendCleanupCursorByUid.delete(oldest);
  }
}

function friendRequestViewerAuthScopeKey(stableId: string): string {
  return `${stableId}:${String(getAuthUserId() ?? '').trim()}`;
}

function isAuthLinkResultForScope(
  result: StableAuthLinkEnsureResult | null,
  stableId: string,
  authUid: string,
): result is StableAuthLinkEnsureResult {
  if (!result?.ok || result.requestedStableId !== stableId || !result.stableUid) return false;
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return true;
  return authUid.length > 0 && result.authUid === authUid;
}

function isViewerAuthProofCurrent(
  result: StableAuthLinkEnsureResult | null,
  stableId: string,
  token: AccountGenerationToken,
): result is StableAuthLinkEnsureResult {
  const currentAuthUid = String(getAuthUserId() ?? '').trim();
  return isCurrentAccountGeneration(token, stableId)
    && isAuthLinkResultForScope(result, stableId, currentAuthUid);
}

function prepareFriendRequestViewerAuthLink(stableId: string): Promise<StableAuthLinkEnsureResult | null> {
  const scopeKey = friendRequestViewerAuthScopeKey(stableId);
  const authUid = String(getAuthUserId() ?? '').trim();
  const now = Date.now();
  if (
    friendRequestViewerAuthLinkSuccess?.scopeKey === scopeKey
    && friendRequestViewerAuthLinkSuccess.expiresAt > now
  ) {
    return Promise.resolve(friendRequestViewerAuthLinkSuccess.result);
  }
  // The cache holds one account/auth pair only. Entering another identity or
  // reaching the TTL immediately evicts the old success instead of leaking it.
  friendRequestViewerAuthLinkSuccess = null;

  if (friendRequestViewerAuthLinkInFlight?.scopeKey === scopeKey) {
    return friendRequestViewerAuthLinkInFlight.promise;
  }

  let sharedPromise!: Promise<StableAuthLinkEnsureResult | null>;
  const bounded = new Promise<StableAuthLinkEnsureResult | null>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (result: StableAuthLinkEnsureResult | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    timer = setTimeout(() => finish(null), FRIEND_REQUEST_VIEWER_AUTH_LINK_TIMEOUT_MS);
    void Promise.resolve()
      .then(() => ensureStableAuthLinkForStableIdDetailed(stableId))
      .then(finish, () => finish(null));
  });

  sharedPromise = bounded
    .then(result => {
      const valid = isAuthLinkResultForScope(result, stableId, authUid);
      if (valid && friendRequestViewerAuthLinkInFlight?.promise === sharedPromise) {
        friendRequestViewerAuthLinkSuccess = {
          // Cache the identity pair that actually started this link. If Firebase
          // Auth changes while the callable is in flight, its late success must
          // not authorize listeners for the new auth UID.
          scopeKey,
          expiresAt: Date.now() + FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS,
          result,
        };
      } else if (!valid) {
        logFriendsHealth('friends:auth_link_failed', new Error('stable auth link unavailable'), {
          action: 'ensure_friend_auth_link',
          myUid: stableId,
        });
      }
      return valid ? result : null;
    })
    .finally(() => {
      if (friendRequestViewerAuthLinkInFlight?.promise === sharedPromise) {
        friendRequestViewerAuthLinkInFlight = null;
      }
    });

  friendRequestViewerAuthLinkInFlight = { scopeKey, promise: sharedPromise };
  return sharedPromise;
}

// ── sendFriendRequest ──────────────────────────────────────────────────────

/**
 * Send a friend request to another user by their UID (resolved from friend
 * code via lookupUserByFriendCode, which already filters banned users).
 *
 * Returns a typed result rather than throwing so the UI can render
 * appropriate copy without catching.
 *
 * Writes: users/{toUid}/friend_requests/{myUid} = { status: 'pending', createdAt, fromName? }
 */
export async function sendFriendRequest(toUid: string): Promise<SendRequestResult> {
  const requestedMyUid = await ensureAnonUser();
  if (!requestedMyUid) {
    logFriendsHealth('friends:send_request_no_canonical_uid', new Error('canonical uid unavailable'), {
      action: 'send_friend_request',
      targetUid: toUid,
    });
    return 'error';
  }

  const myUid = await resolveFriendsCanonicalUid(requestedMyUid, 'send_friend_request', {
    requestedMyUid,
    targetUid: toUid,
  });
  if (!myUid) return 'error';

  if (toUid === myUid || toUid === requestedMyUid) return 'self';

  const db = getFirestore();
  if (!db) {
    logFriendsHealth('friends:send_request_firestore_unavailable', new Error('Firestore unavailable'), {
      action: 'send_friend_request',
      targetUid: toUid,
    });
    return 'error';
  }

  try {
    const senderNamePromise = readMyFriendRequestDisplayName(myUid, db);
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
        // after deleteFriend (batch couldn\'t delete the other user\'s request due to security rules).
        // Check if they\'re actually friends: if not, the pending doc is stale garbage — overwrite it.
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
    const fromName = await senderNamePromise;
    await db
      .collection('users')
      .doc(toUid)
      .collection('friend_requests')
      .doc(myUid)
      .set({ status: 'pending', createdAt: Date.now(), ...(fromName ? { fromName } : {}) });

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
  const requestedMyUid = await ensureAnonUser();
  if (!requestedMyUid) {
    const err = new Error('acceptFriendRequest: canonical UID unavailable');
    logFriendsHealth('friends:accept_request_no_canonical_uid', err, { action: 'accept_friend_request', fromUid });
    throw err;
  }

  const db = getFirestore();
  if (!db) {
    const err = new Error('acceptFriendRequest: Firestore unavailable');
    logFriendsHealth('friends:accept_request_firestore_unavailable', err, {
      action: 'accept_friend_request',
      requestedMyUid,
      fromUid,
    });
    throw err;
  }

  const myUid = await resolveFriendsCanonicalUid(requestedMyUid, 'accept_friend_request', {
    requestedMyUid,
    fromUid,
  });
  if (!myUid) {
    throw new Error('acceptFriendRequest: stable auth link unavailable');
  }

  // Batch: create both friend entries + delete the request doc.
  const requestRef = db.collection('users').doc(myUid).collection('friend_requests').doc(fromUid);
  const [requestSnap, myDisplayName] = await Promise.all([
    requestRef.get(),
    readMyFriendRequestDisplayName(myUid, db),
  ]);
  const fromName = cleanFriendRequestDisplayName(requestSnap.data?.()?.fromName);
  const batch = db.batch();
  const now = Date.now();

  batch.set(
    db.collection('users').doc(myUid).collection('friends').doc(fromUid),
    { createdAt: now, ...(fromName ? { displayName: fromName } : {}) },
  );
  // Reverse doc живёт на стороне ОТПРАВИТЕЛЯ заявки (fromUid) — это его друг-запись.
  // Помечаем acceptedAt, чтобы отправитель мог показать «X принял твою заявку»
  // (Компас, соц-сводка «Кстати…»). Своя сторона (myUid) маркера не несёт →
  // там я САМ принял входящую, копия будет нейтральной «теперь вы друзья».
  batch.set(
    db.collection('users').doc(fromUid).collection('friends').doc(myUid),
    { createdAt: now, acceptedAt: now, ...(myDisplayName ? { displayName: myDisplayName } : {}) },
  );
  // Удаляем request-документ после принятия — иначе он висит вечно и может блокировать повторные заявки.
  batch.delete(requestRef);

  try {
    await batch.commit();
  } catch (e) {
    logFriendsHealth('friends:accept_request_failed', e, { action: 'accept_friend_request', myUid, fromUid });
    throw e;
  }

  // Достижения: считаем текущих друзей после принятия заявки
  try {
    const { checkAchievements } = await import('./achievements');
    const friendsSnap = await db.collection('users').doc(myUid).collection('friends').get();
    const totalFriends = friendsSnap.size;
    void checkAchievements({ type: 'friend_added', totalFriends });
  } catch {}
}

// ── declineFriendRequest ───────────────────────────────────────────────────

/**
 * Decline an incoming friend request by DELETING the request document.
 *
 * Deletion (not status update to 'declined') keeps Firestore tidy and
 * avoids stale declined docs that would block future re-requests.
 */
export async function declineFriendRequest(fromUid: string): Promise<void> {
  const requestedMyUid = await ensureAnonUser();
  if (!requestedMyUid) {
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
      requestedMyUid,
      fromUid,
    });
    return;
  }

  const myUid = await resolveFriendsCanonicalUid(requestedMyUid, 'decline_friend_request', {
    requestedMyUid,
    fromUid,
  });
  if (!myUid) return;

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
  const requestedMyUid = await ensureAnonUser();
  if (!requestedMyUid) {
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
      requestedMyUid,
      friendUid,
    });
    return;
  }

  const myUid = await resolveFriendsCanonicalUid(requestedMyUid, 'delete_friend', {
    requestedMyUid,
    friendUid,
  });
  if (!myUid) return;

  const batch = db.batch();

  batch.delete(db.collection('users').doc(myUid).collection('friends').doc(friendUid));
  batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(myUid));
  // Снимаем мой reverse-edge на стороне экс-друга, чтобы он больше не мог читать мою ленту
  // активности (friend_auth_edges keyed by МОЙ authUid; rule разрешает delete своего же edge).
  const myAuthUid = getCurrentAuthUidForFriends();
  if (myAuthUid) {
    batch.delete(
      db.collection('users').doc(friendUid).collection('friend_auth_edges').doc(myAuthUid),
    );
  }
  // Only delete own request doc — security rules forbid deleting the other user\'s subcollection.
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
// true means Firestore security can accept the live listeners. On false the
// screen must retain its SWR cache and skip listeners instead of provoking permission-denied.
export async function ensureFriendRequestViewerAuthLink(stableId?: string): Promise<boolean> {
  let myUid = String(stableId ?? '').trim();
  if (!myUid) {
    try {
      myUid = String(await ensureAnonUser() ?? '').trim();
    } catch {
      return false;
    }
  }
  if (!myUid) return false;
  const result = await prepareFriendRequestViewerAuthLink(myUid);
  return isAuthLinkResultForScope(result, myUid, String(getAuthUserId() ?? '').trim());
}

// ── subscribeToFriends ─────────────────────────────────────────────────────

/** Второй аргумент `subscribeToFriends`: снимок с устройства до ответа сервера (`fromCache: true`). */
export type SubscribeFriendsSnapshotMeta = { fromCache: boolean };
export type FriendSubscriptionSetupState = 'ready' | 'preflight_failed';

/**
 * Real-time listener for the current user\'s friends collection.
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
  onSetupState?: (state: FriendSubscriptionSetupState) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  ensureAnonUser()
    .then(async myUid => {
      if (cancelled) return;
      if (!myUid) {
        // Auth ещё не готов (холодный старт/сеть) — это НЕ «друзей нет». fromCache:true,
        // чтобы вызывающий не принял пустоту за серверную правду и не стёр показанный список.
        callback([], { fromCache: true });
        onSetupState?.('preflight_failed');
        return;
      }
      const accountToken = captureAccountGeneration();
      const authLinkProof = await prepareFriendRequestViewerAuthLink(myUid);
      if (cancelled) return;
      if (!isViewerAuthProofCurrent(authLinkProof, myUid, accountToken)) {
        onSetupState?.('preflight_failed');
        return;
      }
      const db = getFirestore();
      if (!db) {
        callback([], { fromCache: true });
        onSetupState?.('preflight_failed');
        return;
      }
      // The callable is authoritative for merges. It may resolve the current
      // local id to another canonical users/{uid}; the requested id, Firebase
      // auth uid and account generation were all verified above.
      const listenerStableUid = authLinkProof.stableUid;
      const friendsRef = db
        .collection('users')
        .doc(listenerStableUid)
        .collection('friends');
      // Identity is checked again directly before opening the native listener.
      if (cancelled) return;
      if (!isViewerAuthProofCurrent(authLinkProof, myUid, accountToken)) {
        onSetupState?.('preflight_failed');
        return;
      }
      unsubscribe = friendsRef.onSnapshot(
          (snap: {
            docs: Array<{ id: string; data: () => Record<string, unknown> }>;
            metadata?: { fromCache?: boolean };
          }) => {
            if (cancelled || !isCurrentAccountGeneration(accountToken, myUid)) return;
            const fromCache = snap.metadata?.fromCache === true;
            const friends: FriendEntry[] = snap.docs.map(doc => ({
              displayName: cleanFriendRequestDisplayName(doc.data().displayName) || undefined,
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
      onSetupState?.('ready');
    })
    .catch((err: unknown) => {
      onSetupState?.('preflight_failed');
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
 * Real-time listener for incoming pending requests.
 * Firestore filters by status before snapshots reach JS, so accepted/declined
 * history does not grow the work done on every update.
 */
export function subscribeToIncomingRequests(
  callback: (requests: FriendRequestEntry[]) => void,
  onError?: (err: Error) => void,
  onSetupState?: (state: FriendSubscriptionSetupState) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  ensureAnonUser()
    .then(async myUid => {
      if (cancelled) return;
      if (!myUid) {
        onSetupState?.('preflight_failed');
        return;
      }
      const accountToken = captureAccountGeneration();
      const authLinkProof = await prepareFriendRequestViewerAuthLink(myUid);
      if (cancelled) return;
      if (!isViewerAuthProofCurrent(authLinkProof, myUid, accountToken)) {
        onSetupState?.('preflight_failed');
        return;
      }
      const db = getFirestore();
      if (!db) {
        onSetupState?.('preflight_failed');
        return;
      }
      const listenerStableUid = authLinkProof.stableUid;
      const pendingRequestsQuery = db
        .collection('users')
        .doc(listenerStableUid)
        .collection('friend_requests')
        .where('status', '==', 'pending');
      // Identity is checked again directly before opening the native listener.
      if (cancelled) return;
      if (!isViewerAuthProofCurrent(authLinkProof, myUid, accountToken)) {
        onSetupState?.('preflight_failed');
        return;
      }
      unsubscribe = pendingRequestsQuery.onSnapshot(
          (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
            if (cancelled || !isCurrentAccountGeneration(accountToken, myUid)) return;
            const requests: FriendRequestEntry[] = snap.docs
              .map(doc => {
                const data = doc.data();
                const st = data.status as string | undefined;
                const fromName = cleanFriendRequestDisplayName(data.fromName);
                return {
                  fromUid: doc.id,
                  fromName: fromName || undefined,
                  status: 'pending' as const,
                  createdAt: (data.createdAt as number) ?? 0,
                  _rawStatus: st,
                };
              })
              .filter(r => r._rawStatus === 'pending')
              .map(({ fromUid, fromName, status, createdAt }) => ({ fromUid, ...(fromName ? { fromName } : {}), status, createdAt }));
            callback(requests);
          },
          (err: Error) => {
            logFriendsHealth('friends:subscribe_incoming_requests_failed', err, { action: 'subscribe_incoming_requests' });
            onError?.(err);
          },
        );
      onSetupState?.('ready');
    })
    .catch((err: unknown) => {
      onSetupState?.('preflight_failed');
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
 * Запрашивается при открытии вкладки, но успешно выполняется не чаще одного
 * раза за FRIEND_CLEANUP_TTL_MS для каждого аккаунта и прекращается при blur.
 */
export async function cleanupStaleFriendData(shouldAbort?: () => boolean): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || shouldAbort?.()) return;
  let cleanupUid = '';
  let cleanupStartedAt = 0;
  let completed = false;
  try {
    const requestedMyUid = await ensureAnonUser();
    if (!requestedMyUid || shouldAbort?.()) return;
    const db = getFirestore();
    if (!db) return;
    const myUid = await resolveFriendsCanonicalUid(requestedMyUid, 'cleanup_stale_friend_data', {
      requestedMyUid,
    });
    if (!myUid || shouldAbort?.()) return;

    const now = Date.now();
    const lastCompletedAt = friendCleanupCompletedAtByUid.get(myUid) ?? 0;
    if (now - lastCompletedAt < FRIEND_CLEANUP_TTL_MS) return;
    cleanupUid = myUid;
    cleanupStartedAt = now;
    // The timestamp also acts as a tiny in-process lease, so rapid tab re-entry
    // cannot start two copies of the same best-effort cleanup.
    rememberFriendCleanup(myUid, cleanupStartedAt);

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_MAX = 400;

    // 1. Удаляем accepted request-документы (мусор от accept без cleanup).
    const reqSnap = await db
      .collection('users').doc(myUid).collection('friend_requests')
      .where('status', '==', 'accepted')
      .limit(50)
      .get();
    if (shouldAbort?.()) return;
    for (const doc of reqSnap.docs as Array<{ id: string; data: () => Record<string, unknown>; ref: unknown }>) {
      if (batchCount >= BATCH_MAX) break;
      const st = doc.data().status as string | undefined;
      if (st === 'accepted') {
        batch.delete(doc.ref);
        batchCount++;
      }
    }

    // 2. Проверяем односторонние friends-документы (есть у меня, нет у друга).
    // Не больше трёх запросов одновременно; между пачками учитываем уход с таба.
    const friendsRef = db.collection('users').doc(myUid).collection('friends');
    const previousCursor = friendCleanupCursorByUid.get(myUid);
    let friendsSnap = await (previousCursor
      ? friendsRef.startAfter(previousCursor).limit(20)
      : friendsRef.limit(20)
    ).get();
    // The previous page may now end past the collection after deletes. Wrap to
    // the first bounded page immediately instead of spending a whole TTL pass.
    if (previousCursor && friendsSnap.docs.length === 0) {
      friendsSnap = await friendsRef.limit(20).get();
    }
    if (shouldAbort?.()) return;
    const friendDocs = friendsSnap.docs as Array<{ id: string; ref: unknown }>;
    const toCheck = friendDocs.slice(0, 20);
    for (let offset = 0; offset < toCheck.length; offset += 3) {
      if (shouldAbort?.()) return;
      const part = toCheck.slice(offset, offset + 3);
      const reverseSnaps = await Promise.all(
        part.map(doc => db.collection('users').doc(doc.id).collection('friends').doc(myUid).get()),
      );
      for (let i = 0; i < part.length; i++) {
        if (batchCount >= BATCH_MAX) break;
        if (!reverseSnaps[i].exists) {
          batch.delete(part[i].ref);
          batchCount++;
        }
      }
    }

    if (shouldAbort?.()) return;
    if (batchCount > 0) await batch.commit();
    rememberFriendCleanupCursor(
      myUid,
      friendDocs.length === 20 ? friendDocs[friendDocs.length - 1] : null,
    );
    completed = true;
  } catch {
    /* ignore — cleanup is best-effort */
  } finally {
    // A failed or cancelled pass must remain retryable on the next focus.
    if (!completed && cleanupUid && friendCleanupCompletedAtByUid.get(cleanupUid) === cleanupStartedAt) {
      friendCleanupCompletedAtByUid.delete(cleanupUid);
    }
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
