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

  it('keeps proactive native auto-refresh disabled across interactive epochs', async () => {
    const getToken = jest.fn(async () => ({ token: VALID_JWT }));
    const native = mockNative(getToken);
    const { initFirebaseAppCheckIfAvailable } = await import('../app/app_check_init');
    const {
      beginInteractiveNetworkQuiet,
      releaseInteractiveNetworkQuiet,
      waitForInteractiveNetworkQuiet,
    } = await import('../app/interactive_network_quiet');
    await expect(initFirebaseAppCheckIfAvailable()).resolves.toBe(true);
    expect(native.setTokenAutoRefreshEnabled).toHaveBeenLastCalledWith(false);
    expect(native.setTokenAutoRefreshEnabled).not.toHaveBeenCalledWith(true);

    const quiet = beginInteractiveNetworkQuiet();
    await waitForInteractiveNetworkQuiet(quiet);
    expect(native.setTokenAutoRefreshEnabled).toHaveBeenLastCalledWith(false);
    releaseInteractiveNetworkQuiet(quiet);
    await Promise.resolve();
    expect(native.setTokenAutoRefreshEnabled).toHaveBeenLastCalledWith(false);
    expect(native.setTokenAutoRefreshEnabled).not.toHaveBeenCalledWith(true);
  });

  it('does not start App Check initialization or token mint while quiet', async () => {
    const getToken = jest.fn(async () => ({ token: VALID_JWT }));
    const native = mockNative(getToken);
    const { initFirebaseAppCheckIfAvailable } = await import('../app/app_check_init');
    const {
      beginInteractiveNetworkQuiet,
      releaseInteractiveNetworkQuiet,
      waitForInteractiveNetworkQuiet,
    } = await import('../app/interactive_network_quiet');

    const quiet = beginInteractiveNetworkQuiet();
    await waitForInteractiveNetworkQuiet(quiet);
    await expect(initFirebaseAppCheckIfAvailable()).resolves.toBe(false);
    expect(native.initializeAppCheck).not.toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();

    releaseInteractiveNetworkQuiet(quiet);
    await Promise.resolve();
    await expect(initFirebaseAppCheckIfAvailable({ forceRetry: true })).resolves.toBe(true);
    expect(native.initializeAppCheck).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('keeps quiet pending until an admitted raw native token request actually settles', async () => {
    jest.useFakeTimers();
    let resolveToken!: (value: { token: string }) => void;
    const getToken = jest.fn(() => new Promise<{ token: string }>((resolve) => {
      resolveToken = resolve;
    }));
    mockNative(getToken);
    const { initFirebaseAppCheckIfAvailable } = await import('../app/app_check_init');
    const {
      beginInteractiveNetworkQuiet,
      interactiveNetworkQuietSnapshot,
      waitForInteractiveNetworkQuiet,
    } = await import('../app/interactive_network_quiet');

    const initialization = initFirebaseAppCheckIfAvailable();
    await Promise.resolve();
    await Promise.resolve();
    expect(getToken).toHaveBeenCalledTimes(1);
    const quiet = beginInteractiveNetworkQuiet();
    let ready = false;
    const waiting = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });

    await jest.advanceTimersByTimeAsync(10_000);
    expect(ready).toBe(false);
    expect(interactiveNetworkQuietSnapshot()).toMatchObject({
      phase: 'quiescing', activeNetworkLeases: 1,
    });

    resolveToken({ token: VALID_JWT });
    await expect(initialization).resolves.toBe(false);
    await waiting;
    expect(ready).toBe(true);
    jest.useRealTimers();
  });
});
