jest.mock('react-native-purchases', () => ({ __esModule: true, default: {} }));

import {
  PREMIUM_LISTENER_MAX_RETRY_ATTEMPTS,
  getPremiumListenerLinkAction,
  premiumRetryDelayMs,
  runBoundedPremiumRetrySequence,
  shouldRetryUnresolvedPremiumOnNetworkSignal,
} from '../components/PremiumContext';

describe('PremiumContext retry policy', () => {
  it('recovers after two entitlement read failures with bounded exponential backoff', async () => {
    const attempt = jest.fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockRejectedValueOnce(new Error('runtime unavailable'))
      .mockResolvedValue(undefined);
    const wait = jest.fn(async () => true);

    await expect(runBoundedPremiumRetrySequence({
      attempt,
      shouldContinue: () => true,
      wait,
      maxAttempts: 4,
      baseDelayMs: 400,
      maxDelayMs: 3_200,
    })).resolves.toBe(true);

    expect(attempt).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[400], [800]]);
  });

  it('stops immediately when a retry wait is cancelled and never exceeds its attempt cap', async () => {
    const cancelledAttempt = jest.fn(async () => { throw new Error('offline'); });
    await expect(runBoundedPremiumRetrySequence({
      attempt: cancelledAttempt,
      shouldContinue: () => true,
      wait: async () => false,
      maxAttempts: 4,
      baseDelayMs: 400,
      maxDelayMs: 3_200,
    })).resolves.toBe(false);
    expect(cancelledAttempt).toHaveBeenCalledTimes(1);

    const cappedAttempt = jest.fn(async () => { throw new Error('offline'); });
    const waits: number[] = [];
    await expect(runBoundedPremiumRetrySequence({
      attempt: cappedAttempt,
      shouldContinue: () => true,
      wait: async (delayMs) => { waits.push(delayMs); return true; },
      maxAttempts: 4,
      baseDelayMs: 400,
      maxDelayMs: 3_200,
    })).resolves.toBe(false);
    expect(cappedAttempt).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([400, 800, 1_600]);
  });

  it('caps exponential delays without producing a hot retry loop', () => {
    expect([0, 1, 2, 3, 4].map((attempt) => premiumRetryDelayMs(attempt, 2_500, 20_000)))
      .toEqual([2_500, 5_000, 10_000, 20_000, 20_000]);
  });

  it('never retries a permanent stable-id mismatch and bounds transient retries', () => {
    expect(getPremiumListenerLinkAction({
      ok: false,
      stableUid: null,
      failure: 'stable_id_mismatch',
    }, 0)).toBe('stop');
    expect(getPremiumListenerLinkAction(null, 0)).toBe('retry');
    expect(getPremiumListenerLinkAction({
      ok: false,
      stableUid: null,
      failure: 'unavailable',
    }, PREMIUM_LISTENER_MAX_RETRY_ATTEMPTS)).toBe('stop');
    expect(getPremiumListenerLinkAction({
      ok: true,
      stableUid: 'stable-current',
    }, 0)).toBe('listen');
  });

  it('uses an online signal only for an unresolved active current account', () => {
    const activeUnresolved = {
      online: true,
      accessResolved: false,
      mounted: true,
      appActive: true,
      accountActive: true,
      transitioning: false,
      refreshPending: false,
    };
    expect(shouldRetryUnresolvedPremiumOnNetworkSignal(activeUnresolved)).toBe(true);
    expect(shouldRetryUnresolvedPremiumOnNetworkSignal({ ...activeUnresolved, online: false })).toBe(false);
    expect(shouldRetryUnresolvedPremiumOnNetworkSignal({ ...activeUnresolved, accessResolved: true })).toBe(false);
    expect(shouldRetryUnresolvedPremiumOnNetworkSignal({ ...activeUnresolved, appActive: false })).toBe(false);
    expect(shouldRetryUnresolvedPremiumOnNetworkSignal({ ...activeUnresolved, transitioning: true })).toBe(false);
  });
});
