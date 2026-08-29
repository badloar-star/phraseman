import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from '../account_generation';
import {
  prepareSessionAttemptRuneRecovery,
  recoverAndHydrateLevelSpinStarGrants,
} from '../level_spin_star_grants';
import { commitPhoneStateNonMonetaryEconomyGrant } from '../phone_state_economy_bridge';
import { withStorageLock } from '../storage_mutex';
import {
  clearAttemptRestoreGiftConsumePreparation,
  prepareAttemptRestoreGiftConsumeCommit,
  syncPendingAttemptRestoreGiftOperations,
} from './session_attempt_restore_inventory';
import {
  reduceSessionAttempts,
  type SessionAttemptsStateV1,
} from './session_attempts_domain';
import {
  hasValidSessionAttemptRuneRecoveryFingerprint,
  parseSessionAttemptRuneRecoveryExactResult,
  type SessionAttemptRuneRecoveryExactResultV1,
} from '../../modules/phone-state/domains/economy';
import { DebugLogger } from '../debug-logger';

export type SessionAttemptRecoverySource = 'runes' | 'gift';

type SessionAttemptRecoveryPreparedV1 = Readonly<{
  schemaVersion: 'session-attempt-recovery-prepared.v1';
  ownerStableId: string;
  accountGeneration: number;
  source: SessionAttemptRecoverySource;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  receiptId: string;
  createdAtMs: number;
  sessionState: SessionAttemptsStateV1;
}>;

type SessionAttemptRecoveryReceiptV1 = Readonly<{
  schemaVersion: 'session-attempt-recovery-receipt.v1';
  receiptId: string;
  ownerStableId: string;
  accountGeneration: number;
  source: SessionAttemptRecoverySource;
  operationId: string;
  operationFingerprint: string;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  attemptsGranted: 3;
  createdAtMs: number;
  attemptsState: SessionAttemptsStateV1;
}>;

export type SessionAttemptRecoveryResult = Readonly<{
  duplicate: boolean;
  source: SessionAttemptRecoverySource;
  attemptsState: SessionAttemptsStateV1;
  receiptId: string;
}>;

const MAX_PREPARED_RECOVERIES = 128;

function ownerFromToken(token: AccountGenerationToken): string {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('session_attempt_recovery_identity_changed');
  }
  return ownerStableId;
}

function safePart(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 256 || /[\u0000-\u001F\u007F]/u.test(normalized)) {
    throw new Error('session_attempt_recovery_id_invalid');
  }
  return encodeURIComponent(normalized);
}

export function sessionAttemptsStateKey(ownerStableId: string, sessionId: string): string {
  return `session_attempts_state_v1:${safePart(ownerStableId)}:${safePart(sessionId)}`;
}

export function sessionAttemptRecoveryPreparedKey(
  ownerStableId: string,
  sessionId: string,
  recoveryOrdinal: number,
): string {
  return `session_attempt_recovery_prepared_v1:${safePart(ownerStableId)}:${safePart(sessionId)}:${recoveryOrdinal}`;
}

export function sessionAttemptRecoveryReceiptKey(ownerStableId: string, receiptId: string): string {
  return `session_attempt_recovery_receipt_v1:${safePart(ownerStableId)}:${safePart(receiptId)}`;
}

function syncOutboxKey(ownerStableId: string): string {
  return `session_attempt_recovery_sync_outbox_v1:${safePart(ownerStableId)}`;
}

