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

function completeFetches(revenueRows: FetchMoneySourceResult['rows'] = []): FetchMoneySourceResult[] {
  return [
    fetchResult({ sourceId: 'revenuecat_premium_events', rows: revenueRows }),
    fetchResult({ sourceId: 'paywall_funnel', rows: [] }),
    fetchResult({ sourceId: 'client_economy_opening', rows: [] }),
    fetchResult({ sourceId: 'client_economy_operations', rows: [] }),
    fetchResult({ sourceId: 'external_economy_events', rows: [] }),
  ];
}

describe('Jarvis money department — required trustworthy sources', () => {
  test('a missing required source is explicit insufficient_evidence', () => {
    const fetches = completeFetches(NEW_PAYING_ROWS).filter((fetch) => fetch.sourceId !== 'paywall_funnel');
    const result = runMoneyDepartment({ fetches, trigger: 'owner_request', nowMs: 10_000 });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].status).toBe('insufficient_evidence');
    expect(result.decisions[0].evidence.find((item) => item.sourceId === 'paywall_funnel')).toMatchObject({
      state: 'error', trustworthy: false, count: null, digest: '',
    });
  });

  test.each([
    { state: 'partial' as const, truncated: false, droppedCount: 1 },
    { state: 'ready' as const, truncated: true, droppedCount: 1 },
    { state: 'error' as const, truncated: false, droppedCount: 0 },
  ])('untrustworthy RevenueCat evidence cannot emit a numeric refund spike or breakdown: %j', (health) => {
    const fetches = completeFetches([...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS]);
    fetches[0] = fetchResult({ ...health, rows: [...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS] });
    const result = runMoneyDepartment({
      fetches, trigger: 'owner_request', nowMs: 10_000,
      yesterday: { newPaying: 100, renewals: 50, refunds: 1 },
    });
    expect(result.decisions[0].status).toBe('insufficient_evidence');
    expect(result.decisions[0].finding).not.toMatch(/8 возвратов|10 новых платящих|Новые платящие|Продления|Возвраты:/i);
  });

  test('personal economy diagnostics are numeric only when all three journal sources are trustworthy', () => {
    const complete = runMoneyDepartment({ fetches: completeFetches(), trigger: 'owner_request', nowMs: 10_000 });
    expect(complete.decisions[0].finding).toMatch(/Экономика: 0 клиентских операций, 0 внешних событий/);

    const incompleteFetches = completeFetches();
    incompleteFetches[3] = fetchResult({ sourceId: 'client_economy_operations', state: 'error' });
    const incomplete = runMoneyDepartment({ fetches: incompleteFetches, trigger: 'owner_request', nowMs: 10_000 });
    expect(incomplete.decisions[0].status).toBe('insufficient_evidence');
    expect(incomplete.decisions[0].finding).not.toMatch(/Экономика: \d+ клиентских операций/);
  });
});

describe('Jarvis money department — a decision only when the signal is real', () => {
  test('no decision on an ordinary day with no refund spike', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches(NEW_PAYING_ROWS),
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toEqual([]);
  });

  test('raises a decision when refunds exceed the spike threshold relative to new paying', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS]),
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

  test('a failed required source blocks numeric spike, breakdown, hypothesis and action', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS])
        .map((fetch) => fetch.sourceId === 'paywall_funnel' ? fetchResult({ sourceId: 'paywall_funnel', state: 'error' }) : fetch),
      trigger: 'scheduled',
      nowMs: 10_000,
      yesterday: { newPaying: 100, renewals: 50, refunds: 1 },
    });
    expect(result.decisions).toHaveLength(1);
    const [decision] = result.decisions;
    expect(decision.status).toBe('insufficient_evidence');
    expect(decision.finding).not.toMatch(/8 возвратов|10 новых платящих|Новые платящие|Продления|Возвраты:/i);
    expect(decision.hypothesis).toBe('Недостаточно данных для гипотезы.');
    expect(decision.recommendation).toBe('Продолжить наблюдение без вмешательства');
  });

  test('every source failing yields insufficient_evidence, not silence', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches().map((fetch) => fetchResult({ sourceId: fetch.sourceId, state: 'error' })),
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
        fetches: completeFetches().map((fetch) => {
          if (fetch.sourceId === failedSource) return fetchResult({ sourceId: failedSource, state: 'error' });
          if (fetch.sourceId === emptySource) return fetchResult({ sourceId: emptySource, state: 'empty' });
          return fetch;
        }),
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
      fetches: completeFetches(NEW_PAYING_ROWS),
      trigger: 'owner_request',
      question: 'Как дела с возвратами?',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].question).toBe('Как дела с возвратами?');
  });

  test('every decision carries every required evidence row', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 10), ...REFUND_ROWS]),
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions[0].evidence).toHaveLength(5);
  });
});

describe('Jarvis money department — app tier scales the spike threshold', () => {
  // зачем: владелец 2026-08-02 — тот же % возвратов не должен звучать
  // одинаково тревожно на маленькой и на зрелой базе. 20 новых платящих +
  // 7 возвратов (35%) выше базового порога (30%), но на seed-тире порог
  // поднимается до 60% — сигнал остаётся шумом маленькой выборки.
  test('a rate that trips the base threshold stays silent on the seed tier (small-base noise)', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 20), ...BORDERLINE_REFUND_ROWS]),
      trigger: 'scheduled',
      nowMs: 10_000,
      appTier: 'seed',
    });
    expect(result.decisions).toEqual([]);
  });

  test('the same rate raises a decision on the mature tier — same signal, larger base, real', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 20), ...BORDERLINE_REFUND_ROWS]),
      trigger: 'scheduled',
      nowMs: 10_000,
      appTier: 'mature',
    });
    expect(result.decisions).toHaveLength(1);
  });

  test('no appTier argument defaults to the most cautious tier (seed) — never silently loosens', () => {
    const result = runMoneyDepartment({
      fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 20), ...BORDERLINE_REFUND_ROWS]),
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toEqual([]);
  });

  describe('разбор по составляющим', () => {
    // зачем (аудит 2026-08-16): департамент говорил «столько-то новых
    // платящих» и останавливался. Владельцу приходилось самому искать,
    // из-за какой части это произошло — находка не экономила работу.

    function runWithYesterday(yesterday: { newPaying: number; renewals: number; refunds: number } | null) {
      return runMoneyDepartment({
        fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 4), ...REFUND_ROWS]),
        trigger: 'owner_request',
        nowMs: 10_000,
        yesterday,
      });
    }

    test('называет просевшую часть, а не только итог', () => {
      const result = runWithYesterday({ newPaying: 40, renewals: 10, refunds: 1 });
      expect(result.decisions[0].finding).toMatch(/новые платящие|Новые платящие/i);
    });

    test('без вчерашних данных разбор не выдумывается', () => {
      // зачем: первый запуск не должен рапортовать о падении с нуля.
      const result = runWithYesterday(null);
      expect(result.decisions[0].finding).not.toMatch(/объясняется одной частью/i);
    });

    test('ровный день не порождает лишней строки', () => {
      // зачем: «изменений нет» каждый день — шум, из-за которого
      // перестают читать находку целиком.
      const result = runMoneyDepartment({
        fetches: completeFetches([...NEW_PAYING_ROWS.slice(0, 4), ...REFUND_ROWS]),
        trigger: 'owner_request',
        nowMs: 10_000,
        yesterday: { newPaying: 4, renewals: 0, refunds: REFUND_ROWS.length },
      });
      expect(result.decisions[0].finding).not.toMatch(/объясняется одной частью/i);
    });
  });
});
