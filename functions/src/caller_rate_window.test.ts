// зачем (координатор 18.10, защита от накрутки счёта): окно вызовов на uid и IP — счёт, сброс окна, IP из x-forwarded-for,
// отказ с понятным кодом, хранение только хешей и fail-open при сбое Firestore.
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { callerIpFromRawRequest, enforceCallerRateWindow } from './caller_rate_window';

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

beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

const T0 = 1_000_000_000_000;
const raw = (ip: string) => ({ headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });

test('IP берётся из первого адреса x-forwarded-for, иначе из rawRequest.ip', () => {
  expect(callerIpFromRawRequest(raw('203.0.113.7'))).toBe('203.0.113.7');
  expect(callerIpFromRawRequest({ ip: '198.51.100.2' })).toBe('198.51.100.2');
  expect(callerIpFromRawRequest(undefined)).toBe('');
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

test('без IP и без потолка uid — пропуск; сбой транзакции — fail-open, вызов проходит', async () => {
  const { db } = makeDb();
  await expect(enforceCallerRateWindow({ db, scope: 'dlg_start', authUid: 'u1', rawRequest: {}, maxPerUid: 0, maxPerIp: 5, nowMs: T0 })).resolves.toBeUndefined();
  const broken = { collection: () => ({ doc: (id: string) => ({ id }) }), runTransaction: async () => { throw new Error('unavailable'); } } as unknown as admin.firestore.Firestore;
  await expect(enforceCallerRateWindow({ db: broken, scope: 'dlg_start', authUid: 'u1', rawRequest: raw('203.0.113.7'), maxPerUid: 1, maxPerIp: 1, nowMs: T0 })).resolves.toBeUndefined();
});
