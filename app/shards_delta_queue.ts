import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { withStorageLock } from './storage_mutex';
import { DebugLogger } from './debug-logger';

const LEGACY_SHARD_DELTA_QUEUE_KEY = 'shards_delta_queue_v1';
const LEGACY_SHARD_DELTA_QUARANTINE_KEY = 'shards_delta_queue_v1_quarantine:ownerless';
const LEGACY_SHARD_DELTA_RESOLVED_PREFIX = 'shards_delta_queue_v1_resolved:';
const SHARD_DELTA_QUEUE_V2_PREFIX = 'shards_delta_queue_v2:';
const SHARD_DELTA_QUEUE_V2_QUARANTINE_PREFIX = 'shards_delta_queue_v2_quarantine:';
const MAX_PENDING_SHARD_DELTAS_PER_OWNER = 1000;
const SHARD_OP_ID_RE = /^[A-Za-z0-9_:-]{8,80}$/;
const SHARD_REASON_MAX_LEN = 64;

export type PendingShardDelta = {
  opId: string;
  ownerStableId: string;
  delta: number;
  type: 'earn' | 'spend';
  reason: string;
  createdAtMs: number;
  /**
   * True only when this row and its optimistic wallet mutation were persisted
   * in the same AsyncStorage multiSet. Missing/false rows must never be sent.
   */
  localApplied: boolean;
};

export type LegacyShardDeltaRecoveryIdentity = {
  opId: string;
  delta: number;
  type: 'earn' | 'spend';
  reason: string;
  createdAtMs?: number;
};

function cleanOwnerStableId(value: string): string {
  return String(value ?? '').trim();
}

function isValidPendingShardDelta(
  item: unknown,
  ownerStableId: string,
): item is PendingShardDelta {
  if (item == null || typeof item !== 'object') return false;
  const value = item as Partial<PendingShardDelta>;
  return value.ownerStableId === ownerStableId
    && cleanOwnerStableId(ownerStableId) === ownerStableId
    && ownerStableId.length <= 200
    && !/[\/\s]/.test(ownerStableId)
    && typeof value.opId === 'string'
    && SHARD_OP_ID_RE.test(value.opId)
    && Number.isSafeInteger(value.delta)
    && Number(value.delta) > 0
    && (value.type === 'earn' || value.type === 'spend')
    && typeof value.reason === 'string'
    && value.reason.trim() === value.reason
    && value.reason.length > 0
    && value.reason.length <= SHARD_REASON_MAX_LEN
    && Number.isSafeInteger(value.createdAtMs)
    && Number(value.createdAtMs) > 0
    && typeof value.localApplied === 'boolean';
}

export function shardDeltaQueueStorageKey(ownerStableId: string): string {
  const owner = cleanOwnerStableId(ownerStableId);
  if (!owner) throw new Error('shard_delta_owner_required');
  return `${SHARD_DELTA_QUEUE_V2_PREFIX}${encodeURIComponent(owner)}`;
}

export function newShardOpId(): string {
  return Crypto.randomUUID();
}

