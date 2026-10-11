// зачем (координатор 00:56, [RC-IDENTITY] sync:slow 53 467 мс): расчёт доступа Plus не ждёт синхронизацию RevenueCat
// дольше потолка; поздний итог отдаётся один раз, чтобы пересчитать доступ.
import { PREMIUM_IDENTITY_WAIT_MS, waitForIdentitySyncBounded } from '../app/premium_identity_wait';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

describe('waitForIdentitySyncBounded', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the sync result when it arrives before the cap and never calls onLate', async () => {
    const sync = deferred<boolean>();
    const onLate = jest.fn();
    const waiting = waitForIdentitySyncBounded(sync.promise, onLate, 3_000);
    sync.resolve(true);
    await expect(waiting).resolves.toEqual({ ready: true, timedOut: false });
    jest.advanceTimersByTime(5_000);
    await Promise.resolve();
    expect(onLate).not.toHaveBeenCalled();
  });

  it('stops waiting at the cap, then reports a late success exactly once', async () => {
    const sync = deferred<boolean>();
    const onLate = jest.fn();
    const waiting = waitForIdentitySyncBounded(sync.promise, onLate, 3_000);
    jest.advanceTimersByTime(3_000);
    await expect(waiting).resolves.toEqual({ ready: false, timedOut: true });
    sync.resolve(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(onLate).toHaveBeenCalledTimes(1);
    expect(onLate).toHaveBeenCalledWith(true);
  });

  it('reports a late failure as false', async () => {
    const sync = deferred<boolean>();
    const onLate = jest.fn();
    const waiting = waitForIdentitySyncBounded(sync.promise, onLate, 3_000);
    jest.advanceTimersByTime(3_000);
    await waiting;
    sync.resolve(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(onLate).toHaveBeenCalledWith(false);
  });

  it('treats a rejected sync as a failure, not a hang', async () => {
    const sync = deferred<boolean>();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const waiting = waitForIdentitySyncBounded(sync.promise, jest.fn(), 3_000);
    sync.reject(new Error('billing_unavailable'));
    await expect(waiting).resolves.toEqual({ ready: false, timedOut: false });
    expect(warn).toHaveBeenCalledWith('[RC-IDENTITY] premium_reload:sync_rejected', 'billing_unavailable');
    warn.mockRestore();
  });

  it('a throwing onLate is logged, not an unhandled rejection', async () => {
    const sync = deferred<boolean>();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const waiting = waitForIdentitySyncBounded(sync.promise, () => { throw new Error('reload_gone'); }, 3_000);
    jest.advanceTimersByTime(3_000);
    await waiting;
    sync.resolve(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith('[RC-IDENTITY] premium_reload:on_late_failed', 'reload_gone');
    warn.mockRestore();
  });

  it('caps the default wait at a few seconds, far below the observed minute-long sync', () => {
    expect(PREMIUM_IDENTITY_WAIT_MS).toBeLessThanOrEqual(5_000);
  });
});
