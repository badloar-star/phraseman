// зачем (координатор 18.10, защита от накрутки счёта): окно вызовов на uid и IP — счёт, сброс окна, IP из x-forwarded-for,
// отказ с понятным кодом, хранение только хешей; пропуск только при UNAVAILABLE, таймаут/конфликт — отказ (Ревизор 3.116).
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { callerIpFromRawRequest, callerIpInfoFromRawRequest, enforceCallerRateWindow, enforceLocalCallerWindow, ipRateKey, resetCallerRateWindowStateForTest } from './caller_rate_window';

type Data = Record<string, unknown>;
function makeDb() {
  const store = new Map<string, Data>();
  const ref = (id: string) => ({ id });
  const db = {
    collection: () => ({ doc: (id: string) => ref(id) }),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const writes: Array<[string, Data]> = [];
      const tx = {
        get: async (r: { id: string }) => ({ exists: store.has(r.id), data: () => store.get(r.id) }),
        set: (r: { id: string }, d: Data) => writes.push([r.id, d]),
      };
      const out = await fn(tx);
      writes.forEach(([id, d]) => store.set(id, d));
      return out;
    },
  };
  return { db: db as unknown as admin.firestore.Firestore, store };
}

beforeEach(() => { resetCallerRateWindowStateForTest(); jest.spyOn(console, 'warn').mockImplementation(() => undefined); jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

const T0 = 1_000_000_000_000;
const raw = (ip: string) => ({ headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });

test('IP — правый адрес x-forwarded-for без адресов инфраструктуры; подделка слева не меняет адрес', () => {
  expect(callerIpFromRawRequest(raw('203.0.113.7'))).toBe('203.0.113.7');
  // Клиент прислал свой x-forwarded-for: фронт Google дописал реальный адрес справа.
  expect(callerIpFromRawRequest({ headers: { 'x-forwarded-for': '1.2.3.4, 9.9.9.9, 203.0.113.7' } })).toBe('203.0.113.7');
  expect(callerIpFromRawRequest({ headers: { 'x-forwarded-for': '203.0.113.7, 35.191.10.20' } })).toBe('203.0.113.7');
  expect(callerIpFromRawRequest({ headers: { 'x-forwarded-for': 'мусор, [2001:db8::1]:443' } })).toBe('2001:db8::1');
  expect(callerIpFromRawRequest({ headers: { 'x-forwarded-for': '::ffff:203.0.113.8' } })).toBe('203.0.113.8');
  expect(callerIpInfoFromRawRequest({ headers: { 'x-forwarded-for': 'a, b, 203.0.113.7' } })).toMatchObject({ chainLength: 3, source: 'forwarded' });
  expect(callerIpFromRawRequest({ ip: '198.51.100.2' })).toBe('198.51.100.2');
  expect(callerIpFromRawRequest(undefined)).toBe('');
});

test('IPv6 считается по префиксу /64: смена адреса внутри сети абонента не обходит окно', async () => {
  expect(ipRateKey('2001:db8:aa:bb:1:2:3:4')).toBe('2001:db8:aa:bb::/64');
  expect(ipRateKey('2001:db8::5')).toBe('2001:db8:0:0::/64');
  expect(ipRateKey('203.0.113.7')).toBe('203.0.113.7');
  const { db } = makeDb();
  const v6 = (ip: string, nowMs: number) => enforceCallerRateWindow({ db, scope: 'dlg_turn', authUid: null, rawRequest: { headers: { 'x-forwarded-for': ip } }, maxPerUid: 0, maxPerIp: 2, nowMs });
  await v6('2001:db8:aa:bb::1', T0);
  await v6('2001:db8:aa:bb::2', T0 + 1);
  await expect(v6('2001:db8:aa:bb:ffff::9', T0 + 2)).rejects.toMatchObject({ code: 'resource-exhausted' });
  await expect(v6('2001:db8:aa:cc::1', T0 + 3)).resolves.toBeUndefined();
});

test('предфильтр: ключ, упёршийся в потолок, отбивается без транзакции', async () => {
  const { db } = makeDb();
  const holder = db as unknown as { runTransaction: (fn: unknown) => Promise<unknown> };
  const real = holder.runTransaction;
  let txCalls = 0;
  holder.runTransaction = (fn) => { txCalls += 1; return real(fn); };
  const call = (nowMs: number) => enforceCallerRateWindow({ db, scope: 'ff_turn', authUid: 'u1', rawRequest: {}, maxPerUid: 1, maxPerIp: 0, nowMs });
  await call(T0);
  await expect(call(T0 + 1)).rejects.toMatchObject({ code: 'resource-exhausted' });
  await expect(call(T0 + 2)).rejects.toMatchObject({ code: 'resource-exhausted' });
  expect(txCalls).toBe(1);
});

test('потолок на uid: третий вызов в окне отказан resource-exhausted, после окна снова можно', async () => {
  const { db } = makeDb();
  const call = (nowMs: number) => enforceCallerRateWindow({ db, scope: 'ff_turn', authUid: 'u1', rawRequest: raw('203.0.113.7'), maxPerUid: 2, maxPerIp: 100, nowMs });
  await call(T0);
  await call(T0 + 1000);
  await expect(call(T0 + 2000)).rejects.toMatchObject({ code: 'resource-exhausted', message: 'ff_turn_rate_limited' });
  await expect(call(T0 + 60 * 60 * 1000 + 1)).resolves.toBeUndefined();
});

test('потолок на IP: разные uid с одного адреса упираются в окно IP (ферма анонимных аккаунтов)', async () => {
  const { db } = makeDb();
  for (let i = 0; i < 3; i += 1) {
    await enforceCallerRateWindow({ db, scope: 'dlg_turn', authUid: `u${i}`, rawRequest: raw('203.0.113.9'), maxPerUid: 0, maxPerIp: 3, nowMs: T0 + i });
  }
  const refused = enforceCallerRateWindow({ db, scope: 'dlg_turn', authUid: 'u9', rawRequest: raw('203.0.113.9'), maxPerUid: 0, maxPerIp: 3, nowMs: T0 + 10 });
  await expect(refused).rejects.toBeInstanceOf(HttpsError);
  await expect(enforceCallerRateWindow({ db, scope: 'dlg_turn', authUid: 'u9', rawRequest: raw('198.51.100.1'), maxPerUid: 0, maxPerIp: 3, nowMs: T0 + 11 })).resolves.toBeUndefined();
});

test('в хранилище только хеши: ни IP, ни uid в ключах и полях', async () => {
  const { db, store } = makeDb();
  await enforceCallerRateWindow({ db, scope: 'ensure_link', authUid: 'secret-uid', rawRequest: raw('203.0.113.7'), maxPerUid: 5, maxPerIp: 5, nowMs: T0 });
  const dump = JSON.stringify([...store.entries()]);
  expect(store.size).toBe(2);
  expect(dump).not.toContain('secret-uid');
  expect(dump).not.toContain('203.0.113.7');
});

test('без IP и без потолка uid — пропуск; Firestore UNAVAILABLE — пропуск; таймаут и конфликт — отказ «занято»', async () => {
  const { db } = makeDb();
  await expect(enforceCallerRateWindow({ db, scope: 'dlg_start', authUid: 'u1', rawRequest: {}, maxPerUid: 0, maxPerIp: 5, nowMs: T0 })).resolves.toBeUndefined();
  const failing = (error: Error) => ({ collection: () => ({ doc: (id: string) => ({ id }) }), runTransaction: async () => { throw error; } } as unknown as admin.firestore.Firestore);
  const call = (db2: admin.firestore.Firestore) => enforceCallerRateWindow({ db: db2, scope: 'dlg_start', authUid: 'u1', rawRequest: raw('203.0.113.7'), maxPerUid: 1, maxPerIp: 1, nowMs: T0 });
  await expect(call(failing(Object.assign(new Error('14 UNAVAILABLE'), { code: 14 })))).resolves.toBeUndefined();
  await expect(call(failing(Object.assign(new Error('10 ABORTED: too much contention'), { code: 10 })))).rejects.toMatchObject({ code: 'unavailable', message: 'rate_window_busy' });
  await expect(call(failing(new Error('caller_rate_window_timeout')))).rejects.toMatchObject({ code: 'unavailable', message: 'rate_window_busy' });
});

// зачем: вход не должен падать (владелец 18.10) — у привязки входа окно в базе заменено счётчиком в памяти экземпляра.
test('счётчик в памяти: без базы, отказ только после порога на этом экземпляре, после окна снова можно', () => {
  const call = (nowMs: number) => enforceLocalCallerWindow({ scope: 'ensure_link', authUid: 'u-local', maxPerUid: 3, nowMs });
  call(T0); call(T0 + 1); call(T0 + 2);
  expect(() => call(T0 + 3)).toThrow(expect.objectContaining({ code: 'resource-exhausted', message: 'ensure_link_rate_limited' }));
  expect(() => call(T0 + 60 * 60 * 1000 + 5)).not.toThrow();
  // без uid — пропуск
  expect(() => enforceLocalCallerWindow({ scope: 'ensure_link', authUid: null, maxPerUid: 1, nowMs: T0 })).not.toThrow();
});
