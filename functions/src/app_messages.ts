import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';

const APP_MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

export async function deleteAppMessageWithEngagement(
  db: FirebaseFirestore.Firestore,
  messageRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const reactions = await messageRef.collection('reactions').limit(400).get();
    if (reactions.empty) break;
    const batch = db.batch();
    reactions.docs.forEach((reaction) => batch.delete(reaction.ref));
    await batch.commit();
  }
  while (true) {
    const votes = await messageRef.collection('poll_votes').limit(400).get();
    if (votes.empty) break;
    const batch = db.batch();
    votes.docs.forEach((vote) => batch.delete(vote.ref));
    await batch.commit();
  }
  while (true) {
    const states = await db.collectionGroup('app_message_states').where('messageId', '==', messageRef.id).limit(400).get();
    if (states.empty) break;
    const batch = db.batch();
    states.docs.forEach((state) => batch.delete(state.ref));
    await batch.commit();
  }
  await messageRef.delete();
}

export async function clearAppMessagePollEngagement(
  db: FirebaseFirestore.Firestore,
  messageRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  // Votes and the selected option in user state refer to the old option structure.
  // The message must be inactive before this helper is called, so rules reject new votes.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const votes = await messageRef.collection('poll_votes').limit(400).get();
    if (votes.empty) break;
    const batch = db.batch();
    votes.docs.forEach((vote) => batch.delete(vote.ref));
    await batch.commit();
  }
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = db.collectionGroup('app_message_states')
      .where('messageId', '==', messageRef.id)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(400);
    if (cursor) query = query.startAfter(cursor);
    const states = await query.get();
    if (states.empty) break;
    const batch = db.batch();
    const updatedAtMs = Date.now();
    states.docs.forEach((state) => batch.update(state.ref, {
      pollOptionId: admin.firestore.FieldValue.delete(),
      updatedAtMs,
    }));
    await batch.commit();
    cursor = states.docs[states.docs.length - 1];
    if (states.size < 400) break;
  }
}

export async function cleanupExpiredAppMessages(): Promise<{ deleted: number; scanned: number }> {
  const db = admin.firestore();
  const now = Date.now();
  const cutoff = now - APP_MESSAGE_TTL_MS;
  const snap = await db.collection('app_messages').orderBy('createdAtMs', 'asc').limit(200).get();
  let deleted = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const createdAtMs = toMs(data.createdAtMs ?? data.createdAt);
    const expiresAtMs = toMs(data.expiresAtMs ?? data.expiresAt);
    const expired = (expiresAtMs > 0 && expiresAtMs <= now) || (createdAtMs > 0 && createdAtMs <= cutoff);
    if (!expired) continue;
    await deleteAppMessageWithEngagement(db, doc.ref);
    deleted += 1;
  }

  return { deleted, scanned: snap.size };
}

function reactionDelta(reaction: unknown): { like: number; dislike: number } {
  if (reaction === 'like') return { like: 1, dislike: 0 };
  if (reaction === 'dislike') return { like: 0, dislike: 1 };
  return { like: 0, dislike: 0 };
}

function cleanPollOptionId(value: unknown): string {
  const raw = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(raw) ? raw : '';
}

export const onAppMessageReactionWritten = functions.firestore.onDocumentWritten(
  'app_messages/{messageId}/reactions/{userId}',
  async (event) => {
    const before = reactionDelta(event.data?.before.exists ? event.data.before.data()?.reaction : null);
    const after = reactionDelta(event.data?.after.exists ? event.data.after.data()?.reaction : null);
    const likeDelta = after.like - before.like;
    const dislikeDelta = after.dislike - before.dislike;
    if (likeDelta === 0 && dislikeDelta === 0) return;

    const messageId = String(event.params.messageId || '');
    if (!messageId) return;
    try {
      await admin.firestore().collection('app_messages').doc(messageId).update({
        likeCount: admin.firestore.FieldValue.increment(likeDelta),
        dislikeCount: admin.firestore.FieldValue.increment(dislikeDelta),
        reactionCountUpdatedAtMs: Date.now(),
      });
    } catch (e) {
      const code = (e as { code?: number | string } | null)?.code;
      if (code !== 5 && code !== 'not-found') {
        console.error('onAppMessageReactionWritten failed', { messageId, likeDelta, dislikeDelta, e });
      }
    }
  },
);

