class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({ name, value: () => 'test-secret' }),
}));

import {
  REVENUECAT_PROJECT_ID,
  parseRevenueCatOverview,
} from './admin_revenuecat_overview';

describe('RevenueCat overview metrics', () => {
  it('extracts the live active subscription and trial totals', () => {
    expect(parseRevenueCatOverview({
      metrics: [
        { id: 'active_trials', value: 5, unit: '#', period: 'P0D' },
        { id: 'active_subscriptions', value: 56, unit: '#', period: 'P0D' },
        { id: 'mrr', value: 187, unit: '$', period: 'P28D' },
        { id: 'revenue', value: 387, unit: '$', period: 'P28D' },
      ],
    })).toEqual({
      activeSubscriptions: 56,
      activeTrials: 5,
      mrr: { value: 187, currency: 'USD', period: 'P28D' },
      revenue: { value: 387, currency: 'USD', period: 'P28D' },
    });
    expect(REVENUECAT_PROJECT_ID).toBe('proj6af7e8d5');
  });

  it('rejects missing or invalid authoritative totals instead of inventing zeroes', () => {
    expect(() => parseRevenueCatOverview({ metrics: [{ id: 'active_trials', value: 5 }] }))
      .toThrow('RevenueCat active subscription metric is unavailable');
    expect(() => parseRevenueCatOverview({
      metrics: [
        { id: 'active_subscriptions', value: -1 },
        { id: 'active_trials', value: 5 },
      ],
    })).toThrow('RevenueCat active subscription metric is unavailable');
  });
});
