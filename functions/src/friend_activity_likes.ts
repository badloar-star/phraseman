import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { buildUserNotification, userNotificationRef } from './user_notifications';

const REGION = 'us-central1';
const MAX_ID_LEN = 160;
/** Stable event id for a profile-level (eventless) like. */
const PROFILE_LIKE_EVENT_ID = '__profile__';

function cleanId(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanDocId(value: unknown): string {
  const id = cleanId(value);
  if (!id || id.length > MAX_ID_LEN || id.includes('/') || id === '.' || id === '..') return '';
  return id;
}

function todayStrUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function cleanDisplayName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function resolveSenderName(senderData: Record<string, unknown>, requestDisplayName: unknown): string {
  const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
    ? senderData.progress as Record<string, unknown>
    : {};
  return (
    cleanDisplayName(requestDisplayName) ||
    cleanDisplayName(senderData.displayName) ||
    cleanDisplayName(senderProgress.user_name) ||
    'Friend'
  );
}

function resolveSenderAvatar(senderData: Record<string, unknown>): string {
  const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
    ? senderData.progress as Record<string, unknown>
    : {};
  return String(senderProgress.user_avatar ?? '').trim().slice(0, 200);
}

/** Persistent state belongs to the sender, so target + event are unique in that subcollection. */
function activityLikeRecordId(targetStableId: string, eventId: string): string {
  const digest = createHash('sha256')
    .update(`activity-like-v2\0${targetStableId}\0${eventId}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
  return `al_${digest}`;
}

/**
 * Receiver-side history is shared by every sender. Include both actors so two people liking
 * the same post cannot overwrite each other's audit row or notification.
 */
function activityLikeReceiptId(senderStableId: string, targetStableId: string, eventId: string): string {
  const digest = createHash('sha256')
    .update(`activity-like-received-v2\0${senderStableId}\0${targetStableId}\0${eventId}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
  return `alr_${digest}`;
}

function likeNotificationId(receiptId: string): string {
  return `like_${receiptId}`;
}

/**
 * Validates the call envelope (auth + ids) and that the claimed sender stable id is
 * really owned by the authed user. Returns the resolved ids; throws HttpsError otherwise.
 * `eventId` is optional: when empty the caller is a profile-level (eventless) like from a
 * user card, where any user — friend or not — may be liked.
 */
function readIds(request: { auth?: { uid?: string } | null; data?: unknown }): {
  authUid: string;
  senderStableId: string;
  targetStableId: string;
  eventId: string;
  isProfileLike: boolean;
} {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const data = (request.data ?? {}) as Record<string, unknown>;
  const senderStableId = cleanDocId(data.senderStableId);
  const targetStableId = cleanDocId(data.targetStableId);
  const rawEventId = cleanId(data.eventId);
  const isProfileLike = rawEventId === '';
  const eventId = isProfileLike ? PROFILE_LIKE_EVENT_ID : cleanDocId(data.eventId);

  if (!senderStableId || !targetStableId || !eventId) {
    throw new HttpsError('invalid-argument', 'Valid sender, target and event ids required');
  }
  if (senderStableId === targetStableId) {
    throw new HttpsError('failed-precondition', 'Self activity likes are not allowed');
  }
  return { authUid: request.auth.uid, senderStableId, targetStableId, eventId, isProfileLike };
}

/**
 * Like a friend's activity.
 *
 * Two modes, chosen by whether `eventId` is supplied:
 *  • event-mode (eventId present) — one persistent like per sender + target event. Requires
 *    the target's my_events/{eventId} doc to exist AND the users to be friends.
 *  • profile-mode (eventId absent) — one persistent like per sender + user card. ANY user may
 *    be liked (friend or not); no activity event is required.
 *
 * There is deliberately no global daily quota. Replaying the same unique like is idempotent,
 * while liking another post or another user card is independent.
 */
export const friendLikeActivity = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { authUid, senderStableId, targetStableId, eventId, isProfileLike } = readIds(request);

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const targetRef = db.collection('users').doc(targetStableId);
  const targetFriendRef = targetRef.collection('friends').doc(senderStableId);
  const eventRef = targetRef.collection('my_events').doc(eventId);
  const statsRef = targetRef.collection('activity_like_stats').doc('summary');
  const today = todayStrUtc();
  const recordId = activityLikeRecordId(targetStableId, eventId);
  const receiptId = activityLikeReceiptId(senderStableId, targetStableId, eventId);
  const sentLikeRef = senderRef.collection('friend_activity_likes_sent').doc(recordId);
  // Legacy one-per-day documents are queried across every date only to migrate an
  // already placed like. This prevents a pre-cutover like from being counted again.
  const legacyLikeQuery = senderRef.collection('friend_activity_like_daily_limits')
    .where('targetUid', '==', targetStableId)
    .where('eventId', '==', eventId)
    .limit(1);
  const receivedRef = targetRef
    .collection('activity_likes_received')
    .doc(receiptId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  return db.runTransaction(async (tx) => {
    const [senderSnap, targetFriendSnap, eventSnap, statsSnap, sentLikeSnap, legacyLikeSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(targetFriendRef),
      isProfileLike ? Promise.resolve(null) : tx.get(eventRef),
      tx.get(statsRef),
      tx.get(sentLikeRef),
      tx.get(legacyLikeQuery),
    ]);

    if (!senderSnap.exists) {
      throw new HttpsError('not-found', 'Sender user not found');
    }
    // Event-mode requires a real activity event to attach the like to.
    if (!isProfileLike && (!eventSnap || !eventSnap.exists)) {
      throw new HttpsError('not-found', 'Activity event not found');
    }
    const senderData = senderSnap.data() ?? {};
    const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
    if (linkedAuthUid !== authUid && senderStableId !== authUid) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }
    const eventData = (eventSnap?.data?.() ?? {}) as Record<string, unknown>;
    if (sentLikeSnap.exists) {
      return {
        ok: true,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: parseCount(eventData.activityLikeCount),
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total),
        idempotentReplay: true,
      };
    }
    const legacyLikeDoc = legacyLikeSnap.docs[0];
    const dailyLimitData = legacyLikeDoc?.data() ?? null;
    const alreadyLikedSameEvent =
      !!dailyLimitData &&
      cleanDocId(dailyLimitData.targetUid) === targetStableId &&
      cleanDocId(dailyLimitData.eventId) === eventId;
    if (alreadyLikedSameEvent) {
      const legacyCreatedAt = Number(dailyLimitData.createdAt);
      tx.set(sentLikeRef, {
        targetUid: targetStableId,
        eventId,
        kind: isProfileLike ? 'profile' : 'event',
        createdAt: Number.isFinite(legacyCreatedAt) ? legacyCreatedAt : now,
        createdAtIso: String(dailyLimitData.createdAtIso || nowIso),
        legacyDate: legacyLikeDoc.id,
        migratedAt: now,
      });
      tx.delete(legacyLikeDoc.ref);
      return {
        ok: true,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: parseCount(eventData.activityLikeCount),
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total),
        idempotentReplay: true,
        migratedLegacy: true,
      };
    }
    // Event-mode keeps the original friends-only gate. Profile-mode (card) is open to all.
    if (!isProfileLike && !targetFriendSnap.exists) {
      throw new HttpsError('failed-precondition', 'Users are not friends');
    }

    const eventLikeCount = parseCount(eventData.activityLikeCount) + 1;
    const totalLikeCount = parseCount(statsSnap.data()?.total) + 1;
    const eventType = cleanId(eventData.type);
    const leagueGroupId = cleanDocId(eventData.groupId);
    const senderName = resolveSenderName(senderData, (request.data as Record<string, unknown>)?.senderDisplayName);

    if (!isProfileLike) {
      tx.set(eventRef, {
        uid: targetStableId,
        activityLikeCount: eventLikeCount,
        activityLikedAt: now,
        lastActivityLikeFromUid: senderStableId,
        lastActivityLikeFromName: senderName,
      }, { merge: true });
    }

    tx.set(statsRef, {
      total: totalLikeCount,
      updatedAt: now,
      lastFromUid: senderStableId,
      lastFromName: senderName,
      lastEventId: eventId,
    }, { merge: true });

    tx.set(sentLikeRef, {
      date: today,
      targetUid: targetStableId,
      eventId,
      kind: isProfileLike ? 'profile' : 'event',
      createdAt: now,
      createdAtIso: nowIso,
    });

    tx.set(receivedRef, {
      date: today,
      eventId,
      kind: isProfileLike ? 'profile' : 'event',
      fromUid: senderStableId,
      fromName: senderName,
      ts: now,
      tsIso: nowIso,
    });

    // Единый центр событий: «X поставил вам лайк» (раньше жило только в ленте друзей).
    tx.set(
      userNotificationRef(db, targetStableId, likeNotificationId(receiptId)),
      buildUserNotification({
        type: 'activity_like',
        fromUid: senderStableId,
        fromName: senderName,
        fromAvatar: resolveSenderAvatar(senderData),
        nav: { kind: 'friends' },
      }, now),
    );

    if (eventType === 'league_group_boost' && leagueGroupId && eventId.startsWith('league_group_boost_')) {
      tx.set(db.collection('league_groups').doc(leagueGroupId), {
        groupBoost: {
          likeCount: eventLikeCount,
        },
        updatedAt: now,
      }, { merge: true });
    }

    return {
      ok: true,
      date: today,
      targetUid: targetStableId,
      eventId,
      activityLikeCount: eventLikeCount,
      targetActivityLikeTotal: totalLikeCount,
    };
  });
});

