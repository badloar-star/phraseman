import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  DAILY_JOURNEY_FREEZE_OPERATION_PREFIX,
  DAILY_JOURNEY_FREEZE_PREPARED_PREFIX,
  DAILY_JOURNEY_FREEZE_PROJECTION_PREFIX,
} from '../constants/daily_journey_freeze_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
  type AccountGenerationToken,
} from './account_generation';
import { withStorageLock } from './storage_mutex';

const CLAIM_ID_RE = /^daily-journey-gift-claim:[A-Za-z0-9][A-Za-z0-9_.:-]{7,159}$/;
const USE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,159}$/;
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;

type LegacyFreezeOperationKind = 'grant' | 'consume';

type DailyJourneyFreezeOperationV1 = Readonly<{
  schemaVersion: 'daily-journey-freeze-operation.v1';
  operationId: string;
  ownerStableId: string;
  kind: LegacyFreezeOperationKind;
  sourceId: string;
  sourceFingerprint: string | null;
  amount: number;
  revision: number;
  createdAtMs: number;
  payloadFingerprint: string;
}>;

type DailyJourneyFreezeCompositeConsumeOperationV2 = Readonly<{
  schemaVersion: 'daily-journey-freeze-operation.v2';
  operationId: string;
  ownerStableId: string;
  kind: 'consume_batch';
  sourceId: string;
  sourceFingerprint: string;
  useOperationIds: readonly string[];
  amount: number;
  revision: number;
  createdAtMs: number;
  payloadFingerprint: string;
}>;

type DailyJourneyFreezeOperation =
  | DailyJourneyFreezeOperationV1
  | DailyJourneyFreezeCompositeConsumeOperationV2;

type DailyJourneyFreezeOperationBody =
  | Omit<DailyJourneyFreezeOperationV1, 'payloadFingerprint'>
  | Omit<DailyJourneyFreezeCompositeConsumeOperationV2, 'payloadFingerprint'>;

type DailyJourneyFreezePreparedV1 = Readonly<{
  schemaVersion: 'daily-journey-freeze-prepared.v1';
  ownerStableId: string;
  operation: DailyJourneyFreezeOperation;
  preparedAtMs: number;
}>;

export type DailyJourneyFreezeProjectionV1 = Readonly<{
  schemaVersion: 'daily-journey-freeze-projection.v1';
  ownerStableId: string;
  grantedCount: number;
  consumedCount: number;
  remainingCount: number;
  latestRevision: number;
}>;

type Journal = Readonly<{
  operations: readonly DailyJourneyFreezeOperation[];
  projection: DailyJourneyFreezeProjectionV1;
}>;

function assertCurrent(token: AccountGenerationToken): string {
  const ownerStableId = token.stableId?.trim() ?? '';
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('daily_journey_freeze_account_stale');
  }
  return ownerStableId;
}

async function accountAwait<T>(token: AccountGenerationToken, work: () => Promise<T>): Promise<T> {
  assertCurrent(token);
  const value = await work();
  assertCurrent(token);
  return value;
}

const ownerPart = (ownerStableId: string): string => encodeURIComponent(ownerStableId);
const operationPart = (operationId: string): string => encodeURIComponent(operationId);
const operationKey = (ownerStableId: string, operationId: string): string => (
  `${DAILY_JOURNEY_FREEZE_OPERATION_PREFIX}${ownerPart(ownerStableId)}:${operationPart(operationId)}`
);
const preparedKey = (ownerStableId: string): string => (
  `${DAILY_JOURNEY_FREEZE_PREPARED_PREFIX}${ownerPart(ownerStableId)}`
);
const projectionKey = (ownerStableId: string): string => (
  `${DAILY_JOURNEY_FREEZE_PROJECTION_PREFIX}${ownerPart(ownerStableId)}`
);

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function operationBody(operation: DailyJourneyFreezeOperationBody) {
  const common = {
    schemaVersion: operation.schemaVersion,
    operationId: operation.operationId,
    ownerStableId: operation.ownerStableId,
    kind: operation.kind,
    sourceId: operation.sourceId,
    sourceFingerprint: operation.sourceFingerprint,
    amount: operation.amount,
    revision: operation.revision,
    createdAtMs: operation.createdAtMs,
  };
  return operation.schemaVersion === 'daily-journey-freeze-operation.v2'
    ? { ...common, useOperationIds: operation.useOperationIds }
    : common;
}

