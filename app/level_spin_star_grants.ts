import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { getAppSnapshot, patchAppSnapshot } from './app_snapshot_store';
import { callLevelSpinStarComposite } from './community_packs/functionsClient';
import {
  commitPhoneStateNonMonetaryEconomyGrant,
  readPhoneStateStarCreditState,
} from './phone_state_economy_bridge';
import { withStorageLock } from './storage_mutex';
import {
  levelSpinStarCreditAckOperationId,
  parseLevelSpinStarCreditAckExactResult,
  parseLevelSpinStarCreditExactResult,
  type LevelSpinStarCreditExactResult,
} from '../modules/phone-state/domains/economy';

const STAR_AMOUNTS = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
} as const);

type LevelSpinStarGiftId = keyof typeof STAR_AMOUNTS;
type LevelSpinStarLane = 'base' | 'premium';
type LevelSpinStarOperation = LevelSpinStarCreditExactResult;

type LevelSpinStarProjection = Readonly<{
  schemaVersion: 'client-level-spin-star-projection.v2';
  ownerStableId: string;
  operations: readonly LevelSpinStarOperation[];
  acknowledged: Readonly<Record<string, string>>;
  serverBalance: number;
  serverEarnedTotal: number;
  serverSeq: number;
}>;

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;
const DELIVERY_TOKEN_RE = /^[A-Za-z0-9_-]{16,96}$/;
const MAX_PENDING_STAR_OPERATIONS = 4_096;

export function levelSpinStarAmount(giftId: string): number {
  const amount = STAR_AMOUNTS[giftId as LevelSpinStarGiftId];
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('level_spin_star_gift_invalid');
  return amount;
}

export function levelSpinStarGrantOutboxKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('level_spin_star_owner_invalid');
  return `level_spin_star_grant_outbox_v1:${encodeURIComponent(owner)}`;
}

export function levelSpinStarProjectionKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('level_spin_star_owner_invalid');
  return `level_spin_star_projection_v1:${encodeURIComponent(owner)}`;
}

export function levelSpinStarPreparedKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('level_spin_star_owner_invalid');
  return `level_spin_star_prepared_v1:${encodeURIComponent(owner)}`;
}

function operationIdFor(requestId: string, lane: LevelSpinStarLane): string {
  return `level_spin:${requestId}.${lane}`;
}

function operationStorageKey(ownerStableId: string, operationId: string): string {
  return `level_spin_star_operation_v1:${encodeURIComponent(ownerStableId)}:${encodeURIComponent(operationId)}`;
}

async function fingerprintFor(input: Readonly<{
  ownerStableId: string; requestId: string; lane: LevelSpinStarLane; deliveryToken?: string;
  giftId: LevelSpinStarGiftId; amount: number;
}>): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    requestId: input.requestId,
    lane: input.lane,
    deliveryToken: input.deliveryToken ?? null,
    giftId: input.giftId,
    amount: input.amount,
    reason: 'level_spin_star_reward',
  }));
}

function parseOperation(value: unknown, ownerStableId: string): LevelSpinStarOperation | null {
  const entry = parseLevelSpinStarCreditExactResult(value);
  return entry?.ownerStableId === ownerStableId ? entry : null;
}

async function hasValidFingerprint(operation: LevelSpinStarOperation): Promise<boolean> {
  const expected = await fingerprintFor({
    ownerStableId: operation.ownerStableId,
    requestId: operation.requestId,
    lane: operation.lane,
    ...(operation.deliveryToken ? { deliveryToken: operation.deliveryToken } : {}),
    giftId: operation.giftId,
    amount: operation.amount,
  });
  return expected === operation.requestFingerprint;
}

function parseOutbox(raw: string | null, ownerStableId: string): LevelSpinStarOperation[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_PENDING_STAR_OPERATIONS) {
      throw new Error('level_spin_star_outbox_corrupt');
    }
    return parsed.map((value) => {
      const operation = parseOperation(value, ownerStableId);
      if (!operation) throw new Error('level_spin_star_outbox_corrupt');
      return operation;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'level_spin_star_outbox_corrupt') throw error;
    throw new Error('level_spin_star_outbox_corrupt');
  }
}

