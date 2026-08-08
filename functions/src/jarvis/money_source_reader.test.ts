import { aggregateMoneyRows, buildMoneyEvidence, MONEY_REPORT_COLLECTIONS } from './money_source_reader';

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
  });

  test('failed source is error, not zero', () => {
    const evidence = buildMoneyEvidence({
      sourceId: 'paywall_funnel', state: 'error', truncated: false, droppedCount: 0, rows: [], observedAtMs: 1_000,
    });
    expect(evidence.state).toBe('error');
    expect(evidence.count).toBeNull();
  });
});

test('the two money collections match the ones the plan approved', () => {
  expect(MONEY_REPORT_COLLECTIONS).toEqual(['revenuecat_premium_events', 'paywall_funnel']);
});