async function fingerprintOperation(
  operation: DailyJourneyFreezeOperationBody,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(operationBody(operation)),
  );
}

async function parseOperation(
  raw: string | null,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyFreezeOperation | null> {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const isComposite = value.schemaVersion === 'daily-journey-freeze-operation.v2';
    if (!hasExactKeys(value, [
      'schemaVersion', 'operationId', 'ownerStableId', 'kind', 'sourceId',
      'sourceFingerprint', ...(isComposite ? ['useOperationIds'] : []),
      'amount', 'revision', 'createdAtMs', 'payloadFingerprint',
    ])) return null;
    const operation = value as DailyJourneyFreezeOperation;
    const validGrant = operation.kind === 'grant'
      && CLAIM_ID_RE.test(operation.sourceId)
      && (operation.amount === 1 || operation.amount === 2)
      && typeof operation.sourceFingerprint === 'string'
      && FINGERPRINT_RE.test(operation.sourceFingerprint)
      && operation.operationId === operation.sourceId;
    const validConsume = operation.kind === 'consume'
      && USE_ID_RE.test(operation.sourceId)
      && operation.amount === 1
      && operation.sourceFingerprint === null
      && operation.operationId === `daily-journey-freeze-consume:${operation.sourceId}`;
    const composite = isComposite
      ? operation as DailyJourneyFreezeCompositeConsumeOperationV2
      : null;
    const validComposite = composite !== null
      && composite.kind === 'consume_batch'
      && Array.isArray(composite.useOperationIds)
      && composite.useOperationIds.length >= 1
      && composite.useOperationIds.every((id) => typeof id === 'string' && USE_ID_RE.test(id))
      && new Set(composite.useOperationIds).size === composite.useOperationIds.length
      && composite.amount === composite.useOperationIds.length
      && composite.sourceId === composite.useOperationIds[0]
      && composite.operationId === `daily-journey-freeze-consume-batch:${composite.sourceId}`
      && FINGERPRINT_RE.test(composite.sourceFingerprint);
    const validVersionedOperation = operation.schemaVersion === 'daily-journey-freeze-operation.v1'
      ? validGrant || validConsume
      : operation.schemaVersion === 'daily-journey-freeze-operation.v2' && validComposite;
    if (operation.ownerStableId !== ownerStableId
      || !validVersionedOperation
      || !Number.isSafeInteger(operation.revision) || operation.revision < 1
      || !Number.isSafeInteger(operation.createdAtMs) || operation.createdAtMs < 0
      || typeof operation.payloadFingerprint !== 'string'
      || !FINGERPRINT_RE.test(operation.payloadFingerprint)) return null;
    if (composite) {
      const expectedSemantic = await accountAwait(token, () => Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(composite.useOperationIds),
      ));
      if (expectedSemantic !== composite.sourceFingerprint) return null;
    }
    const expected = await accountAwait(token, () => fingerprintOperation(operation));
    return expected === operation.payloadFingerprint ? Object.freeze(operation) : null;
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_freeze_account_stale') throw error;
    return null;
  }
}

function projectionFrom(
  ownerStableId: string,
  operations: readonly DailyJourneyFreezeOperation[],
): DailyJourneyFreezeProjectionV1 {
  let grantedCount = 0;
  let consumedCount = 0;
  operations.forEach((operation, index) => {
    if (operation.revision !== index + 1) throw new Error('daily_journey_freeze_revision_gap');
    if (operation.kind === 'grant') grantedCount += operation.amount;
    else consumedCount += operation.amount;
    if (consumedCount > grantedCount) throw new Error('daily_journey_freeze_projection_corrupt');
  });
  return Object.freeze({
    schemaVersion: 'daily-journey-freeze-projection.v1',
    ownerStableId,
    grantedCount,
    consumedCount,
    remainingCount: grantedCount - consumedCount,
    latestRevision: operations.length,
  });
}

