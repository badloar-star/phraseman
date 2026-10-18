// Home Polls v2: one atomic vote per account and question.
// The per-account document stores answered booleans only. The selected option is
// used to update aggregate counters inside the transaction and is never retained.
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { resolveStableUidForAuthInTransaction } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  HOME_POLLS_V2_COLLECTION,
  HOME_POLLS_V2_VOTES_SUBCOLLECTION,
  assertHomePollV2StableIdentity,
  decideHomePollV2Vote,
  normalizeHomePollV2VoteInput,
  type HomePollV2Counts,
  type HomePollV2VoteInput,
} from './home_poll_v2_core';

const LOG = '[POLLS-V2]';

export type HomePollV2VoteResult = Readonly<{
  ok: true;
  status: 'accepted' | 'already_answered';
  counts: HomePollV2Counts;
  voteCount: number;
}>;

type HomePollV2TransactionArgs = Readonly<{
  db: admin.firestore.Firestore;
  transaction: admin.firestore.Transaction;
  setRef: admin.firestore.DocumentReference;
  authUid: string;
  input: HomePollV2VoteInput;
  startedAt: number;
  resolveStableUid?: typeof resolveStableUidForAuthInTransaction;
}>;

/** Exported for a focused no-mutation regression around account switches. */
export async function applyHomePollV2VoteTransaction({
  db,
  transaction,
  setRef,
  authUid,
  input,
  startedAt,
  resolveStableUid = resolveStableUidForAuthInTransaction,
}: HomePollV2TransactionArgs): Promise<HomePollV2VoteResult> {
  // Identity/deletion fences and the vote must share one Firestore snapshot.
  // A relink or delete racing this callable must not write under a retired uid.
  const stableUid = await resolveStableUid(db, transaction, authUid);
  assertHomePollV2StableIdentity(input.stableId, stableUid);
  const voteRef = setRef.collection(HOME_POLLS_V2_VOTES_SUBCOLLECTION).doc(stableUid);
  const [setSnap, voteSnap] = await Promise.all([transaction.get(setRef), transaction.get(voteRef)]);
  const nowMs = Date.now();
  const decision = decideHomePollV2Vote({
    set: setSnap.exists ? (setSnap.data() ?? null) : null,
    vote: voteSnap.exists ? (voteSnap.data() ?? null) : null,
    input,
    nowMs,
  });
  logger.info(`${LOG} vote:decision`, {
    setId: input.setId,
    questionId: input.questionId,
    decision: decision.kind,
    reason: decision.kind === 'reject' ? decision.reason : null,
    ms: nowMs - startedAt,
  });
  if (decision.kind === 'reject') throw new HttpsError(decision.code, decision.reason, { reason: decision.reason });
  if (decision.kind === 'already_answered') {
    return { ok: true, status: 'already_answered', counts: decision.counts, voteCount: decision.voteCount };
  }

  transaction.set(voteRef, {
    userId: stableUid,
    answered: { [input.questionId]: true },
    updatedAtMs: nowMs,
    createdAtMs: voteSnap.exists ? (voteSnap.data()?.createdAtMs ?? nowMs) : nowMs,
  }, { merge: true });
  transaction.update(setRef, {
    [`counts.${input.questionId}.${input.optionId}`]: admin.firestore.FieldValue.increment(1),
    [`voteCounts.${input.questionId}`]: admin.firestore.FieldValue.increment(1),
    lastVoteAtMs: nowMs,
  });
  return { ok: true, status: 'accepted', counts: decision.counts, voteCount: decision.voteCount };
}

export const homePollV2Vote = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<HomePollV2VoteResult> => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const input = normalizeHomePollV2VoteInput(request.data);
  const db = admin.firestore();
  const setRef = db.collection(HOME_POLLS_V2_COLLECTION).doc(input.setId);
  const startedAt = Date.now();

  return db.runTransaction((transaction) => applyHomePollV2VoteTransaction({
    db,
    transaction,
    setRef,
    authUid: request.auth!.uid,
    input,
    startedAt,
  }));
});
