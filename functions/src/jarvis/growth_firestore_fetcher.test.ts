import { fetchGrowthSource, MAX_GROWTH_ROWS_PER_SOURCE, GROWTH_LOOKBACK_MS } from './growth_firestore_fetcher';

interface FakeDoc { readonly data: () => Record<string, unknown>; }
interface FakeQuery {
  orderBy: jest.Mock;
  limit: jest.Mock;
  select: jest.Mock;
  get: jest.Mock;
}

function makeFakeCollection(docs: readonly FakeDoc[], overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    select: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
    ...overrides,
  };
  return query;
}

function doc(row: Record<string, unknown>): FakeDoc { return { data: () => row }; }

class FakeTimestamp {
  constructor(private readonly ms: number) {}
  toMillis(): number { return this.ms; }
}

describe('Jarvis growth Firestore fetcher — users.created_at can be number/string/Timestamp (same field as admin_daily_digest.ts:702)', () => {
  test('reads the newest page by __name__ and filters created_at in memory, not via where', async () => {
    const collection = makeFakeCollection([doc({ platform: 'ios', created_at: 5_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    // зачем НЕ where по времени: created_at хранится вперемешку как number/
    // string/Timestamp (клиент пишет его при первом cloud-sync, не единая
    // серверная функция) — Firestore where сравнивает только одинаковые типы
    // и молча теряет документы другого типа. См. admin_daily_digest.ts:698-711.
    expect(collection.orderBy).toHaveBeenCalledWith('__name__', 'desc');
    expect(result.state).toBe('ready');
    expect(result.rows).toEqual([{ platform: 'ios' }]);
  });

  test('counts a user whose created_at is a Firestore Timestamp — this is the bug this fetch used to have', async () => {
    const collection = makeFakeCollection([
      doc({ platform: 'android', created_at: new FakeTimestamp(9_000) }),
    ]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ platform: 'android' }]);
  });

  test('counts a user whose created_at is an ISO string', async () => {
    const collection = makeFakeCollection([
      doc({ platform: 'web', created_at: new Date(9_500).toISOString() }),
    ]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ platform: 'web' }]);
  });

  test('a user older than the lookback window is excluded regardless of field type', async () => {
    const collection = makeFakeCollection([
      doc({ platform: 'ios', created_at: 10_000 - GROWTH_LOOKBACK_MS - 1 }),
      doc({ platform: 'android', created_at: new FakeTimestamp(10_000 - GROWTH_LOOKBACK_MS - 1) }),
    ]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([]);
    expect(result.state).toBe('empty');
  });

  test('a document with an unparseable created_at is excluded, not miscounted as recent', async () => {
    const collection = makeFakeCollection([doc({ platform: 'ios', created_at: null })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([]);
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

  test('hitting the scan page cap marks the fetch truncated — recent users may exist beyond the scanned page', async () => {
    const docs = Array.from({ length: MAX_GROWTH_ROWS_PER_SOURCE + 1 }, () => doc({ platform: 'android', created_at: 9_000 }));
    const collection = makeFakeCollection(docs);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.truncated).toBe(true);
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