async function readOutbox(ownerStableId: string): Promise<LevelSpinStarOperation[]> {
  return parseOutbox(await AsyncStorage.getItem(levelSpinStarGrantOutboxKey(ownerStableId)), ownerStableId);
}

function emptyProjection(ownerStableId: string): LevelSpinStarProjection {
  return Object.freeze({
    schemaVersion: 'client-level-spin-star-projection.v2',
    ownerStableId,
    operations: Object.freeze([]),
    acknowledged: Object.freeze({}),
    serverBalance: 0,
    serverEarnedTotal: 0,
    serverSeq: 0,
  });
}

function parseProjection(raw: string | null, ownerStableId: string): LevelSpinStarProjection {
  if (raw === null) return emptyProjection(ownerStableId);
  try {
    const value = JSON.parse(raw) as Partial<LevelSpinStarProjection>;
    if (value?.schemaVersion !== 'client-level-spin-star-projection.v2'
      || value.ownerStableId !== ownerStableId
      || !Array.isArray(value.operations)
      || value.operations.length > MAX_PENDING_STAR_OPERATIONS
      || !value.acknowledged || typeof value.acknowledged !== 'object' || Array.isArray(value.acknowledged)
      || !Number.isSafeInteger(value.serverBalance ?? (value as { serverBalanceFloor?: unknown }).serverBalanceFloor)
      || Number(value.serverBalance ?? (value as { serverBalanceFloor?: unknown }).serverBalanceFloor) < 0
      || !Number.isSafeInteger(value.serverEarnedTotal ?? (value as { serverEarnedFloor?: unknown }).serverEarnedFloor)
      || Number(value.serverEarnedTotal ?? (value as { serverEarnedFloor?: unknown }).serverEarnedFloor) < 0
      || !Number.isSafeInteger(value.serverSeq ?? 0) || Number(value.serverSeq ?? 0) < 0) {
      throw new Error('level_spin_star_projection_corrupt');
    }
    const operations = value.operations.map((candidate) => parseOperation(candidate, ownerStableId));
    if (operations.some((candidate) => !candidate)) throw new Error('level_spin_star_projection_corrupt');
    const unique = new Map<string, LevelSpinStarOperation>();
    for (const operation of operations as LevelSpinStarOperation[]) {
      const prior = unique.get(operation.operationId);
      if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('level_spin_star_request_conflict');
      }
      unique.set(operation.operationId, operation);
    }
    const acknowledged: Record<string, string> = {};
    for (const [operationId, fingerprint] of Object.entries(value.acknowledged)) {
      if (typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)) {
        throw new Error('level_spin_star_projection_corrupt');
      }
      const operation = unique.get(operationId);
      if (!operation || operation.requestFingerprint !== fingerprint) {
        throw new Error('level_spin_star_projection_corrupt');
      }
      acknowledged[operationId] = fingerprint;
    }
    return Object.freeze({
      schemaVersion: 'client-level-spin-star-projection.v2',
      ownerStableId,
      operations: Object.freeze([...unique.values()].sort((left, right) => left.operationId.localeCompare(right.operationId))),
      acknowledged: Object.freeze(acknowledged),
      serverBalance: Number(value.serverBalance ?? (value as { serverBalanceFloor?: unknown }).serverBalanceFloor),
      serverEarnedTotal: Number(value.serverEarnedTotal ?? (value as { serverEarnedFloor?: unknown }).serverEarnedFloor),
      serverSeq: Number(value.serverSeq ?? 0),
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'level_spin_star_projection_corrupt'
      || error.message === 'level_spin_star_request_conflict'
    )) throw error;
    throw new Error('level_spin_star_projection_corrupt');
  }
}

