import fs from 'fs';
import path from 'path';

const cloudSyncSource = fs.readFileSync(path.join(__dirname, '../app/cloud_sync.ts'), 'utf8');
const authProviderSource = fs.readFileSync(path.join(__dirname, '../app/auth_provider.ts'), 'utf8');

describe('cloud sync account-transition race contract', () => {
  test('serializes account wipe with wallet commits and hydration', () => {
    expect(cloudSyncSource).toContain('inheritedLease?: AccountTransitionLockLease');
    expect(cloudSyncSource).toContain(
      // 89da06443 (координатор 18.10): режим стирания ('full' | 'signout') — тот же замок вокруг того же тела.
      // 18.10 (7a6cf13aa): keepConsents — откат прерванного входа без сброса согласий
      'await withAccountTransitionLock(() => wipeLocalAccountDataUnsafe(mode, keepConsents), inheritedLease);',
    );
  });
  test('outbound sync is generation-bound at the user write and local marker boundaries', () => {
    expect(cloudSyncSource).toContain('const syncGeneration = captureAccountGeneration()');
    expect(cloudSyncSource).toContain('isCurrentAccountGeneration(syncGeneration, uid)');
    // зачем (2026-09-02): запись документа переехала с `docRef.set(...)` на
    // точечное обновление progress по dot-notation — `set(merge:true)` заменял
    // вложенную карту целиком, из-за чего правила видели «удаление» server-owned
    // ключей и рубили ВЕСЬ set (разбор [SYNC-DENY], см.
    // cloud_sync_nested_progress_write_contract). Требование сторожа не
    // изменилось: проверка поколения обязана стоять ВПЛОТНУЮ к сетевой записи.
    expect(cloudSyncSource).toMatch(
      /if \(!isSyncGenerationCurrent\(\)\) return;\r?\n\s+const wrote = await writeUserDocWithNestedProgress\(/,
    );
    // 077deccd0 (координатор 18.10): снимок пишется вместе с пометкой владельца — writeLastSyncSnapshot; проверка поколения та же, прямо перед записью.
    expect(cloudSyncSource).toMatch(/if \(!isSyncGenerationCurrent\(\)\) return;\r?\n\s+await writeLastSyncSnapshot\(JSON\.stringify\(snapshotData\), uid\)/);
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
    // зачем (10.10): результат полёта теперь ждётся с логом отказа по сроку ([ACCOUNT-DELETE-LOCAL]) — проверяем срок, а не форму return (потолок срока может быть своим).
    expect(authProviderSource).toMatch(/(?:return|const result = await) withLocalStepDeadline\(\s*\(\) => flight!,\s*false(?:,\s*[A-Z_]+)?,?\s*\);/);
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
