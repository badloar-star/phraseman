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
    const collection = makeFakeCollection([doc({
      eventType: 'REFUND', periodType: null, environment: 'PRODUCTION', eventTimestampMs: 10_000,
    })]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(collection.where).toHaveBeenCalledWith('eventTimestampMs', '>=', 10_000 - MONEY_LOOKBACK_MS);
    expect(result.state).toBe('ready');
    expect(result.rows).toEqual([{
      eventType: 'REFUND', periodType: null, environment: 'PRODUCTION', createdAtMs: 10_000,
    }]);
  });

  test('filters production and exact inclusive time bounds before newest-first cap', async () => {
    const nowMs = MONEY_LOOKBACK_MS * 2;
    const collection = makeFakeCollection([doc({
      eventType: 'REFUND', periodType: null, environment: 'PRODUCTION', eventTimestampMs: nowMs,
    })]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs,
    });
    expect(collection.where.mock.calls).toEqual([
      ['environment', '==', 'PRODUCTION'],
      ['eventTimestampMs', '>=', nowMs - MONEY_LOOKBACK_MS],
      ['eventTimestampMs', '<=', nowMs],
    ]);
    expect(collection.orderBy).toHaveBeenCalledWith('eventTimestampMs', 'desc');
    expect(collection.limit).toHaveBeenCalledWith(MAX_MONEY_ROWS_PER_SOURCE + 1);
    expect(result.rows).toEqual([{
      eventType: 'REFUND', periodType: null, environment: 'PRODUCTION', createdAtMs: nowMs,
    }]);
  });

  test('future or malformed RevenueCat rows are excluded and counted as dropped', async () => {
    const nowMs = MONEY_LOOKBACK_MS * 2;
    const collection = makeFakeCollection([
      doc({ eventType: 'REFUND', environment: 'PRODUCTION', eventTimestampMs: nowMs + 1 }),
      doc({ eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: 'bad' }),
    ]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events', collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs,
    });
    expect(result.rows).toEqual([]);
    expect(result.droppedCount).toBe(2);
    expect(result.state).toBe('empty');
  });

  test('missing periodType becomes null, not thrown away', async () => {
    const collection = makeFakeCollection([doc({
      eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: 10_000,
    })]);
    const result = await fetchMoneySource({
      sourceId: 'revenuecat_premium_events',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{
      eventType: 'RENEWAL', periodType: null, environment: 'PRODUCTION', createdAtMs: 10_000,
    }]);
  });
});

describe('Jarvis money Firestore fetcher — paywall_funnel (exact timestamp field)', () => {
  test('queries by exact timestamp and filters to purchase_completed, non-dev', async () => {
    const collection = makeFakeCollection([
      doc({ step: 'purchase_completed', dev: false, ts: 10_000 }),
      doc({ step: 'shown', dev: false, ts: 10_000 }),
      doc({ step: 'purchase_completed', dev: true, ts: 10_000 }),
    ]);
    const result = await fetchMoneySource({
      sourceId: 'paywall_funnel',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(collection.where).toHaveBeenCalledWith('ts', '>=', 10_000 - MONEY_LOOKBACK_MS);
    // зачем: только purchase_completed и не dev-сборки считаются деньгами —
    // остальное отбрасывается на этапе фетча, как в admin_daily_digest.ts.
    expect(result.rows).toEqual([{ eventType: 'purchase_completed', periodType: null, createdAtMs: 10_000 }]);
  });

  test('filters purchase_completed, non-dev and exact ts bounds before newest-first cap', async () => {
    const nowMs = MONEY_LOOKBACK_MS * 2;
    const collection = makeFakeCollection([
      doc({ step: 'purchase_completed', dev: false, ts: nowMs }),
      doc({ step: 'purchase_completed', dev: false, ts: nowMs + 1 }),
    ]);
    const result = await fetchMoneySource({
      sourceId: 'paywall_funnel', collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs,
    });
    expect(collection.where.mock.calls).toEqual([
      ['step', '==', 'purchase_completed'],
      ['dev', '==', false],
      ['ts', '>=', nowMs - MONEY_LOOKBACK_MS],
      ['ts', '<=', nowMs],
    ]);
    expect(collection.orderBy).toHaveBeenCalledWith('ts', 'desc');
    expect(collection.limit).toHaveBeenCalledWith(MAX_MONEY_ROWS_PER_SOURCE + 1);
    expect(result.rows).toEqual([{ eventType: 'purchase_completed', periodType: null, createdAtMs: nowMs }]);
    expect(result.droppedCount).toBe(1);
  });

  test('does not query the lossy day string or post-filter a mixed capped sample', async () => {
    const nowMs = MONEY_LOOKBACK_MS * 2;
    const collection = makeFakeCollection([]);
    await fetchMoneySource({
      sourceId: 'paywall_funnel', collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs,
    });
    expect(collection.where).not.toHaveBeenCalledWith('day', '>=', expect.anything());
    expect(collection.where).not.toHaveBeenCalledWith('day', '<=', expect.anything());
  });
});

describe('Jarvis money Firestore fetcher — personal economy exact window', () => {
  test('excludes future rows by query and validation before the cap', async () => {
    const nowMs = MONEY_LOOKBACK_MS * 2;
    const collection = makeFakeCollection([
      doc({ ownerStableId: 'ok', createdAtMs: nowMs, openingBalance: 10 }),
      doc({ ownerStableId: 'future', createdAtMs: nowMs + 1, openingBalance: 20 }),
    ]);
    const result = await fetchMoneySource({
      sourceId: 'client_economy_opening', collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs,
    });
    expect(collection.where.mock.calls).toEqual([
      ['createdAtMs', '>=', nowMs - MONEY_LOOKBACK_MS],
      ['createdAtMs', '<=', nowMs],
    ]);
    expect(collection.orderBy).toHaveBeenCalledWith('createdAtMs', 'desc');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].ownerStableId).toBe('ok');
    expect(result.droppedCount).toBe(1);
  });
});

describe('Jarvis money Firestore fetcher — shared honest-state behavior', () => {
  test('hitting the row cap marks the fetch truncated', async () => {
    const docs = Array.from({ length: MAX_MONEY_ROWS_PER_SOURCE + 1 }, () => doc({
      eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: 10_000,
    }));
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
