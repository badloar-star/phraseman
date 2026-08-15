import { diagnosePersonalEconomy, type MoneySourceFetchResult } from './money_source_reader';

const fetch = (sourceId: MoneySourceFetchResult['sourceId'], rows: MoneySourceFetchResult['rows']): MoneySourceFetchResult => ({
  sourceId, rows, state: rows.length ? 'ready' : 'empty', truncated: false, droppedCount: 0, observedAtMs: 1,
});

describe('Jarvis personal economy diagnostics', () => {
  it('reconstructs journal continuity and external deltas without treating Firestore as balance authority', () => {
    const diagnostics = diagnosePersonalEconomy([
      fetch('client_economy_opening', [{ eventType: null, periodType: null, ownerStableId: 'u1', openingBalance: 10 }]),
      fetch('client_economy_operations', [
        { eventType: null, periodType: null, ownerStableId: 'u1', revision: 1, delta: 5, balanceBefore: 10, balanceAfter: 15 } as any,
        { eventType: null, periodType: null, ownerStableId: 'u1', revision: 2, delta: -3, balanceBefore: 15, balanceAfter: 12 } as any,
      ]),
      fetch('external_economy_events', [
        { eventType: 'purchase-1', periodType: null, ownerStableId: 'u1', source: 'revenuecat_purchase', delta: 35 },
      ]),
    ]);
    expect(diagnostics).toMatchObject({
      openingOwners: 1, operationCount: 2, externalEventCount: 1,
      invalidRows: 0, revisionDiscontinuities: 0, balanceDiscontinuities: 0,
      netClientDelta: 2, netExternalDelta: 35,
    });
  });

  it('reports revision/balance breaks and duplicate external facts', () => {
    const diagnostics = diagnosePersonalEconomy([
      fetch('client_economy_operations', [
        { eventType: null, periodType: null, ownerStableId: 'u1', revision: 1, delta: 1, balanceBefore: 0, balanceAfter: 1 } as any,
        { eventType: null, periodType: null, ownerStableId: 'u1', revision: 3, delta: 1, balanceBefore: 9, balanceAfter: 10 } as any,
      ]),
      fetch('external_economy_events', [
        { eventType: 'e1', periodType: null, ownerStableId: 'u1', source: 's', delta: 1 },
        { eventType: 'e1', periodType: null, ownerStableId: 'u1', source: 's', delta: 1 },
      ]),
    ]);
    expect(diagnostics).toMatchObject({ revisionDiscontinuities: 1, balanceDiscontinuities: 1, duplicateExternalFacts: 1 });
  });
});
