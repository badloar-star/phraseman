import { fetchGrowthSource, MAX_GROWTH_ROWS_PER_SOURCE, GROWTH_LOOKBACK_MS } from './growth_firestore_fetcher';

interface FakeDoc { readonly data: () => Record<string, unknown>; }
interface FakeQuery { where: jest.Mock; limit: jest.Mock; get: jest.Mock; }

function makeFakeCollection(docs: readonly FakeDoc[], overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    where: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
    ...overrides,
  };
  return query;
}

function doc(row: Record<string, unknown>): FakeDoc { return { data: () => row }; }

describe('Jarvis growth Firestore fetcher — users.created_at, same field as admin_daily_digest.ts:702', () => {
  test('queries by created_at and reads platform only', async () => {
    const collection = makeFakeCollection([doc({ platform: 'ios', created_at: 5_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(collection.where).toHaveBeenCalledWith('created_at', '>=', 10_000 - GROWTH_LOOKBACK_MS);
    expect(result.state).toBe('ready');
    expect(result.rows).toEqual([{ platform: 'ios' }]);
  });

  test('missing platform becomes null, not thrown away', async () => {
    const collection = makeFakeCollection([doc({ created_at: 5_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ platform: null }]);
  });

  test('zero rows is empty, not an error', async () => {
    const collection = makeFakeCollection([]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('empty');
  });

  test('hitting the row cap marks the fetch truncated', async () => {
    const docs = Array.from({ length: MAX_GROWTH_ROWS_PER_SOURCE + 1 }, () => doc({ platform: 'android' }));
    const collection = makeFakeCollection(docs);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.truncated).toBe(true);
    expect(result.droppedCount).toBe(1);
    expect(result.rows).toHaveLength(MAX_GROWTH_ROWS_PER_SOURCE);
  });

  test('a Firestore error fails closed', async () => {
    const collection = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('error');
    expect(result.rows).toEqual([]);
  });
});
