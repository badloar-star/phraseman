import { aggregateMoneyRows, buildMoneyEvidence, diagnosePersonalEconomy, MONEY_REPORT_COLLECTIONS } from './money_source_reader';

describe('Jarvis money source reader — same eventType contract as admin_daily_digest.ts', () => {
  test('classifies INITIAL_PURCHASE (non-trial) and NON_RENEWING_PURCHASE as new paying', () => {
    const rows = [
      { eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL' },
      { eventType: 'NON_RENEWING_PURCHASE', periodType: null },
    ];
    expect(aggregateMoneyRows(rows).newPaying).toBe(2);
  });

  test('INITIAL_PURCHASE with periodType TRIAL counts as a trial, not new paying', () => {
    const rows = [{ eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL' }];
    const aggregate = aggregateMoneyRows(rows);
    expect(aggregate.newPaying).toBe(0);
    expect(aggregate.trials).toBe(1);
  });

  test('RENEWAL counts as renewal, REFUND counts as refund', () => {
    const rows = [{ eventType: 'RENEWAL', periodType: null }, { eventType: 'REFUND', periodType: null }];
    const aggregate = aggregateMoneyRows(rows);
    expect(aggregate.renewals).toBe(1);
    expect(aggregate.refunds).toBe(1);
  });

  test('eventType is case-insensitive, matching admin_daily_digest.ts behavior', () => {
    const rows = [{ eventType: 'refund', periodType: null }];
    expect(aggregateMoneyRows(rows).refunds).toBe(1);
  });

  test('unknown eventType is not silently counted anywhere', () => {
    const rows = [{ eventType: 'CANCELLATION', periodType: null }];
    const aggregate = aggregateMoneyRows(rows);
    expect(aggregate.newPaying + aggregate.renewals + aggregate.refunds + aggregate.trials).toBe(0);
    expect(aggregate.totalCount).toBe(1);
  });

  test('empty input aggregates to all-zero, not an error', () => {
    const aggregate = aggregateMoneyRows([]);
    expect(aggregate).toEqual({ totalCount: 0, newPaying: 0, renewals: 0, refunds: 0, trials: 0 });
  });

  test('digest never leaks productId or any field beyond the counted aggregate', () => {
    const rows = [{ eventType: 'INITIAL_PURCHASE', periodType: 'NORMAL', productId: 'plus_yearly_v3' }];
    const evidence = buildMoneyEvidence({
      sourceId: 'revenuecat_premium_events', state: 'ready', truncated: false, droppedCount: 0, rows, observedAtMs: 1_000,
    });
    expect(evidence.digest).not.toMatch(/plus_yearly_v3|productId/i);
  });
});

describe('Jarvis money source reader — honest evidence state', () => {
  test('truncated fetch refuses to assert a count', () => {
    const evidence = buildMoneyEvidence({
      sourceId: 'revenuecat_premium_events', state: 'ready', truncated: true, droppedCount: 12,
      rows: [{ eventType: 'REFUND', periodType: null }], observedAtMs: 1_000,
    });
    expect(evidence.state).toBe('truncated');
    expect(evidence.count).toBeNull();
    expect(evidence.digest).toBe('');
  });

  test('failed source is error, not zero', () => {
    const evidence = buildMoneyEvidence({
      sourceId: 'paywall_funnel', state: 'error', truncated: false, droppedCount: 0, rows: [], observedAtMs: 1_000,
    });
    expect(evidence.state).toBe('error');
    expect(evidence.count).toBeNull();
    expect(evidence.digest).toBe('');
  });

  test('partial source exposes state and dropped count without a partial numeric digest', () => {
    const evidence = buildMoneyEvidence({
      sourceId: 'revenuecat_premium_events', state: 'partial', truncated: false, droppedCount: 3,
      rows: [{ eventType: 'REFUND', periodType: null }], observedAtMs: 1_000,
    });
    expect(evidence.trustworthy).toBe(false);
    expect(evidence.droppedCount).toBe(3);
    expect(evidence.count).toBeNull();
    expect(evidence.digest).toBe('');
  });
});

test('money sources include both revenue signals and the read-only personal economy journal', () => {
  expect(MONEY_REPORT_COLLECTIONS).toEqual([
    'revenuecat_premium_events', 'voice_minute_events', 'paywall_funnel',
    'economy_daily_stats', 'external_economy_events',
  ]);
});

describe('Jarvis personal economy journal ordering', () => {
  const operation = (ownerStableId: string, revision: number, createdAtMs: number, balanceBefore: number, delta: number) => ({
    eventType: null,
    periodType: null,
    ownerStableId,
    revision,
    createdAtMs,
    balanceBefore,
    delta,
    balanceAfter: balanceBefore + delta,
  });

  // зачем пересборка (2026-08-29): per-owner цепочку revision/balance сервер
  // больше НЕ видит — её сверяет сам клиент (economy_daily_stats_reporter) и
  // шлёт готовые счётчики. Сторожим новую обязанность сервера: честно
  // суммировать дневные документы и не выдумывать данные из кривых строк.
  test('sums daily counter documents without inventing per-owner data', () => {
    const diagnostics = diagnosePersonalEconomy([{
      sourceId: 'economy_daily_stats',
      state: 'ready',
      truncated: false,
      droppedCount: 0,
      observedAtMs: 1_000,
      rows: [
        { eventType: 'economy_daily_stats', periodType: null, createdAtMs: 100,
          ops: 3, invalidOps: 0, revisionGaps: 0, balanceGaps: 0,
          amountGranted: 25, amountSpent: 3 } as any,
        { eventType: 'economy_daily_stats', periodType: null, createdAtMs: 200,
          ops: 1, invalidOps: 0, revisionGaps: 0, balanceGaps: 0,
          amountGranted: 5, amountSpent: 0 } as any,
      ],
    }]);

    expect(diagnostics.operationCount).toBe(4);
    expect(diagnostics.revisionDiscontinuities).toBe(0);
    expect(diagnostics.balanceDiscontinuities).toBe(0);
    expect(diagnostics.netClientDelta).toBe(27);
    expect(diagnostics.openingOwners).toBe(0);
  });

  test('client-reported gap counters pass through untouched and a broken row is invalid, not fatal', () => {
    const diagnostics = diagnosePersonalEconomy([{
      sourceId: 'economy_daily_stats',
      state: 'ready',
      truncated: false,
      droppedCount: 0,
      observedAtMs: 1_000,
      rows: [
        { eventType: 'economy_daily_stats', periodType: null, createdAtMs: 100,
          ops: 2, invalidOps: 1, revisionGaps: 1, balanceGaps: 1,
          amountGranted: 0, amountSpent: 2 } as any,
        { eventType: 'economy_daily_stats', periodType: null, createdAtMs: 200,
          ops: -5 } as any,
      ],
    }]);

    expect(diagnostics.operationCount).toBe(2);
    expect(diagnostics.invalidRows).toBe(2);
    expect(diagnostics.revisionDiscontinuities).toBe(1);
    expect(diagnostics.balanceDiscontinuities).toBe(1);
  });
});
