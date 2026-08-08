const VALID_JWT = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;

describe('App Check initialization cost guard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function mockNative(getToken: jest.Mock) {
    const initializeAppCheck = jest.fn(async () => undefined);
    const setTokenAutoRefreshEnabled = jest.fn();
    const configure = jest.fn();
    const appCheckInstance = {
      getToken,
      initializeAppCheck,
      setTokenAutoRefreshEnabled,
      newReactNativeFirebaseAppCheckProvider: () => ({ configure }),
    };
    jest.doMock('../app/config', () => ({
      APP_CHECK_REAL_ATTESTATION_ENABLED: true,
      CLOUD_SYNC_ENABLED: true,
      IS_EXPO_GO: false,
    }));
    jest.doMock('@react-native-firebase/app-check', () => ({
      __esModule: true,
      default: () => appCheckInstance,
    }));
    return { initializeAppCheck, setTokenAutoRefreshEnabled };
  }

  it('cools down failed mint attempts and can recover on a forced retry', async () => {
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const getToken = jest.fn(async () => ({ token: 'invalid' }));
    mockNative(getToken);
    const { initFirebaseAppCheckIfAvailable } = await import('../app/app_check_init');

    await expect(initFirebaseAppCheckIfAvailable()).resolves.toBe(false);
    await expect(initFirebaseAppCheckIfAvailable()).resolves.toBe(false);
    expect(getToken).toHaveBeenCalledTimes(2);

    getToken.mockResolvedValue({ token: VALID_JWT });
    await expect(initFirebaseAppCheckIfAvailable({ forceRetry: true })).resolves.toBe(true);
    await expect(initFirebaseAppCheckIfAvailable()).resolves.toBe(true);
    expect(getToken).toHaveBeenCalledTimes(3);

    now += 10 * 60 * 1000;
  });

  it('shares one in-flight initialization attempt', async () => {
    let resolveToken: (value: { token: string }) => void = () => {};
    const getToken = jest.fn(() => new Promise<{ token: string }>((resolve) => { resolveToken = resolve; }));
    const native = mockNative(getToken);
    const { initFirebaseAppCheckIfAvailable } = await import('../app/app_check_init');

    const first = initFirebaseAppCheckIfAvailable();
    const second = initFirebaseAppCheckIfAvailable();
    await Promise.resolve();
    await Promise.resolve();
    resolveToken({ token: VALID_JWT });

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(native.initializeAppCheck).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
