import { diagnosePersonalEconomy, type MoneySourceFetchResult } from './money_source_reader';

const fetch = (sourceId: MoneySourceFetchResult['sourceId'], rows: MoneySourceFetchResult['rows']): MoneySourceFetchResult => ({
  sourceId, rows, state: rows.length ? 'ready' : 'empty', truncated: false, droppedCount: 0, observedAtMs: 1,
});

describe('Jarvis personal economy diagnostics', () => {
  it('reconstructs journal continuity and external deltas without treating Firestore as balance authority', () => {
    const diagnostics = diagnosePersonalEconomy([
      // зачем (2026-08-29): личная цепочка сверяется клиентом; сервер видит
      // только дневные счётчики economy_daily_stats.
      fetch('economy_daily_stats', [
        { eventType: 'economy_daily_stats', periodType: null, createdAtMs: 100,
          ops: 2, invalidOps: 0, revisionGaps: 0, balanceGaps: 0,
          amountGranted: 5, amountSpent: 3 } as any,
      ]),
      fetch('external_economy_events', [
        { eventType: 'purchase-1', periodType: null, ownerStableId: 'u1', source: 'revenuecat_purchase', delta: 35 },
      ]),
    ]);
    expect(diagnostics).toMatchObject({
      openingOwners: 0, operationCount: 2, externalEventCount: 1,
      invalidRows: 0, revisionDiscontinuities: 0, balanceDiscontinuities: 0,
      netClientDelta: 2, netExternalDelta: 35,
    });
  });

  it('reports revision/balance breaks and duplicate external facts', () => {
    const diagnostics = diagnosePersonalEconomy([
      fetch('economy_daily_stats', [
        { eventType: 'economy_daily_stats', periodType: null, createdAtMs: 100,
          ops: 2, invalidOps: 0, revisionGaps: 1, balanceGaps: 1,
          amountGranted: 2, amountSpent: 0 } as any,
      ]),
      fetch('external_economy_events', [
        { eventType: 'e1', periodType: null, ownerStableId: 'u1', source: 's', delta: 1 },
        { eventType: 'e1', periodType: null, ownerStableId: 'u1', source: 's', delta: 1 },
      ]),
    ]);
    expect(diagnostics).toMatchObject({ revisionDiscontinuities: 1, balanceDiscontinuities: 1, duplicateExternalFacts: 1 });
  });
});
