import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { arenaSeasonWindow } from './arena_v2_core';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

export const DEV_RUNES_GRANT_AMOUNT = 5_000;

const DEV_GRANT_FLAG = 'dev_shards_grant_enabled';
const OP_ID_RE = /^dev_runes:[A-Za-z0-9_.-]{8,96}$/;
const DAY_MS = 24 * 60 * 60 * 1_000;

export function isDevRunesGrantEnabled(remoteConfig: unknown): boolean {
  if (!remoteConfig || typeof remoteConfig !== 'object') return false;
  const numbers = (remoteConfig as { numbers?: unknown }).numbers;
  if (!numbers || typeof numbers !== 'object') return false;
  return Number((numbers as Record<string, unknown>)[DEV_GRANT_FLAG]) === 1;
}

function isoWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Fixed DEV grant: the request chooses identity/idempotency, never the amount. */
export const devRunesGrant = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const requestedStableId = String(request.data?.stableId ?? '').trim();
  const opId = String(request.data?.opId ?? '').trim();
  const createdAtMs = Number(request.data?.createdAtMs);
  if (!requestedStableId) throw new HttpsError('invalid-argument', 'stable_id_required');
  if (!OP_ID_RE.test(opId)) throw new HttpsError('invalid-argument', 'dev_runes_op_id_invalid');
  if (!Number.isSafeInteger(createdAtMs) || createdAtMs < 0) {
    throw new HttpsError('invalid-argument', 'dev_runes_created_at_invalid');
  }

  const db = admin.firestore();
  const configSnap = await db.collection('remote_config').doc('app').get();
  if (!isDevRunesGrantEnabled(configSnap.data())) {
    throw new HttpsError('permission-denied', 'dev_runes_grant_disabled');
  }

  const stableUid = await resolveStableUidForAuth(db, request.auth.uid, requestedStableId, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  if (stableUid !== requestedStableId) {
    throw new HttpsError('permission-denied', 'stable_id_mismatch');
  }

  const nowMs = Date.now();
  const userRef = db.collection('users').doc(stableUid);
  return db.runTransaction(async (tx) => {
    beginStarLedgerTransactionAttempt(tx);
    const existingOperationRef = userRef.collection('star_operations').doc(opId);
    const [userSnap, existingOperationSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(existingOperationRef),
    ]);
    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    const existingEarnedAtMs = Number(existingOperationSnap.data()?.earnedAtMs);
    const immutableEarnedAtMs = existingOperationSnap.exists
      && Number.isSafeInteger(existingEarnedAtMs) && existingEarnedAtMs >= 0
      ? existingEarnedAtMs
      : createdAtMs;

    const operation: StarOpRequest = {
      opId,
      delta: DEV_RUNES_GRANT_AMOUNT,
      reason: 'admin_grant',
      sourceKind: 'dev_runes_grant',
      sourceId: opId,
      ruleVersion: 1,
      earnedAtMs: createdAtMs,
      meta: { authUid: request.auth!.uid },
    };
    operation.earnedAtMs = immutableEarnedAtMs;
    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, [operation], {
      nowMs,
      activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
      weekKeyNow: isoWeekKey(nowMs),
      authUid: request.auth!.uid,
    });
    const committed = commitStarOperations(tx, prepared);
    const outcome = committed.outcomes[0];
    if (!outcome || outcome.status === 'rejected') {
      throw new HttpsError('failed-precondition', outcome?.errorCode ?? 'dev_runes_grant_rejected');
    }
    return {
      ok: true,
      alreadyApplied: outcome.status === 'already_applied',
      granted: DEV_RUNES_GRANT_AMOUNT,
      eventId: opId,
      stars: committed.balance,
      starsEarnedTotal: committed.earnedTotal,
      starsSeq: committed.seq,
    };
  });
});