function parseQueue(
  raw: string | null,
  ownerStableId: string,
): { ok: true; items: PendingShardDelta[] } | { ok: false } {
  if (!raw) return { ok: true, items: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false };
    const allValid = parsed.every((item): item is PendingShardDelta =>
      isValidPendingShardDelta(item, ownerStableId));
    return allValid
      ? { ok: true, items: parsed }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

async function readOwnerQueue(ownerStableId: string): Promise<PendingShardDelta[]> {
  const key = shardDeltaQueueStorageKey(ownerStableId);
  const raw = await AsyncStorage.getItem(key);
  const parsed = parseQueue(raw, ownerStableId);
  if (parsed.ok) return parsed.items;
  if (raw === null) return [];
  const quarantineKey = `${SHARD_DELTA_QUEUE_V2_QUARANTINE_PREFIX}${encodeURIComponent(ownerStableId)}`;
  const existing = await AsyncStorage.getItem(quarantineKey);
  if (existing !== null && existing !== raw) {
    throw new Error('shard_delta_corrupt_quarantine_occupied');
  }
  if (existing === null) await AsyncStorage.setItem(quarantineKey, raw);
  await AsyncStorage.removeItem(key);
  return [];
}

/**
 * Ownerless v1 operations cannot be safely attributed after an account switch.
 * Preserve the raw bytes under a fixed quarantine key before removing v1 so a
 * later recovery tool can inspect them without ever assigning them to a user.
 */
async function quarantineLegacyQueueIfPresent(): Promise<void> {
  const legacyRaw = await AsyncStorage.getItem(LEGACY_SHARD_DELTA_QUEUE_KEY);
  if (legacyRaw === null) return;
  const existingQuarantine = await AsyncStorage.getItem(LEGACY_SHARD_DELTA_QUARANTINE_KEY);
  if (existingQuarantine !== null && existingQuarantine !== legacyRaw) {
    throw new Error('legacy_shard_delta_quarantine_occupied');
  }
  if (existingQuarantine === null) {
    await AsyncStorage.setItem(LEGACY_SHARD_DELTA_QUARANTINE_KEY, legacyRaw);
  }
  await AsyncStorage.removeItem(LEGACY_SHARD_DELTA_QUEUE_KEY);
}

async function hasQuarantinedQueueUnlocked(ownerStableId: string): Promise<boolean> {
  const ownerQuarantineKey =
    `${SHARD_DELTA_QUEUE_V2_QUARANTINE_PREFIX}${encodeURIComponent(ownerStableId)}`;
  const [ownerQuarantine, legacyQuarantine] = await Promise.all([
    AsyncStorage.getItem(ownerQuarantineKey),
    AsyncStorage.getItem(LEGACY_SHARD_DELTA_QUARANTINE_KEY),
  ]);
  return ownerQuarantine !== null || legacyQuarantine !== null;
}

type LegacyQuarantinedShardDelta = Required<LegacyShardDeltaRecoveryIdentity>;

function parseLegacyQuarantinedRows(raw: string | null): LegacyQuarantinedShardDelta[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const rows = parsed as Partial<LegacyQuarantinedShardDelta>[];
    if (!rows.every((row) =>
      typeof row?.opId === 'string'
      && SHARD_OP_ID_RE.test(row.opId)
      && Number.isSafeInteger(row.delta)
      && Number(row.delta) > 0
      && (row.type === 'earn' || row.type === 'spend')
      && typeof row.reason === 'string'
      && row.reason.trim() === row.reason
      && row.reason.length > 0
      && row.reason.length <= SHARD_REASON_MAX_LEN
      && Number.isSafeInteger(row.createdAtMs)
      && Number(row.createdAtMs) > 0
    )) return null;
    return rows as LegacyQuarantinedShardDelta[];
  } catch {
    return null;
  }
}

function matchesLegacyRecoveryIdentity(
  row: LegacyQuarantinedShardDelta,
  expected: LegacyShardDeltaRecoveryIdentity,
): boolean {
  return row.opId === expected.opId
    && row.delta === expected.delta
    && row.type === expected.type
    && row.reason === expected.reason;
}

async function exactLegacyRecoveryRowsUnlocked(
  ownerStableId: string,
  expected: LegacyShardDeltaRecoveryIdentity,
): Promise<
  | { source: 'active'; rows: LegacyQuarantinedShardDelta[]; matchIndex: number }
  | { source: 'resolved'; row: LegacyQuarantinedShardDelta }
  | null
