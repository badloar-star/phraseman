import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from '../account_generation';
import { commitPhoneStateNonMonetaryEconomyGrant } from '../phone_state_economy_bridge';
import { withStorageLock } from '../storage_mutex';
import {
  attemptRestoreGiftConsumeOperationId,
  attemptRestoreGiftCreditOperationId,
  hasValidAttemptRestoreGiftConsumeFingerprint,
  hasValidAttemptRestoreGiftCreditFingerprint,
  parseAttemptRestoreGiftConsumeExactResult,
  parseAttemptRestoreGiftCreditExactResult,
  type AttemptRestoreGiftConsumeV1,
  type AttemptRestoreGiftCreditV1,
  type AttemptRestoreGiftOperationV1,
} from '../../modules/phone-state/domains/economy';

const MAX_ATTEMPT_RESTORE_OPERATIONS = 4_096;
const MAX_STORAGE_KEYS = 16_384;

type AttemptRestoreGiftProjectionV1 = Readonly<{
  schemaVersion: 'client-attempt-restore-gift-projection.v1';
  ownerStableId: string;
  operations: readonly AttemptRestoreGiftOperationV1[];
  synced: Readonly<Record<string, string>>;
}>;

export type PreparedAttemptRestoreGiftConsume = AttemptRestoreGiftConsumeV1;

export type PreparedAttemptRestoreGiftConsumeCommit = Readonly<{
  duplicate: boolean;
  operation: AttemptRestoreGiftConsumeV1;
  countAfter: number;
  durableWrites: readonly (readonly [string, string])[];
}>;

export type CreditAttemptRestoreGiftFromSpinInput = Readonly<{
  token: AccountGenerationToken;
  spinRequestId: string;
  lane: 'base' | 'premium';
  createdAtMs?: number;
}>;

export type PrepareAttemptRestoreGiftConsumeInput = Readonly<{
  token: AccountGenerationToken;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  createdAtMs?: number;
}>;

function ownerFromToken(token: AccountGenerationToken): string {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('attempt_restore_identity_changed');
  }
  return ownerStableId;
}

function assertOwner(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.includes('/') || owner.length > 160) throw new Error('attempt_restore_owner_invalid');
  return owner;
}

export function attemptRestoreGiftProjectionKey(ownerStableId: string): string {
  return `attempt_restore_gift_projection_v1:${encodeURIComponent(assertOwner(ownerStableId))}`;
}

export function attemptRestoreGiftOutboxKey(ownerStableId: string): string {
  return `attempt_restore_gift_outbox_v1:${encodeURIComponent(assertOwner(ownerStableId))}`;
}

export function attemptRestoreGiftPreparedCreditKey(ownerStableId: string): string {
  return `attempt_restore_gift_prepared_credit_v1:${encodeURIComponent(assertOwner(ownerStableId))}`;
}

export function attemptRestoreGiftPreparedConsumeKey(ownerStableId: string): string {
  return `attempt_restore_gift_prepared_consume_v1:${encodeURIComponent(assertOwner(ownerStableId))}`;
}

export function attemptRestoreGiftOperationStorageKey(ownerStableId: string, operationId: string): string {
  return `attempt_restore_gift_operation_v1:${encodeURIComponent(assertOwner(ownerStableId))}:${encodeURIComponent(operationId)}`;
}

function operationStoragePrefix(ownerStableId: string): string {
  return `attempt_restore_gift_operation_v1:${encodeURIComponent(assertOwner(ownerStableId))}:`;
}

function emptyProjection(ownerStableId: string): AttemptRestoreGiftProjectionV1 {
  return Object.freeze({
    schemaVersion: 'client-attempt-restore-gift-projection.v1',
    ownerStableId,
    operations: Object.freeze([]),
    synced: Object.freeze({}),
  });
}

function parseOperation(input: unknown, ownerStableId?: string): AttemptRestoreGiftOperationV1 | null {
  const operation = parseAttemptRestoreGiftCreditExactResult(input)
    ?? parseAttemptRestoreGiftConsumeExactResult(input);
  if (!operation || (ownerStableId !== undefined && operation.ownerStableId !== ownerStableId)) return null;
  return operation;
}

