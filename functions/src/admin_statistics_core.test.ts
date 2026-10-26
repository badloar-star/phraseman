import {
  aggregateProductStatistics,
  PRODUCT_STATISTICS_COUNT_SPECS,
  type StatisticsCountSpec,
} from './admin_statistics_core';

function countMap(overrides: Readonly<Record<string, number | Error>> = {}) {
  const defaults = Object.fromEntries(PRODUCT_STATISTICS_COUNT_SPECS.map((spec) => [spec.key, 0]));
  return { ...defaults, ...overrides };
}

function dayScan(
  profiles: readonly Readonly<Record<string, unknown>>[] = [],
  overrides: Readonly<{ truncated?: boolean; documentReads?: number }> = {},
) {
  return async () => ({
    profiles,
    truncated: overrides.truncated ?? false,
    documentReads: overrides.documentReads ?? profiles.length,
  });
}

describe('product statistics aggregation', () => {
  test('reports only valid bucket populations and keeps missing profiles separate', async () => {
    const counts = countMap({
      total: 100,
      'rank:0': 4,
      'rank:1': 6,
      'proCard:true': 12,
      'proCard:false': 18,
    });

    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => counts[spec.key] as number,
      readDayProfiles: dayScan([
        { cardLongestStreak: 0, cardAppDays: 0 },
        { cardLongestStreak: 0, cardAppDays: 90 },
        { cardLongestStreak: 6, cardAppDays: 90 },
      ]),
    } as never);

    expect(result.totalProfiles).toBe(100);
    expect(result.state).toBe('ready');
    expect(result.metrics.find((metric) => metric.id === 'rank')).toMatchObject({
      knownProfiles: 10,
      missingProfiles: 90,
      status: 'available',
    });
    expect(result.metrics.find((metric) => metric.id === 'proCard')).toMatchObject({
      knownProfiles: 30,
      missingProfiles: 70,
      status: 'available',
    });
    expect(result.metrics.find((metric) => metric.id === 'longestStreak')).toMatchObject({
      knownProfiles: 3,
      missingProfiles: 97,
    });
    expect(result.metrics.find((metric) => metric.id === 'activeDays')).toMatchObject({
      knownProfiles: 3,
      missingProfiles: 97,
    });
    expect(JSON.stringify(result)).not.toMatch(/uid|displayName|email/i);
  });

  test('marks a metric error when one aggregate fails and never turns it into zero', async () => {
    const counts = countMap({ total: 20, 'rank:7': new Error('index unavailable') });
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => {
        const value = counts[spec.key];
        if (value instanceof Error) throw value;
        return value as number;
      },
      readDayProfiles: dayScan(),
    } as never);
    const metric = result.metrics.find((candidate) => candidate.id === 'rank');
    expect(result.state).toBe('partial');
    expect(metric).toMatchObject({ status: 'error', knownProfiles: null, missingProfiles: null });
    expect(metric?.buckets.find((bucket) => bucket.label === '7')?.count).toBeNull();
  });

  test('does not invent missing counts when the total query fails', async () => {
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => {
        if (spec.key === 'total') throw new Error('total unavailable');
        return spec.key === 'proCard:true' ? 3 : 0;
      },
      readDayProfiles: dayScan(),
    } as never);
    expect(result.totalProfiles).toBeNull();
    expect(result.state).toBe('partial');
    expect(result.metrics.every((metric) => metric.missingProfiles === null)).toBe(true);
  });

  test('uses at most four Firestore operations including the projected scan', async () => {
    let active = 0;
    let maximum = 0;
    const tracked = async <T>(value: T): Promise<T> => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active -= 1;
      return value;
    };
    await aggregateProductStatistics({
      nowMs: 1234,
      count: async (_spec: StatisticsCountSpec) => tracked(0),
      readDayProfiles: async () => tracked({ profiles: [], truncated: false, documentReads: 0 }),
    } as never);
    expect(maximum).toBeLessThanOrEqual(4);
  });

  test('returns exact observed day values through the real maximum without empty rows', async () => {
    const counts = countMap({ total: 8 });
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => counts[spec.key] as number,
      readDayProfiles: dayScan([
        { cardLongestStreak: 1000, cardAppDays: 2 },
        { cardLongestStreak: 1000, cardAppDays: 5 },
        { cardLongestStreak: 90, cardAppDays: 11 },
        { cardLongestStreak: 1, cardAppDays: 14 },
        { cardLongestStreak: 0, cardAppDays: 21 },
        { cardLongestStreak: 100_000, cardAppDays: 100_000 },
        { cardLongestStreak: 100_001, cardAppDays: 1.5 },
        {},
      ]),
    } as never);

    const streak = result.metrics.find((metric) => metric.id === 'longestStreak') as never as {
      maximumDays: number | null;
      dayCounts: readonly (readonly [number, number])[];
      buckets: readonly { label: string; count: number | null }[];
    };
    expect(streak.maximumDays).toBe(100_000);
    expect(streak.dayCounts).toEqual([
      [100_000, 1],
      [1000, 2],
      [90, 1],
      [1, 1],
      [0, 1],
    ]);
    expect(streak.dayCounts).not.toContainEqual([999, expect.any(Number)]);
    expect(streak.buckets.find((bucket) => bucket.label === '90+ дней')?.count).toBe(4);
    expect((result.metrics.find((metric) => metric.id === 'activeDays') as never as { dayCounts: readonly (readonly [number, number])[] }).dayCounts)
      .toEqual([[100_000, 1], [21, 1], [14, 1], [11, 1], [5, 1], [2, 1]]);
  });

  test('marks a capped projection partial and never calls its observed maximum global', async () => {
    const counts = countMap({ total: 20_000 });
    const profiles = Array.from({ length: 10_000 }, (_, index) => ({
      cardLongestStreak: index === 0 ? 1000 : 0,
      cardAppDays: 2,
    }));
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => counts[spec.key] as number,
      readDayProfiles: dayScan(profiles, { truncated: true, documentReads: 10_001 }),
    } as never);
    const metric = result.metrics.find((candidate) => candidate.id === 'longestStreak') as never as {
      status: string;
      maximumDays: number | null;
      missingProfiles: number | null;
    };
    expect(result.state).toBe('partial');
    expect(metric).toMatchObject({ status: 'partial', maximumDays: null, missingProfiles: null });
    expect(result).toMatchObject({
      coverage: { projectedProfilesScanned: 10_000, projectedProfilesCap: 10_000, projectedProfilesComplete: false },
      cost: { aggregationQueries: 23, projectedDocumentReads: 10_001, projectedDocumentReadCap: 10_001, ttlHours: 6 },
    });
  });

  test('marks both day metrics error when the bounded projection fails and never reports zero', async () => {
    const counts = countMap({ total: 20 });
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => counts[spec.key] as number,
      readDayProfiles: async () => { throw new Error('projection unavailable'); },
    } as never);
    expect(result.state).toBe('partial');
    for (const metricId of ['longestStreak', 'activeDays']) {
      expect(result.metrics.find((metric) => metric.id === metricId)).toMatchObject({
        status: 'error', knownProfiles: null, missingProfiles: null, maximumDays: null, dayCounts: [],
      });
    }
    expect(result).toMatchObject({
      coverage: { projectedProfilesScanned: null, projectedProfilesCap: 10_000, projectedProfilesComplete: false },
      cost: { projectedDocumentReads: null },
    });
  });

  test('marks a complete scan inconsistent with the total as transient partial data', async () => {
    const counts = countMap({ total: 1 });
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => counts[spec.key] as number,
      readDayProfiles: dayScan([
        { cardLongestStreak: 2, cardAppDays: 3 },
        { cardLongestStreak: 4, cardAppDays: 5 },
      ]),
    } as never);
    expect(result.state).toBe('partial');
    expect(result.coverage.projectedProfilesStatus).toBe('complete');
    expect(result.metrics.find((metric) => metric.id === 'longestStreak')).toMatchObject({
      status: 'partial', missingProfiles: null,
    });
    expect(result.unavailable).toContain('dayHistograms:total_inconsistent');
  });

  test('keeps the worst-case compact cached payload below the cache byte ceiling with exact decode parity', async () => {
    const profiles = Array.from({ length: 10_000 }, (_, value) => ({
      cardLongestStreak: value,
      cardAppDays: value + 10_000,
    }));
    const counts = countMap({ total: profiles.length });
    const result = await aggregateProductStatistics({
      nowMs: 1234,
      count: async (spec: StatisticsCountSpec) => counts[spec.key] as number,
      readDayProfiles: dayScan(profiles),
    } as never);
    const parsed = JSON.parse(JSON.stringify(result)) as typeof result;
    const streak = parsed.metrics.find((metric) => metric.id === 'longestStreak') as never as { dayCounts: readonly (readonly [number, number])[] };
    const active = parsed.metrics.find((metric) => metric.id === 'activeDays') as never as { dayCounts: readonly (readonly [number, number])[] };
    expect(streak.dayCounts).toHaveLength(10_000);
    expect(active.dayCounts).toHaveLength(10_000);
    expect(streak.dayCounts.reduce((sum, pair) => sum + pair[1], 0)).toBe(10_000);
    expect(active.dayCounts.reduce((sum, pair) => sum + pair[1], 0)).toBe(10_000);
    expect(Buffer.byteLength(JSON.stringify(result), 'utf8')).toBeLessThan(900_000);
  });

  test('uses profile-count units and day-category labels without exposing storage keys', async () => {
    const result = await aggregateProductStatistics({ nowMs: 1234, count: async () => 0, readDayProfiles: dayScan() } as never);
    expect(result.metrics.every((metric) => metric.unit === 'профилей')).toBe(true);
    expect((result.metrics.find((metric) => metric.id === 'activeDays') as never as { dayCounts: readonly unknown[] }).dayCounts).toEqual([]);
    expect(result.metrics.map((metric) => metric.description).join(' '))
      .not.toMatch(/coinRank|profileCardPro|cardLongestStreak|cardAppDays/);
  });
});
