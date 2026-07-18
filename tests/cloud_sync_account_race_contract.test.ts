import fs from 'fs';
import path from 'path';

const cloudSyncSource = fs.readFileSync(path.join(__dirname, '../app/cloud_sync.ts'), 'utf8');
const authProviderSource = fs.readFileSync(path.join(__dirname, '../app/auth_provider.ts'), 'utf8');

describe('cloud sync account-transition race contract', () => {
  test('serializes account wipe with wallet commits and hydration', () => {
    expect(cloudSyncSource).toContain('await withAccountTransitionLock(wipeLocalAccountDataUnsafe);');
  });
  test('outbound sync is generation-bound at the user write and local marker boundaries', () => {
    expect(cloudSyncSource).toContain('const syncGeneration = captureAccountGeneration()');
    expect(cloudSyncSource).toContain('isCurrentAccountGeneration(syncGeneration, uid)');
    expect(cloudSyncSource).toMatch(/if \(!isSyncGenerationCurrent\(\)\) return;\r?\n\s+await docRef\.set\(/);
    expect(cloudSyncSource).toMatch(/if \(!isSyncGenerationCurrent\(\)\) return;\r?\n\s+await AsyncStorage\.setItem\(LAST_SYNC_SNAPSHOT_KEY/);
  });

  test('account deletion enqueues first, then invalidates old work and only performs bounded drains', () => {
    expect(cloudSyncSource).toContain('export async function quiesceCloudSyncForAccountTransition(');
    expect(cloudSyncSource).toContain('timeoutMs: number');
    const deleteFlow = authProviderSource.slice(
      authProviderSource.indexOf('export async function deleteAccountAndWipe()'),
      authProviderSource.indexOf('export async function signOutCurrentProvider()'),
    );
    expect(deleteFlow.indexOf('startCloudDeletionEnqueue(')).toBeGreaterThanOrEqual(0);
    expect(deleteFlow.indexOf('await cloudDeleteEnqueueOperation.dispatchSettled')).toBeGreaterThan(
      deleteFlow.indexOf('startCloudDeletionEnqueue('),
    );
    expect(deleteFlow.indexOf('invalidateAccountGeneration()')).toBeGreaterThan(
      deleteFlow.indexOf('startCloudDeletionEnqueue('),
    );
    expect(deleteFlow.indexOf('waitForRestoreApplicationIdleWithDeadline(')).toBeGreaterThan(
      deleteFlow.indexOf('invalidateAccountGeneration()'),
    );
    expect(deleteFlow.indexOf('quiesceCloudSyncForAccountTransition(')).toBeGreaterThan(
      deleteFlow.indexOf('invalidateAccountGeneration()'),
    );
  });
});
