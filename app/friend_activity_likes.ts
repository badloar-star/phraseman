import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { getAuthUserId, getCanonicalUserId } from './user_id_policy';

const FUNCTIONS_REGION = 'us-central1';

/** Stable event id the server uses for an eventless, profile-level like (from a user card). */
export const PROFILE_LIKE_EVENT_ID = '__profile__';

export type FriendActivityLikeTodayState = {
  date: string;
  targetUid: string;
  eventId: string;
  createdAt?: number;
};

export type FriendActivityLikeResponse = {
  ok: boolean;
  date: string;
  targetUid: string;
  eventId: string;
  activityLikeCount: number;
  targetActivityLikeTotal: number;
  idempotentReplay?: boolean;
};

export type FriendActivityUnlikeResponse = {
  ok: boolean;
  removed: boolean;
  date: string;
  targetUid: string;
  eventId: string;
  activityLikeCount: number;
  targetActivityLikeTotal: number;
};

/** A like the current user has received — surfaced in the friends activity feed. */
export type ActivityLikeReceived = {
  id: string;
  date: string;
  eventId: string;
  fromUid: string;
  fromName: string;
  ts: number;
};

export function isFriendActivityLikesCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

const getDb = () => {
  if (!isFriendActivityLikesCloudEnabled()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

export function todayActivityLikeDateKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureActivityLikeAuthLink(stableUid: string): Promise<void> {
  const authUid = getAuthUserId();
  if (!authUid) return;
  const db = getDb();
  if (!db) return;
  try {
    await db.collection('users').doc(stableUid).set({ firebaseAuthUid: authUid }, { merge: true });
  } catch {
    /* Existing sync usually owns this link; callable will enforce it server-side. */
  }
}

export async function fetchTodayActivityLikeState(): Promise<FriendActivityLikeTodayState | null> {
  if (!isFriendActivityLikesCloudEnabled()) return null;
  const myUid = await getCanonicalUserId();
  if (!myUid) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const date = todayActivityLikeDateKeyUtc();
    const snap = await db
      .collection('users')
      .doc(myUid)
      .collection('friend_activity_like_daily_limits')
      .doc(date)
      .get();
    if (!snap.exists) return null;
    const data = snap.data?.() ?? {};
    return {
      date,
      targetUid: String(data.targetUid ?? ''),
      eventId: String(data.eventId ?? ''),
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchActivityLikeTotal(userUid: string): Promise<number> {
  if (!userUid || !isFriendActivityLikesCloudEnabled()) return 0;
  const db = getDb();
  if (!db) return 0;
  try {
    const snap = await db
      .collection('users')
      .doc(userUid)
      .collection('activity_like_stats')
      .doc('summary')
      .get();
    if (!snap.exists) return 0;
    const n = Number(snap.data?.()?.total ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Place a like.
 *  • Omit `eventId` (or pass empty) → profile-level like from a user card: likes ANY user,
 *    friend or not, no activity event required. This is the card path.
 *  • Pass an `eventId` → event-level like (friends activity feed / league group boost).
 * Both honour the shared one-like-per-UTC-day quota; a same-day repeat replays idempotently.
 */
export async function sendFriendActivityLike(data: {
  targetUid: string;
  eventId?: string;
  senderDisplayName?: string;
}): Promise<FriendActivityLikeResponse> {
  if (!isFriendActivityLikesCloudEnabled()) {
    throw new Error('friend_activity_likes_unavailable');
  }
  const senderStableId = await ensureAnonUser();
  if (!senderStableId) {
    throw new Error('sender_unavailable');
  }
  if (!data.targetUid) {
    throw new Error('target_unavailable');
  }
  await ensureActivityLikeAuthLink(senderStableId);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<
    { senderStableId: string; targetStableId: string; eventId?: string; senderDisplayName?: string },
    FriendActivityLikeResponse
  >('friendLikeActivity');
  const res = await fn({
    senderStableId,
    targetStableId: data.targetUid,
    eventId: data.eventId ?? '',
    senderDisplayName: data.senderDisplayName ?? '',
  });
  return res.data;
}

/**
 * Remove today's like (toggle off). Mirror of sendFriendActivityLike: omit `eventId` for a
 * profile-level like, pass it for an event like. The server only removes the like if it still
 * matches today's recorded like, then frees the daily quota.
 */
export async function removeFriendActivityLike(data: {
  targetUid: string;
  eventId?: string;
}): Promise<FriendActivityUnlikeResponse> {
  if (!isFriendActivityLikesCloudEnabled()) {
    throw new Error('friend_activity_likes_unavailable');
  }
  const senderStableId = await ensureAnonUser();
  if (!senderStableId) {
    throw new Error('sender_unavailable');
  }
  if (!data.targetUid) {
    throw new Error('target_unavailable');
  }
  await ensureActivityLikeAuthLink(senderStableId);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<
    { senderStableId: string; targetStableId: string; eventId?: string },
    FriendActivityUnlikeResponse
  >('friendUnlikeActivity');
  const res = await fn({
    senderStableId,
    targetStableId: data.targetUid,
    eventId: data.eventId ?? '',
  });
  return res.data;
}

/**
 * Load the likes the current user has received (most recent first) so the activity feed can
 * show "X liked you". Reads users/{myUid}/activity_likes_received, owner-gated by rules.
 */
export async function fetchActivityLikesReceived(limit = 30): Promise<ActivityLikeReceived[]> {
  if (!isFriendActivityLikesCloudEnabled()) return [];
  const myUid = await getCanonicalUserId();
  if (!myUid) return [];
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection('users')
      .doc(myUid)
      .collection('activity_likes_received')
      .orderBy('ts', 'desc')
      .limit(Math.max(1, Math.min(100, Math.floor(limit))))
      .get();
    const out: ActivityLikeReceived[] = [];
    for (const doc of snap.docs as Array<{ id: string; data: () => Record<string, unknown> }>) {
      const d = doc.data() ?? {};
      const ts = Number(d.ts);
      if (!Number.isFinite(ts)) continue;
      out.push({
        id: doc.id,
        date: String(d.date ?? ''),
        eventId: String(d.eventId ?? ''),
        fromUid: String(d.fromUid ?? ''),
        fromName: String(d.fromName ?? '').trim() || 'Friend',
        ts,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
