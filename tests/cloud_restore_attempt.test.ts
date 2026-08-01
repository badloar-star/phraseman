import { __cloudSyncTestHooks } from '../app/cloud_sync';

describe('cloud restore result contract', () => {
  test('an existing document processed with no local writes is successful, not a transport failure', () => {
    // зачем: контракт восстановления расширился полем failureReason — успешная
    // попытка обязана нести null, чтобы вызывающий код отличал «успех без
    // изменений» от транспортной ошибки по одному полю, а не по status.
    expect(__cloudSyncTestHooks.completedCloudRestoreAttempt(false)).toEqual({
      status: 'restored',
      applied: false,
      failureReason: null,
    });
  });
});
