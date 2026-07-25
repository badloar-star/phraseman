describe('premium account transition signal', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('invalidates entitlement caches and synchronously notifies active subscribers', async () => {
    const guard = await import('../app/premium_guard');
    const storage = (await import('@react-native-async-storage/async-storage')).default as any;
    jest.clearAllMocks();
    const listener = jest.fn();
    const subscription = guard.onPremiumAccountTransition(listener);

    const epoch = guard.beginPremiumAccountTransition();

    expect(epoch).toBeGreaterThan(0);
    expect(listener).toHaveBeenCalledWith(epoch);
    expect(storage.setItem).not.toHaveBeenCalledWith('premium_active', 'false');
    expect(storage.multiSet).not.toHaveBeenCalled();
    subscription.remove();
    guard.beginPremiumAccountTransition();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('drops an in-flight account-scoped VIP callback before it can commit after transition', async () => {
    const guard = await import('../app/premium_guard');
    const callbackCommit = jest.fn();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const epoch = guard.getPremiumAccountTransitionEpoch();

    const callback = guard.runPremiumAccountScopedWork(epoch, async (isCurrent) => {
      await gate;
      if (!isCurrent()) return;
      callbackCommit();
    });
    guard.beginPremiumAccountTransition();
    const drained = guard.waitForPremiumAccountWorkIdle();
    release();
    await Promise.all([callback, drained]);

    expect(callbackCommit).not.toHaveBeenCalled();
  });

  it('drains an already-issued A storage write before wipe and permits B only afterwards', async () => {
    const guard = await import('../app/premium_guard');
    const order: string[] = [];
    const staleUi = jest.fn();
    const staleEvent = jest.fn();
    const staleProfile = jest.fn();
    let releaseStorage!: () => void;
    let markStorageStarted!: () => void;
    const storageStarted = new Promise<void>((resolve) => { markStorageStarted = resolve; });
    const storagePending = new Promise<void>((resolve) => { releaseStorage = resolve; });
    const epochA = guard.getPremiumAccountTransitionEpoch();

    const accountA = guard.runPremiumAccountScopedWork(epochA, async (isCurrent) => {
      if (!isCurrent()) return;
      order.push('A-write-start');
      markStorageStarted();
      await storagePending;
      order.push('A-write-settle');
      if (!isCurrent()) return;
      staleUi();
      staleEvent();
      staleProfile();
    });
    await storageStarted;

    guard.beginPremiumAccountTransition();
    const wipe = guard.waitForPremiumAccountWorkIdle().then(() => { order.push('wipe'); });
    await Promise.resolve();
    expect(order).toEqual(['A-write-start']);

    releaseStorage();
    await Promise.all([accountA, wipe]);
    const epochB = guard.getPremiumAccountTransitionEpoch();
    await guard.runPremiumAccountScopedWork(epochB, async () => { order.push('B-write'); });

    expect(order).toEqual(['A-write-start', 'A-write-settle', 'wipe', 'B-write']);
    expect(staleUi).not.toHaveBeenCalled();
    expect(staleEvent).not.toHaveBeenCalled();
    expect(staleProfile).not.toHaveBeenCalled();
  });
});
