import { fetchContentSource, MAX_LESSON_STATS_DOCS, MIN_SAMPLES_FOR_VERDICT } from './content_firestore_fetcher';

interface FakeDoc { readonly id: string; readonly data: () => Record<string, unknown>; }
interface FakeQuery { orderBy: jest.Mock; limit: jest.Mock; get: jest.Mock; }

function makeFakeCollection(docs: readonly FakeDoc[], overrides: Partial<FakeQuery> = {}) {
  const query: FakeQuery = {
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn(async () => ({ docs })),
    ...overrides,
  };
  return query;
}

function statsDoc(id: string, averageScore: number, sampleCount: number, extra: Record<string, unknown> = {}): FakeDoc {
  return {
    id,
    data: () => ({
      lessonId: Number(id.split('lesson')[1]),
      target: id.startsWith('fr') ? 'fr' : 'en',
      stats: { averageScore, sampleCount, recentScores: [] },
      updatedAt: { toMillis: () => 900 },
      ...extra,
    }),
  };
}

describe('Jarvis content fetcher — reads the lesson_stats aggregate written by the hot path', () => {
  test('reads lessons with a bounded limit, never an unbounded scan', async () => {
    const collection = makeFakeCollection([statsDoc('en_lesson3', 4.2, 60)]);
    await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(collection.limit).toHaveBeenCalledWith(MAX_LESSON_STATS_DOCS + 1);
  });

  test('maps a healthy lesson row', async () => {
    const collection = makeFakeCollection([statsDoc('en_lesson3', 4.2, 60)]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.state).toBe('ready');
    expect(result.rows).toEqual([{ lessonId: 3, target: 'en', averageScore: 4.2, sampleCount: 60 }]);
    expect(result.observedAtMs).toBe(900);
  });

  test('uses the persisted latest stats update as the observation time', async () => {
    const collection = makeFakeCollection([
      statsDoc('en_lesson3', 4.2, 60, { updatedAt: { toMillis: () => 700 } }),
      statsDoc('en_lesson4', 4.1, 55, { updatedAt: { toMillis: () => 950 } }),
    ]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.state).toBe('ready');
    expect(result.observedAtMs).toBe(950);
  });

  test('fails partially instead of treating request time as freshness when stats lack updatedAt', async () => {
    const collection = makeFakeCollection([statsDoc('en_lesson3', 4.2, 60, { updatedAt: undefined })]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.state).toBe('partial');
    expect(result.observedAtMs).not.toBe(1_000);
  });

  test('marks old persisted stats stale rather than supporting a fresh conclusion', async () => {
    const nowMs = 2_000_000_000_000;
    const collection = makeFakeCollection([statsDoc('en_lesson3', 4.2, 60, { updatedAt: { toMillis: () => 1 } })]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs });
    expect(result.state).toBe('stale');
    expect(result.observedAtMs).toBe(1);
  });

  test('a lesson with too few samples is kept but marked — small samples must not drive a verdict', async () => {
    const collection = makeFakeCollection([statsDoc('en_lesson3', 1.0, MIN_SAMPLES_FOR_VERDICT - 1)]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.rows[0].sampleCount).toBe(MIN_SAMPLES_FOR_VERDICT - 1);
  });

  test('a malformed doc is skipped rather than trusted as zeros', async () => {
    const broken: FakeDoc = { id: 'en_lesson9', data: () => ({ lessonId: 9, target: 'en', stats: { averageScore: 'bad', sampleCount: null } }) };
    const collection = makeFakeCollection([broken, statsDoc('en_lesson3', 4.2, 60)]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].lessonId).toBe(3);
    expect(result.droppedCount).toBe(1);
  });

  test('no lesson stats yet is an honest empty, not an error', async () => {
    const collection = makeFakeCollection([]);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.state).toBe('empty');
    expect(result.rows).toEqual([]);
  });

  test('hitting the doc cap marks the fetch truncated', async () => {
    const docs = Array.from({ length: MAX_LESSON_STATS_DOCS + 1 }, (_v, i) => statsDoc(`en_lesson${i + 1}`, 4, 60));
    const collection = makeFakeCollection(docs);
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(MAX_LESSON_STATS_DOCS);
  });

  test('a Firestore error fails closed', async () => {
    const collection = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchContentSource({ collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 1_000 });
    expect(result.state).toBe('error');
    expect(result.rows).toEqual([]);
  });
});
