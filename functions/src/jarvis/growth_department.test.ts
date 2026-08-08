import { runGrowthDepartment } from './growth_department';
import type { FetchGrowthSourceResult } from './growth_firestore_fetcher';

function fetchResult(overrides: Partial<FetchGrowthSourceResult> = {}): FetchGrowthSourceResult {
  const rows = overrides.rows ?? [];
  return {
    sourceId: 'users',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows,
    count: Object.prototype.hasOwnProperty.call(overrides, 'count') ? overrides.count! : rows.length,
    provenance: 'server_daily_aggregate',
    periodKey: '2026-08-08',
    observedAtMs: 10_000,
    ...overrides,
  };
}

describe('Jarvis growth department — no fabricated trend without a baseline', () => {
  test('no decision on a scheduled run with a healthy signup count', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({ rows: [{ platform: 'ios' }, { platform: 'android' }] })],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toEqual([]);
  });

  test('raises a decision when zero new signups appear over the window — itself a signal', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({ rows: [] })],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    const [decision] = result.decisions;
    expect(decision.department).toBe('growth');
    expect(decision.status).toBe('awaiting_owner');
    expect(decision.finding).toMatch(/0|ноль|нет новых/i);
    expect(decision.options.length).toBeGreaterThanOrEqual(2);
    expect(decision.options.length).toBeLessThanOrEqual(3);
  });

  test('a zero-signup empty state and a failed fetch are told apart in the finding', () => {
    const emptyResult = runGrowthDepartment({ fetches: [fetchResult({ state: 'empty', rows: [] })], trigger: 'scheduled', nowMs: 10_000 });
    const errorResult = runGrowthDepartment({ fetches: [fetchResult({ state: 'error', rows: [] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(emptyResult.decisions[0].status).toBe('awaiting_owner');
    expect(errorResult.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request always answers, healthy or not', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({ rows: [{ platform: 'ios' }] })],
      trigger: 'owner_request',
      question: 'Сколько новых пользователей за сутки?',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].question).toBe('Сколько новых пользователей за сутки?');
    expect(result.decisions[0].finding).toMatch(/1/);
  });

  test('uses the server aggregate count without materializing one row per signup', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({
        rows: [],
        count: 4,
        provenance: 'server_daily_aggregate',
        periodKey: '2026-08-08',
      })],
      trigger: 'owner_request',
      nowMs: 10_000,
    });

    expect(result.decisions[0].finding).toMatch(/4/);
    expect(result.decisions[0].status).toBe('awaiting_owner');
  });

  test('does not turn a bounded legacy sample into an exact signup count', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({
        state: 'truncated',
        truncated: true,
        rows: [{ platform: 'ios' }],
        count: null,
        provenance: 'degraded_legacy_users_sample',
        periodKey: '2026-08-08',
      })],
      trigger: 'owner_request',
      nowMs: 10_000,
    });

    expect(result.decisions[0].status).toBe('insufficient_evidence');
    expect(result.decisions[0].finding).not.toMatch(/1 new|1 нов/i);
  });

  test('a truncated fetch does not silently claim a full count', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({ truncated: true, droppedCount: 50, rows: [{ platform: 'ios' }] })],
      trigger: 'owner_request',
      nowMs: 10_000,
    });
    expect(result.decisions[0].confidence).toBeLessThan(1);
  });
});
