import { fetchMoneySource, MAX_MONEY_ROWS_PER_SOURCE, MONEY_LOOKBACK_MS } from './money_firestore_fetcher';

interface FakeDoc { readonly data: () => Record<string, unknown>; }
interface FakeQuery { where: jest.Mock; orderBy: jest.Mock; limit: jest.Mock; get: jest.Mock; }

function makeFakeCollection(docs: readonly FakeDoc[], overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
    ...overrides,
  };
  return query;
}

function doc(row: Record<string, unknown>): FakeDoc { return { data: () => row }; }

describe('Jarvis money Firestore fetcher — revenuecat_premium_events (numeric time field)', () => {
  test('queries by eventTimestampMs, same field as admin_daily_digest.ts', async () => {
    const collection = makeFakeCollection([doc({ eventType: 'REFUND', periodType: null })]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(collection.where).toHaveBeenCalledWith('eventTimestampMs', '>=', 10_000 - MONEY_LOOKBACK_MS);
    expect(result.state).toBe('ready');
    expect(result.rows).toEqual([{ eventType: 'REFUND', periodType: null }]);
  });

  test('missing periodType becomes null, not thrown away', async () => {
    const collection = makeFakeCollection([doc({ eventType: 'RENEWAL' })]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ eventType: 'RENEWAL', periodType: null }]);
  });
});

describe('Jarvis money Firestore fetcher — paywall_funnel (day-string field, admin_daily_digest.ts:721-744)', () => {
  test('queries by day string and filters to purchase_completed, non-dev', async () => {
    const collection = makeFakeCollection([
      doc({ step: 'purchase_completed', dev: false, day: '2026-08-02' }),
      doc({ step: 'shown', dev: false, day: '2026-08-02' }),
      doc({ step: 'purchase_completed', dev: true, day: '2026-08-02' }),
    ]);
    const result = await fetchMoneySource({
      sourceId: 'paywall_funnel',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(collection.where).toHaveBeenCalledWith('day', '>=', expect.any(String));
    // зачем: только purchase_completed и не dev-сборки считаются деньгами —
    // остальное отбрасывается на этапе фетча, как в admin_daily_digest.ts.
    expect(result.rows).toEqual([{ eventType: 'purchase_completed', periodType: null }]);
  });
});

describe('Jarvis money Firestore fetcher — shared honest-state behavior', () => {
  test('hitting the row cap marks the fetch truncated', async () => {
    const docs = Array.from({ length: MAX_MONEY_ROWS_PER_SOURCE + 1 }, () => doc({ eventType: 'RENEWAL' }));
    const collection = makeFakeCollection(docs);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.truncated).toBe(true);
    expect(result.droppedCount).toBe(1);
    expect(result.rows).toHaveLength(MAX_MONEY_ROWS_PER_SOURCE);
  });

  test('zero rows is empty, not an error', async () => {
    const collection = makeFakeCollection([]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('empty');
  });

  test('a Firestore error fails closed', async () => {
    const collection = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchMoneySource({
      sourceId: 'paywall_funnel',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('error');
    expect(result.rows).toEqual([]);
  });
});