async function hasValidFingerprint(operation: AttemptRestoreGiftOperationV1): Promise<boolean> {
  return operation.schemaVersion === 'client-attempt-restore-gift-credit.v1'
    ? hasValidAttemptRestoreGiftCreditFingerprint(operation)
    : hasValidAttemptRestoreGiftConsumeFingerprint(operation);
}

export function replayAttemptRestoreGiftOperations(
  inputs: readonly unknown[],
): Readonly<{ count: number; operations: readonly AttemptRestoreGiftOperationV1[] }> {
  if (!Array.isArray(inputs) || inputs.length > MAX_ATTEMPT_RESTORE_OPERATIONS) {
    throw new Error('attempt_restore_history_too_large');
  }
  const operations = new Map<string, AttemptRestoreGiftOperationV1>();
  let ownerStableId: string | null = null;
  for (const input of inputs) {
    const operation = parseOperation(input);
    if (!operation) throw new Error('attempt_restore_operation_corrupt');
    if (ownerStableId !== null && operation.ownerStableId !== ownerStableId) {
      throw new Error('attempt_restore_owner_conflict');
    }
    ownerStableId = operation.ownerStableId;
    const prior = operations.get(operation.operationId);
    if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
      throw new Error('attempt_restore_operation_id_conflict');
    }
    if (!prior) operations.set(operation.operationId, operation);
  }
  const values = [...operations.values()].sort((left, right) => left.operationId.localeCompare(right.operationId));
  const credits = values.filter((operation) => operation.schemaVersion === 'client-attempt-restore-gift-credit.v1').length;
  const consumes = values.length - credits;
  const count = credits - consumes;
  if (count < 0) throw new Error('attempt_restore_inventory_negative');
  return Object.freeze({ count, operations: Object.freeze(values) });
}

function parseProjection(raw: string | null, ownerStableId: string): AttemptRestoreGiftProjectionV1 {
  if (raw === null) return emptyProjection(ownerStableId);
  try {
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('attempt_restore_projection_corrupt');
    const value = input as Partial<AttemptRestoreGiftProjectionV1>;
    if (Object.keys(value).sort().join(',') !== ['operations', 'ownerStableId', 'schemaVersion', 'synced'].sort().join(',')
      || value.schemaVersion !== 'client-attempt-restore-gift-projection.v1'
      || value.ownerStableId !== ownerStableId
      || !Array.isArray(value.operations)
      || value.operations.length > MAX_ATTEMPT_RESTORE_OPERATIONS
      || !value.synced || typeof value.synced !== 'object' || Array.isArray(value.synced)) {
      throw new Error('attempt_restore_projection_corrupt');
    }
    const replayed = replayAttemptRestoreGiftOperations(value.operations);
    const synced: Record<string, string> = {};
    const byId = new Map(replayed.operations.map((operation) => [operation.operationId, operation]));
    for (const [operationId, fingerprint] of Object.entries(value.synced)) {
      const operation = byId.get(operationId);
      if (!operation || typeof fingerprint !== 'string' || fingerprint !== operation.requestFingerprint) {
        throw new Error('attempt_restore_projection_corrupt');
      }
      synced[operationId] = fingerprint;
    }
    return Object.freeze({
      schemaVersion: 'client-attempt-restore-gift-projection.v1',
      ownerStableId,
      operations: replayed.operations,
      synced: Object.freeze(synced),
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'attempt_restore_projection_corrupt'
      || error.message === 'attempt_restore_operation_corrupt'
      || error.message === 'attempt_restore_operation_id_conflict'
      || error.message === 'attempt_restore_inventory_negative'
      || error.message === 'attempt_restore_history_too_large'
    )) throw new Error('attempt_restore_projection_corrupt');
    throw new Error('attempt_restore_projection_corrupt');
  }
}

function parseOperationList(
  raw: string | null,
  ownerStableId: string,
  errorCode: string,
  schemaVersion?: AttemptRestoreGiftOperationV1['schemaVersion'],
): AttemptRestoreGiftOperationV1[] {
  if (raw === null) return [];
  try {
    const input: unknown = JSON.parse(raw);
    if (!Array.isArray(input) || input.length > MAX_ATTEMPT_RESTORE_OPERATIONS) throw new Error(errorCode);
    return input.map((candidate) => {
      const operation = parseOperation(candidate, ownerStableId);
      if (!operation || (schemaVersion && operation.schemaVersion !== schemaVersion)) throw new Error(errorCode);
      return operation;
    });
  } catch (error) {
    if (error instanceof Error && error.message === errorCode) throw error;
    throw new Error(errorCode);
  }
}

