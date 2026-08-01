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

  it('bounds an entitlement drain when native RevenueCat work never settles', async () => {
    jest.useFakeTimers();
    try {
      const guard = await import('../app/premium_guard');
      const epoch = guard.getPremiumAccountTransitionEpoch();
      void guard.runPremiumAccountScopedWork(epoch, async () => new Promise<void>(() => {}));
      await Promise.resolve();

      guard.beginPremiumAccountTransition();
      const drained = guard.waitForPremiumAccountWorkIdleWithDeadline(1_500);
      expect(guard.__getPremiumAccountWorkIdleWaiterCountForTests()).toBe(1);
      await jest.advanceTimersByTimeAsync(1_499);
      let settled = false;
      void drained.then(() => { settled = true; });
      await Promise.resolve();
      expect(settled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(drained).resolves.toBe(false);
      expect(guard.__getPremiumAccountWorkIdleWaiterCountForTests()).toBe(0);

      // The poisoned work belongs to the retired epoch. It must not charge every
      // later transition another full timeout when the immediately-prior epoch is idle.
      guard.beginPremiumAccountTransition();
      await expect(guard.waitForPremiumAccountWorkIdleWithDeadline(1_500)).resolves.toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns true immediately when idle and clears the deadline when active work settles', async () => {
    jest.useFakeTimers();
    try {
      const guard = await import('../app/premium_guard');
      await expect(guard.waitForPremiumAccountWorkIdleWithDeadline(1_500)).resolves.toBe(true);

      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const epoch = guard.getPremiumAccountTransitionEpoch();
      const work = guard.runPremiumAccountScopedWork(epoch, async () => gate);
      const drained = guard.waitForPremiumAccountWorkIdleWithDeadline(1_500);
      expect(jest.getTimerCount()).toBe(1);
      release();
      await work;
      await expect(drained).resolves.toBe(true);
      expect(jest.getTimerCount()).toBe(0);
      expect(guard.__getPremiumAccountWorkIdleWaiterCountForTests()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('settles the drain after rejected scoped work and ignores a late stale callback after timeout', async () => {
    jest.useFakeTimers();
    try {
      const guard = await import('../app/premium_guard');
      let rejectWork!: (error: Error) => void;
      const rejectedGate = new Promise<void>((_resolve, reject) => { rejectWork = reject; });
      const epoch = guard.getPremiumAccountTransitionEpoch();
      const rejectedWork = guard.runPremiumAccountScopedWork(epoch, async () => rejectedGate);
      const rejectedExpectation = expect(rejectedWork).rejects.toThrow('native failure');
      const rejectedDrain = guard.waitForPremiumAccountWorkIdleWithDeadline(1_500);
      rejectWork(new Error('native failure'));
      await rejectedExpectation;
      await expect(rejectedDrain).resolves.toBe(true);

      const staleCommit = jest.fn();
      let releaseLate!: () => void;
      const lateGate = new Promise<void>((resolve) => { releaseLate = resolve; });
      const lateEpoch = guard.getPremiumAccountTransitionEpoch();
      const lateWork = guard.runPremiumAccountScopedWork(lateEpoch, async (isCurrent) => {
        await lateGate;
        if (isCurrent()) staleCommit();
      });
      guard.beginPremiumAccountTransition();
      const lateDrain = guard.waitForPremiumAccountWorkIdleWithDeadline(1_500);
      await jest.advanceTimersByTimeAsync(1_500);
      await expect(lateDrain).resolves.toBe(false);
      expect(guard.__getPremiumAccountWorkIdleWaiterCountForTests()).toBe(0);
      releaseLate();
      await lateWork;
      expect(staleCommit).not.toHaveBeenCalled();
      expect(guard.__getPremiumAccountWorkIdleWaiterCountForTests()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('times out lock acquisition without starting queued work or breaking exclusion', async () => {
    jest.useFakeTimers();
    try {
      const generation = await import('../app/account_generation');
      const never = new Promise<void>(() => {});
      void generation.withAccountTransitionLock(async () => never);
      await Promise.resolve();
      const queued = jest.fn(async () => 'queued-A');
      const timed = generation.withAccountTransitionLockWithDeadline(queued, 1_500);
      await jest.advanceTimersByTimeAsync(1_500);
      await expect(timed).resolves.toEqual({ completed: false });
      expect(queued).not.toHaveBeenCalled();

      const after = jest.fn(async () => 'account-B');
      const blocked = generation.withAccountTransitionLockWithDeadline(after, 1_500);
      await jest.advanceTimersByTimeAsync(1_500);
      await expect(blocked).resolves.toEqual({ completed: false });
      expect(after).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
