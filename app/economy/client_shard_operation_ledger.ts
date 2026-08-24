import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from '../account_generation';
import { getStableId } from '../stable_id';
import { withStorageLock } from '../storage_mutex';
import {
  CLIENT_SHARD_SEMANTIC_PAID_PREFIX,
  reduceClientShardGrant,
} from './client_shard_semantic_reducer';
import { commitPhoneStateEconomyOperation } from '../phone_state_economy_bridge';

const BALANCE_KEY = 'shards_balance';
const BALANCE_META_KEY = 'shards_balance_meta_v1';
export const CLIENT_SHARD_OPERATION_PREFIX = 'client_shard_operation_v1:';
export const CLIENT_SHARD_LEDGER_STATE_PREFIX = 'client_shard_ledger_state_v1:';
export const CLIENT_SHARD_PREPARED_PREFIX = 'client_shard_prepared_v1:';
export const CLIENT_SHARD_GRANT_RECEIPT_PREFIX = 'client_shard_grant_receipt_v1:';
export const CLIENT_SHARD_CLOUD_SYNCED_PREFIX = 'client_shard_cloud_synced_v1:';

const OP_ID_RE = /^[A-Za-z0-9_:-]{8,80}$/;
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9_.:-]{1,160}$/;
const MAX_REASON_LENGTH = 64;
const MAX_LOCAL_WRITES = 24;
const MAX_LOCAL_WRITE_BYTES = 256 * 1024;

export type ClientShardGrant = Readonly<{
  kind: string;
  subjectId: string;
  payload?: unknown;
}>;

export type ClientShardLocalWrite = readonly [key: string, value: string];

export type CommitClientShardOperationInput = Readonly<{
  expectedOwnerStableId?: string;
  /** Internal cloud-union replay. Concurrent device debits become debt. */
  mergeReplay?: boolean;
  /** Resolve a closed semantic grant inside the same storage lock as commit. */
  mergeSemanticResult?: boolean;
  /** Materialize/check the business result under the ledger lock. */
  semanticResult?: boolean;
  /** Fingerprint signed by the immutable cloud operation being merged. */
  mergeSourceFingerprint?: string;
  authority?: 'client' | 'external';
  operationId: string;
  direction: 'debit' | 'credit';
  amount: number;
  reason: string;
  grant: ClientShardGrant;
  localWrites: readonly ClientShardLocalWrite[];
  createdAtMs?: number;
}>;

export type ClientShardOperation = Readonly<{
  schemaVersion: 'client-shard-operation.v1';
  operationId: string;
  ownerStableId: string;
  authority: 'client' | 'external';
  direction: 'debit' | 'credit';
  amount: number;
  delta: number;
  reason: string;
  grant: ClientShardGrant;
  localWrites: readonly ClientShardLocalWrite[];
  revision: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAtMs: number;
  requestFingerprint: string;
}>;

type ClientShardLedgerState = Readonly<{
  schemaVersion: 'client-shard-ledger-state.v1';
  ownerStableId: string;
  openingBalance: number;
  balance: number;
  revision: number;
  headOperationId: string | null;
  updatedAtMs: number;
}>;

type PreparedOperation = Readonly<{
  schemaVersion: 'client-shard-prepared.v1';
  ownerStableId: string;
  input: CommitClientShardOperationInput;
  requestFingerprint: string;
  preparedAtMs: number;
}>;

export type CommitClientShardOperationResult =
  | Readonly<{
      status: 'applied' | 'already-applied';
      balanceBefore: number;
      balanceAfter: number;
      operation: ClientShardOperation;
    }>
  | Readonly<{ status: 'insufficient'; balance: number }>
  | Readonly<{
      status: 'already-satisfied';
      balance: number;
      balanceBefore: number;
      balanceAfter: number;
    }>
  | Readonly<{ status: 'failed'; reason: string }>;

function ownerPart(ownerStableId: string): string {
  return encodeURIComponent(ownerStableId);
}

export function clientShardOperationStorageKey(ownerStableId: string, operationId: string): string {
  return `${CLIENT_SHARD_OPERATION_PREFIX}${ownerPart(ownerStableId)}:${operationId}`;
}

