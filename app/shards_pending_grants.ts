import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from './storage_mutex';
import { getShardsBalance, loadShardsFromCloud, getShardAchievementEligibleBalance } from './shards_system';
import { emitAppEvent } from './events';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import { DebugLogger } from './debug-logger';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
  type AccountGenerationToken,
} from './account_generation';
import { commitRevenueCatResultForGeneration } from './revenuecat_account_identity';

const STORAGE_KEY_PREFIX = 'pending_shard_grants_v2:';
const LEGACY_STORAGE_KEY = 'pending_shard_grants_v1';
const QUARANTINE_KEY_PREFIX = 'pending_shard_grants_quarantine_v1:';
const LEGACY_QUARANTINE_OWNER_KEY = 'pending_shard_grants_v1_quarantine_owner_v1';
const DELETE_MARKER_PREFIX = 'pending_shard_grants_delete_cleanup_v1:';
const RECOVERY_NEEDED_PREFIX = 'pending_shard_grants_recovery_needed_v1:';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_COMMIT_TIMEOUT_MS = 1_500;
const MAX_PENDING_GRANTS = 32;
const MAX_TEXT_LENGTH = 256;

export interface PendingShardGrant {
  /** Local cryptographically-random id; never derived from product/time. */
  journalId: string;
  /** Store transaction id when the SDK provides one. */
  storeTransactionId: string | null;
  productId: string;
  expectedShards: number;
  beforeBalance: number;
  createdAtMs: number;
}

export type RecordPendingShardGrantResult =
  | { status: 'recorded'; journalId: string }
  | { status: 'stale' | 'storage_unavailable' | 'conflict' | 'quarantined' };

type PendingEnvelope = { version: 2; ownerStableId: string; grants: PendingShardGrant[] };
type ReadPendingResult =
  | { status: 'ok'; grants: PendingShardGrant[] }
  | { status: 'stale' | 'storage_unavailable' | 'conflict' | 'quarantined' };
type DeleteCleanupMarker = { version: 1; ownerStableId: string; keyList: string[]; createdAtMs: number };

function ownerKey(prefix: string, stableId: string): string {
  return `${prefix}${encodeURIComponent(stableId)}`;
}

function pendingStorageKey(stableId: string): string {
  return ownerKey(STORAGE_KEY_PREFIX, stableId);
}

function quarantineStorageKey(stableId: string): string {
  return ownerKey(QUARANTINE_KEY_PREFIX, stableId);
}

function deleteMarkerKey(stableId: string): string {
  return ownerKey(DELETE_MARKER_PREFIX, stableId);
}

function recoveryNeededKey(stableId: string): string {
  return ownerKey(RECOVERY_NEEDED_PREFIX, stableId);
}

function accountIsCurrent(token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return !!token.stableId && isCurrentAccountGeneration(token, token.stableId);
}

function validBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT_LENGTH;
}

function validGrant(value: unknown): value is PendingShardGrant {
  if (!value || typeof value !== 'object') return false;
  const grant = value as Record<string, unknown>;
  return validBoundedString(grant.journalId)
    && (grant.storeTransactionId === null || validBoundedString(grant.storeTransactionId))
    && validBoundedString(grant.productId)
    && Number.isSafeInteger(grant.expectedShards)
    && Number(grant.expectedShards) > 0
    && Number.isSafeInteger(grant.beforeBalance)
    && Number(grant.beforeBalance) >= 0
    && Number.isSafeInteger(grant.createdAtMs)
    && Number(grant.createdAtMs) > 0;
}

function sameGrant(a: PendingShardGrant, b: PendingShardGrant): boolean {
  return a.journalId === b.journalId
    && a.storeTransactionId === b.storeTransactionId
    && a.productId === b.productId
    && a.expectedShards === b.expectedShards
    && a.beforeBalance === b.beforeBalance
    && a.createdAtMs === b.createdAtMs;
}

async function verifySet(key: string, raw: string): Promise<boolean> {
  await AsyncStorage.setItem(key, raw);
  return await AsyncStorage.getItem(key) === raw;
}