function parsePrepared(raw: string | null, ownerStableId: string): LevelSpinStarOperation[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_PENDING_STAR_OPERATIONS) {
      throw new Error('level_spin_star_prepared_corrupt');
    }
    return parsed.map((candidate) => {
      const operation = parseOperation(candidate, ownerStableId);
      if (!operation) throw new Error('level_spin_star_prepared_corrupt');
      return operation;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'level_spin_star_prepared_corrupt') throw error;
    throw new Error('level_spin_star_prepared_corrupt');
  }
}

function unacknowledgedTotal(projection: LevelSpinStarProjection): number {
  return projection.operations.reduce((total, operation) => (
    projection.acknowledged[operation.operationId] === operation.requestFingerprint
      ? total
      : total + operation.amount
  ), 0);
}

function visibleProjection(projection: LevelSpinStarProjection): Readonly<{ balance: number; earnedTotal: number }> {
  const overlay = unacknowledgedTotal(projection);
  return Object.freeze({
    balance: projection.serverBalance + overlay,
    // level_spin_grant is a ledger grant, not competitive earned progress.
    earnedTotal: projection.serverEarnedTotal,
  });
}

function withOperations(
  projection: LevelSpinStarProjection,
  operations: readonly LevelSpinStarOperation[],
): LevelSpinStarProjection {
  const merged = new Map(projection.operations.map((operation) => [operation.operationId, operation]));
  for (const operation of operations) {
    const prior = merged.get(operation.operationId);
    if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
      throw new Error('level_spin_star_request_conflict');
    }
    merged.set(operation.operationId, operation);
  }
  return Object.freeze({
    ...projection,
    operations: Object.freeze([...merged.values()].sort((left, right) => left.operationId.localeCompare(right.operationId))),
  });
}

function observeCurrentSnapshot(projection: LevelSpinStarProjection): LevelSpinStarProjection {
  const progress = getAppSnapshot().progress;
  if (!progress) return projection;
  const visibleBalance = Math.max(0, Math.trunc(progress.stars ?? 0));
  const visibleEarned = Math.max(0, Math.trunc(progress.starsEarnedTotal ?? 0));
  return Object.freeze({
    ...projection,
    serverBalance: projection.serverSeq === 0
      ? Math.max(
        projection.serverBalance,
        Math.max(0, visibleBalance - unacknowledgedTotal(projection)),
      )
      : projection.serverBalance,
    serverEarnedTotal: Math.max(projection.serverEarnedTotal, visibleEarned),
  });
}

function publishProjection(token: AccountGenerationToken, projection: LevelSpinStarProjection): void {
  if (!isCurrentAccountGeneration(token, projection.ownerStableId)) return;
  const visible = visibleProjection(projection);
  patchAppSnapshot((current) => current.progress ? (
    // зачем (владелец, 2026-08-24, «цифра рун постоянно прыгает»): публикация
    // зовётся часто (recover, sync, каждое начисление) и раньше ВСЕГДА создавала
    // новый объект progress с updatedAt: Date.now(). shallowPatchChanged сравнивает
    // секции по ссылке, поэтому будились ВСЕ подписчики снапшота на каждой
    // публикации — лишние ре-рендеры Главной без единого изменения числа.
    // Руны те же -> патча нет.
    current.progress.stars === visible.balance
    && current.progress.starsEarnedTotal === visible.earnedTotal
  ) ? {} : {
    progress: {
      ...current.progress,
      source: 'local',
      updatedAt: Date.now(),
      stars: visible.balance,
      starsEarnedTotal: visible.earnedTotal,
    },
  } : {});
}

async function storedOperationsForOwner(ownerStableId: string): Promise<readonly LevelSpinStarOperation[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  if (allKeys.length > 16_384) throw new Error('level_spin_star_storage_scan_too_large');
  const prefix = `level_spin_star_operation_v1:${encodeURIComponent(ownerStableId)}:`;
  const keys = allKeys.filter((key) => key.startsWith(prefix)).sort();
  if (keys.length > MAX_PENDING_STAR_OPERATIONS) throw new Error('level_spin_star_history_too_large');
  const rows = await AsyncStorage.multiGet(keys);
  const result: LevelSpinStarOperation[] = [];
  for (const [, raw] of rows) {
    if (raw === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error('level_spin_star_operation_corrupt'); }
    const operation = parseOperation(parsed, ownerStableId);
    if (!operation || !await hasValidFingerprint(operation)) throw new Error('level_spin_star_operation_corrupt');
    result.push(operation);
  }
  return Object.freeze(result);
}