async function readStoredOperations(ownerStableId: string): Promise<AttemptRestoreGiftOperationV1[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  if (allKeys.length > MAX_STORAGE_KEYS) throw new Error('attempt_restore_storage_scan_too_large');
  const keys = allKeys.filter((key) => key.startsWith(operationStoragePrefix(ownerStableId))).sort();
  if (keys.length > MAX_ATTEMPT_RESTORE_OPERATIONS) throw new Error('attempt_restore_history_too_large');
  const rows = await AsyncStorage.multiGet(keys);
  const operations: AttemptRestoreGiftOperationV1[] = [];
  for (const [, raw] of rows) {
    if (raw === null) continue;
    let input: unknown;
    try { input = JSON.parse(raw); } catch { throw new Error('attempt_restore_operation_corrupt'); }
    const operation = parseOperation(input, ownerStableId);
    if (!operation || !await hasValidFingerprint(operation)) throw new Error('attempt_restore_operation_corrupt');
    operations.push(operation);
  }
  return operations;
}

async function recoverLocked(ownerStableId: string): Promise<AttemptRestoreGiftProjectionV1> {
  const [projectionRaw, outboxRaw, preparedCreditRaw, storedOperations] = await Promise.all([
    AsyncStorage.getItem(attemptRestoreGiftProjectionKey(ownerStableId)),
    AsyncStorage.getItem(attemptRestoreGiftOutboxKey(ownerStableId)),
    AsyncStorage.getItem(attemptRestoreGiftPreparedCreditKey(ownerStableId)),
    readStoredOperations(ownerStableId),
  ]);
  const current = parseProjection(projectionRaw, ownerStableId);
  const outbox = parseOperationList(outboxRaw, ownerStableId, 'attempt_restore_outbox_corrupt');
  const preparedCredits = parseOperationList(
    preparedCreditRaw,
    ownerStableId,
    'attempt_restore_prepared_credit_corrupt',
    'client-attempt-restore-gift-credit.v1',
  ) as AttemptRestoreGiftCreditV1[];
  for (const operation of [...current.operations, ...outbox, ...preparedCredits]) {
    if (!await hasValidFingerprint(operation)) throw new Error('attempt_restore_operation_corrupt');
  }
  const replayed = replayAttemptRestoreGiftOperations([
    ...current.operations,
    ...storedOperations,
    ...preparedCredits,
  ]);
  const projection = Object.freeze({
    ...current,
    operations: replayed.operations,
  });
  const pending = new Map<string, AttemptRestoreGiftOperationV1>();
  for (const operation of [...outbox, ...replayed.operations]) {
    if (projection.synced[operation.operationId] === operation.requestFingerprint) continue;
    const prior = pending.get(operation.operationId);
    if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
      throw new Error('attempt_restore_operation_id_conflict');
    }
    pending.set(operation.operationId, operation);
  }
  if (pending.size > MAX_ATTEMPT_RESTORE_OPERATIONS) throw new Error('attempt_restore_outbox_full');
  await AsyncStorage.multiSet([
    [attemptRestoreGiftProjectionKey(ownerStableId), JSON.stringify(projection)],
    [attemptRestoreGiftOutboxKey(ownerStableId), JSON.stringify([...pending.values()])],
    ...preparedCredits.map((operation) => [
      attemptRestoreGiftOperationStorageKey(ownerStableId, operation.operationId),
      JSON.stringify(operation),
    ] as [string, string]),
  ]);
  if (preparedCredits.length > 0) {
    await AsyncStorage.setItem(attemptRestoreGiftPreparedCreditKey(ownerStableId), '[]');
  }
  return projection;
}

async function fingerprintCredit(input: Readonly<{
  ownerStableId: string;
  spinRequestId: string;
  lane: 'base' | 'premium';
}>): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    spinRequestId: input.spinRequestId,
    lane: input.lane,
    giftId: 'attempt_restore_all',
    quantity: 1,
  }));
}