async function quarantineRawLocked(
  token: AccountGenerationToken & { stableId: string },
  reason: 'ownerless_v1' | 'owner_mismatch' | 'corrupt_v2',
  raw: string,
): Promise<'quarantined' | 'conflict' | 'storage_unavailable' | 'stale'> {
  if (!accountIsCurrent(token)) return 'stale';
  const key = quarantineStorageKey(token.stableId);
  const evidence = JSON.stringify({ version: 1, ownerStableId: token.stableId, reason, raw });
  try {
    const existing = await AsyncStorage.getItem(key);
    if (!accountIsCurrent(token)) return 'stale';
    if (existing !== null) return existing === evidence ? 'quarantined' : 'conflict';
    if (!await verifySet(key, evidence)) return 'storage_unavailable';
    return accountIsCurrent(token) ? 'quarantined' : 'stale';
  } catch {
    return 'storage_unavailable';
  }
}

async function quarantineLegacyIfNeededLocked(
  token: AccountGenerationToken & { stableId: string },
): Promise<Exclude<ReadPendingResult['status'], 'ok'> | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!accountIsCurrent(token) || raw === null) return accountIsCurrent(token) ? null : 'stale';
    const existingOwner = await AsyncStorage.getItem(LEGACY_QUARANTINE_OWNER_KEY);
    if (!accountIsCurrent(token)) return 'stale';
    if (existingOwner !== null && existingOwner !== token.stableId) return null;
    if (existingOwner === null && !await verifySet(LEGACY_QUARANTINE_OWNER_KEY, token.stableId)) {
      return 'storage_unavailable';
    }
    return await quarantineRawLocked(token, 'ownerless_v1', raw);
  } catch {
    return 'storage_unavailable';
  }
}

async function readPendingLocked(
  token: AccountGenerationToken & { stableId: string },
): Promise<ReadPendingResult> {
  if (!accountIsCurrent(token)) return { status: 'stale' };
  const legacyStatus = await quarantineLegacyIfNeededLocked(token);
  if (legacyStatus && legacyStatus !== 'quarantined') return { status: legacyStatus };
  try {
    const raw = await AsyncStorage.getItem(pendingStorageKey(token.stableId));
    if (!accountIsCurrent(token)) return { status: 'stale' };
    if (raw === null) return { status: 'ok', grants: [] };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: await quarantineRawLocked(token, 'corrupt_v2', raw) };
    }
    if (!parsed || typeof parsed !== 'object') {
      return { status: await quarantineRawLocked(token, 'corrupt_v2', raw) };
    }
    const envelope = parsed as Partial<PendingEnvelope>;
    if (envelope.ownerStableId !== token.stableId) {
      return { status: await quarantineRawLocked(token, 'owner_mismatch', raw) };
    }
    if (envelope.version !== 2 || !Array.isArray(envelope.grants)
      || envelope.grants.length > MAX_PENDING_GRANTS || !envelope.grants.every(validGrant)) {
      return { status: await quarantineRawLocked(token, 'corrupt_v2', raw) };
    }
    return { status: 'ok', grants: envelope.grants };
  } catch {
    return { status: 'storage_unavailable' };
  }
}

async function writePendingLocked(
  token: AccountGenerationToken & { stableId: string },
  grants: PendingShardGrant[],
): Promise<boolean> {
  if (!accountIsCurrent(token) || grants.length > MAX_PENDING_GRANTS || !grants.every(validGrant)) return false;
  const key = pendingStorageKey(token.stableId);
  try {
    if (grants.length === 0) {
      await AsyncStorage.removeItem(key);
      return accountIsCurrent(token) && await AsyncStorage.getItem(key) === null;
    }
    const raw = JSON.stringify({ version: 2, ownerStableId: token.stableId, grants });
    return await verifySet(key, raw) && accountIsCurrent(token);
  } catch {
    return false;
  }
}

async function withAccountStorageCommit<T>(
  token: AccountGenerationToken,
  staleValue: T,
  work: (currentToken: AccountGenerationToken & { stableId: string }) => Promise<T>,
): Promise<T> {
  const locked = await withAccountTransitionLockWithDeadline(async () => {
    if (!accountIsCurrent(token)) return staleValue;
    return withStorageLock(async () => accountIsCurrent(token) ? work(token) : staleValue);
  }, ACCOUNT_COMMIT_TIMEOUT_MS);
  return locked.completed ? locked.value : staleValue;
}

