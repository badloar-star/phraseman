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
  adminGetRevenueCatOverviewMetrics,
  parseRevenueCatOverview,
} from './admin_revenuecat_overview';

describe('RevenueCat overview metrics', () => {
  const callable = adminGetRevenueCatOverviewMetrics as unknown as (request: {
    auth?: { uid: string; token: Record<string, unknown> } | null;
  }) => Promise<unknown>;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        metrics: [
          { id: 'active_trials', value: 5 },
          { id: 'active_subscriptions', value: 56 },
        ],
      }),
    })) as unknown as typeof fetch;
  });

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

  it('uses canonical legacy-owner role resolution and claimed money.read permissions', async () => {
    await expect(callable({ auth: { uid: 'legacy-owner', token: { admin: true } } })).resolves.toMatchObject({
      activeSubscriptions: 56,
      activeTrials: 5,
    });
    await expect(callable({ auth: { uid: 'analyst', token: { admin: true, adminRole: 'analyst' } } })).resolves.toMatchObject({
      activeSubscriptions: 56,
    });
    await expect(callable({ auth: { uid: 'support', token: { admin: true, adminRole: 'support' } } }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(callable({ auth: { uid: 'not-admin', token: { admin: false } } }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });
});
