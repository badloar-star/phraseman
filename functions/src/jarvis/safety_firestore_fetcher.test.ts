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

  test('uses only server-authored evidence fields and treats legacy/missing evidence as unverified', async () => {
    const { db } = makeCountingDb({
      'safety_flags': 20,
      'safety_flags|handled=true': 15,
      'safety_flags|ageEvidence=confirmed_adult': 12,
      'safety_flags|ageEvidence=confirmed_adult|handled=true': 10,
      'safety_flags|ageEvidence=unavailable': 2,
      'safety_flags|ageEvidence=unavailable|handled=true': 1,
    });
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result).toMatchObject({
      openFlags: 5,
      openMinorFlags: null,
      openAgeUnverifiedFlags: 2,
      openAgeUnavailableFlags: 1,
      ageEvidence: 'age_unverified',
    });
  });

  test('never queries client-controlled ageBracket values', async () => {
    const { db, calls } = makeCountingDb({ 'safety_flags': 1 });
    await fetchSafetySource({ db, nowMs: NOW });
    expect(calls.some((key) => key.includes('ageBracket'))).toBe(false);
  });

  test('reports confirmed_adult when every open incident carries server confirmation', async () => {
    const { db } = makeCountingDb({
      'safety_flags': 4,
      'safety_flags|handled=true': 1,
      'safety_flags|ageEvidence=confirmed_adult': 4,
      'safety_flags|ageEvidence=confirmed_adult|handled=true': 1,
    });
    await expect(fetchSafetySource({ db, nowMs: NOW })).resolves.toMatchObject({
      openFlags: 3,
      openAgeUnverifiedFlags: 0,
      openAgeUnavailableFlags: 0,
      ageEvidence: 'confirmed_adult',
    });
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
    expect(result.ageEvidence).toBe('confirmed_adult');
  });

  test('a failed count fails closed — never reports a fake zero as safety', async () => {
    const { db } = makeCountingDb({ 'safety_flags': 10 }, 'safety_flags');
    const result = await fetchSafetySource({ db, nowMs: NOW });
    expect(result.state).toBe('error');
    expect(result.openFlags).toBeNull();
    expect(result.openMinorFlags).toBeNull();
    expect(result).toMatchObject({
      openAgeUnverifiedFlags: null,
      openAgeUnavailableFlags: null,
      ageEvidence: 'unavailable',
    });
  });

  test('the lookback window covers at least a day', () => {
    expect(SAFETY_LOOKBACK_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });
});
