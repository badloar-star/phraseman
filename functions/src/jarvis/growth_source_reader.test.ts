import { aggregateGrowthRows, buildGrowthEvidence, GROWTH_REPORT_COLLECTIONS } from './growth_source_reader';

describe('Jarvis growth source reader — counts new signups by platform, nothing else', () => {
  test('counts total and groups by platform', () => {
    const rows = [{ platform: 'ios' }, { platform: 'ios' }, { platform: 'android' }];
    const aggregate = aggregateGrowthRows(rows);
    expect(aggregate.totalCount).toBe(3);
    expect(aggregate.byPlatform).toEqual({ ios: 2, android: 1 });
  });

  test('missing platform is bucketed as unknown, never dropped', () => {
    const aggregate = aggregateGrowthRows([{ platform: null }]);
    expect(aggregate.byPlatform).toEqual({ unknown: 1 });
    expect(aggregate.totalCount).toBe(1);
  });

  test('empty input aggregates to all-zero, not an error', () => {
    expect(aggregateGrowthRows([])).toEqual({ totalCount: 0, byPlatform: {} });
  });

  test('digest never leaks any field beyond platform counts (no uid, no name)', () => {
    const evidence = buildGrowthEvidence({
      sourceId: 'users', state: 'ready', truncated: false, droppedCount: 0,
      rows: [{ platform: 'ios' }], count: 1, provenance: 'server_daily_aggregate',
      periodKey: '1970-01-01', observedAtMs: 1_000,
    });
    expect(evidence.digest).not.toMatch(/uid|name|email/i);
  });
});

describe('Jarvis growth source reader — honest evidence state', () => {
  test('truncated fetch refuses to assert a count', () => {
    const evidence = buildGrowthEvidence({
      sourceId: 'users', state: 'ready', truncated: true, droppedCount: 5,
      rows: [{ platform: 'ios' }], count: null, provenance: 'degraded_legacy_users_sample',
      periodKey: '1970-01-01', observedAtMs: 1_000,
    });
    expect(evidence.state).toBe('truncated');
    expect(evidence.count).toBeNull();
  });

  test('failed source is error, not zero', () => {
    const evidence = buildGrowthEvidence({
      sourceId: 'users', state: 'error', truncated: false, droppedCount: 0, rows: [],
      count: null, provenance: 'degraded_legacy_users_sample', periodKey: '1970-01-01', observedAtMs: 1_000,
    });
    expect(evidence.state).toBe('error');
    expect(evidence.count).toBeNull();
  });
});

test('growth reads only users — app_activity dropped per owner decision 2026-08-02 (no cheap retention signal)', () => {
  expect(GROWTH_REPORT_COLLECTIONS).toEqual(['users']);
});