export function clientShardLedgerStateStorageKey(ownerStableId: string): string {
  return `${CLIENT_SHARD_LEDGER_STATE_PREFIX}${ownerPart(ownerStableId)}`;
}

export function clientShardPreparedStorageKey(ownerStableId: string): string {
  return `${CLIENT_SHARD_PREPARED_PREFIX}${ownerPart(ownerStableId)}`;
}

function clientShardGrantReceiptStorageKey(ownerStableId: string, operationId: string): string {
  return `${CLIENT_SHARD_GRANT_RECEIPT_PREFIX}${ownerPart(ownerStableId)}:${operationId}`;
}

export function clientShardCloudSyncedStorageKey(ownerStableId: string, operationId: string): string {
  return `${CLIENT_SHARD_CLOUD_SYNCED_PREFIX}${ownerPart(ownerStableId)}:${operationId}`;
}

function finiteBalance(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeJson(value: unknown, path = 'root'): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`non_finite_json:${path}`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => normalizeJson(item, `${path}[${index}]`));
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    Object.keys(record).sort().forEach((key) => {
      const item = record[key];
      if (item === undefined) return;
      normalized[key] = normalizeJson(item, `${path}.${key}`);
    });
    return normalized;
  }
  throw new Error(`unsupported_json:${path}`);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

async function sha256(value: unknown): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalJson(value),
  );
}