/**
 * Remove the sender's persistent like for this exact target + event/profile. A stale client
 * cannot decrement an unrelated counter because the sent record is deterministic and its
 * payload must match. Idempotent: removing an already absent like is a no-op.
 */
export const friendUnlikeActivity = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { authUid, senderStableId, targetStableId, eventId, isProfileLike } = readIds(request);

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const targetRef = db.collection('users').doc(targetStableId);
  const eventRef = targetRef.collection('my_events').doc(eventId);
  const statsRef = targetRef.collection('activity_like_stats').doc('summary');
  const today = todayStrUtc();
  const recordId = activityLikeRecordId(targetStableId, eventId);
  const receiptId = activityLikeReceiptId(senderStableId, targetStableId, eventId);
  const sentLikeRef = senderRef.collection('friend_activity_likes_sent').doc(recordId);
  const legacyLikeQuery = senderRef.collection('friend_activity_like_daily_limits')
    .where('targetUid', '==', targetStableId)
    .where('eventId', '==', eventId)
    .limit(1);
  const receivedRef = targetRef
    .collection('activity_likes_received')
    .doc(receiptId);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [senderSnap, eventSnap, statsSnap, sentLikeSnap, legacyLikeSnap] = await Promise.all([
      tx.get(senderRef),
      isProfileLike ? Promise.resolve(null) : tx.get(eventRef),
      tx.get(statsRef),
      tx.get(sentLikeRef),
      tx.get(legacyLikeQuery),
    ]);

    if (!senderSnap.exists) {
      throw new HttpsError('not-found', 'Sender user not found');
    }
    const senderData = senderSnap.data() ?? {};
    const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
    if (linkedAuthUid !== authUid && senderStableId !== authUid) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }

    const eventData = (eventSnap?.data?.() ?? {}) as Record<string, unknown>;
    const sentLikeData = sentLikeSnap.exists ? (sentLikeSnap.data() ?? {}) : null;
    const sentLikeMatches =
      !!sentLikeData &&
      cleanDocId(sentLikeData.targetUid) === targetStableId &&
      cleanDocId(sentLikeData.eventId) === eventId;
    const legacyLikeDoc = legacyLikeSnap.docs[0];
    const limitData = legacyLikeDoc?.data() ?? null;
    const limitMatchesThisLike =
      !!limitData &&
      cleanDocId(limitData.targetUid) === targetStableId &&
      cleanDocId(limitData.eventId) === eventId;

    // Legacy daily state remains removable during the rolling migration.
    if (!sentLikeMatches && !limitMatchesThisLike) {
      return {
        ok: true,
        removed: false,
        date: today,
        targetUid: targetStableId,
        eventId,
        activityLikeCount: parseCount(eventData.activityLikeCount),
        targetActivityLikeTotal: parseCount(statsSnap.data()?.total),
      };
    }

    const eventLikeCount = Math.max(0, parseCount(eventData.activityLikeCount) - 1);
    const totalLikeCount = Math.max(0, parseCount(statsSnap.data()?.total) - 1);
    const eventType = cleanId(eventData.type);
    const leagueGroupId = cleanDocId(eventData.groupId);

    if (!isProfileLike && eventSnap?.exists) {
      tx.set(eventRef, {
        uid: targetStableId,
        activityLikeCount: eventLikeCount,
        activityLikeRemovedAt: now,
      }, { merge: true });
    }

    tx.set(statsRef, {
      total: totalLikeCount,
      updatedAt: now,
    }, { merge: true });

    if (sentLikeMatches) tx.delete(sentLikeRef);
    if (limitMatchesThisLike) tx.delete(legacyLikeDoc.ref);
    tx.delete(receivedRef);
    tx.delete(userNotificationRef(db, targetStableId, likeNotificationId(receiptId)));

    const legacyDate = cleanId(sentLikeData?.legacyDate) || (limitMatchesThisLike ? legacyLikeDoc.id : '');
    if (legacyDate) {
      tx.delete(targetRef.collection('activity_likes_received').doc(`${legacyDate}_${senderStableId}_${eventId}`));
      tx.delete(userNotificationRef(db, targetStableId, `like_${legacyDate}_${senderStableId}_${eventId}`));
    }

    if (eventType === 'league_group_boost' && leagueGroupId && eventId.startsWith('league_group_boost_')) {
      tx.set(db.collection('league_groups').doc(leagueGroupId), {
        groupBoost: {
          likeCount: eventLikeCount,
        },
        updatedAt: now,
      }, { merge: true });
    }

    return {
      ok: true,
      removed: true,
      date: today,
      targetUid: targetStableId,
      eventId,
      activityLikeCount: eventLikeCount,
      targetActivityLikeTotal: totalLikeCount,
    };
  });
});
