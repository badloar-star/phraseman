// зачем (владелец 18.10: «не больше 20 $ в день в принципе»): общий дневной потолок расходов — порог, флаг «платное выключено»,
// шарды, кэш суммы, оценка по модели, fail-open; и разбор уведомления бюджета Cloud Billing для аварийного выключателя.
import * as admin from 'firebase-admin';
import { estimateSpendCents, reserveDailySpend, resetSpendCapStateForTest, utcDateKey } from './spend_cap';
import { parseBillingBudgetNotice, shouldDisablePaid } from './spend_cap_billing_kill_switch';

jest.mock('firebase-admin', () => {
  const increment = (n: number) => ({ __inc: n });
  const firestore = Object.assign(jest.fn(), { FieldValue: { increment }, Timestamp: { fromMillis: (ms: number) => ({ ms }) } });
  return { firestore };
});

type Data = Record<string, unknown>;
function makeDb(config: Data | null = null) {
  const docs = new Map<string, Data>();
  if (config) docs.set('spend_cap_config/global', config);
  const ref = (col: string, id: string) => ({
    path: `${col}/${id}`,
    get: async () => ({ data: () => docs.get(`${col}/${id}`) }),
    set: async (d: Data) => {
      const prev = docs.get(`${col}/${id}`) ?? {};
      const next: Data = { ...prev };
      for (const [k, v] of Object.entries(d)) next[k] = v && typeof v === 'object' && '__inc' in (v as Data) ? Number(prev[k] ?? 0) + Number((v as { __inc: number }).__inc) : v;
      docs.set(`${col}/${id}`, next);
    },
  });
  const db = {
    collection: (col: string) => ({ doc: (id: string) => ref(col, id) }),
    getAll: async (...refs: { path: string }[]) => refs.map((r) => ({ data: () => docs.get(r.path) })),
  };
  return { db: db as unknown as admin.firestore.Firestore, docs };
}

beforeEach(() => { resetSpendCapStateForTest(); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

const T0 = Date.UTC(2026, 9, 18, 10, 0, 0);
const shardsTotal = (docs: Map<string, Data>, date: string) => [...docs.entries()].filter(([k]) => k.startsWith(`spend_daily_shards/${date}_`)).reduce((s, [, v]) => s + Number(v.cents ?? 0), 0);

test('оценка по модели: дешёвая модель дешевле, неизвестная — по самой дорогой; речь и картинка — фиксированно', () => {
  expect(estimateSpendCents({ kind: 'chat', model: 'gpt-4o-mini', inTokens: 1_000_000, outTokens: 0 })).toBe(15);
  expect(estimateSpendCents({ kind: 'chat', model: 'gpt-4.1-mini-2025', inTokens: 0, outTokens: 1_000_000 })).toBe(160);
  expect(estimateSpendCents({ kind: 'chat', model: 'unknown-x', inTokens: 1_000_000, outTokens: 0 })).toBe(250);
  expect(estimateSpendCents({ kind: 'tts' })).toBeGreaterThan(0);
  expect(estimateSpendCents({ kind: 'image' })).toBeGreaterThan(estimateSpendCents({ kind: 'tts' }));
});

test('вызовы прибавляют центы к шардам дня; при достижении порога — отказ daily_spend_cap', async () => {
  const { db, docs } = makeDb({ dailyLimitCents: 3, estimateCentsByFn: { t: 1 } });
  await reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 });
  await reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 + 1 });
  await reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 + 2 });
  expect(shardsTotal(docs, utcDateKey(T0))).toBe(3);
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 + 3 })).rejects.toMatchObject({ code: 'resource-exhausted', message: 'daily_spend_cap' });
});

test('другой инстанс видит сумму дня из шардов (после истечения кэша)', async () => {
  const { db } = makeDb({ dailyLimitCents: 2, estimateCentsByFn: { t: 1 } });
  await reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 });
  await reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 + 1 });
  resetSpendCapStateForTest(); // новый инстанс: кэш пуст
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 + 2 })).rejects.toMatchObject({ message: 'daily_spend_cap' });
});

test('новые UTC-сутки — счётчик с нуля', async () => {
  const { db } = makeDb({ dailyLimitCents: 1, estimateCentsByFn: { t: 1 } });
  await reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 });
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 + 1 })).rejects.toBeTruthy();
  const nextDay = T0 + 24 * 60 * 60 * 1000;
  resetSpendCapStateForTest();
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: nextDay })).resolves.toMatchObject({ dateKey: utcDateKey(nextDay) });
});

test('флаг paidDisabled — отказ сразу; enabled:false — потолок выключен', async () => {
  const off = makeDb({ paidDisabled: true, paidDisabledReason: 'billing' });
  await expect(reserveDailySpend({ db: off.db, fn: 't', kind: 'chat', nowMs: T0 })).rejects.toMatchObject({ message: 'daily_spend_cap' });
  resetSpendCapStateForTest();
  const disabled = makeDb({ enabled: false, dailyLimitCents: 0.0001 });
  await expect(reserveDailySpend({ db: disabled.db, fn: 't', kind: 'chat', nowMs: T0 })).resolves.toBeNull();
});

test('сбой чтения счётчика — пропуск (fail-open), вызов не роняется', async () => {
  const { db } = makeDb({ dailyLimitCents: 100 });
  (db as unknown as { getAll: () => Promise<never> }).getAll = async () => { throw new Error('unavailable'); };
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 })).resolves.toBeNull();
});

test('уведомление бюджета Billing: ≥100 % выключает платное, меньше — нет, мусор — игнор', () => {
  const at100 = parseBillingBudgetNotice({ budgetDisplayName: 'daily', costAmount: 20.1, budgetAmount: 20, alertThresholdExceeded: 1.0 })!;
  expect(shouldDisablePaid(at100)).toBe(true);
  const at50 = parseBillingBudgetNotice({ budgetDisplayName: 'daily', costAmount: 10, budgetAmount: 20, alertThresholdExceeded: 0.5 })!;
  expect(shouldDisablePaid(at50)).toBe(false);
  expect(parseBillingBudgetNotice({ costAmount: 'x' })).toBeNull();
});
