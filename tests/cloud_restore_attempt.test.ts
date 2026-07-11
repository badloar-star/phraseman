import { __cloudSyncTestHooks } from '../app/cloud_sync';

describe('cloud restore result contract', () => {
  test('an existing document processed with no local writes is successful, not a transport failure', () => {
    expect(__cloudSyncTestHooks.completedCloudRestoreAttempt(false)).toEqual({
      status: 'restored',
      applied: false,
    });
  });
});
