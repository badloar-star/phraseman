import fs from 'fs';
import path from 'path';

const cloudSyncSource = fs.readFileSync(path.join(__dirname, '../app/cloud_sync.ts'), 'utf8');
const authProviderSource = fs.readFileSync(path.join(__dirname, '../app/auth_provider.ts'), 'utf8');

describe('cloud sync account-transition race contract', () => {
  test('serializes account wipe with wallet commits and hydration', () => {
    expect(cloudSyncSource).toContain('inheritedLease?: AccountTransitionLockLease');
    expect(cloudSyncSource).toContain(
      'await withAccountTransitionLock(wipeLocalAccountDataUnsafe, inheritedLease);',
    );
  });
  test('outbound sync is generation-bound at the user write and local marker boundaries', () => {
    expect(cloudSyncSource).toContain('const syncGeneration = captureAccountGeneration()');
    expect(cloudSyncSource).toContain('isCurrentAccountGeneration(syncGeneration, uid)');
    expect(cloudSyncSource).toMatch(/if \(!isSyncGenerationCurrent\(\)\) return;\r?\n\s+await docRef\.set\(/);
    expect(cloudSyncSource).toMatch(/if \(!isSyncGenerationCurrent\(\)\) return;\r?\n\s+await AsyncStorage\.setItem\(LAST_SYNC_SNAPSHOT_KEY/);
  });

  test('account deletion invalidates and verifies the local wipe before enqueue, then only performs bounded drains', () => {
    expect(cloudSyncSource).toContain('export async function quiesceCloudSyncForAccountTransition(');
    expect(cloudSyncSource).toContain('timeoutMs: number');
    const deleteFlow = authProviderSource.slice(
      authProviderSource.indexOf('export async function deleteAccountAndWipe()'),
      authProviderSource.indexOf('export async function signOutCurrentProvider()'),
    );
    const wipeHelper = authProviderSource.slice(
      authProviderSource.indexOf('async function executePostDeleteLocalWipe('),
      authProviderSource.indexOf('async function wipeAndVerifyPostDeleteLocalData('),
    );
    const drainHelper = authProviderSource.slice(
      authProviderSource.indexOf('async function drainEntitlementSafeAccountTransition()'),
      authProviderSource.indexOf('async function beginEntitlementSafeAccountTransition()'),
    );
    const prepareFlow = deleteFlow.slice(
      deleteFlow.indexOf('async function prepareAccountDeletion()'),
      deleteFlow.indexOf('/** Фоновая фаза'),
    );
    const finishFlow = deleteFlow.slice(
      deleteFlow.indexOf('async function finishAccountDeletion('),
    );
    const generationInvalidation = wipeHelper.indexOf('invalidateAccountGeneration()');
    const premiumInvalidation = wipeHelper.indexOf('beginPremiumAccountTransition()');
    const premiumDrain = wipeHelper.indexOf('waitForPremiumAccountWorkIdleWithDeadline(');
    const restoreDrain = wipeHelper.indexOf('waitForRestoreApplicationIdleWithDeadline(');
    const cloudDrain = wipeHelper.indexOf('quiesceCloudSyncForAccountTransition(');
    const localWipe = wipeHelper.indexOf('await wipeLocalAccountData()');
    const storageClear = wipeHelper.indexOf('await AsyncStorage.clear()');
    const strictReadback = wipeHelper.indexOf('verifyPostDeleteLocalWipe()');
    const durableGuard = prepareFlow.indexOf('persistAccountDeletePendingAuth(');
    const verifiedWipe = prepareFlow.indexOf('wipeAndVerifyPostDeleteLocalData(');
    const localCleared = prepareFlow.indexOf("'local_data_cleared'");
    const enqueue = prepareFlow.indexOf('startCloudDeletionEnqueue(');
    expect(durableGuard).toBeGreaterThanOrEqual(0);
    expect(durableGuard).toBeLessThan(verifiedWipe);
    expect(verifiedWipe).toBeLessThan(localCleared);
    expect(localCleared).toBeLessThan(enqueue);
    expect(generationInvalidation).toBeGreaterThanOrEqual(0);
    expect(generationInvalidation).toBeLessThan(premiumInvalidation);
    expect(premiumInvalidation).toBeLessThan(premiumDrain);
    expect(premiumDrain).toBeLessThan(localWipe);
    expect(restoreDrain).toBeLessThan(localWipe);
    expect(cloudDrain).toBeLessThan(localWipe);
    expect(premiumInvalidation).toBeLessThan(localWipe);
    expect(localWipe).toBeLessThan(storageClear);
    expect(storageClear).toBeLessThan(strictReadback);
    expect(authProviderSource).toContain('const postDeleteLocalWipeFlights = new Map');
    expect(authProviderSource).toContain('return withLocalStepDeadline(() => flight!, false);');
    expect(drainHelper).toContain('waitForPremiumAccountWorkIdleWithDeadline(');
    expect(finishFlow).toContain('drainEntitlementSafeAccountTransition()');
    expect(finishFlow.indexOf('waitForRestoreApplicationIdleWithDeadline(')).toBeGreaterThan(
      finishFlow.indexOf('drainEntitlementSafeAccountTransition()'),
    );
    expect(finishFlow.indexOf('quiesceCloudSyncForAccountTransition(')).toBeGreaterThan(
      finishFlow.indexOf('drainEntitlementSafeAccountTransition()'),
    );
    expect(finishFlow).not.toContain('invalidateAccountGeneration()');
  });
});
