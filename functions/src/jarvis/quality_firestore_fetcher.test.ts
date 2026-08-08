import { fetchQualitySource, MAX_QUALITY_ROWS_PER_SOURCE, QUALITY_LOOKBACK_MS } from './quality_firestore_fetcher';

interface FakeDoc {
  readonly data: () => Record<string, unknown>;
}

interface FakeQuery {
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  startAfter: jest.Mock;
  get: jest.Mock;
}

function makeFakeCollection(docs: readonly FakeDoc[], overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    startAfter: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
    ...overrides,
  };
  return query;
}

function doc(row: Record<string, unknown>): FakeDoc {
  return { data: () => row };
}

function aggregateDb(meta: Record<string, unknown> | undefined, buckets: readonly FakeDoc[]) {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({ exists: id === '_meta' && meta !== undefined, data: () => meta }),
        collection: () => ({
          doc: () => ({
            collection: () => ({ get: async () => ({ docs: buckets }) }),
          }),
        }),
      }),
    }),
  } as unknown as FirebaseFirestore.Firestore;
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
    expect(collection.where).toHaveBeenCalledWith('createdAtMs', '<=', 10_000);
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

  test('does not truncate a source merely because it has more than the legacy row cap', async () => {
    const docs = Array.from({ length: MAX_QUALITY_ROWS_PER_SOURCE + 1 }, (_value, index) =>
      doc({ category: 'crash', screen: 'lesson', createdAtMs: index }));
    const collection = makeFakeCollection(docs);
    const result = await fetchQualitySource({
      sourceId: 'app_errors',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('ready');
    expect(result.truncated).toBe(false);
    expect(result.droppedCount).toBe(0);
    expect(result.rows).toHaveLength(MAX_QUALITY_ROWS_PER_SOURCE + 1);
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

  test('prefers a complete UTC-day aggregate and exposes release dimensions plus affected-user count internally', async () => {
    const nowMs = Date.parse('2026-08-09T12:00:00.000Z');
    const raw = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('raw fallback must not run'); }) });
    const result = await fetchQualitySource({
      sourceId: 'app_errors', collection: raw as unknown as FirebaseFirestore.CollectionReference,
      db: aggregateDb(
        { schemaVersion: 1, activatedAtMs: Date.parse('2026-08-08T12:00:00.000Z') },
        [doc({ schemaVersion: 1, sourceId: 'app_errors', dayKey: '2026-08-09', build: '319', platform: 'ios', category: 'auth', screen: 'sign_in', eventCount: 7, affectedUserCount: 3 })],
      ),
      nowMs,
    });

    expect(result).toMatchObject({ state: 'ready', evidenceMode: 'exact_daily_aggregate' });
    expect(result.rows).toEqual([{
      category: 'auth', screen: 'sign_in', build: '319', platform: 'ios', createdAtMs: nowMs,
      eventCount: 7, affectedUserCount: 3,
    }]);
    expect(raw.get).not.toHaveBeenCalled();
  });

  test('before a full UTC day of aggregate coverage, raw events are explicitly degraded and user count is unknown', async () => {
    const nowMs = Date.parse('2026-08-09T12:00:00.000Z');
    const raw = makeFakeCollection([doc({ category: 'auth', screen: 'sign_in', buildNumber: '319', platform: 'ios', createdAtMs: nowMs - 1 })]);
    const result = await fetchQualitySource({
      sourceId: 'app_errors', collection: raw as unknown as FirebaseFirestore.CollectionReference,
      db: aggregateDb({ schemaVersion: 1, activatedAtMs: Date.parse('2026-08-09T08:00:00.000Z') }, []),
      nowMs,
    });

    expect(result).toMatchObject({ state: 'partial', evidenceMode: 'degraded_raw_fallback' });
    expect(result.rows).toEqual([{
      category: 'auth', screen: 'sign_in', build: '319', platform: 'ios', createdAtMs: nowMs - 1,
      eventCount: 1, affectedUserCount: null,
    }]);
  });

  test('a fully covered UTC day with no aggregate buckets is an exact empty state', async () => {
    const nowMs = Date.parse('2026-08-09T12:00:00.000Z');
    const result = await fetchQualitySource({
      sourceId: 'user_reports', collection: makeFakeCollection([]) as unknown as FirebaseFirestore.CollectionReference,
      db: aggregateDb({ schemaVersion: 1, activatedAtMs: Date.parse('2026-08-08T12:00:00.000Z') }, []),
      nowMs,
    });
    expect(result).toMatchObject({ state: 'empty', evidenceMode: 'exact_daily_aggregate', rows: [] });
  });
});
