import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { arenaSeasonWindow } from './arena_v2_core';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { getWeekKey } from './progress_events';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpReceipt,
  type StarOpRequest,
} from './stars_ledger';

const STAR_AMOUNTS = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
} as const);
const REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;
const DELIVERY_TOKEN = /^[A-Za-z0-9_-]{16,96}$/;
const FINGERPRINT = /^[a-f0-9]{64}$/;

export type LevelSpinStarComposite = Readonly<{
  schemaVersion: 'client-level-spin-star-operation.v1';
  operationId: string;
  ownerStableId: string;
  requestId: string;
  lane: 'base' | 'premium';
  deliveryToken?: string;
  giftId: keyof typeof STAR_AMOUNTS;
  amount: number;
  reason: 'level_spin_star_reward';
  grant: Readonly<{
    kind: 'star_credit';
    subjectId: string;
    payload: Readonly<{
      requestId: string;
      lane: 'base' | 'premium';
      giftId: keyof typeof STAR_AMOUNTS;
      amount: number;
    }>;
  }>;
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type LevelSpinStarMaterializationAck = Readonly<{
  materialized: true;
  operationId: string;
  requestFingerprint: string;
  replayed: boolean;
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function requestFingerprint(value: LevelSpinStarComposite): string {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: value.ownerStableId,
    requestId: value.requestId,
    lane: value.lane,
    deliveryToken: value.deliveryToken ?? null,
    giftId: value.giftId,
    amount: value.amount,
    reason: 'level_spin_star_reward',
  })).digest('hex');
}

export function parseLevelSpinStarComposite(input: unknown): LevelSpinStarComposite {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'level_spin_star_composite_invalid');
  }
  const value = input as Partial<LevelSpinStarComposite>;
  const keys = [
    'schemaVersion', 'operationId', 'ownerStableId', 'requestId', 'lane', 'giftId',
    'amount', 'reason', 'grant', 'createdAtMs', 'requestFingerprint',
    ...(value.deliveryToken === undefined ? [] : ['deliveryToken']),
  ];
  const requestId = String(value.requestId ?? '');
  const lane = value.lane === 'base' || value.lane === 'premium' ? value.lane : null;
  const giftId = String(value.giftId ?? '') as keyof typeof STAR_AMOUNTS;
  const amount = STAR_AMOUNTS[giftId];
  const operationId = lane ? `level_spin:${requestId}.${lane}` : '';
  const grant = value.grant;
  const payload = grant?.payload;
  if (!exactKeys(value, keys)
    || value.schemaVersion !== 'client-level-spin-star-operation.v1'
    || !REQUEST_ID.test(requestId)
    || !lane
    || typeof value.ownerStableId !== 'string'
    || !value.ownerStableId.trim()
    || value.ownerStableId.includes('/')
    || value.ownerStableId.length > 160
    || value.operationId !== operationId
    || (value.deliveryToken !== undefined && !DELIVERY_TOKEN.test(value.deliveryToken))
    || !Number.isSafeInteger(amount)
    || value.amount !== amount
    || value.reason !== 'level_spin_star_reward'
    || !Number.isSafeInteger(value.createdAtMs)
    || Number(value.createdAtMs) < 0
    || !FINGERPRINT.test(String(value.requestFingerprint ?? ''))
    || !grant || typeof grant !== 'object' || Array.isArray(grant)
    || !exactKeys(grant, ['kind', 'subjectId', 'payload'])
    || grant.kind !== 'star_credit'
    || grant.subjectId !== operationId
    || !payload || typeof payload !== 'object' || Array.isArray(payload)
    || !exactKeys(payload, ['requestId', 'lane', 'giftId', 'amount'])
    || payload.requestId !== requestId
    || payload.lane !== lane
    || payload.giftId !== giftId
    || payload.amount !== amount) {
    throw new HttpsError('invalid-argument', 'level_spin_star_composite_invalid');
  }
  const parsed = value as LevelSpinStarComposite;
  if (requestFingerprint(parsed) !== parsed.requestFingerprint) {
    throw new HttpsError('invalid-argument', 'level_spin_star_fingerprint_invalid');
  }
  return parsed;
}