async function recoverProjection(
  token: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<LevelSpinStarProjection> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  return withAccountTransitionLock(async (lease) => {
    const [phoneState, storedOperations] = await Promise.all([
      readPhoneStateStarCreditState({
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
      }),
      storedOperationsForOwner(ownerStableId),
    ]);
    for (const operation of phoneState.credits) {
      if (!await hasValidFingerprint(operation)) throw new Error('level_spin_star_phone_state_corrupt');
    }
    const phoneStateAcknowledgements = phoneState.acknowledgements.map((candidate) => {
      const acknowledgement = parseLevelSpinStarCreditAckExactResult(candidate);
      if (!acknowledgement || acknowledgement.ownerStableId !== ownerStableId) {
        throw new Error('level_spin_star_phone_state_corrupt');
      }
      return acknowledgement;
    });
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const [projectionRaw, outboxRaw, preparedRaw] = await Promise.all([
      AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarGrantOutboxKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarPreparedKey(ownerStableId)),
    ]);
    const prepared = parsePrepared(preparedRaw, ownerStableId);
    for (const operation of prepared) {
      if (!await hasValidFingerprint(operation)) throw new Error('level_spin_star_prepared_corrupt');
    }
    let projection = observeCurrentSnapshot(withOperations(
      parseProjection(projectionRaw, ownerStableId),
      [...storedOperations, ...phoneState.credits, ...prepared],
    ));
    const acknowledged = { ...projection.acknowledged };
    let serverBalance = projection.serverBalance;
    let serverEarnedTotal = projection.serverEarnedTotal;
    let serverSeq = projection.serverSeq;
    for (const acknowledgement of phoneStateAcknowledgements) {
      const operation = projection.operations.find((candidate) => (
        candidate.operationId === acknowledgement.operationId
      ));
      if (operation && operation.requestFingerprint !== acknowledgement.requestFingerprint) {
        throw new Error('level_spin_star_phone_state_corrupt');
      }
      if (operation) acknowledged[operation.operationId] = acknowledgement.requestFingerprint;
      if (acknowledgement.starsSeq > serverSeq) {
        serverBalance = acknowledgement.starsBalance;
        serverSeq = acknowledgement.starsSeq;
      }
      serverEarnedTotal = Math.max(serverEarnedTotal, acknowledgement.starsEarnedTotal);
    }
    projection = Object.freeze({
      ...projection,
      acknowledged: Object.freeze(acknowledged),
      serverBalance,
      serverEarnedTotal,
      serverSeq,
    });
    const outbox = parseOutbox(outboxRaw, ownerStableId);
    const pending = new Map(outbox.filter((operation) => (
      projection.acknowledged[operation.operationId] !== operation.requestFingerprint
    )).map((operation) => [operation.operationId, operation]));
    for (const operation of projection.operations) {
      if (projection.acknowledged[operation.operationId] === operation.requestFingerprint) continue;
      const prior = pending.get(operation.operationId);
      if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('level_spin_star_request_conflict');
      }
      pending.set(operation.operationId, operation);
    }
    if (pending.size > MAX_PENDING_STAR_OPERATIONS) throw new Error('level_spin_star_outbox_full');
    const compactedOperations = projection.operations.filter((operation) => (
      projection.acknowledged[operation.operationId] === operation.requestFingerprint
    ));
    if (compactedOperations.length > 0) {
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
      await AsyncStorage.multiRemove(compactedOperations.map((operation) => (
        operationStorageKey(ownerStableId, operation.operationId)
      )));
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
      projection = Object.freeze({
        ...projection,
        operations: Object.freeze(projection.operations.filter((operation) => (
          projection.acknowledged[operation.operationId] !== operation.requestFingerprint
        ))),
        acknowledged: Object.freeze({}),
      });
    }
    const writes: [string, string][] = [
      [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(projection)],
      [levelSpinStarGrantOutboxKey(ownerStableId), JSON.stringify([...pending.values()])],
      ...prepared.map((operation) => [
        operationStorageKey(ownerStableId, operation.operationId),
        JSON.stringify(operation),
      ] as [string, string]),
    ];
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.multiSet(writes);
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.setItem(levelSpinStarPreparedKey(ownerStableId), '[]');
    return projection;
    });
  }, accountTransitionLockLease);
}

