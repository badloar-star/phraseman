const mockGetApp = jest.fn(() => ({ name: '[DEFAULT]' }));
const mockGetFunctions = jest.fn((_app: unknown, _region: string) => ({ region: 'us-central1' }));
const mockCallableInvoker = jest.fn(async ({ kind }: { kind: string }) => ({
  data: { ok: true, id: `${kind}_id`, collection: `${kind}s` },
}));
const mockHttpsCallable = jest.fn((_functions: unknown, _name: string) => mockCallableInvoker);
const mockInitFirebaseAppCheckIfAvailable = jest.fn(async () => true);

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: () => mockInitFirebaseAppCheckIfAvailable(),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => mockGetApp(),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: (app: unknown, region: string) => mockGetFunctions(app, region),
  httpsCallable: (functions: unknown, name: string) => mockHttpsCallable(functions, name),
}));

async function loadClientReportsWithFreshCache() {
  jest.resetModules();
  jest.clearAllMocks();
  return import('../app/client_reports');
}

describe('client reports cache', () => {
  it('dedupes concurrent AppCheck warmup and reuses the submitClientReport callable', async () => {
    const { submitClientReport } = await loadClientReportsWithFreshCache();

    await Promise.all([
      submitClientReport('app_error', { n: 1 }),
      submitClientReport('app_activity', { n: 2 }),
    ]);

    expect(mockInitFirebaseAppCheckIfAvailable).toHaveBeenCalledTimes(1);
    expect(mockGetApp).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledWith({ name: '[DEFAULT]' }, 'us-central1');
    expect(mockHttpsCallable).toHaveBeenCalledTimes(1);
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'submitClientReport');
    expect(mockCallableInvoker).toHaveBeenCalledTimes(2);
    expect(mockCallableInvoker).toHaveBeenNthCalledWith(1, {
      kind: 'app_error',
      payload: { n: 1 },
    });
    expect(mockCallableInvoker).toHaveBeenNthCalledWith(2, {
      kind: 'app_activity',
      payload: { n: 2 },
    });

    await expect(submitClientReport('error_report', { n: 3 })).resolves.toEqual({
      ok: true,
      id: 'error_report_id',
      collection: 'error_reports',
    });

    expect(mockHttpsCallable).toHaveBeenCalledTimes(1);
    expect(mockCallableInvoker).toHaveBeenCalledTimes(3);
    expect(mockInitFirebaseAppCheckIfAvailable).toHaveBeenCalledTimes(2);
  });
});