export async function recordPendingShardGrant(
  token: AccountGenerationToken,
  grant: PendingShardGrant,
): Promise<RecordPendingShardGrantResult> {
  if (!validGrant(grant)) return { status: 'conflict' };
  const committed = await commitRevenueCatResultForGeneration(token, async (isCurrent) => withStorageLock(async () => {
    if (!accountIsCurrent(token) || !isCurrent()) return { status: 'stale' } as const;
    const read = await readPendingLocked(token);
    if (read.status !== 'ok') return { status: read.status } as RecordPendingShardGrantResult;
    const sameJournal = read.grants.find((item) => item.journalId === grant.journalId);
    if (sameJournal) return sameGrant(sameJournal, grant)
      ? { status: 'recorded' as const, journalId: sameJournal.journalId }
      : { status: 'conflict' as const };
    const sameTransaction = grant.storeTransactionId
      ? read.grants.find((item) => item.storeTransactionId === grant.storeTransactionId)
      : undefined;
    if (sameTransaction) {
      const equivalent = sameTransaction.productId === grant.productId
        && sameTransaction.expectedShards === grant.expectedShards
        && sameTransaction.beforeBalance === grant.beforeBalance;
      return equivalent
        ? { status: 'recorded' as const, journalId: sameTransaction.journalId }
        : { status: 'conflict' as const };
    }
    if (read.grants.length >= MAX_PENDING_GRANTS) return { status: 'conflict' as const };
    const written = await writePendingLocked(token, [...read.grants, grant]);
    if (!written) return accountIsCurrent(token) && isCurrent()
      ? { status: 'storage_unavailable' as const }
      : { status: 'stale' as const };
    return { status: 'recorded' as const, journalId: grant.journalId };
  }));
  return committed.status === 'ok' ? committed.value : { status: 'stale' };
}

export async function clearPendingShardGrant(
  token: AccountGenerationToken,
  journalId: string,
): Promise<boolean> {
  if (!validBoundedString(journalId)) return false;
  return withAccountStorageCommit(token, false, async (currentToken) => {
    const read = await readPendingLocked(currentToken);
    if (read.status !== 'ok') return false;
    const remaining = read.grants.filter((grant) => grant.journalId !== journalId);
    return remaining.length === read.grants.length || writePendingLocked(currentToken, remaining);
  });
}

