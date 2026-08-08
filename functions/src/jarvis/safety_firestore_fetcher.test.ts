import { fetchSafetySource, SAFETY_LOOKBACK_MS } from './safety_firestore_fetcher';

function makeCountingDb(counts: Record<string, number>, failOn?: string) {
  const calls: string[] = [];
  const makeQuery = (key: string): unknown => ({
    where: (field: string, _op: string, value: unknown) => makeQuery(`${key}|${field}=${String(value)}`),
    count: () => ({
      get: async () => {
        calls.push(key);
        if (failOn && key.includes(failOn)) throw new Error('unavailable');
        return { data: () => ({ count: counts[key] ?? 0 }) };
      },
    }),
  });
  return {
    db: { collection: (name: string) => makeQuery(name) } as unknown as FirebaseFirestore.Firestore,
    calls,
  };
}

const NOW = 10_000_000;

describe('Jarvis safety fetcher — server-side counts only, no document downloads, no UIDs', () => {
  test('counts open safety flags without reading any document', async () => {
    const { db, calls } = makeCountingDb({
      'safety_flags': 12,
      'safety_flags|handled=true': 9,
    });
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result.state).toBe('ready');
    expect(result.openFlags).toBe(3);
    // .count() везде — ни одного .get() по документам.
    expect(calls.length).toBeGreaterThan(0);
  });

  test('counts open flags on MINOR accounts separately — the real legal risk', async () => {
    const { db } = makeCountingDb({
      'safety_flags': 20,
      'safety_flags|handled=true': 15,
      'safety_flags|ageBracket=under13': 4,
      'safety_flags|ageBracket=under13|handled=true': 1,
      'safety_flags|ageBracket=teen_safe': 3,
      'safety_flags|ageBracket=teen_safe|handled=true': 3,
    });
    const result = await fetchSafetySource({ db, nowMs: NOW });
    // under13: 4-1=3 открытых, teen_safe: 3-3=0 → всего 3
    expect(result.openMinorFlags).toBe(3);
  });

  test('handled never exceeds total — a broken counter cannot produce negative open flags', async () => {
    const { db } = makeCountingDb({
      'safety_flags': 5,
      'safety_flags|handled=true': 99,
    });
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result.openFlags).toBe(0);
  });

  test('recent flags are counted in their own window for spike detection', async () => {
    const { db } = makeCountingDb({
      'safety_flags': 30,
      'safety_flags|handled=true': 25,
      [`safety_flags|createdAtMs=${NOW - SAFETY_LOOKBACK_MS}`]: 7,
    });
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result.recentFlags).toBe(7);
  });

  test('zero flags everywhere is a genuine empty — the best possible news', async () => {
    const { db } = makeCountingDb({});
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result.state).toBe('empty');
    expect(result.openFlags).toBe(0);
  });

  test('a failed count fails closed — never reports a fake zero as safety', async () => {
    const { db } = makeCountingDb({ 'safety_flags': 10 }, 'safety_flags');
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result.state).toBe('error');
    expect(result.openFlags).toBeNull();
    expect(result.openMinorFlags).toBeNull();
  });

  test('the lookback window covers at least a day', () => {
    expect(SAFETY_LOOKBACK_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });
});