async function fingerprintConsume(input: Readonly<{
  ownerStableId: string;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
}>): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    sessionId: input.sessionId,
    questionId: input.questionId,
    recoveryOrdinal: input.recoveryOrdinal,
    quantity: 1,
    attemptsGranted: 3,
  }));
}

export async function readAttemptRestoreGiftCount(token: AccountGenerationToken): Promise<number> {
  const ownerStableId = ownerFromToken(token);
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
    const projection = await recoverLocked(ownerStableId);
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
    return replayAttemptRestoreGiftOperations(projection.operations).count;
  }));
}

export async function creditAttemptRestoreGiftFromSpin(
  input: CreditAttemptRestoreGiftFromSpinInput,
): Promise<Readonly<{ duplicate: boolean; count: number }>> {
  const ownerStableId = ownerFromToken(input.token);
  const operationId = attemptRestoreGiftCreditOperationId(input.spinRequestId, input.lane);
  const operation: AttemptRestoreGiftCreditV1 = Object.freeze({
    schemaVersion: 'client-attempt-restore-gift-credit.v1',
    operationId,
    ownerStableId,
    spinRequestId: input.spinRequestId,
    lane: input.lane,
    giftId: 'attempt_restore_all',
    quantity: 1,
    createdAtMs: input.createdAtMs ?? Date.now(),
    requestFingerprint: await fingerprintCredit({
      ownerStableId,
      spinRequestId: input.spinRequestId,
      lane: input.lane,
    }),
  });
  if (!parseAttemptRestoreGiftCreditExactResult(operation)) throw new Error('attempt_restore_credit_invalid');

  const result = await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
    const projection = await recoverLocked(ownerStableId);
    const existing = projection.operations.find((candidate) => candidate.operationId === operation.operationId);
    if (existing) {
      if (existing.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('attempt_restore_operation_id_conflict');
      }
      return Object.freeze({
        duplicate: true,
        count: replayAttemptRestoreGiftOperations(projection.operations).count,
      });
    }
    if (projection.operations.length >= MAX_ATTEMPT_RESTORE_OPERATIONS) throw new Error('attempt_restore_history_too_large');
    const preparedRaw = await AsyncStorage.getItem(attemptRestoreGiftPreparedCreditKey(ownerStableId));
    const prepared = parseOperationList(
      preparedRaw,
      ownerStableId,
      'attempt_restore_prepared_credit_corrupt',
      'client-attempt-restore-gift-credit.v1',
    ) as AttemptRestoreGiftCreditV1[];
    const priorPrepared = prepared.find((candidate) => candidate.operationId === operation.operationId);
    if (priorPrepared && priorPrepared.requestFingerprint !== operation.requestFingerprint) {
      throw new Error('attempt_restore_operation_id_conflict');
    }
    const nextPrepared = priorPrepared ? prepared : [...prepared, operation];
    await AsyncStorage.setItem(attemptRestoreGiftPreparedCreditKey(ownerStableId), JSON.stringify(nextPrepared));
    const nextReplay = replayAttemptRestoreGiftOperations([...projection.operations, operation]);
    const nextProjection: AttemptRestoreGiftProjectionV1 = Object.freeze({
      ...projection,
      operations: nextReplay.operations,
    });
    const outbox = parseOperationList(
      await AsyncStorage.getItem(attemptRestoreGiftOutboxKey(ownerStableId)),
      ownerStableId,
      'attempt_restore_outbox_corrupt',
    );
    const nextOutbox = replayAttemptRestoreGiftOperations([...outbox, operation]).operations;
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
    await AsyncStorage.multiSet([
      [attemptRestoreGiftOperationStorageKey(ownerStableId, operation.operationId), JSON.stringify(operation)],
      [attemptRestoreGiftProjectionKey(ownerStableId), JSON.stringify(nextProjection)],
      [attemptRestoreGiftOutboxKey(ownerStableId), JSON.stringify(nextOutbox)],
    ]);
    await AsyncStorage.setItem(attemptRestoreGiftPreparedCreditKey(ownerStableId), '[]');
    return Object.freeze({ duplicate: false, count: nextReplay.count });
  }));
  void syncPendingAttemptRestoreGiftOperations(input.token).catch(() => {});
  return result;
}

