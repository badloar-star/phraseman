import {
  createPhoneStateSqliteRetryStore,
  createPhoneStateSqliteSyncRepository,
} from '../modules/phone-state/sqlite_sync_repository';
import { createReducerRegistry } from '../modules/phone-state/reducer_registry';
import type { PhoneStateStoreDatabase } from '../modules/phone-state/store';

test('production SQLite adapter exposes every sync-engine durability operation', () => {
  const database = {} as PhoneStateStoreDatabase;
  const local = createPhoneStateSqliteSyncRepository({
    database,
    registry: createReducerRegistry([]),
  });
  expect(Object.keys(local).sort()).toEqual([
    'applyExternalEventsAndAdvanceCursor',
    'applyRemoteSegmentAndAdvanceCursor',
    'externalCursor',
    'isDeviceManifestAcknowledged',
    'markDeviceManifestAcknowledged',
    'markSegmentAcknowledged',
    'oldestPendingSegment',
    'quarantineRemoteReceipt',
    'remoteCursor',
    'sealOpen',
  ]);
});

test('retry state maps to one durable sync_retry row and clears only that row', async () => {
  const runAsync = jest.fn(async (..._args: unknown[]) => undefined);
  const database = {
    getFirstAsync: jest.fn(async () => ({
      attempts: 2,
      next_retry_at_ms: 123,
      lease_owner: null,
      lease_expires_at_ms: null,
      last_error_class: 'offline',
    })),
    runAsync,
  } as unknown as PhoneStateStoreDatabase;
  const retry = createPhoneStateSqliteRetryStore(database);
  await expect(retry.read()).resolves.toEqual({
    attempts: 2,
    nextRetryAt: 123,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastErrorClass: 'offline',
  });
  await retry.write({
    attempts: 3,
    nextRetryAt: 456,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastErrorClass: 'offline',
  });
  await retry.clear();
  expect(runAsync).toHaveBeenCalledTimes(2);
  const clearSql = String((runAsync.mock.calls as unknown[][])[1][0]);
  expect(clearSql).toContain('DELETE FROM sync_retry');
  expect(clearSql).not.toContain('operations');
});
