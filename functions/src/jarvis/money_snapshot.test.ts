import { buildMoneySnapshot } from './money_snapshot';
import type { Evidence } from './decision';
import type { FetchMoneySourceResult } from './money_firestore_fetcher';

function fetchResult(overrides: Partial<FetchMoneySourceResult> = {}): FetchMoneySourceResult {
  return {
    sourceId: 'revenuecat_premium_events',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: 10_000,
    ...overrides,
  };
}

describe('Jarvis money snapshot — the one seam scheduler and panel share', () => {
  test('fetches both collections and hands them to the department unchanged', async () => {
    const fetchers = {
      revenuecat_premium_events: jest.fn(async () => fetchResult()),
      paywall_funnel: jest.fn(async () => fetchResult({ sourceId: 'paywall_funnel' })),
    };
    const snapshot = await buildMoneySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000 });
    expect(fetchers.revenuecat_premium_events).toHaveBeenCalledTimes(1);
    expect(fetchers.paywall_funnel).toHaveBeenCalledTimes(1);
    expect(snapshot.generatedAtMs).toBe(20_000);
    expect(snapshot.decisions).toEqual([]);
  });

  test('one collection throwing degrades to error evidence without aborting the snapshot', async () => {
    const fetchers = {
      revenuecat_premium_events: jest.fn(async () => { throw new Error('unavailable'); }),
      paywall_funnel: jest.fn(async () => fetchResult({ sourceId: 'paywall_funnel' })),
    };
    const snapshot = await buildMoneySnapshot({ fetchers, trigger: 'owner_request', question: 'Как деньги?', nowMs: 20_000 });
    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0].evidence.find((e: Evidence) => e.sourceId === 'revenuecat_premium_events')?.state).toBe('error');
  });

  test('all collections throwing yields insufficient_evidence even on schedule', async () => {
    const fetchers = {
      revenuecat_premium_events: jest.fn(async () => { throw new Error('down'); }),
      paywall_funnel: jest.fn(async () => { throw new Error('down'); }),
    };
    const snapshot = await buildMoneySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000 });
    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0].status).toBe('insufficient_evidence');
  });

  test.each([
    ['revenuecat_premium_events', 'paywall_funnel'],
    ['paywall_funnel', 'revenuecat_premium_events'],
  ] as const)(
    'scheduled snapshot preserves %s error plus %s empty as insufficient_evidence',
    async (failedSource, emptySource) => {
      const fetchers = {
        revenuecat_premium_events: jest.fn(async () => fetchResult({
          sourceId: 'revenuecat_premium_events',
          state: failedSource === 'revenuecat_premium_events' ? 'error' : 'empty',
        })),
        paywall_funnel: jest.fn(async () => fetchResult({
          sourceId: 'paywall_funnel',
          state: failedSource === 'paywall_funnel' ? 'error' : 'empty',
        })),
      };

      const snapshot = await buildMoneySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000 });
      expect(snapshot.decisions).toHaveLength(1);
      expect(snapshot.decisions[0]).toMatchObject({ department: 'money', status: 'insufficient_evidence' });
      expect(snapshot.decisions[0].evidence.find((item) => item.sourceId === emptySource)?.state).toBe('empty');
    },
  );

  test('owner_request is forwarded with the given question', async () => {
    const fetchers = {
      revenuecat_premium_events: jest.fn(async () => fetchResult()),
      paywall_funnel: jest.fn(async () => fetchResult({ sourceId: 'paywall_funnel' })),
    };
    const snapshot = await buildMoneySnapshot({ fetchers, trigger: 'owner_request', question: 'Растут ли возвраты?', nowMs: 20_000 });
    expect(snapshot.decisions[0].question).toBe('Растут ли возвраты?');
  });

  test('appTier is forwarded to the department — passing mature raises a decision that seed would silence', async () => {
    const newPayingRows = Array.from({ length: 20 }, () => ({ eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL' }));
    const refundRows = Array.from({ length: 7 }, () => ({ eventType: 'REFUND', periodType: null }));
    const fetchers = {
      revenuecat_premium_events: jest.fn(async () => fetchResult({ rows: [...newPayingRows, ...refundRows] })),
      paywall_funnel: jest.fn(async () => fetchResult({ sourceId: 'paywall_funnel' })),
    };
    const seedSnapshot = await buildMoneySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000, appTier: 'seed' });
    const matureSnapshot = await buildMoneySnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000, appTier: 'mature' });
    expect(seedSnapshot.decisions).toEqual([]);
    expect(matureSnapshot.decisions).toHaveLength(1);
  });
});