export function levelSpinStarLedgerOperation(composite: LevelSpinStarComposite): StarOpRequest {
  return Object.freeze({
    opId: composite.operationId,
    delta: composite.amount,
    reason: 'level_spin_grant' as const,
    sourceKind: 'level_spin_client_composite',
    sourceId: `${composite.requestId}.${composite.lane}`,
    ruleVersion: 1,
    earnedAtMs: composite.createdAtMs,
    meta: Object.freeze({
      clientFingerprint: composite.requestFingerprint,
      giftId: composite.giftId,
      lane: composite.lane,
    }),
  });
}

export function assertLevelSpinStarOwner(
  resolvedStableUid: string,
  composite: LevelSpinStarComposite,
): void {
  if (resolvedStableUid !== composite.ownerStableId) {
    throw new HttpsError('permission-denied', 'level_spin_star_owner_mismatch');
  }
}

export function levelSpinStarReplayMatches(
  receipt: Partial<StarOpReceipt>,
  composite: LevelSpinStarComposite,
): boolean {
  return receipt.opId === composite.operationId
    && receipt.delta === composite.amount
    && receipt.reason === 'level_spin_grant'
    && receipt.sourceKind === 'level_spin_client_composite'
    && receipt.sourceId === `${composite.requestId}.${composite.lane}`
    && receipt.meta?.clientFingerprint === composite.requestFingerprint
    && receipt.meta?.giftId === composite.giftId
    && receipt.meta?.lane === composite.lane;
}

export const levelSpinStarGrant = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<LevelSpinStarMaterializationAck> => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const composite = parseLevelSpinStarComposite(request.data?.operation);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, composite.ownerStableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  assertLevelSpinStarOwner(stableUid, composite);
  const userRef = db.collection('users').doc(stableUid);
  const receiptRef = userRef.collection('star_operations').doc(composite.operationId);
  const now = Date.now();
  return db.runTransaction(async (tx) => {
    const [userSnap, existingReceipt] = await Promise.all([tx.get(userRef), tx.get(receiptRef)]);
    if (!userSnap.exists) throw new HttpsError('failed-precondition', 'level_spin_star_owner_missing');
    if (existingReceipt.exists) {
      const receipt = existingReceipt.data() as Partial<StarOpReceipt>;
      if (!levelSpinStarReplayMatches(receipt, composite)) {
        throw new HttpsError('already-exists', 'level_spin_star_operation_conflict');
      }
      const current = normalizeStars(userSnap.data()?.stars);
      return Object.freeze({
        materialized: true as const,
        operationId: composite.operationId,
        requestFingerprint: composite.requestFingerprint,
        replayed: true,
        starsBalance: current.balance,
        starsEarnedTotal: current.earnedTotal,
        starsSeq: current.seq,
      });
    }
    const prepared = await prepareStarOperations(
      tx,
      db,
      stableUid,
      userSnap,
      [levelSpinStarLedgerOperation(composite)],
      {
        nowMs: now,
        activeSeasonId: arenaSeasonWindow(now).seasonId,
        weekKeyNow: getWeekKey(new Date(now).toISOString().slice(0, 10)),
        authUid,
        deviceId: null,
      },
    );
    const result = commitStarOperations(tx, prepared);
    if (result.outcomes[0]?.status !== 'applied') {
      throw new HttpsError('failed-precondition', 'level_spin_star_materialization_failed');
    }
    return Object.freeze({
      materialized: true as const,
      operationId: composite.operationId,
      requestFingerprint: composite.requestFingerprint,
      replayed: false,
      starsBalance: result.balance,
      starsEarnedTotal: result.earnedTotal,
      starsSeq: result.seq,
    });
  });
});
