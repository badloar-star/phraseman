import { runMoneyDepartment } from './money_department';
import type { FetchMoneySourceResult } from './money_firestore_fetcher';

// зачем именно 7 из 20 (35%): выше базового порога 30% (mature: 30%×1),
// но ниже порога seed (30%×2=60%) — ровно граница, которую тир должен развести.
const BORDERLINE_REFUND_ROWS = Array.from({ length: 7 }, () => ({ eventType: 'REFUND', periodType: null }));

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

  test.each([
    ['scheduled', 'revenuecat_premium_events', 'paywall_funnel'],
    ['scheduled', 'paywall_funnel', 'revenuecat_premium_events'],
    ['owner_request', 'revenuecat_premium_events', 'paywall_funnel'],
    ['owner_request', 'paywall_funnel', 'revenuecat_premium_events'],
  ] as const)(
    '%s run reports insufficient_evidence when %s errors and %s is empty',
    (trigger, failedSource, emptySource) => {
      const result = runMoneyDepartment({
        fetches: [
          fetchResult({ sourceId: failedSource, state: 'error' }),
          fetchResult({ sourceId: emptySource, state: 'empty' }),
        ],
        trigger,
        nowMs: 10_000,
      });

      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].status).toBe('insufficient_evidence');
      expect(result.decisions[0].evidence.find((item) => item.sourceId === failedSource)?.count).toBeNull();
    },
  );

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

describe('Jarvis money department — app tier scales the spike threshold', () => {
  // зачем: владелец 2026-08-02 — тот же % возвратов не должен звучать
  // одинаково тревожно на маленькой и на зрелой базе. 20 новых платящих +
  // 7 возвратов (35%) выше базового порога (30%), но на seed-тире порог
  // поднимается до 60% — сигнал остаётся шумом маленькой выборки.
  test('a rate that trips the base threshold stays silent on the seed tier (small-base noise)', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: [...NEW_PAYING_ROWS.slice(0, 20), ...BORDERLINE_REFUND_ROWS] }),
        fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
      appTier: 'seed',
    });
    expect(result.decisions).toEqual([]);
  });

  test('the same rate raises a decision on the mature tier — same signal, larger base, real', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: [...NEW_PAYING_ROWS.slice(0, 20), ...BORDERLINE_REFUND_ROWS] }),
        fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
      appTier: 'mature',
    });
    expect(result.decisions).toHaveLength(1);
  });

  test('no appTier argument defaults to the most cautious tier (seed) — never silently loosens', () => {
    const result = runMoneyDepartment({
      fetches: [
        fetchResult({ rows: [...NEW_PAYING_ROWS.slice(0, 20), ...BORDERLINE_REFUND_ROWS] }),
        fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toEqual([]);
  });
});