export async function prepareAttemptRestoreGiftConsume(
  input: PrepareAttemptRestoreGiftConsumeInput,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<PreparedAttemptRestoreGiftConsume> {
  const ownerStableId = ownerFromToken(input.token);
  const operationId = attemptRestoreGiftConsumeOperationId(input.sessionId, input.recoveryOrdinal);
  const operation: AttemptRestoreGiftConsumeV1 = Object.freeze({
    schemaVersion: 'client-attempt-restore-gift-consume.v1',
    operationId,
    ownerStableId,
    sessionId: input.sessionId,
    questionId: input.questionId,
    recoveryOrdinal: input.recoveryOrdinal,
    quantity: 1,
    attemptsGranted: 3,
    createdAtMs: input.createdAtMs ?? Date.now(),
    requestFingerprint: await fingerprintConsume({
      ownerStableId,
      sessionId: input.sessionId,
      questionId: input.questionId,
      recoveryOrdinal: input.recoveryOrdinal,
    }),
  });
  if (!parseAttemptRestoreGiftConsumeExactResult(operation)) throw new Error('attempt_restore_consume_invalid');

  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
    const projection = await recoverLocked(ownerStableId);
    const existing = projection.operations.find((candidate) => candidate.operationId === operation.operationId);
    if (existing) {
      if (existing.requestFingerprint !== operation.requestFingerprint
        || existing.schemaVersion !== 'client-attempt-restore-gift-consume.v1') {
        throw new Error('attempt_restore_operation_id_conflict');
      }
      return existing;
    }
    const preparedRaw = await AsyncStorage.getItem(attemptRestoreGiftPreparedConsumeKey(ownerStableId));
    const prepared = parseOperationList(
      preparedRaw,
      ownerStableId,
      'attempt_restore_prepared_consume_corrupt',
      'client-attempt-restore-gift-consume.v1',
    ) as AttemptRestoreGiftConsumeV1[];
    const prior = prepared.find((candidate) => candidate.operationId === operation.operationId);
    if (prior) {
      if (prior.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('attempt_restore_operation_id_conflict');
      }
      return prior;
    }
    const committedCount = replayAttemptRestoreGiftOperations(projection.operations).count;
    const committedIds = new Set(projection.operations.map((candidate) => candidate.operationId));
    const reservations = prepared.filter((candidate) => !committedIds.has(candidate.operationId)).length;
    if (committedCount - reservations <= 0) throw new Error('attempt_restore_gift_unavailable');
    if (prepared.length >= MAX_ATTEMPT_RESTORE_OPERATIONS) throw new Error('attempt_restore_prepared_consume_full');
    await AsyncStorage.setItem(attemptRestoreGiftPreparedConsumeKey(ownerStableId), JSON.stringify([...prepared, operation]));
    return operation;
  }), accountTransitionLockLease);
}

/**
 * Builds the exact gift-consume projection writes without committing them.
 * The recovery coordinator owns the single durable multiSet that also stores
 * the attempts receipt and restored state.
 */
export async function prepareAttemptRestoreGiftConsumeCommit(
  input: PrepareAttemptRestoreGiftConsumeInput,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<PreparedAttemptRestoreGiftConsumeCommit> {
  const ownerStableId = ownerFromToken(input.token);
  return withAccountTransitionLock(async (lease) => {
    const operation = await prepareAttemptRestoreGiftConsume(input, lease);
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
        throw new Error('attempt_restore_identity_changed');
      }
      const projection = await recoverLocked(ownerStableId);
      const existing = projection.operations.find((candidate) => (
        candidate.operationId === operation.operationId
      ));
      if (existing) {
        if (existing.schemaVersion !== 'client-attempt-restore-gift-consume.v1'
          || existing.requestFingerprint !== operation.requestFingerprint) {
          throw new Error('attempt_restore_operation_id_conflict');
        }
        return Object.freeze({
          duplicate: true,
          operation,
          countAfter: replayAttemptRestoreGiftOperations(projection.operations).count,
          durableWrites: Object.freeze([]),
        });
      }
      const replayed = replayAttemptRestoreGiftOperations([...projection.operations, operation]);
      const nextProjection: AttemptRestoreGiftProjectionV1 = Object.freeze({
        ...projection,
        operations: replayed.operations,
      });
      const outbox = parseOperationList(
        await AsyncStorage.getItem(attemptRestoreGiftOutboxKey(ownerStableId)),
        ownerStableId,
        'attempt_restore_outbox_corrupt',
      );
      const nextOutbox = replayAttemptRestoreGiftOperations([...outbox, operation]).operations;
      return Object.freeze({
        duplicate: false,
        operation,
        countAfter: replayed.count,
        durableWrites: Object.freeze([
          Object.freeze([
            attemptRestoreGiftOperationStorageKey(ownerStableId, operation.operationId),
            JSON.stringify(operation),
          ] as const),
          Object.freeze([
            attemptRestoreGiftProjectionKey(ownerStableId),
            JSON.stringify(nextProjection),
          ] as const),
          Object.freeze([
            attemptRestoreGiftOutboxKey(ownerStableId),
            JSON.stringify(nextOutbox),
          ] as const),
        ]),
      });
    });
  }, accountTransitionLockLease);
}

