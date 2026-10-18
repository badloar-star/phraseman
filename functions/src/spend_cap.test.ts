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

test('сбои чтения суммы: UNAVAILABLE — пропуск; таймаут без суммы в памяти — отказ «занято»; с суммой — по памяти', async () => {
  const { db } = makeDb({ dailyLimitCents: 100 });
  const holder = db as unknown as { getAll: (...a: unknown[]) => Promise<unknown> };
  holder.getAll = async () => { throw Object.assign(new Error('14 UNAVAILABLE'), { code: 14 }); };
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 })).resolves.toBeNull();
  resetSpendCapStateForTest();
  holder.getAll = async () => { throw new Error('spend_cap_timeout_total'); };
  await expect(reserveDailySpend({ db, fn: 't', kind: 'chat', nowMs: T0 })).rejects.toMatchObject({ code: 'unavailable', message: 'spend_cap_busy' });
  // Сумма дня уже была в памяти и у порога — таймаут не открывает дверь.
  resetSpendCapStateForTest();
  const near = makeDb({ dailyLimitCents: 1 });
  await near.docs.set('spend_daily_shards/' + utcDateKey(T0) + '_0', { cents: 0.99 });
  await reserveDailySpend({ db: near.db, fn: 't', kind: 'chat', model: 'gpt-4.1-nano', inTokens: 10, outTokens: 10, nowMs: T0 });
  (near.db as unknown as { getAll: () => Promise<never> }).getAll = async () => { throw new Error('spend_cap_timeout_total'); };
  await expect(reserveDailySpend({ db: near.db, fn: 't', kind: 'chat', nowMs: T0 + 60_000 })).rejects.toMatchObject({ message: 'daily_spend_cap' });
});

test('выше 80 % порога сумма перечитывается через 10 с, ниже — держится 45 с', async () => {
  const { db, docs } = makeDb({ dailyLimitCents: 100 });
  const reads: number[] = [];
  const holder = db as unknown as { getAll: (...a: { path: string }[]) => Promise<unknown> };
  const realGetAll = holder.getAll;
  holder.getAll = async (...refs) => { reads.push(1); return realGetAll(...refs); };
  const date = utcDateKey(T0);
  docs.set(`spend_daily_shards/${date}_0`, { cents: 50 });
  await reserveDailySpend({ db, fn: 't', kind: 'tts', nowMs: T0 });
  await reserveDailySpend({ db, fn: 't', kind: 'tts', nowMs: T0 + 15_000 });
  expect(reads.length).toBe(1); // 50 % — кэш 45 с
  docs.set(`spend_daily_shards/${date}_0`, { cents: 85 });
  await reserveDailySpend({ db, fn: 't', kind: 'tts', nowMs: T0 + 46_000 });
  expect(reads.length).toBe(2);
  await reserveDailySpend({ db, fn: 't', kind: 'tts', nowMs: T0 + 57_000 });
  expect(reads.length).toBe(3); // 85 % — перечитали через 11 с
});

test('уведомление бюджета Billing: ≥100 % выключает платное, меньше — нет, мусор — игнор', () => {
  const at100 = parseBillingBudgetNotice({ budgetDisplayName: 'daily', costAmount: 20.1, budgetAmount: 20, alertThresholdExceeded: 1.0 })!;
  expect(shouldDisablePaid(at100)).toBe(true);
  const at50 = parseBillingBudgetNotice({ budgetDisplayName: 'daily', costAmount: 10, budgetAmount: 20, alertThresholdExceeded: 0.5 })!;
  expect(shouldDisablePaid(at50)).toBe(false);
  expect(parseBillingBudgetNotice({ costAmount: 'x' })).toBeNull();
});
