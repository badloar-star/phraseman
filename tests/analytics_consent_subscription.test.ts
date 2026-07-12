import {
  getAnalyticsConsentState,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '../app/analytics_consent';

let mockNativeBarrier: Promise<void> | null = null;
const mockApplyAnalyticsCollectionConsent = jest.fn(async (_enabled?: boolean) => {
  if (mockNativeBarrier) await mockNativeBarrier;
});

jest.mock('../app/firebase', () => ({
  applyAnalyticsCollectionConsent: (enabled?: boolean) => mockApplyAnalyticsCollectionConsent(enabled),
}));

describe('analytics consent subscription', () => {
  it('notifies subscribers and stops after unsubscribe', async () => {
    const seen: string[] = [];
    const unsubscribe = subscribeAnalyticsConsent((state) => seen.push(state));

    await setAnalyticsConsent('granted');
    expect(getAnalyticsConsentState()).toBe('granted');
    expect(seen).toEqual(['granted']);

    unsubscribe();
    await setAnalyticsConsent('denied');
    expect(seen).toEqual(['granted']);
  });

  it('enables native collection before notifying runtime about a grant', async () => {
    await setAnalyticsConsent('denied');
    const order: string[] = [];
    let releaseNative: (() => void) | undefined;
    mockNativeBarrier = new Promise<void>((resolve) => { releaseNative = resolve; });
    mockApplyAnalyticsCollectionConsent.mockImplementationOnce(async () => {
      order.push('native_enable_started');
      await mockNativeBarrier;
      order.push('native_enable_finished');
    });
    const unsubscribe = subscribeAnalyticsConsent(() => order.push('runtime_notified'));

    const granting = setAnalyticsConsent('granted');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['native_enable_started']);
    releaseNative?.();
    await granting;

    expect(order).toEqual(['native_enable_started', 'native_enable_finished', 'runtime_notified']);
    unsubscribe();
    mockNativeBarrier = null;
  });
});