export async function clearAttemptRestoreGiftConsumePreparation(
  token: AccountGenerationToken,
  operationId: string,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<void> {
  const ownerStableId = ownerFromToken(token);
  await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('attempt_restore_identity_changed');
    }
    const prepared = parseOperationList(
      await AsyncStorage.getItem(attemptRestoreGiftPreparedConsumeKey(ownerStableId)),
      ownerStableId,
      'attempt_restore_prepared_consume_corrupt',
      'client-attempt-restore-gift-consume.v1',
    );
    await AsyncStorage.setItem(
      attemptRestoreGiftPreparedConsumeKey(ownerStableId),
      JSON.stringify(prepared.filter((candidate) => candidate.operationId !== operationId)),
    );
  }), accountTransitionLockLease);
}

export async function syncPendingAttemptRestoreGiftOperations(
  token: AccountGenerationToken,
): Promise<Readonly<{ synced: number; pending: number }>> {
  const ownerStableId = ownerFromToken(token);
  return withAccountTransitionLock(async () => {
    const { projection, outbox } = await withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
      const recovered = await recoverLocked(ownerStableId);
      const pending = parseOperationList(
        await AsyncStorage.getItem(attemptRestoreGiftOutboxKey(ownerStableId)),
        ownerStableId,
        'attempt_restore_outbox_corrupt',
      );
      return { projection: recovered, outbox: pending };
    });
    const synced = { ...projection.synced };
    let syncedCount = 0;
    for (const operation of outbox) {
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
      const committed = operation.schemaVersion === 'client-attempt-restore-gift-credit.v1'
        ? await commitPhoneStateNonMonetaryEconomyGrant({
          operationId: operation.operationId,
          kind: 'attempt_restore_inventory_credit',
          entitlementId: operation.operationId,
          expectedOwnerStableId: ownerStableId,
          expectedAccountGeneration: token.generation,
          exactResult: operation,
        })
        : await commitPhoneStateNonMonetaryEconomyGrant({
          operationId: operation.operationId,
          kind: 'attempt_restore_inventory_consume',
          entitlementId: operation.operationId,
          expectedOwnerStableId: ownerStableId,
          expectedAccountGeneration: token.generation,
          exactResult: operation,
        });
      if (committed) {
        synced[operation.operationId] = operation.requestFingerprint;
        syncedCount += 1;
      }
    }
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('attempt_restore_identity_changed');
      const latest = await recoverLocked(ownerStableId);
      const nextProjection: AttemptRestoreGiftProjectionV1 = Object.freeze({
        ...latest,
        synced: Object.freeze({ ...latest.synced, ...synced }),
      });
      const remaining = latest.operations.filter((operation) => (
        nextProjection.synced[operation.operationId] !== operation.requestFingerprint
      ));
      await AsyncStorage.multiSet([
        [attemptRestoreGiftProjectionKey(ownerStableId), JSON.stringify(nextProjection)],
        [attemptRestoreGiftOutboxKey(ownerStableId), JSON.stringify(remaining)],
      ]);
      return Object.freeze({ synced: syncedCount, pending: remaining.length });
    });
  });
}

export default function __RouteShim() { return null; }
