import { ANALYTICS_CACHE_TTL_MS, analyticsCacheKey, readThroughAnalyticsCache } from './admin_analytics_cache';

// зачем (№45, 21.10): «Аналитика» в админке читала до 30–50 тыс. документов на открытие — проверяем,
// что повторное открытие в пределах 6 ч обходится одним чтением, а неполный ответ не закрепляется.
const fakeDb = () => {
  const store = new Map<string, Record<string, unknown>>();
  let reads = 0;
  const db = {
    collection: () => ({
      doc: (id: string) => ({
        get: async () => { reads += 1; return { exists: store.has(id), data: () => store.get(id) }; },
        set: async (value: Record<string, unknown>) => { store.set(id, value); },
      }),
    }),
  };
  return { db: db as never, reads: () => reads, size: () => store.size };
};

describe('admin analytics cache', () => {
  test('second call within TTL is served from the cache document', async () => {
    const { db, reads } = fakeDb();
    let computed = 0;
    const compute = async () => { computed += 1; return { state: 'ready', value: 42 }; };
    const first = await readThroughAnalyticsCache({ kind: 'snapshot', data: { rangeDays: 28 }, nowMs: 1_000, compute, db });
    const second = await readThroughAnalyticsCache({ kind: 'snapshot', data: { rangeDays: 28 }, nowMs: 2_000, compute, db });
    expect(first).toEqual({ state: 'ready', value: 42, cache: { hit: false, ageMs: 0 } });
    expect(second).toEqual({ state: 'ready', value: 42, cache: { hit: true, ageMs: 1_000 } });
    expect(computed).toBe(1);
    expect(reads()).toBe(2);
  });

  test('expired entry and explicit refresh recompute', async () => {
    const { db } = fakeDb();
    let computed = 0;
    const compute = async () => { computed += 1; return { state: 'ready', n: computed }; };
    await readThroughAnalyticsCache({ kind: 'trends', data: { presetDays: 28 }, nowMs: 0, compute, db });
    await readThroughAnalyticsCache({ kind: 'trends', data: { presetDays: 28 }, nowMs: ANALYTICS_CACHE_TTL_MS + 1, compute, db });
    await readThroughAnalyticsCache({ kind: 'trends', data: { presetDays: 28, refresh: true }, nowMs: ANALYTICS_CACHE_TTL_MS + 2, compute, db });
    expect(computed).toBe(3);
  });

  test('partial or error answers are not cached', async () => {
    const { db, size } = fakeDb();
    await readThroughAnalyticsCache({ kind: 'snapshot', data: { rangeDays: 7 }, nowMs: 0, compute: async () => ({ state: 'partial' }), db });
    expect(size()).toBe(0);
  });

  test('refresh flag does not change the cache key; ranges do', () => {
    expect(analyticsCacheKey('snapshot', { rangeDays: 7, refresh: true })).toBe(analyticsCacheKey('snapshot', { rangeDays: 7 }));
    expect(analyticsCacheKey('snapshot', { rangeDays: 7 })).not.toBe(analyticsCacheKey('snapshot', { rangeDays: 28 }));
    expect(analyticsCacheKey('snapshot', { rangeDays: 7 })).not.toBe(analyticsCacheKey('trends', { rangeDays: 7 }));
  });
});