function validateInput(input: CommitClientShardOperationInput): void {
  if (!OP_ID_RE.test(String(input.operationId ?? ''))) throw new Error('invalid_operation_id');
  if (input.direction !== 'debit' && input.direction !== 'credit') throw new Error('invalid_direction');
  if (input.authority !== undefined && input.authority !== 'client' && input.authority !== 'external') {
    throw new Error('invalid_authority');
  }
  if (input.expectedOwnerStableId !== undefined && !String(input.expectedOwnerStableId).trim()) {
    throw new Error('invalid_expected_owner');
  }
  if (input.mergeReplay !== undefined && typeof input.mergeReplay !== 'boolean') {
    throw new Error('invalid_merge_replay');
  }
  if (input.mergeSemanticResult !== undefined && typeof input.mergeSemanticResult !== 'boolean') {
    throw new Error('invalid_merge_semantic_result');
  }
  if (input.semanticResult !== undefined && typeof input.semanticResult !== 'boolean') {
    throw new Error('invalid_semantic_result');
  }
  if (input.mergeSemanticResult && !input.mergeReplay) throw new Error('invalid_merge_semantic_scope');
  if (input.mergeReplay && (!input.expectedOwnerStableId || (input.authority ?? 'client') !== 'client')) {
    throw new Error('invalid_merge_replay_scope');
  }
  if (input.mergeReplay && !FINGERPRINT_RE.test(String(input.mergeSourceFingerprint ?? ''))) {
    throw new Error('invalid_merge_source_fingerprint');
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('invalid_amount');
  if (
    typeof input.reason !== 'string'
    || input.reason.trim() !== input.reason
    || input.reason.length === 0
    || input.reason.length > MAX_REASON_LENGTH
  ) throw new Error('invalid_reason');
  if (!input.grant || !TOKEN_RE.test(String(input.grant.kind ?? ''))) throw new Error('invalid_grant_kind');
  if (!TOKEN_RE.test(String(input.grant.subjectId ?? ''))) throw new Error('invalid_grant_subject');
  if (input.grant.payload !== undefined) normalizeJson(input.grant.payload);
  if (!Array.isArray(input.localWrites)) throw new Error('invalid_local_writes');
  if (input.direction === 'debit' && input.localWrites.length === 0 && !input.mergeReplay && !input.semanticResult) {
    throw new Error('debit_exact_result_required');
  }
  if (input.localWrites.length > MAX_LOCAL_WRITES) throw new Error('too_many_local_writes');
  const seenKeys = new Set<string>();
  let totalBytes = 0;
  input.localWrites.forEach(([key, value]) => {
    if (typeof key !== 'string' || key.length === 0 || key.length > 240) throw new Error('invalid_local_write_key');
    if (typeof value !== 'string') throw new Error('invalid_local_write_value');
    if (seenKeys.has(key)) throw new Error('duplicate_local_write_key');
    seenKeys.add(key);
    if (
      key === BALANCE_KEY
      || key === BALANCE_META_KEY
      || key.startsWith(CLIENT_SHARD_OPERATION_PREFIX)
      || key.startsWith(CLIENT_SHARD_LEDGER_STATE_PREFIX)
      || key.startsWith(CLIENT_SHARD_PREPARED_PREFIX)
      || key.startsWith(CLIENT_SHARD_GRANT_RECEIPT_PREFIX)
      || key.startsWith(CLIENT_SHARD_CLOUD_SYNCED_PREFIX)
      || key.startsWith(CLIENT_SHARD_SEMANTIC_PAID_PREFIX)
    ) throw new Error('reserved_local_write_key');
    totalBytes += key.length + value.length;
  });
  if (totalBytes > MAX_LOCAL_WRITE_BYTES) throw new Error('local_writes_too_large');
}

function parseOperation(raw: string | null): ClientShardOperation | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ClientShardOperation;
    if (
      value.schemaVersion !== 'client-shard-operation.v1'
      || !OP_ID_RE.test(value.operationId)
      || typeof value.ownerStableId !== 'string'
      || (value.authority !== 'client' && value.authority !== 'external')
      || !Number.isSafeInteger(value.amount)
      || value.amount <= 0
      || value.delta !== (value.direction === 'debit' ? -value.amount : value.amount)
      || !Number.isSafeInteger(value.revision)
      || value.revision <= 0
      || finiteBalance(value.balanceBefore) === null
      || finiteBalance(value.balanceAfter) === null
      || value.balanceAfter !== value.balanceBefore + value.delta
      || typeof value.requestFingerprint !== 'string'
      || !FINGERPRINT_RE.test(value.requestFingerprint)
      || !Array.isArray(value.localWrites)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

function parseState(raw: string | null, ownerStableId: string): ClientShardLedgerState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ClientShardLedgerState;
    if (
      value.schemaVersion !== 'client-shard-ledger-state.v1'
      || value.ownerStableId !== ownerStableId
      || finiteBalance(value.openingBalance) === null
      || value.openingBalance < 0
      || finiteBalance(value.balance) === null
      || !Number.isSafeInteger(value.revision)
      || value.revision < 0
      || (value.headOperationId !== null && !OP_ID_RE.test(value.headOperationId))
      || (value.revision === 0) !== (value.headOperationId === null)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

async function readOrCreateState(ownerStableId: string): Promise<ClientShardLedgerState> {
  const raw = await AsyncStorage.getItem(clientShardLedgerStateStorageKey(ownerStableId));
  const parsed = parseState(raw, ownerStableId);
  if (parsed) return parsed;
  if (raw !== null) throw new Error('client_shard_ledger_state_corrupt');
  const openingBalance = Math.max(0, finiteBalance(await AsyncStorage.getItem(BALANCE_KEY)) ?? 0);
  return {
    schemaVersion: 'client-shard-ledger-state.v1',
    ownerStableId,
    openingBalance,
    balance: openingBalance,
    revision: 0,
    headOperationId: null,
    updatedAtMs: Date.now(),
  };
}

function publicRequest(input: CommitClientShardOperationInput): unknown {
  return {
    operationId: input.operationId,
    authority: input.authority ?? 'client',
    direction: input.direction,
    amount: input.amount,
    reason: input.reason,
    grant: input.grant,
    semanticResult: Boolean(input.semanticResult || input.mergeSemanticResult),
    // Device-local snapshots are crash materialization only. They cannot be
    // part of the cross-device semantic identity of an idempotent purchase.
    localWrites: input.semanticResult || input.mergeSemanticResult ? [] : input.localWrites,
  };
}

async function publishProjection(state: ClientShardLedgerState, operation: ClientShardOperation): Promise<void> {
  await AsyncStorage.multiSet([
    [BALANCE_KEY, String(Math.max(0, state.balance))],
    [BALANCE_META_KEY, JSON.stringify({
      updatedAtMs: state.updatedAtMs,
      op: operation.direction === 'debit' ? 'spend' : 'earn',
      reason: operation.reason,
      authority: `${operation.authority}_operation_ledger_v1`,
      operationId: operation.operationId,
    })],
  ]);
}

async function commitUnlocked(
  input: CommitClientShardOperationInput,
  ownerStableId: string,
): Promise<CommitClientShardOperationResult> {
  validateInput(input);
  const fingerprint = input.mergeReplay
    ? String(input.mergeSourceFingerprint)
    : await sha256(publicRequest(input));
  const operationKey = clientShardOperationStorageKey(ownerStableId, input.operationId);
  const stateKey = clientShardLedgerStateStorageKey(ownerStableId);
  const preparedKey = clientShardPreparedStorageKey(ownerStableId);
  const grantReceiptKey = clientShardGrantReceiptStorageKey(ownerStableId, input.operationId);
  const [existingRaw, grantReceiptRaw, preparedRaw] = await Promise.all([
    AsyncStorage.getItem(operationKey),
    AsyncStorage.getItem(grantReceiptKey),
    AsyncStorage.getItem(preparedKey),
  ]);
  const existing = parseOperation(existingRaw);
  if (existingRaw !== null && !existing) throw new Error('client_shard_operation_corrupt');
  if (existing && existing.requestFingerprint !== fingerprint) throw new Error('operation_id_conflict');
  const pendingPrepared = parsePrepared(preparedRaw, ownerStableId);
  if (preparedRaw !== null && !pendingPrepared) throw new Error('prepared_operation_corrupt');
  if (pendingPrepared && pendingPrepared.input.operationId !== input.operationId) {
    throw new Error('prepared_operation_recovery_required');
  }
  if (pendingPrepared && pendingPrepared.requestFingerprint !== fingerprint) {
    throw new Error('prepared_operation_fingerprint_conflict');
  }

  const state = await readOrCreateState(ownerStableId);
  if (existing) {
    if (grantReceiptRaw !== fingerprint) throw new Error('applied_operation_incomplete');
    let healedState = state;
    if (state.revision < existing.revision) {
      if (
        state.revision !== existing.revision - 1
        || state.balance !== existing.balanceBefore
      ) throw new Error('client_shard_ledger_head_gap');
      healedState = {
        ...state,
        balance: existing.balanceAfter,
        revision: existing.revision,
        headOperationId: existing.operationId,
        updatedAtMs: Date.now(),
      };
      await AsyncStorage.setItem(stateKey, JSON.stringify(healedState));
    } else if (state.revision === existing.revision && state.headOperationId !== existing.operationId) {
      throw new Error('client_shard_ledger_revision_conflict');
    }
    await publishProjection(healedState, existing);
    await AsyncStorage.removeItem(preparedKey);
    return {
      status: 'already-applied',
      balanceBefore: existing.balanceBefore,
      balanceAfter: healedState.balance,
      operation: existing,
    };
  }

  const semanticIdentity = Boolean(input.semanticResult || input.mergeSemanticResult);
  const semanticDebit = semanticIdentity && input.direction === 'debit';
  let semanticWrites: readonly ClientShardLocalWrite[] = input.localWrites;
  if (!existing && semanticDebit && grantReceiptRaw !== fingerprint) {
    const reduced = await reduceClientShardGrant(
      input.grant,
      Number(input.createdAtMs) || Date.now(),
      input.localWrites,
      ownerStableId,
    );
    if (reduced.status === 'already-satisfied') {
      if (reduced.writes.length > 0) {
        await AsyncStorage.multiSet(reduced.writes.map(([key, value]) => [key, value]));
      }
      if (pendingPrepared) await AsyncStorage.removeItem(preparedKey);
      return {
        status: 'already-satisfied',
        balance: state.balance,
        balanceBefore: state.balance,
        balanceAfter: state.balance,
      };
    }
    if (reduced.status !== 'materialized') throw new Error('unsupported_semantic_grant');
    const materializedKeys = new Set(reduced.writes.map(([key]) => key));
    semanticWrites = [
      ...reduced.writes,
      ...input.localWrites.filter(([key]) => !materializedKeys.has(key)),
    ];
  }

  if (
    (input.authority ?? 'client') === 'client'
    && !input.mergeReplay
    && input.direction === 'debit'
    && state.balance < input.amount
  ) {
    return { status: 'insufficient', balance: state.balance };
  }

  const prepared: PreparedOperation = {
    schemaVersion: 'client-shard-prepared.v1',
    ownerStableId,
    input,
    requestFingerprint: fingerprint,
    preparedAtMs: Date.now(),
  };
  await AsyncStorage.setItem(preparedKey, JSON.stringify(prepared));

  if (grantReceiptRaw !== fingerprint) {
    const exactResultWrites = semanticDebit ? semanticWrites : input.localWrites;
    await AsyncStorage.multiSet(exactResultWrites.map(([key, value]) => [key, value]));
    await AsyncStorage.setItem(grantReceiptKey, fingerprint);
  }

  const balanceBefore = state.balance;
  const delta = input.direction === 'debit' ? -input.amount : input.amount;
  const nextBalance = state.balance + delta;
  if (!Number.isSafeInteger(nextBalance)) throw new Error('invalid_next_balance');
  const operation: ClientShardOperation = {
    schemaVersion: 'client-shard-operation.v1',
    operationId: input.operationId,
    ownerStableId,
    authority: input.authority ?? 'client',
    direction: input.direction,
    amount: input.amount,
    delta,
    reason: input.reason,
    grant: normalizeJson(input.grant) as ClientShardGrant,
    // Raw storage snapshots are source-device only and never become cloud
    // executable input. Semantic debits are reconstructed from their grant;
    // credit marker writes remain local crash state only.
    localWrites: semanticDebit
      ? []
      : input.localWrites.map(([key, value]) => [key, value] as const),
    revision: state.revision + 1,
    balanceBefore,
    balanceAfter: nextBalance,
    createdAtMs: Number.isSafeInteger(input.createdAtMs) && Number(input.createdAtMs) > 0
      ? Number(input.createdAtMs)
      : Date.now(),
    requestFingerprint: fingerprint,
  };
  const nextState: ClientShardLedgerState = {
    ...state,
    balance: nextBalance,
    revision: state.revision + 1,
    headOperationId: operation.operationId,
    updatedAtMs: Date.now(),
  };

  // Root-last: result/grant is durable before the immutable operation commits
  // the debit. A crash can favor the user, but can never publish a debit
  // without its exact result. The mutable state below is only a projection.
  await AsyncStorage.setItem(operationKey, JSON.stringify(operation));
  await AsyncStorage.setItem(stateKey, JSON.stringify(nextState));
  await publishProjection(nextState, operation);
  await AsyncStorage.removeItem(preparedKey);
  return { status: 'applied', balanceBefore, balanceAfter: nextBalance, operation };
}

export async function commitClientShardOperation(
  input: CommitClientShardOperationInput,
  options: Readonly<{
    accountToken?: AccountGenerationToken;
    accountTransitionLockLease?: AccountTransitionLockLease;
  }> = {},
): Promise<CommitClientShardOperationResult> {
  try {
    const ownerStableId = String(await getStableId()).trim();
    if (input.expectedOwnerStableId !== undefined && ownerStableId !== input.expectedOwnerStableId) {
      return { status: 'failed', reason: 'external_event_owner_changed' };
    }
    const accountToken = options.accountToken ?? captureAccountGeneration();
    if (!ownerStableId
      || accountToken.stableId !== ownerStableId
      || !isCurrentAccountGeneration(accountToken, ownerStableId)) {
      return { status: 'failed', reason: 'stale_account_generation' };
    }
    const result = await withAccountTransitionLock(async () => withStorageLock(async () => {
      if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
        return { status: 'failed', reason: 'stale_account_generation' } as const;
      }
      try {
        return await commitUnlocked(input, ownerStableId);
      } catch (error) {
        // If root publication succeeded and only the compatibility projection
        // failed, a same-id retry is safe and heals it without a second debit.
        const state = parseState(
          await AsyncStorage.getItem(clientShardLedgerStateStorageKey(ownerStableId)).catch(() => null),
          ownerStableId,
        );
        const operation = parseOperation(
          await AsyncStorage.getItem(clientShardOperationStorageKey(ownerStableId, input.operationId)).catch(() => null),
        );
        const retryFingerprint = input.mergeReplay
          ? String(input.mergeSourceFingerprint)
          : await sha256(publicRequest(input)).catch(() => null);
        if (operation && operation.requestFingerprint === retryFingerprint) {
          let healedState = state;
          if (state && state.revision === operation.revision - 1 && state.balance === operation.balanceBefore) {
            healedState = {
              ...state,
              balance: operation.balanceAfter,
              revision: operation.revision,
              headOperationId: operation.operationId,
              updatedAtMs: Date.now(),
            };
            await AsyncStorage.setItem(
              clientShardLedgerStateStorageKey(ownerStableId),
              JSON.stringify(healedState),
            ).catch(() => {});
          }
          if (!healedState || healedState.revision < operation.revision) {
            throw error;
          }
          await publishProjection(healedState, operation).catch(() => {});
          return {
            status: 'applied',
            balanceBefore: operation.balanceBefore,
            balanceAfter: healedState.balance,
            operation,
          } as const;
        }
        const reason = error instanceof Error ? error.message : 'unknown';
        return { status: 'failed', reason } as const;
      }
    }), options.accountTransitionLockLease);
    if (
      (result.status === 'applied' || result.status === 'already-applied')
      && result.operation.authority === 'client'
    ) {
      // The compatibility ledger remains the crash-safe materialization while
      // PhoneState is the single portable/background journal. A local SQL
      // failure is retried by opening import and never takes away the grant.
      await commitPhoneStateEconomyOperation(result.operation);
    }
    return result;
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' };
  }
}

function parsePrepared(raw: string | null, ownerStableId: string): PreparedOperation | null {
  if (!raw) return null;
  try {
    const prepared = JSON.parse(raw) as PreparedOperation;
    if (
      prepared.schemaVersion !== 'client-shard-prepared.v1'
      || prepared.ownerStableId !== ownerStableId
      || typeof prepared.requestFingerprint !== 'string'
      || !FINGERPRINT_RE.test(prepared.requestFingerprint)
    ) return null;
    validateInput(prepared.input);
    return prepared;
  } catch {
    return null;
  }
}

/** Recover the one owner-scoped operation that may have crossed a crash boundary. */
export async function recoverPreparedClientShardOperation(
  options: Readonly<{
    accountToken?: AccountGenerationToken;
    accountTransitionLockLease?: AccountTransitionLockLease;
  }> = {},
): Promise<CommitClientShardOperationResult | null> {
  try {
    const ownerStableId = String(await getStableId()).trim();
    if (!ownerStableId) return null;
    const raw = await AsyncStorage.getItem(clientShardPreparedStorageKey(ownerStableId));
    if (raw === null) return null;
    const prepared = parsePrepared(raw, ownerStableId);
    if (!prepared) return { status: 'failed', reason: 'prepared_operation_corrupt' };
    const fingerprint = prepared.input.mergeReplay
      ? String(prepared.input.mergeSourceFingerprint)
      : await sha256(publicRequest(prepared.input));
    if (fingerprint !== prepared.requestFingerprint) {
      return { status: 'failed', reason: 'prepared_operation_fingerprint_mismatch' };
    }
    return commitClientShardOperation(prepared.input, options);
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' };
  }
}

export function clientShardOperationForCloud(operation: ClientShardOperation): Record<string, unknown> {
  return {
    schemaVersion: operation.schemaVersion,
    operationId: operation.operationId,
    ownerStableId: operation.ownerStableId,
    authority: operation.authority,
    direction: operation.direction,
    amount: operation.amount,
    delta: operation.delta,
    revision: operation.revision,
    balanceBefore: operation.balanceBefore,
    balanceAfter: operation.balanceAfter,
    reason: operation.reason,
    grant: operation.grant,
    createdAtMs: operation.createdAtMs,
    requestFingerprint: operation.requestFingerprint,
  };
}

export async function readStoredClientShardOperation(
  ownerStableId: string,
  operationId: string,
): Promise<ClientShardOperation | null> {
  const owner = String(ownerStableId ?? '').trim();
  if (!owner || !OP_ID_RE.test(operationId)) return null;
  const operation = parseOperation(
    await AsyncStorage.getItem(clientShardOperationStorageKey(owner, operationId)),
  );
  return operation?.ownerStableId === owner ? operation : null;
}

export async function hasClientShardLedgerState(ownerStableId: string): Promise<boolean> {
  const owner = String(ownerStableId ?? '').trim();
  if (!owner) return false;
  const raw = await AsyncStorage.getItem(clientShardLedgerStateStorageKey(owner));
  if (raw === null) return false;
  if (!parseState(raw, owner)) throw new Error('client_shard_ledger_state_corrupt');
  return true;
}

/** Freeze the legacy balance once as the opening projection for journal v1. */
export async function initializeClientShardLedgerOpeningBalance(
  openingOverride?: number,
  expectedOwnerStableId?: string,
): Promise<number | null> {
  const ownerStableId = String(await getStableId()).trim();
  const accountToken = captureAccountGeneration();
  if (
    !ownerStableId
    || (expectedOwnerStableId !== undefined && ownerStableId !== expectedOwnerStableId)
    || !isCurrentAccountGeneration(accountToken, ownerStableId)
  ) return null;
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (
      (expectedOwnerStableId !== undefined && ownerStableId !== expectedOwnerStableId)
      || !isCurrentAccountGeneration(accountToken, ownerStableId)
    ) return null;
    const key = clientShardLedgerStateStorageKey(ownerStableId);
    const existingRaw = await AsyncStorage.getItem(key);
    if (existingRaw !== null) {
      const existing = parseState(existingRaw, ownerStableId);
      if (!existing) throw new Error('client_shard_ledger_state_corrupt');
      return existing.balance;
    }
    const requestedOpening = openingOverride === undefined
      ? finiteBalance(await AsyncStorage.getItem(BALANCE_KEY))
      : finiteBalance(openingOverride);
    const openingBalance = Math.max(0, requestedOpening ?? 0);
    const state: ClientShardLedgerState = {
      schemaVersion: 'client-shard-ledger-state.v1',
      ownerStableId,
      openingBalance,
      balance: openingBalance,
      revision: 0,
      headOperationId: null,
      updatedAtMs: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(state));
    return openingBalance;
  }));
}

