import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { buildUserNotification, userNotificationRef } from './user_notifications';

const REGION = 'us-central1';
const IDEAS_COLLECTION = 'user_ideas';

function cleanId(value: unknown, max = 180): string {
  const id = String(value ?? '').trim().slice(0, max);
  return id && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id) ? id : '';
}

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function senderName(data: Record<string, unknown>): string {
  const progress = data.progress && typeof data.progress === 'object' ? data.progress as Record<string, unknown> : {};
  return String(progress.user_name ?? data.displayName ?? data.name ?? 'Phraseman user').trim().slice(0, 80) || 'Phraseman user';
}

function receiptId(senderUid: string, ideaId: string): string {
  return `il_${createHash('sha256').update(`idea-like-v1\0${senderUid}\0${ideaId}`, 'utf8').digest('hex').slice(0, 48)}`;
}

function receivedId(senderUid: string, ideaId: string): string {
  return `ilr_${createHash('sha256').update(`idea-like-received-v1\0${senderUid}\0${ideaId}`, 'utf8').digest('hex').slice(0, 48)}`;
}

function notificationId(senderUid: string, ideaId: string): string {
  return `idea_like_${senderUid}_${ideaId}`.slice(0, 160);
}

function readIdeaId(request: { data?: unknown }): string {
  const data = (request.data ?? {}) as Record<string, unknown>;
  const ideaId = cleanId(data.ideaId);
  if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');
  return ideaId;
}

export const likeUserIdea = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 15, memory: '256MiB', maxInstances: 20 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const ideaId = readIdeaId(request);
    const senderUid = await resolveStableUidForAuth(db, request.auth.uid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const senderRef = db.collection('users').doc(senderUid);
    const now = Date.now();

    return db.runTransaction(async (tx) => {
      const ideaSnap = await tx.get(ideaRef);
      if (!ideaSnap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea = ideaSnap.data() as Record<string, unknown>;
      if (!['published', 'approved', 'in_progress', 'implemented'].includes(String(idea.status ?? ''))) {
        throw new HttpsError('not-found', 'idea_not_found');
      }
      const authorUid = cleanId(idea.uid);
      if (!authorUid) throw new HttpsError('failed-precondition', 'idea_missing_author');
      if (authorUid === senderUid) throw new HttpsError('failed-precondition', 'self_like_not_allowed');

      const sentRef = senderRef.collection('idea_likes_sent').doc(ideaId);
      const authorRef = db.collection('users').doc(authorUid);
      const statsRef = authorRef.collection('activity_like_stats').doc('summary');
      const receivedRef = authorRef.collection('activity_likes_received').doc(receivedId(senderUid, ideaId));
      const notificationRef = userNotificationRef(db, authorUid, notificationId(senderUid, ideaId));
      const [sentSnap, senderSnap, statsSnap] = await Promise.all([tx.get(sentRef), tx.get(senderRef), tx.get(statsRef)]);
      const currentLikeCount = count(idea.likeCount);
      const currentTotal = count(statsSnap.data()?.total);
      if (sentSnap.exists) {
        return { ok: true, liked: true, ideaId, likeCount: currentLikeCount, authorLikeTotal: currentTotal, idempotentReplay: true };
      }
      const fromName = senderName((senderSnap.exists ? senderSnap.data() : {}) as Record<string, unknown>);
      tx.set(sentRef, { ideaId, targetAuthorUid: authorUid, kind: 'idea', createdAtMs: now, createdAtIso: new Date(now).toISOString() });
      tx.set(ideaRef, { likeCount: currentLikeCount + 1, updatedAtMs: now }, { merge: true });
      tx.set(receivedRef, { kind: 'idea', ideaId, eventId: `idea:${ideaId}`, fromUid: senderUid, fromName, ts: now, tsIso: new Date(now).toISOString() });
      tx.set(statsRef, { total: currentTotal + 1, updatedAt: now, lastFromUid: senderUid, lastFromName: fromName, lastEventId: `idea:${ideaId}` }, { merge: true });
      tx.set(notificationRef, buildUserNotification({ type: 'activity_like', fromUid: senderUid, fromName, text: 'Пользователь поддержал твою идею.', nav: { kind: 'idea', ideaId, action: 'like' } }, now));
      return { ok: true, liked: true, ideaId, likeCount: currentLikeCount + 1, authorLikeTotal: currentTotal + 1, idempotentReplay: false };
    });
  },
);

export const unlikeUserIdea = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 15, memory: '256MiB', maxInstances: 20 },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const ideaId = readIdeaId(request);
    const senderUid = await resolveStableUidForAuth(db, request.auth.uid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const sentRef = db.collection('users').doc(senderUid).collection('idea_likes_sent').doc(ideaId);
    const now = Date.now();

    return db.runTransaction(async (tx) => {
      const ideaSnap = await tx.get(ideaRef);
      if (!ideaSnap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea = ideaSnap.data() as Record<string, unknown>;
      const authorUid = cleanId(idea.uid);
      if (!authorUid) throw new HttpsError('failed-precondition', 'idea_missing_author');
      const authorRef = db.collection('users').doc(authorUid);
      const statsRef = authorRef.collection('activity_like_stats').doc('summary');
      const receivedRef = authorRef.collection('activity_likes_received').doc(receivedId(senderUid, ideaId));
      const [sentSnap, statsSnap] = await Promise.all([tx.get(sentRef), tx.get(statsRef)]);
      const currentLikeCount = count(idea.likeCount);
      const currentTotal = count(statsSnap.data()?.total);
      if (!sentSnap.exists) return { ok: true, removed: false, ideaId, likeCount: currentLikeCount, authorLikeTotal: currentTotal };
      tx.delete(sentRef);
      tx.delete(receivedRef);
      tx.set(ideaRef, { likeCount: Math.max(0, currentLikeCount - 1), updatedAtMs: now }, { merge: true });
      tx.set(statsRef, { total: Math.max(0, currentTotal - 1), updatedAt: now }, { merge: true });
      return { ok: true, removed: true, ideaId, likeCount: Math.max(0, currentLikeCount - 1), authorLikeTotal: Math.max(0, currentTotal - 1) };
    });
  },
);
