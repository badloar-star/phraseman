import { runMoneyDepartment } from './money_department';
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

const REFUND_ROWS = Array.from({ length: 8 }, () => ({ eventType: 'REFUND', periodType: null }));
const NEW_PAYING_ROWS = Array.from({ length: 20 }, () => ({ eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL' }));

describe('Jarvis money department — a decision only when the signal is real', () => {
  test('no decision on an ordinary day with no refund spike', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: NEW_PAYING_ROWS }),
        fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toEqual([]);
  });

  test('raises a decision when refunds exceed the spike threshold relative to new paying', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: [...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS] }),
        fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    const [decision] = result.decisions;
    expect(decision.department).toBe('money');
    expect(decision.status).toBe('awaiting_owner');
    expect(decision.finding).toMatch(/возврат/i);
    expect(decision.options.length).toBeGreaterThanOrEqual(2);
    expect(decision.options.length).toBeLessThanOrEqual(3);
  });

  test('a failed source does not block the decision but lowers confidence', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: [...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS] }),
        fetchResult({ sourceId: 'paywall_funnel', state: 'error' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].confidence).toBeLessThan(1);
  });

  test('every source failing yields insufficient_evidence, not silence', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ state: 'error' }),
        fetchResult({ sourceId: 'paywall_funnel', state: 'error' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request always answers even without a spike', () => {
    const result = runMoneyDepartment({
      fetches: [fetchResult({ rows: NEW_PAYING_ROWS }), fetchResult({ sourceId: 'paywall_funnel', rows: [] })],
      trigger: 'owner_request',
      question: 'Как дела с возвратами?',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].question).toBe('Как дела с возвратами?');
  });

  test('every decision carries both evidence rows', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: [...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS] }),
        fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions[0].evidence).toHaveLength(2);
  });
});