export async function readClientShardLedgerOpeningBalance(ownerStableId: string): Promise<number | null> {
  const owner = String(ownerStableId ?? '').trim();
  if (!owner) return null;
  const state = parseState(
    await AsyncStorage.getItem(clientShardLedgerStateStorageKey(owner)),
    owner,
  );
  return state?.openingBalance ?? null;
}

/** Rebase an already-migrated device onto the one immutable cloud opening. */
export async function reconcileClientShardLedgerOpeningBalance(
  expectedOwnerStableId: string,
  canonicalOpeningBalance: number,
): Promise<number | null> {
  const canonical = finiteBalance(canonicalOpeningBalance);
  if (canonical === null || canonical < 0) return null;
  const ownerStableId = String(await getStableId()).trim();
  const accountToken = captureAccountGeneration();
  if (
    ownerStableId !== expectedOwnerStableId
    || !isCurrentAccountGeneration(accountToken, ownerStableId)
  ) return null;
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, ownerStableId)) return null;
    const key = clientShardLedgerStateStorageKey(ownerStableId);
    const state = parseState(await AsyncStorage.getItem(key), ownerStableId);
    if (!state) return null;
    if (state.openingBalance === canonical) return state.balance;
    const balance = state.balance + canonical - state.openingBalance;
    if (!Number.isSafeInteger(balance)) return null;
    const next: ClientShardLedgerState = {
      ...state,
      openingBalance: canonical,
      balance,
      updatedAtMs: Date.now(),
    };
    await AsyncStorage.multiSet([
      [key, JSON.stringify(next)],
      [BALANCE_KEY, String(Math.max(0, balance))],
      [BALANCE_META_KEY, JSON.stringify({
        updatedAtMs: next.updatedAtMs,
        op: 'replace',
        reason: 'immutable_opening_rebase',
        authority: 'client_operation_ledger_v1',
      })],
    ]);
    return balance;
  }));
}