export async function recoverAndHydrateLevelSpinStarGrants(
  token: AccountGenerationToken,
  options: Readonly<{ syncNow?: boolean }> = {},
): Promise<Readonly<{ balance: number; earnedTotal: number }>> {
  const projection = await recoverProjection(token);
  publishProjection(token, projection);
  if (options.syncNow !== false) void syncPendingLevelSpinStarGrants(token).catch(() => {});
  return visibleProjection(projection);
}

export async function mergeLevelSpinServerStars(
  token: AccountGenerationToken,
  observation: Readonly<{ stars?: unknown; starsEarnedTotal?: unknown; starsSeq?: unknown }>,
): Promise<Readonly<{ balance: number; earnedTotal: number }>> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const projection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(token, lease);
    return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const current = parseProjection(
      await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
      ownerStableId,
    );
    const balance = Number(observation.stars);
    const earned = Number(observation.starsEarnedTotal);
    const seq = Number(observation.starsSeq);
    const newer = Number.isSafeInteger(seq) && seq > current.serverSeq;
    const next = Object.freeze({
      ...current,
      serverBalance: newer && Number.isSafeInteger(balance) && balance >= 0
        ? balance : current.serverBalance,
      serverEarnedTotal: Number.isSafeInteger(earned) && earned >= 0
        ? Math.max(current.serverEarnedTotal, earned) : current.serverEarnedTotal,
      serverSeq: newer ? seq : current.serverSeq,
    });
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.setItem(levelSpinStarProjectionKey(ownerStableId), JSON.stringify(next));
    return next;
    });
  });
  publishProjection(token, projection);
  return visibleProjection(projection);
}

export async function hydrateLevelSpinStarsAfterPhoneStatePull(
  token: AccountGenerationToken,
  result: Readonly<{ downloaded?: unknown }>,
): Promise<void> {
  if (!Number.isSafeInteger(result.downloaded) || Number(result.downloaded) <= 0) return;
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return;
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
}

export async function readUnifiedLevelSpinStars(
  token: AccountGenerationToken,
): Promise<Readonly<{ balance: number; earnedTotal: number }>> {
  return visibleProjection(await recoverProjection(token));
}