export async function listPendingShardGrants(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<PendingShardGrant[]> {
  return withAccountStorageCommit(token, [], async (currentToken) => {
    const read = await readPendingLocked(currentToken);
    return read.status === 'ok' ? read.grants : [];
  });
}

function deletionKeys(stableId: string): string[] {
  return [pendingStorageKey(stableId), quarantineStorageKey(stableId), recoveryNeededKey(stableId)];
}

function makeDeleteMarker(stableId: string): DeleteCleanupMarker {
  return { version: 1, ownerStableId: stableId, keyList: deletionKeys(stableId), createdAtMs: Date.now() };
}

function validDeleteMarker(value: unknown, stableId: string): value is DeleteCleanupMarker {
  if (!value || typeof value !== 'object') return false;
  const marker = value as Partial<DeleteCleanupMarker>;
  return marker.version === 1
    && marker.ownerStableId === stableId
    && Array.isArray(marker.keyList)
    && JSON.stringify(marker.keyList) === JSON.stringify(deletionKeys(stableId))
    && Number.isSafeInteger(marker.createdAtMs)
    && Number(marker.createdAtMs) > 0;
}

async function ensureDeleteMarkerLocked(stableId: string): Promise<DeleteCleanupMarker | null> {
  const key = deleteMarkerKey(stableId);
  try {
    const existingRaw = await AsyncStorage.getItem(key);
    if (existingRaw !== null) {
      try {
        const existing = JSON.parse(existingRaw) as unknown;
        return validDeleteMarker(existing, stableId) ? existing : null;
      } catch { return null; }
    }
    const marker = makeDeleteMarker(stableId);
    return await verifySet(key, JSON.stringify(marker)) ? marker : null;
  } catch { return null; }
}

async function executeDeleteCleanupLocked(stableId: string, marker: DeleteCleanupMarker): Promise<boolean> {
  try {
    for (const key of marker.keyList) {
      await AsyncStorage.removeItem(key);
      if (await AsyncStorage.getItem(key) !== null) return false;
    }
    const markerKey = deleteMarkerKey(stableId);
    await AsyncStorage.removeItem(markerKey);
    return await AsyncStorage.getItem(markerKey) === null;
  } catch { return false; }
}

export async function removePendingShardGrantsForAccount(
  stableId: string,
): Promise<'cleaned' | 'cleanup_pending'> {
  const owner = stableId.trim();
  if (!owner) return 'cleanup_pending';
  const locked = await withAccountTransitionLockWithDeadline(
    () => withStorageLock(async () => {
      const marker = await ensureDeleteMarkerLocked(owner);
      if (!marker) return 'cleanup_pending' as const;
      return await executeDeleteCleanupLocked(owner, marker) ? 'cleaned' as const : 'cleanup_pending' as const;
    }),
    ACCOUNT_COMMIT_TIMEOUT_MS,
  );
  if (locked.completed) return locked.value;
  // A timed-out removal is not attempted outside the lock. Persist only the
  // owner-scoped cleanup obligation; a later exact-owner retry performs it.
  await withStorageLock(async () => { await ensureDeleteMarkerLocked(owner); }).catch(() => {});
  return 'cleanup_pending';
}

export async function retryPendingShardGrantDeleteCleanup(
  token: AccountGenerationToken,
  markerOwnerStableId: string = token.stableId ?? '',
): Promise<'cleaned' | 'cleanup_pending' | 'not_owner' | 'no_marker'> {
  const owner = markerOwnerStableId.trim();
  if (!owner || token.stableId !== owner || !accountIsCurrent(token)) return 'not_owner';
  return withAccountStorageCommit(token, 'cleanup_pending' as const, async (currentToken) => {
    const key = deleteMarkerKey(owner);
    let raw: string | null;
    try { raw = await AsyncStorage.getItem(key); } catch { return 'cleanup_pending' as const; }
    if (!accountIsCurrent(currentToken)) return 'cleanup_pending' as const;
    if (raw === null) return 'no_marker' as const;
    let marker: unknown;
    try { marker = JSON.parse(raw); } catch { return 'cleanup_pending' as const; }
    if (!validDeleteMarker(marker, owner)) return 'cleanup_pending' as const;
    return await executeDeleteCleanupLocked(owner, marker) ? 'cleaned' as const : 'cleanup_pending' as const;
  });
}

type RecoveryMarker = { version: 1; ownerStableId: string; createdAtMs: number };

export async function markPendingShardRecoveryNeeded(token: AccountGenerationToken): Promise<boolean> {
  return withAccountStorageCommit(token, false, async (currentToken) => {
    const marker: RecoveryMarker = { version: 1, ownerStableId: currentToken.stableId, createdAtMs: Date.now() };
    try { return await verifySet(recoveryNeededKey(currentToken.stableId), JSON.stringify(marker)); } catch { return false; }
  });
}

export async function clearPendingShardRecoveryNeeded(token: AccountGenerationToken): Promise<boolean> {
  return withAccountStorageCommit(token, false, async (currentToken) => {
    const key = recoveryNeededKey(currentToken.stableId);
    try {
      await AsyncStorage.removeItem(key);
      return accountIsCurrent(currentToken) && await AsyncStorage.getItem(key) === null;
    } catch { return false; }
  });
}

export async function resumePendingShardRecoveryNeeded(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  if (!accountIsCurrent(token)) return false;
  const markerExists = await withAccountStorageCommit(token, false, async (currentToken) => {
    try {
      const raw = await AsyncStorage.getItem(recoveryNeededKey(currentToken.stableId));
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<RecoveryMarker>;
      return parsed.version === 1 && parsed.ownerStableId === currentToken.stableId;
    } catch { return false; }
  });
  if (!markerExists || !accountIsCurrent(token)) return false;
  const isCurrent = () => accountIsCurrent(token);
  try { await loadShardsFromCloud(isCurrent); } catch { return false; }
  if (!isCurrent()) return false;
  const balance = await getShardsBalance().catch(() => null);
  if (balance === null || !isCurrent()) return false;
  const cleared = await clearPendingShardRecoveryNeeded(token);
  if (!cleared || !isCurrent()) return false;
  emitAppEvent('shards_balance_updated', { balance, op: 'replace', reason: 'shards_store_purchase_recovery' });
  return true;
}

type ResumeResult = { resolved: number; stillPending: number; expired: number };
const EMPTY_RESUME_RESULT: ResumeResult = { resolved: 0, stillPending: 0, expired: 0 };
const resumeInFlight = new Map<string, Promise<ResumeResult>>();

async function resumePendingShardGrantsInternal(token: AccountGenerationToken): Promise<ResumeResult> {
  if (!accountIsCurrent(token)) return EMPTY_RESUME_RESULT;
  const list = await listPendingShardGrants(token);
  if (list.length === 0 || !accountIsCurrent(token)) return EMPTY_RESUME_RESULT;
  const isCurrent = () => accountIsCurrent(token);
  try {
    await loadShardsFromCloud(isCurrent);
  } catch (error) {
    if (isCurrent()) DebugLogger.error('shards_pending_grants:loadShardsFromCloud', error, 'warning');
    return { resolved: 0, stillPending: list.length, expired: 0 };
  }
  if (!isCurrent()) return { resolved: 0, stillPending: list.length, expired: 0 };
  const cloudBalance = await getShardsBalance().catch(() => null);
  if (cloudBalance === null || !isCurrent()) return { resolved: 0, stillPending: list.length, expired: 0 };
  const now = Date.now();
  const resolved = list.filter((grant) => cloudBalance >= grant.beforeBalance + grant.expectedShards);
  const expired = list.filter((grant) => !resolved.includes(grant) && now - grant.createdAtMs > PENDING_TTL_MS);
  const removedIds = new Set([...resolved, ...expired].map((grant) => grant.journalId));
  const remaining = list.filter((grant) => !removedIds.has(grant.journalId));
  if (removedIds.size > 0) {
    const committed = await withAccountStorageCommit(token, false, async (currentToken) => {
      const latest = await readPendingLocked(currentToken);
      if (latest.status !== 'ok') return false;
      return writePendingLocked(currentToken, latest.grants.filter((grant) => !removedIds.has(grant.journalId)));
    });
    if (!committed || !isCurrent()) return { resolved: 0, stillPending: list.length, expired: 0 };
  }
  for (const grant of expired) {
    DebugLogger.error('shards_pending_grants:expired', new Error(
      `productId=${grant.productId} journal=${grant.journalId} expected=${grant.expectedShards} before=${grant.beforeBalance} cloudNow=${cloudBalance} ageMs=${now - grant.createdAtMs}`,
    ), 'critical');
  }
  if (!isCurrent()) return { resolved: 0, stillPending: list.length, expired: 0 };
  const eligibleAchievementBalance = resolved.length > 0
    ? await getShardAchievementEligibleBalance(cloudBalance).catch(() => cloudBalance)
    : cloudBalance;
  if (!isCurrent()) return { resolved: 0, stillPending: list.length, expired: 0 };
  for (const grant of resolved) {
    emitAppEvent('shards_balance_updated', {
      balance: cloudBalance,
      op: 'earn',
      reason: 'shards_store_purchase',
      eligibleAchievementBalance,
    });
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: `Готово: +${grant.expectedShards} жемчужин`,
      messageUk: `Готово: +${grant.expectedShards} перлин`,
      messageEs: `Listo: +${grant.expectedShards} ${BRAND_SHARDS_ES.toLowerCase()}`,
      messagePtBr: `Pronto: +${grant.expectedShards} perlas`,
      messageVi: `Xong: +${grant.expectedShards} mảnh`,
      messageId: `Selesai: +${grant.expectedShards} shard`,
      messageTr: `Tamam: +${grant.expectedShards} parça`,
      messagePl: `Gotowe: +${grant.expectedShards} monet`,
    });
  }
  return { resolved: resolved.length, stillPending: remaining.length, expired: expired.length };
}

export function resumePendingShardGrants(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<ResumeResult> {
  const key = `${token.generation}:${token.stableId ?? ''}`;
  const existing = resumeInFlight.get(key);
  if (existing) return existing;
  const operation = resumePendingShardGrantsInternal(token).finally(() => {
    if (resumeInFlight.get(key) === operation) resumeInFlight.delete(key);
  });
  resumeInFlight.set(key, operation);
  return operation;
}

export const __testOnly = {
  STORAGE_KEY_PREFIX,
  LEGACY_STORAGE_KEY,
  QUARANTINE_KEY_PREFIX,
  DELETE_MARKER_PREFIX,
  RECOVERY_NEEDED_PREFIX,
  PENDING_TTL_MS,
  MAX_PENDING_GRANTS,
  pendingStorageKey,
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