function receiptIdFor(sessionId: string, recoveryOrdinal: number): string {
  return `session_attempt_recovery:${sessionId}:${recoveryOrdinal}`;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function parseAttemptsState(input: unknown, expectedSessionId?: string): SessionAttemptsStateV1 | null {
  if (!isPlainObject(input)) return null;
  const remaining = Number(input.remainingAttempts);
  const recoveryOrdinal = Number(input.recoveryOrdinal);
  const processed = input.processedAnswerAttemptIds;
  const receipts = input.recoveryReceiptIds;
  if (input.schemaVersion !== 'session-attempts-state.v1'
    || typeof input.sessionId !== 'string'
    || (expectedSessionId !== undefined && input.sessionId !== expectedSessionId)
    || typeof input.questionId !== 'string'
    || input.maxAttempts !== 3
    || !Number.isSafeInteger(remaining) || remaining < 0 || remaining > 3
    || !['active', 'awaiting_recovery', 'ended'].includes(String(input.phase))
    || !Number.isSafeInteger(recoveryOrdinal) || recoveryOrdinal < 0 || recoveryOrdinal > 1_000
    || !Array.isArray(processed) || !processed.every((value) => typeof value === 'string')
    || !Array.isArray(receipts) || !receipts.every((value) => typeof value === 'string')) return null;
  return Object.freeze({
    schemaVersion: 'session-attempts-state.v1',
    sessionId: input.sessionId,
    questionId: input.questionId,
    maxAttempts: 3,
    remainingAttempts: remaining as SessionAttemptsStateV1['remainingAttempts'],
    phase: input.phase as SessionAttemptsStateV1['phase'],
    recoveryOrdinal,
    processedAnswerAttemptIds: Object.freeze([...processed]),
    recoveryReceiptIds: Object.freeze([...receipts]),
  });
}

function parsePrepared(input: unknown, ownerStableId: string): SessionAttemptRecoveryPreparedV1 | null {
  if (!isPlainObject(input)) return null;
  const recoveryOrdinal = Number(input.recoveryOrdinal);
  const createdAtMs = Number(input.createdAtMs);
  const sessionState = parseAttemptsState(input.sessionState, String(input.sessionId ?? ''));
  if (input.schemaVersion !== 'session-attempt-recovery-prepared.v1'
    || input.ownerStableId !== ownerStableId
    || !Number.isSafeInteger(Number(input.accountGeneration)) || Number(input.accountGeneration) < 1
    || !['runes', 'gift'].includes(String(input.source))
    || typeof input.sessionId !== 'string'
    || typeof input.questionId !== 'string'
    || !Number.isSafeInteger(recoveryOrdinal) || recoveryOrdinal < 1 || recoveryOrdinal > 1_000
    || input.receiptId !== receiptIdFor(input.sessionId, recoveryOrdinal)
    || !Number.isSafeInteger(createdAtMs) || createdAtMs < 0
    || !sessionState
    || sessionState.questionId !== input.questionId
    || sessionState.phase !== 'awaiting_recovery'
    || sessionState.remainingAttempts !== 0
    || sessionState.recoveryOrdinal + 1 !== recoveryOrdinal) return null;
  return input as SessionAttemptRecoveryPreparedV1;
}

function parseReceipt(input: unknown, ownerStableId: string): SessionAttemptRecoveryReceiptV1 | null {
  if (!isPlainObject(input)) return null;
  const recoveryOrdinal = Number(input.recoveryOrdinal);
  const accountGeneration = Number(input.accountGeneration);
  const createdAtMs = Number(input.createdAtMs);
  const attemptsState = parseAttemptsState(input.attemptsState, String(input.sessionId ?? ''));
  if (input.schemaVersion !== 'session-attempt-recovery-receipt.v1'
    || input.ownerStableId !== ownerStableId
    || !Number.isSafeInteger(accountGeneration) || accountGeneration < 1
    || !['runes', 'gift'].includes(String(input.source))
    || typeof input.operationId !== 'string' || !input.operationId
    || typeof input.operationFingerprint !== 'string'
    || !/^[a-f0-9]{64}$/u.test(input.operationFingerprint)
    || typeof input.sessionId !== 'string'
    || typeof input.questionId !== 'string'
    || !Number.isSafeInteger(recoveryOrdinal) || recoveryOrdinal < 1 || recoveryOrdinal > 1_000
    || input.receiptId !== receiptIdFor(input.sessionId, recoveryOrdinal)
    || input.attemptsGranted !== 3
    || !Number.isSafeInteger(createdAtMs) || createdAtMs < 0
    || !attemptsState
    || attemptsState.questionId !== input.questionId
    || attemptsState.phase !== 'active'
    || attemptsState.remainingAttempts !== 3
    || attemptsState.recoveryOrdinal !== recoveryOrdinal
    || !attemptsState.recoveryReceiptIds.includes(String(input.receiptId))) return null;
  return input as SessionAttemptRecoveryReceiptV1;
}

async function parseRuneOutbox(
  raw: string | null,
  ownerStableId: string,
): Promise<SessionAttemptRuneRecoveryExactResultV1[]> {
  const input = parseJson(raw, 'session_attempt_recovery_outbox_corrupt');
  if (input === null) return [];
  if (!Array.isArray(input) || input.length > MAX_PREPARED_RECOVERIES) {
    throw new Error('session_attempt_recovery_outbox_corrupt');
  }
  const operations: SessionAttemptRuneRecoveryExactResultV1[] = [];
  const ids = new Map<string, string>();
  for (const candidate of input) {
    const operation = parseSessionAttemptRuneRecoveryExactResult(candidate);
    if (!operation
      || operation.ownerStableId !== ownerStableId
      || !await hasValidSessionAttemptRuneRecoveryFingerprint(operation)) {
      throw new Error('session_attempt_recovery_outbox_corrupt');
    }
    const prior = ids.get(operation.operationId);
    if (prior && prior !== operation.requestFingerprint) {
      throw new Error('session_attempt_recovery_outbox_conflict');
    }
    if (!prior) operations.push(operation);
    ids.set(operation.operationId, operation.requestFingerprint);
  }
  return operations;
}

function parseJson(raw: string | null, errorCode: string): unknown {
  if (raw === null) return null;
  try { return JSON.parse(raw) as unknown; } catch { throw new Error(errorCode); }
}

async function cleanupPrepared(
  token: AccountGenerationToken,
  prepared: SessionAttemptRecoveryPreparedV1,
  lease: AccountTransitionLockLease,
  operationId?: string,
): Promise<void> {
  try {
    await withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, prepared.ownerStableId)) return;
      await AsyncStorage.removeItem(sessionAttemptRecoveryPreparedKey(
        prepared.ownerStableId,
        prepared.sessionId,
        prepared.recoveryOrdinal,
      ));
    });
  } catch (e) {
      // a durable receipt makes cleanup retryable
      DebugLogger.error('session_attempt_recovery:cleanupPrepared', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  if (prepared.source === 'gift' && operationId) {
    try { await clearAttemptRestoreGiftConsumePreparation(token, operationId, lease); } catch (e) {
      // retryable
      DebugLogger.error('session_attempt_recovery:cleanupPrepared', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
}

export async function persistSessionAttemptsState(
  token: AccountGenerationToken,
  state: SessionAttemptsStateV1,
): Promise<void> {
  const ownerStableId = ownerFromToken(token);
  const validated = parseAttemptsState(state, state.sessionId);
  if (!validated) throw new Error('session_attempts_state_invalid');
  await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('session_attempt_recovery_identity_changed');
    }
    await AsyncStorage.setItem(sessionAttemptsStateKey(ownerStableId, state.sessionId), JSON.stringify(validated));
  }));
}