> {
  const ownerQuarantineKey =
    `${SHARD_DELTA_QUEUE_V2_QUARANTINE_PREFIX}${encodeURIComponent(ownerStableId)}`;
  if (await AsyncStorage.getItem(ownerQuarantineKey) !== null) return null;
  const activeRaw = await AsyncStorage.getItem(LEGACY_SHARD_DELTA_QUARANTINE_KEY);
  const rows = parseLegacyQuarantinedRows(activeRaw);
  if (activeRaw !== null && !rows) return null;
  if (rows) {
    const matches = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => matchesLegacyRecoveryIdentity(row, expected));
    if (matches.length === 1) {
      return { source: 'active', rows, matchIndex: matches[0].index };
    }
    if (matches.length > 1) return null;
  }
  const resolvedRaw = await AsyncStorage.getItem(
    `${LEGACY_SHARD_DELTA_RESOLVED_PREFIX}${encodeURIComponent(expected.opId)}`,
  );
  const resolvedRows = parseLegacyQuarantinedRows(
    resolvedRaw ? `[${resolvedRaw}]` : null,
  );
  return resolvedRows?.length === 1
    && matchesLegacyRecoveryIdentity(resolvedRows[0], expected)
    ? { source: 'resolved', row: resolvedRows[0] }
    : null;
}

export async function hasExactLegacyQuarantinedShardDelta(
  ownerStableId: string,
  expected: LegacyShardDeltaRecoveryIdentity,
): Promise<boolean> {
  const owner = cleanOwnerStableId(ownerStableId);
  if (!owner) return false;
  try {
    return await withStorageLock(async () =>
      (await exactLegacyRecoveryRowsUnlocked(owner, expected)) !== null);
  } catch (error) {
    DebugLogger.error(
      'shards_delta_queue.ts:hasExactLegacyQuarantinedShardDelta',
      error,
      'warning',
    );
    return false;
  }
}

export async function consumeExactLegacyQuarantinedShardDelta(
  ownerStableId: string,
  expected: LegacyShardDeltaRecoveryIdentity,
): Promise<boolean> {
  const owner = cleanOwnerStableId(ownerStableId);
  if (!owner) return false;
  try {
    return await withStorageLock(async () => {
      const recovery = await exactLegacyRecoveryRowsUnlocked(owner, expected);
      if (!recovery) return false;
      if (recovery.source === 'resolved') return true;
      const matched = recovery.rows[recovery.matchIndex];
      const remaining = recovery.rows.filter((_, index) => index !== recovery.matchIndex);
      const resolvedKey =
        `${LEGACY_SHARD_DELTA_RESOLVED_PREFIX}${encodeURIComponent(matched.opId)}`;
      await AsyncStorage.setItem(resolvedKey, JSON.stringify(matched));
      if (remaining.length === 0) {
        await AsyncStorage.removeItem(LEGACY_SHARD_DELTA_QUARANTINE_KEY);
      } else {
        await AsyncStorage.setItem(
          LEGACY_SHARD_DELTA_QUARANTINE_KEY,
          JSON.stringify(remaining),
        );
      }
      return true;
    });
  } catch (error) {
    DebugLogger.error(
      'shards_delta_queue.ts:consumeExactLegacyQuarantinedShardDelta',
      error,
      'warning',
    );
    return false;
  }
}

export async function readShardDeltaQueue(ownerStableId: string): Promise<PendingShardDelta[]> {
  const owner = cleanOwnerStableId(ownerStableId);
  if (!owner) return [];
  try {
    return await withStorageLock(async () => {
      await quarantineLegacyQueueIfPresent();
      return readOwnerQueue(owner);
    });
  } catch (error) {
    DebugLogger.error('shards_delta_queue.ts:readShardDeltaQueue', error, 'warning');
    return [];
  }
}

export async function hasQuarantinedShardDeltaQueue(ownerStableId: string): Promise<boolean> {
  const owner = cleanOwnerStableId(ownerStableId);
  if (!owner) return true;
  try {
    return await withStorageLock(async () => {
      await quarantineLegacyQueueIfPresent();
      return hasQuarantinedQueueUnlocked(owner);
    });
  } catch (error) {
    DebugLogger.error('shards_delta_queue.ts:hasQuarantinedShardDeltaQueue', error, 'warning');
    return true;
  }
}

