import { fetchQualitySource, MAX_QUALITY_ROWS_PER_SOURCE, QUALITY_LOOKBACK_MS } from './quality_firestore_fetcher';

interface FakeDoc {
  readonly data: () => Record<string, unknown>;
}

interface FakeQuery {
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  get: jest.Mock;
}

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

function doc(row: Record<string, unknown>): FakeDoc {
  return { data: () => row };
}

describe('Jarvis quality Firestore fetcher — honest state under real query shapes', () => {
  test('ready fetch under the row cap reads category/screen/createdAtMs only', async () => {
    const collection = makeFakeCollection([
      doc({ category: 'crash', screen: 'lesson', createdAtMs: 1_000 }),
      doc({ category: 'audio', screen: 'lesson', createdAtMs: 2_000 }),
    ]);
    const result = await fetchQualitySource({
      sourceId: 'error_reports',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('ready');
    expect(result.truncated).toBe(false);
    expect(result.rows).toEqual([
      { category: 'crash', screen: 'lesson', createdAtMs: 1_000 },
      { category: 'audio', screen: 'lesson', createdAtMs: 2_000 },
    ]);
    expect(collection.where).toHaveBeenCalledWith('createdAtMs', '>=', 10_000 - QUALITY_LOOKBACK_MS);
    expect(collection.limit).toHaveBeenCalledWith(MAX_QUALITY_ROWS_PER_SOURCE + 1);
  });

  test('zero rows is a genuine empty state, not an error', async () => {
    const collection = makeFakeCollection([]);
    const result = await fetchQualitySource({
      sourceId: 'user_reports',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('empty');
    expect(result.rows).toEqual([]);
  });

  test('hitting the row cap marks the fetch truncated and reports the drop', async () => {
    const docs = Array.from({ length: MAX_QUALITY_ROWS_PER_SOURCE + 1 }, (_value, index) =>
      doc({ category: 'crash', screen: 'lesson', createdAtMs: index }));
    const collection = makeFakeCollection(docs);
    const result = await fetchQualitySource({
      sourceId: 'app_errors',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('ready');
    expect(result.truncated).toBe(true);
    expect(result.droppedCount).toBe(1);
    expect(result.rows).toHaveLength(MAX_QUALITY_ROWS_PER_SOURCE);
  });

  test('a Firestore error fails closed instead of throwing past the department', async () => {
    const collection = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchQualitySource({
      sourceId: 'error_reports',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('error');
    expect(result.rows).toEqual([]);
  });

  test('missing category or screen fields become null, not thrown away', async () => {
    const collection = makeFakeCollection([doc({ createdAtMs: 1_000 })]);
    const result = await fetchQualitySource({
      sourceId: 'error_reports',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ category: null, screen: null, createdAtMs: 1_000 }]);
  });
});
