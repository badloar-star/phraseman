import {
  createPaywallAnalyticsImpression,
  paywallImpressionParams,
} from '../app/paywall_analytics_impression';

describe('paywall analytics impression', () => {
  it('keeps one random identity and reports non-negative elapsed time', () => {
    const impression = createPaywallAnalyticsImpression(() => 'impression-1', () => 2000);
    expect(paywallImpressionParams(impression, () => 2600)).toEqual({
      paywall_impression_id: 'impression-1',
      time_since_impression_ms: 600,
    });
    expect(paywallImpressionParams(impression, () => 1500).time_since_impression_ms).toBe(0);
  });

  it('rejects an empty generated identity', () => {
    expect(() => createPaywallAnalyticsImpression(() => '', () => 2000)).toThrow('paywall_impression_id');
  });
});