export async function enqueueLevelSpinStarGrant(
  input: Readonly<{
    token: AccountGenerationToken;
    requestId: string;
    lane: LevelSpinStarLane;
    deliveryToken?: string;
    giftId: string;
  }>,
  options: Readonly<{
    syncNow?: boolean;
    /** Internal capability propagated by an existing account-transition critical section. */
    accountTransitionLockLease?: AccountTransitionLockLease;
  }> = {},
): Promise<void> {
  const ownerStableId = input.token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(input.token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const requestId = input.requestId.trim();
  if (!REQUEST_ID_RE.test(requestId)) throw new Error('level_spin_star_request_invalid');
  if (input.deliveryToken !== undefined && !DELIVERY_TOKEN_RE.test(input.deliveryToken.trim())) {
    throw new Error('level_spin_star_delivery_token_invalid');
  }
  const giftId = input.giftId as LevelSpinStarGiftId;
  const amount = levelSpinStarAmount(giftId);
  const operationId = operationIdFor(requestId, input.lane);
  const deliveryToken = input.deliveryToken?.trim();
  const requestFingerprint = await fingerprintFor({
    ownerStableId, requestId, lane: input.lane, ...(deliveryToken ? { deliveryToken } : {}), giftId, amount,
  });
  if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const operation: LevelSpinStarOperation = Object.freeze({
    schemaVersion: 'client-level-spin-star-operation.v1',
    operationId,
    ownerStableId,
    requestId,
    lane: input.lane,
    ...(deliveryToken ? { deliveryToken } : {}),
    giftId,
    amount,
    reason: 'level_spin_star_reward',
    grant: Object.freeze({
      kind: 'star_credit',
      subjectId: operationId,
      payload: Object.freeze({ requestId, lane: input.lane, giftId, amount }),
    }),
    createdAtMs: Date.now(),
    requestFingerprint,
  });

  const committedProjection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(input.token, lease);
    return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const operationKey = operationStorageKey(ownerStableId, operationId);
    const [existingRaw, outboxRaw, projectionRaw, preparedRaw] = await Promise.all([
      AsyncStorage.getItem(operationKey),
      AsyncStorage.getItem(levelSpinStarGrantOutboxKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarPreparedKey(ownerStableId)),
    ]);
    let existingValue: unknown = null;
    try { existingValue = existingRaw ? JSON.parse(existingRaw) as unknown : null; } catch {
      throw new Error('level_spin_star_operation_corrupt');
    }
    const existing = existingRaw ? parseOperation(existingValue, ownerStableId) : null;
    if (existingRaw && !existing) throw new Error('level_spin_star_operation_corrupt');
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) throw new Error('level_spin_star_request_conflict');
      return observeCurrentSnapshot(parseProjection(projectionRaw, ownerStableId));
    }
    const outbox = parseOutbox(outboxRaw, ownerStableId);
    if (outbox.length >= MAX_PENDING_STAR_OPERATIONS) throw new Error('level_spin_star_outbox_full');
    const prepared = parsePrepared(preparedRaw, ownerStableId);
    const priorPrepared = prepared.find((candidate) => candidate.operationId === operationId);
    if (priorPrepared && priorPrepared.requestFingerprint !== requestFingerprint) {
      throw new Error('level_spin_star_request_conflict');
    }
    if (prepared.length >= MAX_PENDING_STAR_OPERATIONS && !priorPrepared) {
      throw new Error('level_spin_star_outbox_full');
    }
    const nextPrepared = priorPrepared ? prepared : [...prepared, operation];
    const projection = observeCurrentSnapshot(withOperations(
      parseProjection(projectionRaw, ownerStableId),
      [operation],
    ));
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.setItem(levelSpinStarPreparedKey(ownerStableId), JSON.stringify(nextPrepared));
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.multiSet([
      [operationKey, JSON.stringify(operation)],
      [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(projection)],
      [levelSpinStarGrantOutboxKey(ownerStableId), JSON.stringify([...outbox, operation])],
    ]);
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.setItem(
      levelSpinStarPreparedKey(ownerStableId),
      JSON.stringify(prepared.filter((candidate) => candidate.operationId !== operationId)),
    );
    return projection;
    });
  }, options.accountTransitionLockLease);

  publishProjection(input.token, committedProjection);
  if (options.syncNow !== false) void syncPendingLevelSpinStarGrants(input.token).catch(() => {});
}

