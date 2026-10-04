/** PM-252 п.2 (04.10): promoCodeRedeem — не больше 5 попыток за 10 минут на аккаунт и отдельно на IP. */
import * as admin from 'firebase-admin';
import {
  PROMO_REDEEM_RATE_LIMIT,
  consumePromoRedeemAttempt,
  decidePromoRate,
  promoRateDocId,
  promoRequestIp,
} from './promo_codes';

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

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

const T0 = 1_000_000_000_000;
const uid = { kind: 'uid' as const, id: 'stable-1' };
const ip = { kind: 'ip' as const, id: '203.0.113.7' };

test('five attempts pass, the sixth is refused with the time left until the window ends', async () => {
  const { db } = makeDb();
  for (let i = 0; i < PROMO_REDEEM_RATE_LIMIT.max; i += 1) await consumePromoRedeemAttempt(db, [uid, ip], T0 + i * 1000);
  await expect(consumePromoRedeemAttempt(db, [uid, ip], T0 + 60_000)).rejects.toMatchObject({
    code: 'resource-exhausted',
    message: 'promo_rate_limited',
    details: { retryAfterMs: PROMO_REDEEM_RATE_LIMIT.windowMs - 60_000 },
  });
  expect(console.warn).toHaveBeenCalledWith('[PROMO-RATE] blocked', expect.stringContaining('"kind":"uid"'));
});

test('after the window the pause ends', async () => {
  const { db } = makeDb();
  for (let i = 0; i < 6; i += 1) await consumePromoRedeemAttempt(db, [uid], T0).catch(() => undefined);
  await expect(consumePromoRedeemAttempt(db, [uid], T0 + PROMO_REDEEM_RATE_LIMIT.windowMs)).resolves.toBeUndefined();
});

test('one IP across many accounts is limited too', async () => {
  const { db } = makeDb();
  for (let i = 0; i < 5; i += 1) await consumePromoRedeemAttempt(db, [{ kind: 'uid', id: `acc-${i}` }, ip], T0);
  await expect(consumePromoRedeemAttempt(db, [{ kind: 'uid', id: 'acc-new' }, ip], T0)).rejects.toMatchObject({ message: 'promo_rate_limited' });
});

test('a refused attempt is not counted against the other key', async () => {
  const { db, store } = makeDb();
  for (let i = 0; i < 5; i += 1) await consumePromoRedeemAttempt(db, [ip], T0);
  await consumePromoRedeemAttempt(db, [uid, ip], T0).catch(() => undefined);
  expect(store.has(promoRateDocId(uid))).toBe(false);
});

test('counter ids carry no raw uid or IP', () => {
  expect(promoRateDocId(ip)).toMatch(/^[a-f0-9]{64}$/);
  expect(promoRateDocId(ip)).not.toContain('203.0.113.7');
});

test('pure decision and IP extraction', () => {
  expect(decidePromoRate(undefined, T0)).toMatchObject({ allowed: true, count: 1, windowStartMs: T0 });
  expect(decidePromoRate({ count: 5, windowStartMs: T0 }, T0 + 1)).toMatchObject({ allowed: false });
  expect(promoRequestIp({ headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }, ip: '10.0.0.2' })).toBe('198.51.100.1');
  expect(promoRequestIp({ ip: '10.0.0.2' })).toBe('10.0.0.2');
  expect(promoRequestIp(undefined)).toBe('');
});