// Агрегат «сколько людей прочитали письмо». Состояние прочтения у каждого юзера лежит в
// users/{userId}/app_message_states/{messageId}. Когда readAtMs впервые становится > 0,
// инкрементим readCount на самом сообщении; при удалении прочитанного состояния — декремент.
// Так в админке видна метрика reach/read-rate без перебора подколлекций на каждый рефреш.
function isRead(data: FirebaseFirestore.DocumentData | undefined): boolean {
  return toMs(data?.readAtMs ?? data?.readAt) > 0;
}

export const onAppMessageStateWritten = functions.firestore.onDocumentWritten(
  'users/{userId}/app_message_states/{messageId}',
  async (event) => {
    const beforeRead = event.data?.before.exists ? isRead(event.data.before.data()) : false;
    const afterRead = event.data?.after.exists ? isRead(event.data.after.data()) : false;
    const delta = (afterRead ? 1 : 0) - (beforeRead ? 1 : 0);
    if (delta === 0) return;

    const messageId = String(event.params.messageId || '');
    if (!messageId) return;
    try {
      await admin.firestore().collection('app_messages').doc(messageId).update({
        readCount: admin.firestore.FieldValue.increment(delta),
        readCountUpdatedAtMs: Date.now(),
      });
    } catch (e) {
      // Сообщение могло быть удалено — это нормально, состояния чистятся отдельно.
      const code = (e as { code?: number | string } | null)?.code;
      if (code !== 5 && code !== 'not-found') {
        console.error('onAppMessageStateWritten failed', { messageId, delta, e });
      }
    }
  },
);

export const onAppMessagePollVoteWritten = functions.firestore.onDocumentWritten(
  'app_messages/{messageId}/poll_votes/{userId}',
  async (event) => {
    const beforeOptionId = cleanPollOptionId(event.data?.before.exists ? event.data.before.data()?.optionId : '');
    const afterOptionId = cleanPollOptionId(event.data?.after.exists ? event.data.after.data()?.optionId : '');
    const beforeUpdatedAtMs = toMs(event.data?.before.exists ? event.data.before.data()?.updatedAtMs : 0);

    const messageId = String(event.params.messageId || '');
    if (!messageId) return;
    const messageRef = admin.firestore().collection('app_messages').doc(messageId);
    let countedBeforeOptionId = beforeOptionId;

    if (beforeOptionId && beforeUpdatedAtMs > 0) {
      const messageSnap = await messageRef.get().catch(() => null);
      const pollResetAtMs = toMs(messageSnap?.exists ? messageSnap.data()?.pollResetAtMs : 0);
      if (pollResetAtMs >= beforeUpdatedAtMs) {
        countedBeforeOptionId = '';
      }
    }

    if (countedBeforeOptionId === afterOptionId) return;

    const update: Record<string, unknown> = {
      pollVoteCount: admin.firestore.FieldValue.increment((afterOptionId ? 1 : 0) - (countedBeforeOptionId ? 1 : 0)),
      pollCountUpdatedAtMs: Date.now(),
    };
    if (countedBeforeOptionId) {
      update[`pollCounts.${countedBeforeOptionId}`] = admin.firestore.FieldValue.increment(-1);
    }
    if (afterOptionId) {
      update[`pollCounts.${afterOptionId}`] = admin.firestore.FieldValue.increment(1);
    }

    try {
      await messageRef.update(update);
    } catch (e) {
      const code = (e as { code?: number | string } | null)?.code;
      if (code !== 5 && code !== 'not-found') {
        console.error('onAppMessagePollVoteWritten failed', { messageId, beforeOptionId, afterOptionId, e });
      }
    }
  },
);