export async function syncPendingLevelSpinStarGrants(
  token: AccountGenerationToken,
): Promise<{ synced: number; pending: number }> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return { synced: 0, pending: 0 };
  const recovered = await recoverProjection(token);
  publishProjection(token, recovered);
  const snapshot = await readOutbox(ownerStableId);
  let synced = 0;
  for (const operation of snapshot) {
    if (!isCurrentAccountGeneration(token, ownerStableId)) break;
    try {
      if (!await hasValidFingerprint(operation)) continue;
      if (!isCurrentAccountGeneration(token, ownerStableId)) break;
      const stored = await commitPhoneStateNonMonetaryEconomyGrant({
        operationId: operation.operationId,
        kind: 'star_credit',
        entitlementId: operation.operationId,
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
        exactResult: operation,
      });
      if (!stored || !isCurrentAccountGeneration(token, ownerStableId)) break;
      const ack = await callLevelSpinStarComposite(operation);
      if (!isCurrentAccountGeneration(token, ownerStableId)) break;
      if (ack.materialized !== true
        || ack.operationId !== operation.operationId
        || ack.requestFingerprint !== operation.requestFingerprint
        || !Number.isSafeInteger(ack.starsBalance) || ack.starsBalance < 0
        || !Number.isSafeInteger(ack.starsEarnedTotal) || ack.starsEarnedTotal < 0
        || !Number.isSafeInteger(ack.starsSeq) || ack.starsSeq < 0) {
        throw new Error('level_spin_star_ack_invalid');
      }
      const ackOperationId = levelSpinStarCreditAckOperationId(operation.operationId);
      if (!ackOperationId) throw new Error('level_spin_star_ack_invalid');
      const ackStored = await commitPhoneStateNonMonetaryEconomyGrant({
        operationId: ackOperationId,
        kind: 'star_credit_ack',
        entitlementId: operation.operationId,
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
        exactResult: Object.freeze({
          schemaVersion: 'client-level-spin-star-ack.v1',
          operationId: operation.operationId,
          ownerStableId,
          requestFingerprint: operation.requestFingerprint,
          starsBalance: ack.starsBalance,
          starsEarnedTotal: ack.starsEarnedTotal,
          starsSeq: ack.starsSeq,
        }),
      });
      if (!ackStored || !isCurrentAccountGeneration(token, ownerStableId)) break;
      const projection = await withAccountTransitionLock(async () => withStorageLock(async () => {
        if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
        const current = await readOutbox(ownerStableId);
        const exact = current.find((candidate) => candidate.operationId === operation.operationId);
        if (!exact || exact.requestFingerprint !== operation.requestFingerprint) return null;
        const currentProjection = withOperations(parseProjection(
          await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
          ownerStableId,
        ), [operation]);
        const next: LevelSpinStarProjection = Object.freeze({
          ...currentProjection,
          acknowledged: Object.freeze({
            ...currentProjection.acknowledged,
            [operation.operationId]: operation.requestFingerprint,
          }),
          serverBalance: ack.starsSeq > currentProjection.serverSeq
            ? ack.starsBalance : currentProjection.serverBalance,
          serverEarnedTotal: Math.max(currentProjection.serverEarnedTotal, ack.starsEarnedTotal),
          serverSeq: Math.max(currentProjection.serverSeq, ack.starsSeq),
        });
        if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
        await AsyncStorage.multiSet([
          [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(next)],
          [levelSpinStarGrantOutboxKey(ownerStableId), JSON.stringify(
            current.filter((candidate) => candidate.operationId !== operation.operationId),
          )],
        ]);
        const compacted: LevelSpinStarProjection = Object.freeze({
          ...next,
          operations: Object.freeze(next.operations.filter((candidate) => (
            next.acknowledged[candidate.operationId] !== candidate.requestFingerprint
          ))),
          acknowledged: Object.freeze({}),
        });
        const compactedIds = next.operations.filter((candidate) => (
          next.acknowledged[candidate.operationId] === candidate.requestFingerprint
        ));
        if (compactedIds.length > 0) {
          await AsyncStorage.multiRemove(compactedIds.map((candidate) => (
            operationStorageKey(ownerStableId, candidate.operationId)
          )));
          if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
          await AsyncStorage.setItem(levelSpinStarProjectionKey(ownerStableId), JSON.stringify(compacted));
        }
        synced += 1;
        return compacted;
      }));
      if (projection) publishProjection(token, projection);
    } catch {
      // Sync is persistence only; the locally committed credit remains durable.
    }
  }
  if (!isCurrentAccountGeneration(token, ownerStableId)) return { synced: 0, pending: 0 };
  return { synced, pending: (await readOutbox(ownerStableId)).length };
}

export default function __RouteShim() { return null; }
