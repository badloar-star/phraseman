import { fetchRetentionSource, RETENTION_WEEK_MS, RETENTION_MONTH_MS } from './retention_firestore_fetcher';

const NOW = 1_800_000_000_000;

function makeCollection(counts: Record<string, number>, failing = false) {
  const make = (key: string): unknown => ({
    where: (field: string, op: string, value: unknown) => make(`${key}|${field}${op}${String(value)}`),
    count: () => ({
      get: async () => {
        if (failing) throw new Error('unavailable');
        return { data: () => ({ count: counts[key] ?? 0 }) };
      },
    }),
  });
  return make('users') as unknown as FirebaseFirestore.CollectionReference;
}

const WEEK_KEY = `users|last_active_at>=${NOW - RETENTION_WEEK_MS}`;
const MONTH_KEY = `users|last_active_at>=${NOW - RETENTION_MONTH_MS}`;

describe('Jarvis retention fetcher — who came back, counted on the server', () => {
  test('counts weekly and monthly actives without downloading users', async () => {
    const result = await fetchRetentionSource({
      collection: makeCollection({ [WEEK_KEY]: 300, [MONTH_KEY]: 1000 }),
      nowMs: NOW,
    });
    expect(result.state).toBe('ready');
    expect(result.activeWeek).toBe(300);
    expect(result.activeMonth).toBe(1000);
  });

  test('weekly actives can never exceed monthly — a broken counter cannot invent loyalty', async () => {
    const result = await fetchRetentionSource({
      collection: makeCollection({ [WEEK_KEY]: 900, [MONTH_KEY]: 100 }),
      nowMs: NOW,
    });
    // Неделя входит в месяц: 900 из 100 невозможно, значит счётчику веры нет.
    expect(result.activeWeek).toBeLessThanOrEqual(result.activeMonth ?? 0);
  });

  test('an empty base is empty, not a retention crisis', async () => {
    const result = await fetchRetentionSource({ collection: makeCollection({}), nowMs: NOW });
    expect(result.state).toBe('empty');
    expect(result.activeMonth).toBe(0);
  });

  test('a failed count reports nothing rather than a fake collapse', async () => {
    const result = await fetchRetentionSource({ collection: makeCollection({}, true), nowMs: NOW });
    expect(result.state).toBe('error');
    expect(result.activeWeek).toBeNull();
    expect(result.activeMonth).toBeNull();
  });

  test('the week window is a week and the month window is a month', () => {
    expect(RETENTION_WEEK_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(RETENTION_MONTH_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
