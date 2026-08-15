import { correlatePendingPurchases } from '../app/revenuecat_pending_correlation';

const grant = (overrides: Partial<Parameters<typeof correlatePendingPurchases>[0][number]> = {}) => ({
  journalId: 'journal-1', storeTransactionId: null, productId: 'phraseman_shards_30',
  expectedShards: 35, createdAtMs: 1_000_000, ...overrides,
});
const event = (overrides: Partial<Parameters<typeof correlatePendingPurchases>[1][number]> = {}) => ({
  eventId: 'server-event-1', amount: 35, productId: 'phraseman_shards_30',
  createdAtMs: 1_000_500, transactionAliases: [] as string[], ...overrides,
});

describe('RevenueCat pending purchase correlation', () => {
  it('resolves a missing SDK transaction id from one unique matching server fact', () => {
    expect(correlatePendingPurchases([grant()], [event()]).get('journal-1')).toBe('server-event-1');
  });

  it('resolves mismatched SDK ids through immutable RevenueCat transaction aliases', () => {
    expect(correlatePendingPurchases(
      [grant({ storeTransactionId: 'storekit-id' })],
      [event({ eventId: 'original-id', transactionAliases: ['storekit-id'] })],
    ).get('journal-1')).toBe('original-id');
  });

  it('never clears an ambiguous local obligation or reuses a reserved event', () => {
    const grants = [grant(), grant({ journalId: 'journal-2', createdAtMs: 1_000_100 })];
    expect(correlatePendingPurchases(grants, [event()]).size).toBe(0);
    expect(correlatePendingPurchases([grant()], [event()], new Set(['server-event-1'])).size).toBe(0);
  });

  it('does not correlate a different product, amount, or distant purchase', () => {
    expect(correlatePendingPurchases([grant()], [
      event({ productId: 'phraseman_shards_80' }),
      event({ eventId: 'wrong-amount', amount: 92 }),
      event({ eventId: 'too-old', createdAtMs: 1_000_000 - 16 * 60 * 1000 }),
    ]).size).toBe(0);
  });

  it('cannot reuse a previously consumed event for a later same-pack obligation', () => {
    const purchase1 = correlatePendingPurchases([grant()], [event()]);
    expect(purchase1.get('journal-1')).toBe('server-event-1');

    const purchase2 = grant({ journalId: 'journal-2', createdAtMs: 1_000_700 });
    const reserved = new Set(purchase1.values());
    expect(correlatePendingPurchases([purchase2], [event()], reserved).size).toBe(0);
  });
});
