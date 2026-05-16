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

async function deleteMessageWithReactions(
  db: FirebaseFirestore.Firestore,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const reactions = await doc.ref.collection('reactions').limit(400).get();
    if (reactions.empty) break;
    const batch = db.batch();
    reactions.docs.forEach((reaction) => batch.delete(reaction.ref));
    await batch.commit();
  }
  while (true) {
    const states = await db.collectionGroup('app_message_states').where('messageId', '==', doc.id).limit(400).get();
    if (states.empty) break;
    const batch = db.batch();
    states.docs.forEach((state) => batch.delete(state.ref));
    await batch.commit();
  }
  await doc.ref.delete();
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
    await deleteMessageWithReactions(db, doc);
    deleted += 1;
  }

  return { deleted, scanned: snap.size };
}

function reactionDelta(reaction: unknown): { like: number; dislike: number } {
  if (reaction === 'like') return { like: 1, dislike: 0 };
  if (reaction === 'dislike') return { like: 0, dislike: 1 };
  return { like: 0, dislike: 0 };
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
