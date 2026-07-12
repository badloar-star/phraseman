import { aggregatePaywallFunnel, parsePaywallAbPublishRequest } from './admin_paywall_ab';

describe('admin paywall A/B contracts', () => {
  test('aggregates production events by variant and excludes dev rows by default', () => {
    const result = aggregatePaywallFunnel([
      { variant: 'A', step: 'shown', context: 'generic', uidh: 'u1' },
      { variant: 'A', step: 'purchase_completed', context: 'generic', plan: 'yearly', uidh: 'u1' },
      { variant: 'B', step: 'shown', context: 'onboarding', dev: true, uidh: 'dev' },
    ], false);

    expect(result.totalEvents).toBe(2);
    expect(result.excludedDevEvents).toBe(1);
    expect(result.variants.A).toMatchObject({ shown: 1, purchaseCompleted: 1, uniqueShown: 1 });
    expect(result.contexts.generic).toMatchObject({ shown: 1, purchaseCompleted: 1 });
    expect(result.plans.yearly).toBe(1);
  });

  test('rejects traffic allocations above one hundred percent', () => {
    expect(() => parsePaywallAbPublishRequest({
      config: { aPct: 50, bPct: 40, cPct: 20, salt: 'v3', ratingX10: 50, ratingsCount: 10 },
      expectedRevision: 0,
      idempotencyKey: 'paywall-test',
      reason: 'contract test',
      requestId: 'request-test',
    })).toThrow('traffic allocation must not exceed 100');
  });
});
