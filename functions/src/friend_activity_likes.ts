import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const MAX_ID_LEN = 160;

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

export const friendLikeActivity = onCall({ region: REGION, enforceAppCheck: false }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }

  const senderStableId = cleanDocId(request.data?.senderStableId);
  const targetStableId = cleanDocId(request.data?.targetStableId);
  const eventId = cleanDocId(request.data?.eventId);

  if (!senderStableId || !targetStableId || !eventId) {
    throw new HttpsError('invalid-argument', 'Valid sender, target and event ids required');
  }
  if (senderStableId === targetStableId) {
    throw new HttpsError('failed-precondition', 'Self activity likes are not allowed');
  }

  const db = admin.firestore();
  const senderRef = db.collection('users').doc(senderStableId);
  const targetRef = db.collection('users').doc(targetStableId);
  const eventRef = targetRef.collection('my_events').doc(eventId);
  const statsRef = targetRef.collection('activity_like_stats').doc('summary');
  const today = todayStrUtc();
  const dailyLimitRef = senderRef.collection('friend_activity_like_daily_limits').doc(today);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  return db.runTransaction(async (tx) => {
    const [senderSnap, eventSnap, statsSnap, dailyLimitSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(eventRef),
      tx.get(statsRef),
      tx.get(dailyLimitRef),
    ]);

    if (!senderSnap.exists) {
      throw new HttpsError('not-found', 'Sender user not found');
    }
    if (!eventSnap.exists) {
      throw new HttpsError('not-found', 'Activity event not found');
    }
    if (dailyLimitSnap.exists) {
      throw new HttpsError('resource-exhausted', 'Daily activity like limit reached');
    }

    const senderData = senderSnap.data() ?? {};
    const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
    if (linkedAuthUid !== request.auth!.uid && senderStableId !== request.auth!.uid) {
      throw new HttpsError('permission-denied', 'Sender does not match auth user');
    }

    const eventData = eventSnap.data() ?? {};
    if (String(eventData.uid ?? targetStableId) !== targetStableId) {
      throw new HttpsError('failed-precondition', 'Activity event owner mismatch');
    }

    const eventLikeCount = parseCount(eventData.activityLikeCount) + 1;
    const totalLikeCount = parseCount(statsSnap.data()?.total) + 1;

    const senderProgress = (senderData.progress && typeof senderData.progress === 'object')
      ? senderData.progress as Record<string, unknown>
      : {};
    const senderName =
      cleanDisplayName(request.data?.senderDisplayName) ||
      cleanDisplayName(senderData.displayName) ||
      cleanDisplayName(senderProgress.user_name) ||
      'Friend';

    tx.set(eventRef, {
      activityLikeCount: eventLikeCount,
      activityLikedAt: now,
      lastActivityLikeFromUid: senderStableId,
      lastActivityLikeFromName: senderName,
    }, { merge: true });

    tx.set(statsRef, {
      total: totalLikeCount,
      updatedAt: now,
      lastFromUid: senderStableId,
      lastFromName: senderName,
      lastEventId: eventId,
    }, { merge: true });

    tx.set(dailyLimitRef, {
      date: today,
      targetUid: targetStableId,
      eventId,
      createdAt: now,
      createdAtIso: nowIso,
    });

    tx.set(targetRef.collection('activity_likes_received').doc(`${today}_${senderStableId}_${eventId}`), {
      date: today,
      eventId,
      fromUid: senderStableId,
      fromName: senderName,
      ts: now,
      tsIso: nowIso,
    });

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
