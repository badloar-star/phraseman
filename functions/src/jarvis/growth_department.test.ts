import { runGrowthDepartment } from './growth_department';
import type { FetchGrowthSourceResult } from './growth_firestore_fetcher';

function fetchResult(overrides: Partial<FetchGrowthSourceResult> = {}): FetchGrowthSourceResult {
  return {
    sourceId: 'users',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
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

  test('a truncated fetch does not silently claim a full count', () => {
    const result = runGrowthDepartment({
      fetches: [fetchResult({ truncated: true, droppedCount: 50, rows: [{ platform: 'ios' }] })],
      trigger: 'owner_request',
      nowMs: 10_000,
    });
    expect(result.decisions[0].confidence).toBeLessThan(1);
  });
});
