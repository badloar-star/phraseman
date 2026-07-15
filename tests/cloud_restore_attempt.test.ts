import { __cloudSyncTestHooks } from '../app/cloud_sync';

describe('cloud restore result contract', () => {
  test('an existing document processed with no local writes is successful, not a transport failure', () => {
    expect(__cloudSyncTestHooks.completedCloudRestoreAttempt(false)).toEqual({
      status: 'restored',
      applied: false,
    });
  });

  test('Firestore permission failures are not mislabeled as transport failures', () => {
    expect(__cloudSyncTestHooks.classifyCloudRestoreFailure({ code: 'firestore/permission-denied' }))
      .toBe('permission_denied');
    expect(__cloudSyncTestHooks.classifyCloudRestoreFailure(new Error('network request failed')))
      .toBe('failed');
  });
});
