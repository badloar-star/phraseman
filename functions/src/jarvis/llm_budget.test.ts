import { checkAndReserveBudget, recordActualSpend, MONTHLY_CAP_USD, dailyCapUsd } from './llm_budget';

const NOW = new Date('2026-08-15T12:00:00Z').getTime();

function makeDb(initial: Record<string, unknown> = {}) {
  const store = new Map<string, Record<string, unknown>>(Object.entries(initial) as never);
  const db = {
    doc: (path: string) => ({
      path,
      get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async (ref: { path: string }) => ({
          exists: store.has(ref.path), data: () => store.get(ref.path),
        }),
        set: (ref: { path: string }, value: Record<string, unknown>, opts?: { merge?: boolean }) => {
          const prev = opts?.merge ? (store.get(ref.path) ?? {}) : {};
          store.set(ref.path, { ...prev, ...value });
        },
      };
      return fn(tx);
    },
  } as unknown as FirebaseFirestore.Firestore;
  return { db, store };
}

describe('Jarvis LLM budget — money must be a hard technical ceiling, not a promise', () => {
  test('an empty month allows a reasonable reservation', async () => {
    const { db } = makeDb();
    const verdict = await checkAndReserveBudget({ db, nowMs: NOW, estimatedCostUsd: 0.05 });
    expect(verdict.allowed).toBe(true);
  });

  test('refuses a reservation that would cross the monthly cap', async () => {
    const { db } = makeDb({
      'jarvis_llm_budget/2026-08': { spentUsd: MONTHLY_CAP_USD - 0.01 },
    });
    const verdict = await checkAndReserveBudget({ db, nowMs: NOW, estimatedCostUsd: 0.05 });
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('monthly_cap');
  });

  test('refuses a reservation that would cross the daily share of the monthly cap', async () => {
    // зачем: без дневного потолка одна дорогая ночь съедает весь месяц сразу.
    const { db } = makeDb({
      'jarvis_llm_budget/2026-08': { spentUsd: 0, dailySpentUsd: { '2026-08-15': dailyCapUsd() - 0.001 } },
    });
    const verdict = await checkAndReserveBudget({ db, nowMs: NOW, estimatedCostUsd: 0.01 });
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('daily_cap');
  });

  test('a Firestore failure refuses spending rather than allowing it silently', async () => {
    // зачем fail-closed: недоступный счётчик не должен читаться как «бюджет цел».
    const broken = {
      doc: () => ({ get: async () => { throw new Error('down'); } }),
      runTransaction: async () => { throw new Error('down'); },
    } as unknown as FirebaseFirestore.Firestore;
    const verdict = await checkAndReserveBudget({ db: broken, nowMs: NOW, estimatedCostUsd: 0.01 });
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('storage_error');
  });

  test('recording actual spend increases both monthly and daily counters', async () => {
    const { db, store } = makeDb();
    await recordActualSpend({ db, nowMs: NOW, actualCostUsd: 0.03 });
    const doc = store.get('jarvis_llm_budget/2026-08');
    expect(doc?.spentUsd).toBeCloseTo(0.03);
    expect((doc?.dailySpentUsd as Record<string, number>)['2026-08-15']).toBeCloseTo(0.03);
  });

  test('recording spend accumulates across multiple calls in the same month', async () => {
    const { db, store } = makeDb({ 'jarvis_llm_budget/2026-08': { spentUsd: 0.10, dailySpentUsd: { '2026-08-15': 0.10 } } });
    await recordActualSpend({ db, nowMs: NOW, actualCostUsd: 0.02 });
    const doc = store.get('jarvis_llm_budget/2026-08');
    expect(doc?.spentUsd).toBeCloseTo(0.12);
  });

  test('the daily cap is roughly the monthly cap spread over the month', () => {
    // зачем ~1/28, а не /30 или /31: худший месяц (февраль) не должен получить
    // завышенный дневной кап только потому, что в нём меньше дней.
    expect(dailyCapUsd()).toBeCloseTo(MONTHLY_CAP_USD / 28, 2);
  });

  test('the monthly cap matches the budget the owner explicitly approved', () => {
    expect(MONTHLY_CAP_USD).toBeLessThanOrEqual(55);
    expect(MONTHLY_CAP_USD).toBeGreaterThanOrEqual(45);
  });
});
