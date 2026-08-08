import {
  buildHistoryPointsFromPage,
  earliestDayKeyOfPage,
  parseRevenueEventRow,
  parseUserCreatedAt,
} from './business_tier_backfill';

describe('buildHistoryPointsFromPage — one page of raw rows -> sorted history points with running cumulative', () => {
  test('builds ascending-day points and carries cumulative users across days', () => {
    const day1 = Date.parse('2026-08-01T01:00:00.000Z');
    const day2 = Date.parse('2026-08-02T01:00:00.000Z');
    const result = buildHistoryPointsFromPage({
      userRows: [{ createdAtMs: day1 }, { createdAtMs: day1 }, { createdAtMs: day2 }],
      revenueRows: [{ atMs: day1, eventType: 'NON_RENEWING_PURCHASE', periodType: null }],
      cumulativeUsersBeforePage: 100,
    });
    expect(result.points.map((p) => p.dayKey)).toEqual(['2026-08-01', '2026-08-02']);
    expect(result.points[0]).toMatchObject({ cumulativeUsers: 102, newUsers: 2, newPaying: 1 });
    expect(result.points[1]).toMatchObject({ cumulativeUsers: 103, newUsers: 1 });
    expect(result.cumulativeUsersAfterPage).toBe(103);
  });

  test('an empty page produces no points and preserves the incoming cumulative', () => {
    const result = buildHistoryPointsFromPage({ userRows: [], revenueRows: [], cumulativeUsersBeforePage: 42 });
    expect(result.points).toEqual([]);
    expect(result.cumulativeUsersAfterPage).toBe(42);
  });

  test('revenue-only days (no new users that day) still produce a point with newUsers=0', () => {
    const day1 = Date.parse('2026-08-01T01:00:00.000Z');
    const result = buildHistoryPointsFromPage({
      userRows: [],
      revenueRows: [{ atMs: day1, eventType: 'RENEWAL', periodType: null }],
      cumulativeUsersBeforePage: 10,
    });
    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toMatchObject({ newUsers: 0, renewals: 1, cumulativeUsers: 10 });
  });

  test('rows with unparseable timestamps are dropped, not bucketed as a fake day', () => {
    const result = buildHistoryPointsFromPage({
      userRows: [{ createdAtMs: null }],
      revenueRows: [{ atMs: null, eventType: 'RENEWAL', periodType: null }],
      cumulativeUsersBeforePage: 5,
    });
    expect(result.points).toEqual([]);
    expect(result.cumulativeUsersAfterPage).toBe(5);
  });

  test('revenueProxy is computed per day as newPaying + renewals - refunds', () => {
    const day1 = Date.parse('2026-08-01T01:00:00.000Z');
    const result = buildHistoryPointsFromPage({
      userRows: [],
      revenueRows: [
        { atMs: day1, eventType: 'NON_RENEWING_PURCHASE', periodType: null },
        { atMs: day1, eventType: 'RENEWAL', periodType: null },
        { atMs: day1, eventType: 'REFUND', periodType: null },
      ],
      cumulativeUsersBeforePage: 0,
    });
    expect(result.points[0].revenueProxy).toBe(1); // 1 + 1 - 1
  });
});

describe('parseUserCreatedAt / parseRevenueEventRow — thin adapters over mixed-type timestamps', () => {
  test('parseUserCreatedAt extracts a millisecond timestamp from any supported shape', () => {
    expect(parseUserCreatedAt(1_700_000_000_000)).toEqual({ createdAtMs: 1_700_000_000_000 });
    expect(parseUserCreatedAt('garbage')).toEqual({ createdAtMs: null });
  });

  test('parseRevenueEventRow keeps eventType/periodType passthrough and parses createdAt', () => {
    const row = parseRevenueEventRow({ createdAt: 1_700_000_000_000, eventType: 'RENEWAL', periodType: 'NORMAL' });
    expect(row).toEqual({
      atMs: 1_700_000_000_000,
      eventType: 'RENEWAL',
      periodType: 'NORMAL',
      // Старое событие без финансовых полей — честный null, не подставной ноль.
      grossUsdMicros: null,
      estimatedProceedsUsdMicros: null,
      financialCoverage: null,
      billingCadence: null,
    });
  });

  test('parseRevenueEventRow reads the pre-normalized money fields written by the webhook', () => {
    const row = parseRevenueEventRow({
      createdAt: 1_700_000_000_000,
      eventType: 'RENEWAL',
      periodType: 'NORMAL',
      grossUsdMicros: 4_990_000,
      estimatedProceedsUsdMicros: 3_493_000,
      financialCoverage: 'complete',
      billingCadence: 'monthly',
    });
    expect(row.grossUsdMicros).toBe(4_990_000);
    expect(row.estimatedProceedsUsdMicros).toBe(3_493_000);
    expect(row.financialCoverage).toBe('complete');
    expect(row.billingCadence).toBe('monthly');
  });

  test.each([
    ['garbage coverage', { financialCoverage: 'weird' }, 'financialCoverage'],
    ['garbage cadence', { billingCadence: 'biweekly' }, 'billingCadence'],
    ['non-numeric money', { grossUsdMicros: '4990000' }, 'grossUsdMicros'],
  ])('%s collapses to null rather than being trusted', (_name, patch, field) => {
    const row = parseRevenueEventRow({ createdAt: 1, eventType: 'RENEWAL', periodType: null, ...patch });
    expect((row as unknown as Record<string, unknown>)[field]).toBeNull();
  });
});

describe('earliestDayKeyOfPage — reports how far back a page reaches, for honest progress reporting', () => {
  test('returns the earliest UTC day among valid timestamps', () => {
    const early = Date.parse('2026-01-01T00:00:00.000Z');
    const late = Date.parse('2026-06-01T00:00:00.000Z');
    expect(earliestDayKeyOfPage([{ createdAtMs: late }, { createdAtMs: early }])).toBe('2026-01-01');
  });

  test('returns null when no row has a valid timestamp', () => {
    expect(earliestDayKeyOfPage([{ createdAtMs: null }])).toBeNull();
  });

  test('returns null for an empty page', () => {
    expect(earliestDayKeyOfPage([])).toBeNull();
  });
});
