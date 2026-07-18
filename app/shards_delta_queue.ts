import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { withStorageLock } from './storage_mutex';
import { DebugLogger } from './debug-logger';

const LEGACY_SHARD_DELTA_QUEUE_KEY = 'shards_delta_queue_v1';
const LEGACY_SHARD_DELTA_QUARANTINE_KEY = 'shards_delta_queue_v1_quarantine:ownerless';
const SHARD_DELTA_QUEUE_V2_PREFIX = 'shards_delta_queue_v2:';
const SHARD_DELTA_QUEUE_V2_QUARANTINE_PREFIX = 'shards_delta_queue_v2_quarantine:';
const MAX_PENDING_SHARD_DELTAS_PER_OWNER = 1000;
const SHARD_OP_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const SHARD_REASON_MAX_LEN = 64;

export type PendingShardDelta = {
  opId: string;
  ownerStableId: string;
  delta: number;
  type: 'earn' | 'spend';
  reason: string;
  createdAtMs: number;
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
    && Number(value.createdAtMs) > 0;
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
      const ownerQuarantineKey =
        `${SHARD_DELTA_QUEUE_V2_QUARANTINE_PREFIX}${encodeURIComponent(owner)}`;
      const [ownerQuarantine, legacyQuarantine] = await Promise.all([
        AsyncStorage.getItem(ownerQuarantineKey),
        AsyncStorage.getItem(LEGACY_SHARD_DELTA_QUARANTINE_KEY),
      ]);
      return ownerQuarantine !== null || legacyQuarantine !== null;
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
      const key = shardDeltaQueueStorageKey(owner);
      const queue = await readOwnerQueue(owner);
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
      const key = shardDeltaQueueStorageKey(owner);
      const queue = await readOwnerQueue(owner);
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
