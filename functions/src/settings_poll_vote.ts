import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const REGION = 'us-central1';
type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedId(value: unknown, name: string, max: number): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > max || !/^[A-Za-z0-9._:-]+$/.test(normalized)) {
    throw new HttpsError('invalid-argument', `${name}_invalid`);
  }
  return normalized;
}

export type NormalizedSettingsPollVoteInput = {
  messageId: string;
  optionId: string;
  requestId: string;
  stableId: string;
};

export function normalizeSettingsPollVoteInput(data: unknown): NormalizedSettingsPollVoteInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request_object_required');
  return {
    messageId: boundedId(data.messageId, 'message_id', 160),
    optionId: boundedId(data.optionId, 'option_id', 80),
    requestId: boundedId(data.requestId, 'request_id', 160),
    stableId: boundedId(data.stableId, 'stable_id', 160),
  };
}

export function validateSettingsPollCampaign(data: RecordValue, optionId: string, nowMs: number): void {
  if (data.active !== true) throw new HttpsError('failed-precondition', 'settings_poll_inactive');
  if (data.deliverySurface !== 'settings' || (data.settingsSlot !== 'top' && data.settingsSlot !== 'bottom')) {
    throw new HttpsError('failed-precondition', 'settings_poll_surface_invalid');
  }
  if (data.kind !== 'poll' || data.voteMode !== 'fixed') {
    throw new HttpsError('failed-precondition', 'settings_poll_mode_invalid');
  }
  const expiresAtMs = Number(data.expiresAtMs ?? 0);
  if (expiresAtMs > 0 && expiresAtMs <= nowMs) throw new HttpsError('failed-precondition', 'settings_poll_expired');
  const poll = isRecord(data.poll) ? data.poll : {};
  const optionIds = Array.isArray(poll.optionIds) ? poll.optionIds.map(String) : [];
  if (!optionIds.includes(optionId)) throw new HttpsError('invalid-argument', 'settings_poll_option_invalid');
}

export const submitSettingsPollVote = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const authUid = String(request.auth?.uid ?? '').trim();
    if (!authUid) throw new HttpsError('unauthenticated', 'authentication_required');
    const input = normalizeSettingsPollVoteInput(request.data);
    const db = admin.firestore();
    const stableUid = await resolveStableUidForAuth(db, authUid, input.stableId);
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const voteRef = messageRef.collection('fixed_poll_votes').doc(stableUid);
    return db.runTransaction(async (transaction) => {
      const [messageSnap, voteSnap] = await Promise.all([
        transaction.get(messageRef),
        transaction.get(voteRef),
      ]);
      if (voteSnap.exists) {
        return {
          accepted: false,
          alreadyVoted: true,
          optionId: String(voteSnap.data()?.optionId ?? ''),
        };
      }
      if (!messageSnap.exists) throw new HttpsError('not-found', 'settings_poll_not_found');
      const campaign = messageSnap.data() ?? {};
      validateSettingsPollCampaign(campaign, input.optionId, Date.now());
      transaction.create(voteRef, {
        messageId: input.messageId,
        userId: stableUid,
        optionId: input.optionId,
        requestId: input.requestId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
      });
      transaction.update(messageRef, {
        [`poll.counts.${input.optionId}`]: admin.firestore.FieldValue.increment(1),
        [`pollCounts.${input.optionId}`]: admin.firestore.FieldValue.increment(1),
        'poll.voteCount': admin.firestore.FieldValue.increment(1),
        pollVoteCount: admin.firestore.FieldValue.increment(1),
        pollCountUpdatedAtMs: Date.now(),
      });
      return { accepted: true, alreadyVoted: false, optionId: input.optionId };
    });
  },
);
