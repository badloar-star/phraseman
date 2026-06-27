jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/firebase', () => ({ recordError: jest.fn() }));
jest.mock('../app/client_reports', () => ({
  submitClientReport: jest.fn(async () => ({ ok: true, id: 'report_1' })),
}));

type AsyncStorageMock = {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  __reset?: () => void;
};

async function loadAppHealthWithFreshCache() {
  jest.resetModules();
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  jest.clearAllMocks();

  const appHealth = await import('../app/app_health');
  const firebase = await import('../app/firebase');
  const clientReports = await import('../app/client_reports');

  return { appHealth, storage, firebase, clientReports };
}

describe('app health throttle cache', () => {
  it('drops repeated identical warnings before rereading storage or writing another server report', async () => {
    const { appHealth, storage, firebase, clientReports } = await loadAppHealthWithFreshCache();

    await appHealth.logAppWarning('health:loop_failed', new Error('same failure'), {
      feature: 'health',
      writeToFirestore: true,
    });
    await appHealth.logAppWarning('health:loop_failed', new Error('same failure'), {
      feature: 'health',
      writeToFirestore: true,
    });

    const throttleReads = storage.getItem.mock.calls.filter(([key]) =>
      key.startsWith('app_health_last_'),
    );
    const throttleWrites = storage.setItem.mock.calls.filter(([key]) =>
      key.startsWith('app_health_last_'),
    );

    expect(throttleReads).toHaveLength(1);
    expect(throttleWrites).toHaveLength(1);
    expect(storage.getItem.mock.calls.filter(([key]) => key === 'user_name')).toHaveLength(1);
    expect(firebase.recordError).toHaveBeenCalledTimes(1);
    expect(clientReports.submitClientReport).toHaveBeenCalledTimes(1);
    expect(clientReports.submitClientReport).toHaveBeenCalledWith(
      'app_error',
      expect.objectContaining({
        context: 'health:loop_failed',
        feature: 'health',
        severity: 'warning',
        message: 'same failure',
      }),
    );
  });
});