function parseProjection(raw: string | null, ownerStableId: string): DailyJourneyFreezeProjectionV1 | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || !hasExactKeys(value, [
        'schemaVersion', 'ownerStableId', 'grantedCount', 'consumedCount',
        'remainingCount', 'latestRevision',
      ])) return null;
    const projection = value as DailyJourneyFreezeProjectionV1;
    if (projection.schemaVersion !== 'daily-journey-freeze-projection.v1'
      || projection.ownerStableId !== ownerStableId
      || !Number.isSafeInteger(projection.grantedCount) || projection.grantedCount < 0
      || !Number.isSafeInteger(projection.consumedCount) || projection.consumedCount < 0
      || !Number.isSafeInteger(projection.remainingCount) || projection.remainingCount < 0
      || !Number.isSafeInteger(projection.latestRevision) || projection.latestRevision < 0
      || projection.remainingCount !== projection.grantedCount - projection.consumedCount) return null;
    return Object.freeze(projection);
  } catch {
    return null;
  }
}

async function readOperations(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyFreezeOperation[]> {
  const prefix = `${DAILY_JOURNEY_FREEZE_OPERATION_PREFIX}${ownerPart(ownerStableId)}:`;
  const allKeys = await accountAwait(token, () => AsyncStorage.getAllKeys());
  const keys = allKeys.filter((key) => key.startsWith(prefix)).sort();
  const rows = keys.length > 0
    ? await accountAwait(token, () => AsyncStorage.multiGet(keys))
    : [];
  if (rows.length !== keys.length) throw new Error('daily_journey_freeze_operation_corrupt');
  const operations: DailyJourneyFreezeOperation[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const [key, raw] = rows[index] ?? [];
    if (key !== keys[index]) throw new Error('daily_journey_freeze_operation_corrupt');
    const operation = await accountAwait(token, () => parseOperation(raw ?? null, ownerStableId, token));
    if (!operation || key !== operationKey(ownerStableId, operation.operationId)) {
      throw new Error('daily_journey_freeze_operation_corrupt');
    }
    operations.push(operation);
  }
  operations.sort((left, right) => left.revision - right.revision);
  projectionFrom(ownerStableId, operations);
  return operations;
}

async function readJournal(
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<Journal> {
  const operations = await accountAwait(token, () => readOperations(ownerStableId, token));
  const expected = projectionFrom(ownerStableId, operations);
  const raw = await accountAwait(token, () => AsyncStorage.getItem(projectionKey(ownerStableId)));
  if (raw === null && operations.length === 0) return { operations, projection: expected };
  const projection = parseProjection(raw, ownerStableId);
  if (!projection || JSON.stringify(projection) !== JSON.stringify(expected)) {
    throw new Error('daily_journey_freeze_projection_corrupt');
  }
  return Object.freeze({ operations, projection });
}

async function parsePrepared(
  raw: string | null,
  ownerStableId: string,
  token: AccountGenerationToken,
): Promise<DailyJourneyFreezePreparedV1 | null> {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || !hasExactKeys(value, ['schemaVersion', 'ownerStableId', 'operation', 'preparedAtMs'])
      || value.schemaVersion !== 'daily-journey-freeze-prepared.v1'
      || value.ownerStableId !== ownerStableId
      || !Number.isSafeInteger(value.preparedAtMs) || Number(value.preparedAtMs) < 0) return null;
    const operation = await accountAwait(token, () => parseOperation(
      JSON.stringify(value.operation),
      ownerStableId,
      token,
    ));
    if (!operation || Number(value.preparedAtMs) < operation.createdAtMs) return null;
    return Object.freeze({
      schemaVersion: 'daily-journey-freeze-prepared.v1',
      ownerStableId,
      operation,
      preparedAtMs: Number(value.preparedAtMs),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_journey_freeze_account_stale') throw error;
    return null;
  }
}

async function finalizePrepared(
  prepared: DailyJourneyFreezePreparedV1,
  token: AccountGenerationToken,
): Promise<void> {
  const ownerStableId = assertCurrent(token);
  if (prepared.ownerStableId !== ownerStableId) throw new Error('daily_journey_freeze_account_stale');
  const operations = await accountAwait(token, () => readOperations(ownerStableId, token));
  const existing = operations.find((operation) => operation.operationId === prepared.operation.operationId);
  if (existing && JSON.stringify(existing) !== JSON.stringify(prepared.operation)) {
    throw new Error('daily_journey_freeze_operation_conflict');
  }
  const priorOperations = existing
    ? operations.filter((operation) => operation.operationId !== prepared.operation.operationId)
    : operations;
  if (prepared.operation.revision !== priorOperations.length + 1
    || (existing && prepared.operation.revision !== operations.length)) {
    throw new Error('daily_journey_freeze_prepared_conflict');
  }
  const nextOperations = [...priorOperations, prepared.operation];
  const priorProjection = projectionFrom(ownerStableId, priorOperations);
  const projection = projectionFrom(ownerStableId, nextOperations);
  const projectionRaw = await accountAwait(token, () => AsyncStorage.getItem(projectionKey(ownerStableId)));
  const exactPriorProjectionRaw = priorOperations.length === 0 ? null : JSON.stringify(priorProjection);
  const exactNextProjectionRaw = JSON.stringify(projection);
  if (projectionRaw !== exactPriorProjectionRaw && projectionRaw !== exactNextProjectionRaw) {
    throw new Error('daily_journey_freeze_projection_corrupt');
  }
  await accountAwait(token, () => AsyncStorage.multiSet([
    [operationKey(ownerStableId, prepared.operation.operationId), JSON.stringify(prepared.operation)],
    [projectionKey(ownerStableId), JSON.stringify(projection)],
  ]));
  await accountAwait(token, () => readJournal(ownerStableId, token));
  await accountAwait(token, () => AsyncStorage.removeItem(preparedKey(ownerStableId)));
  const remaining = await accountAwait(token, () => AsyncStorage.getItem(preparedKey(ownerStableId)));
  if (remaining !== null) throw new Error('daily_journey_freeze_prepared_clear_failed');
}

async function recoverPrepared(ownerStableId: string, token: AccountGenerationToken): Promise<void> {
  const raw = await accountAwait(token, () => AsyncStorage.getItem(preparedKey(ownerStableId)));
  if (raw === null) return;
  const prepared = await accountAwait(token, () => parsePrepared(raw, ownerStableId, token));
  if (!prepared) throw new Error('daily_journey_freeze_prepared_corrupt');
  await accountAwait(token, () => finalizePrepared(prepared, token));
}

async function withFreezeLock<T>(
  token: AccountGenerationToken,
  work: (ownerStableId: string) => Promise<T>,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<T> {
  return accountAwait(token, () => withAccountTransitionLock(
    async () => withStorageLock(async () => {
      const ownerStableId = assertCurrent(token);
      await recoverPrepared(ownerStableId, token);
      const value = await work(ownerStableId);
      assertCurrent(token);
      return value;
    }),
    accountTransitionLockLease,
  ));
}

function sameSemantic(
  operation: DailyJourneyFreezeOperation,
  kind: LegacyFreezeOperationKind,
  sourceId: string,
  sourceFingerprint: string | null,
  amount: number,
): boolean {
  return operation.kind === kind
    && operation.sourceId === sourceId
    && operation.sourceFingerprint === sourceFingerprint
    && operation.amount === amount;
}

type FreezeOperationInput = Readonly<{
  kind: LegacyFreezeOperationKind;
  operationId: string;
  sourceId: string;
  sourceFingerprint: string | null;
  amount: number;
}>;

async function persistPreparedOperationLocked(
  body: DailyJourneyFreezeOperationBody,
  token: AccountGenerationToken,
  ownerStableId: string,
): Promise<void> {
  const operation: DailyJourneyFreezeOperation = Object.freeze({
    ...body,
    payloadFingerprint: await accountAwait(token, () => fingerprintOperation(body)),
  }) as DailyJourneyFreezeOperation;
  const prepared: DailyJourneyFreezePreparedV1 = Object.freeze({
    schemaVersion: 'daily-journey-freeze-prepared.v1',
    ownerStableId,
    operation,
    preparedAtMs: Math.max(Date.now(), operation.createdAtMs),
  });
  const key = preparedKey(ownerStableId);
  await accountAwait(token, () => AsyncStorage.setItem(key, JSON.stringify(prepared)));
  const verifiedRaw = await accountAwait(token, () => AsyncStorage.getItem(key));
  const verified = await accountAwait(token, () => parsePrepared(verifiedRaw, ownerStableId, token));
  if (!verified || JSON.stringify(verified) !== JSON.stringify(prepared)) {
    throw new Error('daily_journey_freeze_prepared_write_unverified');
  }
  await accountAwait(token, () => finalizePrepared(verified, token));
}

async function appendOperationLocked(
  input: FreezeOperationInput,
  token: AccountGenerationToken,
  ownerStableId: string,
): Promise<'applied' | 'already_applied' | 'unavailable'> {
  const journal = await accountAwait(token, () => readJournal(ownerStableId, token));
  const existing = journal.operations.find((operation) => operation.operationId === input.operationId);
  if (existing) {
    if (!sameSemantic(existing, input.kind, input.sourceId, input.sourceFingerprint, input.amount)) {
      throw new Error('daily_journey_freeze_operation_conflict');
    }
    return 'already_applied';
  }
  if (input.kind === 'consume' && journal.projection.remainingCount < input.amount) return 'unavailable';
  const body: Omit<DailyJourneyFreezeOperationV1, 'payloadFingerprint'> = {
    schemaVersion: 'daily-journey-freeze-operation.v1',
    operationId: input.operationId,
    ownerStableId,
    kind: input.kind,
    sourceId: input.sourceId,
    sourceFingerprint: input.sourceFingerprint,
    amount: input.amount,
    revision: journal.projection.latestRevision + 1,
    createdAtMs: Date.now(),
  };
  await persistPreparedOperationLocked(body, token, ownerStableId);
  return 'applied';
}

async function appendOperation(
  input: FreezeOperationInput,
  token: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<'applied' | 'already_applied' | 'unavailable'> {
  return withFreezeLock(token, async (ownerStableId) => (
    appendOperationLocked(input, token, ownerStableId)
  ), accountTransitionLockLease);
}

function freezeConsumeInput(useOperationId: string): FreezeOperationInput {
  return Object.freeze({
    kind: 'consume',
    operationId: `daily-journey-freeze-consume:${useOperationId}`,
    sourceId: useOperationId,
    sourceFingerprint: null,
    amount: 1,
  });
}

export async function commitDailyJourneyFreezeGrant(
  input: Readonly<{
    claimOperationId: string;
    amount: number;
    occurrenceFingerprint: string;
  }>,
  token: AccountGenerationToken,
): Promise<{ status: 'applied' | 'already_applied' }> {
  if (!CLAIM_ID_RE.test(input.claimOperationId)
    || (input.amount !== 1 && input.amount !== 2)
    || !FINGERPRINT_RE.test(input.occurrenceFingerprint)) {
    throw new Error('daily_journey_freeze_grant_invalid');
  }
  const status = await appendOperation({
    kind: 'grant',
    operationId: input.claimOperationId,
    sourceId: input.claimOperationId,
    sourceFingerprint: input.occurrenceFingerprint,
    amount: input.amount,
  }, token);
  if (status === 'unavailable') throw new Error('daily_journey_freeze_projection_corrupt');
  return { status };
}

export async function consumeDailyJourneyFreeze(
  useOperationId: string,
  token: AccountGenerationToken = captureAccountGeneration(),
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<boolean> {
  if (!USE_ID_RE.test(useOperationId)) throw new Error('daily_journey_freeze_consume_invalid');
  const status = await appendOperation(
    freezeConsumeInput(useOperationId),
    token,
    accountTransitionLockLease,
  );
  return status !== 'unavailable';
}

/**
 * All-or-none consume for one Daily Journey calendar gap. The ordered missed
 * day ids are one immutable v2 operation with amount=N, so its prepared WAL
 * recovers the whole debit before any Hall operation after a process crash.
 */
export async function consumeDailyJourneyFreezeBatch(
  useOperationIds: readonly string[],
  token: AccountGenerationToken = captureAccountGeneration(),
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<Readonly<{
  status: 'applied' | 'already_applied' | 'unavailable';
  consumedCount: number;
}>> {
  if (useOperationIds.length < 1
    || new Set(useOperationIds).size !== useOperationIds.length
    || useOperationIds.some((id) => !USE_ID_RE.test(id))) {
    throw new Error('daily_journey_freeze_batch_invalid');
  }
  return withFreezeLock(token, async (ownerStableId) => {
    const orderedUseIds = Object.freeze([...useOperationIds]);
    const sourceId = orderedUseIds[0];
    const operationId = `daily-journey-freeze-consume-batch:${sourceId}`;
    const sourceFingerprint = await accountAwait(token, () => Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(orderedUseIds),
    ));
    const journal = await accountAwait(token, () => readJournal(ownerStableId, token));
    const existing = journal.operations.find((operation) => operation.operationId === operationId);
    if (existing) {
      if (existing.schemaVersion !== 'daily-journey-freeze-operation.v2'
        || existing.kind !== 'consume_batch'
        || existing.sourceId !== sourceId
        || existing.sourceFingerprint !== sourceFingerprint
        || existing.amount !== orderedUseIds.length
        || JSON.stringify(existing.useOperationIds) !== JSON.stringify(orderedUseIds)) {
        throw new Error('daily_journey_freeze_operation_conflict');
      }
      return Object.freeze({ status: 'already_applied' as const, consumedCount: 0 });
    }
    if (journal.projection.remainingCount < orderedUseIds.length) {
      return Object.freeze({ status: 'unavailable' as const, consumedCount: 0 });
    }
    const body: Omit<DailyJourneyFreezeCompositeConsumeOperationV2, 'payloadFingerprint'> = {
      schemaVersion: 'daily-journey-freeze-operation.v2',
      operationId,
      ownerStableId,
      kind: 'consume_batch',
      sourceId,
      sourceFingerprint,
      useOperationIds: orderedUseIds,
      amount: orderedUseIds.length,
      revision: journal.projection.latestRevision + 1,
      createdAtMs: Date.now(),
    };
    await persistPreparedOperationLocked(body, token, ownerStableId);
    return Object.freeze({ status: 'applied' as const, consumedCount: orderedUseIds.length });
  }, accountTransitionLockLease);
}

export async function readDailyJourneyFreezeProjection(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<DailyJourneyFreezeProjectionV1> {
  return withFreezeLock(token, async (ownerStableId) => (
    accountAwait(token, () => readJournal(ownerStableId, token)).then((journal) => journal.projection)
  ));
}

export async function readEffectiveStreakProtection(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<{
  serverShieldDays: number;
  dailyJourneyFreezeCount: number;
  totalProtectionCount: number;
}> {
  const projection = await accountAwait(token, () => readDailyJourneyFreezeProjection(token));
  const serverRaw = await accountAwait(token, () => AsyncStorage.getItem('chain_shield'));
  let serverShieldDays = 0;
  try {
    const server = serverRaw ? JSON.parse(serverRaw) as { daysLeft?: unknown } : null;
    serverShieldDays = Math.max(0, Math.floor(Number(server?.daysLeft) || 0));
  } catch {
    serverShieldDays = 0;
  }
  return Object.freeze({
    serverShieldDays,
    dailyJourneyFreezeCount: projection.remainingCount,
    totalProtectionCount: serverShieldDays + projection.remainingCount,
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
