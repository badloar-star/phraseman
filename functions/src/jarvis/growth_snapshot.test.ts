import { buildGrowthSnapshot } from './growth_snapshot';
import type { Evidence } from './decision';
import type { FetchGrowthSourceResult } from './growth_firestore_fetcher';

function fetchResult(overrides: Partial<FetchGrowthSourceResult> = {}): FetchGrowthSourceResult {
  return {
    sourceId: 'users',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    count: 1,
    provenance: 'server_daily_aggregate',
    periodKey: '1970-01-01',
    observedAtMs: 10_000,
    ...overrides,
  };
}

describe('Jarvis growth snapshot — the one seam scheduler and panel share', () => {
  test('fetches users and hands it to the department unchanged', async () => {
    const fetchers = { users: jest.fn(async () => fetchResult({ rows: [{ platform: 'ios' }] })) };
    const snapshot = await buildGrowthSnapshot({ fetchers, trigger: 'scheduled', nowMs: 20_000 });
    expect(fetchers.users).toHaveBeenCalledTimes(1);
    expect(snapshot.generatedAtMs).toBe(20_000);
    expect(snapshot.decisions).toEqual([]);
  });

  test('a throwing fetch degrades to error evidence without aborting the snapshot', async () => {
    const fetchers = { users: jest.fn(async () => { throw new Error('unavailable'); }) };
    const snapshot = await buildGrowthSnapshot({ fetchers, trigger: 'owner_request', question: 'Как рост?', nowMs: 20_000 });
    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.decisions[0].evidence.find((e: Evidence) => e.sourceId === 'users')?.state).toBe('error');
    expect(snapshot.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request is forwarded with the given question', async () => {
    const fetchers = { users: jest.fn(async () => fetchResult({ rows: [{ platform: 'ios' }] })) };
    const snapshot = await buildGrowthSnapshot({ fetchers, trigger: 'owner_request', question: 'Сколько новых?', nowMs: 20_000 });
    expect(snapshot.decisions[0].question).toBe('Сколько новых?');
  });
});
