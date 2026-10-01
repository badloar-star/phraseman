import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from './storage_mutex';
import { withAccountTransitionLockWithDeadline } from './account_generation';

// зачем (PM-289, D70/D78): журнал ожидающих оплаченных пакетов жемчуга удалён
// (запись/чтение/очистка по одному — у них не осталось вызовов). Остался только
// снос его ключей при удалении аккаунта: его зовёт auth_provider.ts, который
// правит другая сессия. Модуль уходит целиком на этапе 3 PM-289 вместе с вызовом.

const LOG = '[PEARL-GRANTS]';
const STORAGE_KEY_PREFIX = 'pending_shard_grants_v2:';
const QUARANTINE_KEY_PREFIX = 'pending_shard_grants_quarantine_v1:';
const DELETE_MARKER_PREFIX = 'pending_shard_grants_delete_cleanup_v1:';
const RECOVERY_NEEDED_PREFIX = 'pending_shard_grants_recovery_needed_v1:';
const ACCOUNT_COMMIT_TIMEOUT_MS = 1_500;

type DeleteCleanupMarker = { version: 1; ownerStableId: string; keyList: string[]; createdAtMs: number };

function ownerKey(prefix: string, stableId: string): string {
  return `${prefix}${encodeURIComponent(stableId)}`;
}

function deleteMarkerKey(stableId: string): string {
  return ownerKey(DELETE_MARKER_PREFIX, stableId);
}

async function verifySet(key: string, raw: string): Promise<boolean> {
  await AsyncStorage.setItem(key, raw);
  return await AsyncStorage.getItem(key) === raw;
}

function deletionKeys(stableId: string): string[] {
  return [
    ownerKey(STORAGE_KEY_PREFIX, stableId),
    ownerKey(QUARANTINE_KEY_PREFIX, stableId),
    ownerKey(RECOVERY_NEEDED_PREFIX, stableId),
  ];
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
        if (validDeleteMarker(existing, stableId)) return existing;
        console.warn(`${LOG} marker:invalid_existing`);
        return null;
      } catch (error) {
        console.warn(`${LOG} marker:parse_failed`, error instanceof Error ? error.message : String(error));
        return null;
      }
    }
    const marker = makeDeleteMarker(stableId);
    if (await verifySet(key, JSON.stringify(marker))) return marker;
    console.warn(`${LOG} marker:write_not_verified`);
    return null;
  } catch (error) {
    console.warn(`${LOG} marker:storage_failed`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function executeDeleteCleanupLocked(stableId: string, marker: DeleteCleanupMarker): Promise<boolean> {
  try {
    for (const key of marker.keyList) {
      await AsyncStorage.removeItem(key);
      if (await AsyncStorage.getItem(key) !== null) {
        console.warn(`${LOG} cleanup:key_survived`);
        return false;
      }
    }
    const markerKey = deleteMarkerKey(stableId);
    await AsyncStorage.removeItem(markerKey);
    return await AsyncStorage.getItem(markerKey) === null;
  } catch (error) {
    console.warn(`${LOG} cleanup:storage_failed`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/** Снести локальные ключи журнала ожиданий удаляемого аккаунта. */
export async function removePendingShardGrantsForAccount(
  stableId: string,
): Promise<'cleaned' | 'cleanup_pending'> {
  const owner = stableId.trim();
  if (!owner) {
    console.warn(`${LOG} remove:exit no_owner`);
    return 'cleanup_pending';
  }
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
  // owner-scoped cleanup obligation.
  console.warn(`${LOG} remove:lock_timeout`);
  await withStorageLock(async () => { await ensureDeleteMarkerLocked(owner); }).catch((error: unknown) => {
    console.warn(`${LOG} remove:marker_failed`, error instanceof Error ? error.message : String(error));
  });
  return 'cleanup_pending';
}

export default function __RouteShim() { return null; }