export async function hydrateSessionAttemptsState(
  token: AccountGenerationToken,
  sessionId: string,
): Promise<SessionAttemptsStateV1 | null> {
  const ownerStableId = ownerFromToken(token);
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('session_attempt_recovery_identity_changed');
    }
    const raw = await AsyncStorage.getItem(sessionAttemptsStateKey(ownerStableId, sessionId));
    if (raw === null) return null;
    const state = parseAttemptsState(parseJson(raw, 'session_attempts_state_corrupt'), sessionId);
    if (!state) throw new Error('session_attempts_state_corrupt');
    return state;
  }));
}

export async function commitSessionAttemptRecovery(input: Readonly<{
  source: SessionAttemptRecoverySource;
  token: AccountGenerationToken;
  sessionState: SessionAttemptsStateV1;
}>): Promise<SessionAttemptRecoveryResult> {
  const ownerStableId = ownerFromToken(input.token);
  const state = parseAttemptsState(input.sessionState, input.sessionState.sessionId);
  if (!state || state.phase !== 'awaiting_recovery' || state.remainingAttempts !== 0) {
    throw new Error('session_attempt_recovery_not_available');
  }
  const recoveryOrdinal = state.recoveryOrdinal + 1;
  const receiptId = receiptIdFor(state.sessionId, recoveryOrdinal);
  const preparedKey = sessionAttemptRecoveryPreparedKey(ownerStableId, state.sessionId, recoveryOrdinal);
  const receiptKey = sessionAttemptRecoveryReceiptKey(ownerStableId, receiptId);

  const committed = await withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
      throw new Error('session_attempt_recovery_identity_changed');
    }
    const [receiptRaw, preparedRaw] = await withStorageLock(async () => Promise.all([
      AsyncStorage.getItem(receiptKey),
      AsyncStorage.getItem(preparedKey),
    ]));
    const existingReceipt = parseReceipt(
      parseJson(receiptRaw, 'session_attempt_recovery_receipt_corrupt'),
      ownerStableId,
    );
    if (receiptRaw !== null && !existingReceipt) throw new Error('session_attempt_recovery_receipt_corrupt');
    if (existingReceipt) {
      if (existingReceipt.source !== input.source
        || existingReceipt.sessionId !== state.sessionId
        || existingReceipt.questionId !== state.questionId) {
        throw new Error('session_attempt_recovery_request_conflict');
      }
      const stalePrepared = preparedRaw === null
        ? null
        : parsePrepared(parseJson(preparedRaw, 'session_attempt_recovery_prepared_corrupt'), ownerStableId);
      if (preparedRaw !== null && !stalePrepared) throw new Error('session_attempt_recovery_prepared_corrupt');
      if (stalePrepared) await cleanupPrepared(input.token, stalePrepared, lease, existingReceipt.operationId);
      return Object.freeze({
        duplicate: true,
        source: existingReceipt.source,
        attemptsState: existingReceipt.attemptsState,
        receiptId: existingReceipt.receiptId,
      });
    }

    const parsedPrepared = preparedRaw === null
      ? null
      : parsePrepared(parseJson(preparedRaw, 'session_attempt_recovery_prepared_corrupt'), ownerStableId);
    if (preparedRaw !== null && !parsedPrepared) throw new Error('session_attempt_recovery_prepared_corrupt');
    if (parsedPrepared && parsedPrepared.source !== input.source) {
      throw new Error('session_attempt_recovery_source_conflict');
    }
    const prepared: SessionAttemptRecoveryPreparedV1 = parsedPrepared ?? Object.freeze({
      schemaVersion: 'session-attempt-recovery-prepared.v1',
      ownerStableId,
      accountGeneration: input.token.generation,
      source: input.source,
      sessionId: state.sessionId,
      questionId: state.questionId,
      recoveryOrdinal,
      receiptId,
      createdAtMs: Date.now(),
      sessionState: state,
    });

    const sourcePreparation = input.source === 'runes'
      ? await prepareSessionAttemptRuneRecovery({
        token: input.token,
        sessionId: state.sessionId,
        questionId: state.questionId,
        recoveryOrdinal,
        createdAtMs: prepared.createdAtMs,
      }, lease)
      : await prepareAttemptRestoreGiftConsumeCommit({
        token: input.token,
        sessionId: state.sessionId,
        questionId: state.questionId,
        recoveryOrdinal,
        createdAtMs: prepared.createdAtMs,
      }, lease);

    if (!parsedPrepared) {
      await withStorageLock(async () => {
        if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
          throw new Error('session_attempt_recovery_identity_changed');
        }
        await AsyncStorage.setItem(preparedKey, JSON.stringify(prepared));
      });
    }

    const restored = reduceSessionAttempts(state, { type: 'recover_all', recoveryReceiptId: receiptId });
    if (restored.effect !== 'attempts_restored') throw new Error('session_attempt_recovery_state_invalid');
    const operation = sourcePreparation.operation;
    const receipt: SessionAttemptRecoveryReceiptV1 = Object.freeze({
      schemaVersion: 'session-attempt-recovery-receipt.v1',
      receiptId,
      ownerStableId,
      accountGeneration: input.token.generation,
      source: input.source,
      operationId: operation.operationId,
      operationFingerprint: operation.requestFingerprint,
      sessionId: state.sessionId,
      questionId: state.questionId,
      recoveryOrdinal,
      attemptsGranted: 3,
      createdAtMs: prepared.createdAtMs,
      attemptsState: restored.state,
    });

    await withStorageLock(async () => {
      if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
        throw new Error('session_attempt_recovery_identity_changed');
      }
      const writes: [string, string][] = sourcePreparation.durableWrites.map(([key, value]) => [key, value]);
      if (input.source === 'runes') {
        const runeOperation = parseSessionAttemptRuneRecoveryExactResult(operation);
        if (!runeOperation) throw new Error('session_attempt_recovery_operation_invalid');
        const outbox = await parseRuneOutbox(
          await AsyncStorage.getItem(syncOutboxKey(ownerStableId)),
          ownerStableId,
        );
        const pending = outbox.filter((candidate) => candidate.operationId !== runeOperation.operationId);
        pending.push(runeOperation);
        writes.push([syncOutboxKey(ownerStableId), JSON.stringify(pending)]);
      }
      writes.push(
        [receiptKey, JSON.stringify(receipt)],
        [sessionAttemptsStateKey(ownerStableId, state.sessionId), JSON.stringify(restored.state)],
      );
      await AsyncStorage.multiSet(writes);
      try { await AsyncStorage.removeItem(preparedKey); } catch (e) {
      // receipt wins; cleanup retries
      DebugLogger.error('session_attempt_recovery:pending', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    });
    if (input.source === 'gift') {
      try { await clearAttemptRestoreGiftConsumePreparation(input.token, operation.operationId, lease); } catch (e) {
      // retryable
      DebugLogger.error('session_attempt_recovery:pending', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
    return Object.freeze({
      duplicate: false,
      source: input.source,
      attemptsState: restored.state,
      receiptId,
    });
  });

  if (input.source === 'runes') {
    void recoverAndHydrateLevelSpinStarGrants(input.token, { syncNow: false }).catch(() => {});
    void syncPendingSessionAttemptRecoveryOperations(input.token).catch(() => {});
  } else {
    void syncPendingAttemptRestoreGiftOperations(input.token).catch(() => {});
  }
  return committed;
}

export async function syncPendingSessionAttemptRecoveryOperations(
  token: AccountGenerationToken,
): Promise<Readonly<{ synced: number; pending: number }>> {
  const ownerStableId = ownerFromToken(token);
  const operations = await withAccountTransitionLock(async () => withStorageLock(async () => {
    return parseRuneOutbox(await AsyncStorage.getItem(syncOutboxKey(ownerStableId)), ownerStableId);
  }));
  const syncedIds = new Set<string>();
  for (const operation of operations) {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('session_attempt_recovery_identity_changed');
    }
    const synced = await commitPhoneStateNonMonetaryEconomyGrant({
      operationId: operation.operationId,
      kind: 'session_attempt_recovery_rune_debit',
      entitlementId: operation.operationId,
      expectedOwnerStableId: ownerStableId,
      expectedAccountGeneration: token.generation,
      exactResult: operation,
    });
    if (synced) syncedIds.add(operation.operationId);
  }
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('session_attempt_recovery_identity_changed');
    }
    const remaining = operations.filter((operation) => !syncedIds.has(operation.operationId));
    await AsyncStorage.setItem(syncOutboxKey(ownerStableId), JSON.stringify(remaining));
    return Object.freeze({ synced: syncedIds.size, pending: remaining.length });
  }));
}

export async function recoverPreparedSessionAttemptRecoveries(
  token: AccountGenerationToken,
): Promise<Readonly<{ recovered: number; pending: number }>> {
  const ownerStableId = ownerFromToken(token);
  const prefix = `session_attempt_recovery_prepared_v1:${safePart(ownerStableId)}:`;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
  if (keys.length > MAX_PREPARED_RECOVERIES) throw new Error('session_attempt_recovery_prepared_overflow');
  const rows = await AsyncStorage.multiGet(keys);
  let recovered = 0;
  let pending = 0;
  for (const [, raw] of rows) {
    if (raw === null) continue;
    const prepared = parsePrepared(
      parseJson(raw, 'session_attempt_recovery_prepared_corrupt'),
      ownerStableId,
    );
    if (!prepared) throw new Error('session_attempt_recovery_prepared_corrupt');
    try {
      await commitSessionAttemptRecovery({
        source: prepared.source,
        token,
        sessionState: prepared.sessionState,
      });
      recovered += 1;
    } catch {
      pending += 1;
    }
  }
  void syncPendingSessionAttemptRecoveryOperations(token).catch(() => {});
  return Object.freeze({ recovered, pending });
}

export default function __RouteShim() { return null; }