export async function enqueueShardDelta(entry: PendingShardDelta): Promise<boolean> {
  const owner = cleanOwnerStableId(entry.ownerStableId);
  if (!owner || !isValidPendingShardDelta(entry, owner)) return false;
  try {
    return await withStorageLock(async () => {
      await quarantineLegacyQueueIfPresent();
      if (await hasQuarantinedQueueUnlocked(owner)) return false;
      const key = shardDeltaQueueStorageKey(owner);
      const queue = await readOwnerQueue(owner);
      if (await hasQuarantinedQueueUnlocked(owner)) return false;
      if (queue.some((item) => item.opId === entry.opId)) return true;
      if (queue.length >= MAX_PENDING_SHARD_DELTAS_PER_OWNER) return false;
      await AsyncStorage.setItem(key, JSON.stringify([...queue, entry]));
      return true;
    });
  } catch (error) {
    DebugLogger.error('shards_delta_queue.ts:enqueueShardDelta', error, 'warning');
    return false;
  }
}

/**
 * Persists a replayable queue row and its wallet/ledger mutation in one native
 * storage batch. A queue row must not become replayable before the matching
 * local balance is durable.
 */
export async function enqueueAppliedShardDeltaWithStorage<T>(
  entry: PendingShardDelta,
  buildWalletUpdate: () => Promise<
    | {
      commit: true;
      value: T;
      walletPairs: readonly (readonly [string, string])[];
    }
    | { commit: false; value: T }
  >,
): Promise<
  | { ok: true; committed: boolean; value: T }
  | { ok: true; duplicateExact: true }
  | { ok: false }
> {
  const owner = cleanOwnerStableId(entry.ownerStableId);
  if (
    !owner
    || entry.localApplied !== true
    || !isValidPendingShardDelta(entry, owner)
  ) return { ok: false };
  try {
    return await withStorageLock(async () => {
      await quarantineLegacyQueueIfPresent();
      if (await hasQuarantinedQueueUnlocked(owner)) return { ok: false as const };
      const key = shardDeltaQueueStorageKey(owner);
      const queue = await readOwnerQueue(owner);
      if (await hasQuarantinedQueueUnlocked(owner)) return { ok: false as const };
      const existing = queue.find((item) => item.opId === entry.opId);
      if (existing) {
        const exact = existing.ownerStableId === entry.ownerStableId
          && existing.delta === entry.delta
          && existing.type === entry.type
          && existing.reason === entry.reason
          && existing.localApplied === entry.localApplied;
        return exact
          ? { ok: true as const, duplicateExact: true as const }
          : { ok: false as const };
      }
      if (queue.length >= MAX_PENDING_SHARD_DELTAS_PER_OWNER) return { ok: false as const };
      const update = await buildWalletUpdate();
      if (!update.commit) {
        return { ok: true as const, committed: false, value: update.value };
      }
      if (update.walletPairs.length === 0) return { ok: false as const };
      await AsyncStorage.multiSet([
        [key, JSON.stringify([...queue, entry])],
        ...update.walletPairs,
      ]);
      return { ok: true as const, committed: true, value: update.value };
    });
  } catch (error) {
    DebugLogger.error(
      'shards_delta_queue.ts:enqueueAppliedShardDeltaWithStorage',
      error,
      'warning',
    );
    return { ok: false };
  }
}

export async function removeShardDeltas(
  ownerStableId: string,
  opIds: readonly string[],
): Promise<boolean> {
  const owner = cleanOwnerStableId(ownerStableId);
  if (!owner) return false;
  if (opIds.length === 0) return true;
  const drop = new Set(opIds);
  try {
    return await withStorageLock(async () => {
      await quarantineLegacyQueueIfPresent();
      if (await hasQuarantinedQueueUnlocked(owner)) return false;
      const key = shardDeltaQueueStorageKey(owner);
      const queue = await readOwnerQueue(owner);
      if (await hasQuarantinedQueueUnlocked(owner)) return false;
      const next = queue.filter((item) => !drop.has(item.opId));
      if (next.length === queue.length) return true;
      await AsyncStorage.setItem(key, JSON.stringify(next));
      return true;
    });
  } catch (error) {
    DebugLogger.error('shards_delta_queue.ts:removeShardDeltas', error, 'warning');
    return false;
  }
}

export default function __RouteShim() { return null; }
