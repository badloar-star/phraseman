import { createHash } from 'node:crypto';
import {
  COIN_WALLET_LIMITS,
  EMPTY_COIN_WALLET_LIMITS,
  applyCoinWalletLimits,
  classifyCoinWalletSource,
} from './coin_wallet_policy';
import {
  assertLevelSpinStarOwner,
  classifyLevelSpinStarComposite,
  levelSpinStarGrant,
  levelSpinStarLedgerOperation,
  materializeCoinWalletOperation,
  parseLevelSpinStarComposite,
  type LevelSpinStarComposite,
} from './level_spin_star_grant';

// зачем: серверный кошелёк монет, спины удалены (владелец 01.10, Q13).
// Сторож: белый список источников, лимиты, идемпотентность, запись в stars_ledger.

const AMOUNTS: Record<string, number> = {
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100, stars_250: 250,
  stars_500: 500, stars_1000: 1_000, stars_2000: 2_000,
};
const HASH32 = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const MONDAY = Date.parse('2026-09-28T12:00:00.000Z');

type Over = Partial<LevelSpinStarComposite>;

function composite(over: Over = {}): LevelSpinStarComposite {
  const lane = over.lane ?? 'base';
  const requestId = over.requestId ?? 'report_reward_msg0000000001';
  const giftId = over.giftId ?? 'stars_1000';
  const createdAtMs = over.createdAtMs ?? MONDAY;
  const promotionEligibility = 'promotionEligibility' in over
    ? over.promotionEligibility
    : 'excluded_compensation';
  const base = AMOUNTS[giftId] ?? 0;
  const amount = over.amount ?? (promotionEligibility === 'gameplay'
    && new Date(createdAtMs).getUTCDay() === 0 ? base * 2 : base);
  const ownerStableId = over.ownerStableId ?? 'account-a';
  const operationId = `level_spin:${requestId}.${lane}`;
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId, requestId, lane, deliveryToken: null, giftId, amount,
    ...(promotionEligibility === undefined ? {} : { promotionEligibility }),
    reason: 'level_spin_star_reward',
  })).digest('hex');
  return Object.freeze({
    schemaVersion: 'client-level-spin-star-operation.v1', operationId, ownerStableId,
    requestId, lane, giftId, amount,
    ...(promotionEligibility ? { promotionEligibility } : {}),
    reason: 'level_spin_star_reward', createdAtMs, requestFingerprint,
    grant: Object.freeze({ kind: 'star_credit', subjectId: operationId, payload: Object.freeze({
      requestId, lane, giftId, amount,
    }) }),
  }) as LevelSpinStarComposite;
}

/** Минимальный Firestore в памяти: только то, что трогает кошелёк и stars_ledger. */
function makeDb(userExists = true) {
  const docs = new Map<string, Record<string, unknown>>();
  if (userExists) docs.set('users/account-a', {});
  const ref = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  let reads = 0;
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      const pending: Array<() => void> = [];
      const tx = {
        get: async (r: any) => {
          reads += 1;
          const data = docs.get(r.path);
          return { exists: data !== undefined, ref: r, id: r.id, data: () => data };
        },
        set: (r: any, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
          pending.push(() => docs.set(r.path, opts?.merge ? { ...(docs.get(r.path) ?? {}), ...data } : data));
        },
        create: (r: any, data: Record<string, unknown>) => {
          pending.push(() => {
            if (docs.has(r.path)) throw new Error('already exists');
            docs.set(r.path, data);
          });
        },
      };
      const result = await fn(tx);
      pending.forEach((apply) => apply());
      return result;
    },
  };
  return { db, docs, reads: () => reads };
}

async function credit(world: ReturnType<typeof makeDb>, value: LevelSpinStarComposite, nowMs = MONDAY) {
  const parsed = parseLevelSpinStarComposite(value);
  const classification = classifyLevelSpinStarComposite(parsed);
  return materializeCoinWalletOperation(world.db, {
    authUid: 'auth-a', stableUid: 'account-a', composite: parsed, classification, nowMs,
  });
}

const invoke = (auth: { uid: string; token: Record<string, unknown> } | undefined, data: unknown) => (
  levelSpinStarGrant.run({
    auth, data, rawRequest: { headers: {} }, app: undefined, instanceIdToken: undefined,
  } as never)
);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('requires auth before anything else', async () => {
  await expect(invoke(undefined, { operation: composite() }))
    .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
});

test('white list: report and daily journey are the only sources (D148: g2c* compensation retired)', () => {
  expect(classifyCoinWalletSource('report_reward_msg0000000001').source).toBe('report_reward');
  expect(classifyCoinWalletSource(`dailyjourney_${HASH32}_1`).source).toBe('daily_journey');
  expect(() => classifyCoinWalletSource(`g2c1_${HASH32}_3`)).toThrow('coin_wallet_source_not_allowed');
  expect(() => classifyCoinWalletSource(`g2cdj_${HASH32}_2`)).toThrow('coin_wallet_source_not_allowed');
});

test.each([
  ['level spin request id', 'request0000000001'],
  ['quest reward', 'quest_daily_lesson_0_1'],
  ['referral-looking id', 'referral_spin_0000000001'],
  ['prefix lookalike', 'xreport_reward_msg000001'],
])('unknown source is rejected with a clear code: %s', async (_name, requestId) => {
  const world = makeDb();
  await expect(credit(world, composite({ requestId })))
    .rejects.toMatchObject({ code: 'permission-denied', message: 'coin_wallet_source_not_allowed' });
  expect(world.reads()).toBe(0);
  expect(world.docs.size).toBe(1);
});

test('credit writes one stars_ledger receipt, updates the balance and the limit counters', async () => {
  const world = makeDb();
  const ack = await credit(world, composite());
  expect(ack).toMatchObject({ materialized: true, replayed: false, starsBalance: 1_000, starsSeq: 1 });
  const receipt = world.docs.get('users/account-a/star_operations/level_spin:report_reward_msg0000000001.base');
  expect(receipt).toMatchObject({
    delta: 1_000, reason: 'level_spin_grant', sourceKind: 'level_spin_client_composite',
    sourceId: 'report_reward_msg0000000001.base',
  });
  const user = world.docs.get('users/account-a') as Record<string, any>;
  expect(user.stars.balance).toBe(1_000);
  expect(user.coinWalletLimitsV1).toMatchObject({ reportDayKey: '2026-09-28', reportDayCoins: 1_000 });
});

test('idempotent: a repeat returns the prior result and never credits twice', async () => {
  const world = makeDb();
  const value = composite({ requestId: `dailyjourney_${HASH32}_1`, giftId: 'stars_500', promotionEligibility: 'gameplay' });
  const first = await credit(world, value);
  const second = await credit(world, value);
  expect(first.replayed).toBe(false);
  expect(second).toMatchObject({ replayed: true, starsBalance: 500, starsSeq: first.starsSeq });
  const user = world.docs.get('users/account-a') as Record<string, any>;
  expect(user.stars.balance).toBe(500);
  expect(user.coinWalletLimitsV1.journeyDayCoins).toBe(500);
});

test('a forged receipt with another amount conflicts instead of replaying', async () => {
  const world = makeDb();
  const value = composite();
  const parsed = parseLevelSpinStarComposite(value);
  world.docs.set(`users/account-a/star_operations/${parsed.operationId}`, {
    ...levelSpinStarLedgerOperation(parsed), delta: 250,
  });
  await expect(credit(world, value))
    .rejects.toMatchObject({ code: 'already-exists', message: 'level_spin_star_operation_conflict' });
});

test('report: per-reward total is capped at 1000 across both lanes', async () => {
  const world = makeDb();
  await credit(world, composite({ requestId: 'report_reward_msg0000000002', giftId: 'stars_1000' }));
  await expect(credit(world, composite({
    requestId: 'report_reward_msg0000000002', lane: 'premium', giftId: 'stars_100',
  }))).rejects.toMatchObject({ code: 'invalid-argument', message: 'coin_wallet_amount_over_limit' });
  const ok = makeDb();
  await credit(ok, composite({ requestId: 'report_reward_msg0000000003', giftId: 'stars_500' }));
  const premium = await credit(ok, composite({
    requestId: 'report_reward_msg0000000003', lane: 'premium', giftId: 'stars_100',
  }));
  expect(premium.starsBalance).toBe(600);
});

test.each([
  ['report gift outside the tier table', { giftId: 'stars_2000' as const }],
  ['report premium lane with a base gift', { lane: 'premium' as const, giftId: 'stars_1000' as const }],
  ['report marked as gameplay', { promotionEligibility: 'gameplay' as const }],
  ['journey on the premium lane', { requestId: `dailyjourney_${HASH32}_1`, lane: 'premium' as const, giftId: 'stars_100' as const, promotionEligibility: 'gameplay' as const }],
  ['journey with a non-denomination gift', { requestId: `dailyjourney_${HASH32}_1`, giftId: 'stars_2000' as const, promotionEligibility: 'gameplay' as const }],
])('shape outside the source table is rejected: %s', async (_name, over) => {
  const world = makeDb();
  await expect(credit(world, composite(over))).rejects.toMatchObject({ code: 'invalid-argument' });
  expect(world.reads()).toBe(0);
});

test('daily journey: a UTC day is capped at 2000, the next day opens again', async () => {
  const world = makeDb();
  await credit(world, composite({ requestId: `dailyjourney_${HASH32}_1`, giftId: 'stars_1000', promotionEligibility: 'gameplay' }));
  await credit(world, composite({ requestId: `dailyjourney_${HASH32}_2`, giftId: 'stars_1000', promotionEligibility: 'gameplay' }));
  const third = composite({ requestId: `dailyjourney_${HASH32}_3`, giftId: 'stars_10', promotionEligibility: 'gameplay' });
  await expect(credit(world, third))
    .rejects.toMatchObject({ code: 'resource-exhausted', message: 'coin_wallet_daily_limit_reached' });
  const nextDay = await credit(world, third, MONDAY + 24 * 60 * 60 * 1_000);
  expect(nextDay.starsBalance).toBe(2_010);
});

test('gift compensation (g2c*) is rejected by the server: the migration was cancelled by D148', async () => {
  const world = makeDb();
  for (const requestId of [`g2c1_${HASH32}_1`, `g2cdj_${HASH32}_1`]) {
    await expect(credit(world, composite({ requestId, giftId: 'stars_2000' })))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'coin_wallet_source_not_allowed' });
  }
  expect(world.reads()).toBe(0);
});

test('missing owner document and foreign owner are rejected', async () => {
  await expect(credit(makeDb(false), composite()))
    .rejects.toMatchObject({ code: 'failed-precondition', message: 'level_spin_star_owner_missing' });
  expect(() => assertLevelSpinStarOwner('account-b', parseLevelSpinStarComposite(composite())))
    .toThrow('level_spin_star_owner_mismatch');
});

test('malformed or self-inconsistent composites never reach the source check', () => {
  const exact = composite();
  expect(() => parseLevelSpinStarComposite({ ...exact, mintedByClient: true })).toThrow('level_spin_star_composite_invalid');
  expect(() => parseLevelSpinStarComposite({ ...exact, amount: 5_000 })).toThrow('level_spin_star_composite_invalid');
  expect(() => parseLevelSpinStarComposite({ ...exact, requestFingerprint: 'a'.repeat(64) }))
    .toThrow('level_spin_star_fingerprint_invalid');
});

// зачем (владелец 22.10 через координатора): 40 монет за первую сдачу экзамена главы Learning V2 — две операции stars_20,
// урок и глава только из курса, сумма зашита на сервере, повтор не начисляет второй раз.
describe('chapter exam source (chapterexam_l<УУ>_c<Г>_<1|2>)', () => {
  const exam = (requestId: string, over: Over = {}) => composite({ requestId, giftId: 'stars_20', promotionEligibility: 'gameplay', ...over });

  test('both parts credit 40 coins in total and count against the chapter exam day limit', async () => {
    const world = makeDb();
    expect(classifyCoinWalletSource('chapterexam_l01_c2_1')).toEqual({ source: 'chapter_exam', subSource: 'exam_pass' });
    await credit(world, exam('chapterexam_l01_c2_1'));
    const second = await credit(world, exam('chapterexam_l01_c2_2'));
    expect(second.starsBalance).toBe(COIN_WALLET_LIMITS.chapterExamCoinsPerChapter);
    const user = world.docs.get('users/account-a') as Record<string, any>;
    expect(user.coinWalletLimitsV1).toMatchObject({ chapterExamDayKey: '2026-09-28', chapterExamDayCoins: 40 });
  });

  test('a repeat of the same part returns the prior result and never credits twice', async () => {
    const world = makeDb();
    const first = await credit(world, exam('chapterexam_l03_c7_1'));
    const again = await credit(world, exam('chapterexam_l03_c7_1'));
    expect(again).toMatchObject({ replayed: true, starsBalance: 20, starsSeq: first.starsSeq });
  });

  test.each([
    ['lesson outside the course', 'chapterexam_l33_c1_1'],
    ['lesson zero', 'chapterexam_l00_c1_1'],
    ['chapter outside the lesson', 'chapterexam_l01_c8_1'],
    ['chapter zero', 'chapterexam_l01_c0_1'],
  ])('number not in the course is rejected: %s', async (_name, requestId) => {
    await expect(credit(makeDb(), exam(requestId)))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'coin_wallet_source_shape_invalid' });
  });

  test.each([
    ['third part', 'chapterexam_l01_c1_3'],
    ['made-up format', 'chapterexam_lesson1_chapter1'],
    ['foreign prefix', 'chapterexamx_l01_c1_1'],
  ])('a request id outside the format is a foreign source: %s', async (_name, requestId) => {
    await expect(credit(makeDb(), exam(requestId)))
      .rejects.toMatchObject({ code: 'permission-denied', message: 'coin_wallet_source_not_allowed' });
  });

  test.each([
    ['amount other than 20 per part (stars_50)', { giftId: 'stars_50' as const }],
    ['amount other than 20 per part (stars_10)', { giftId: 'stars_10' as const }],
    ['premium lane', { lane: 'premium' as const }],
    ['compensation instead of gameplay', { promotionEligibility: 'excluded_compensation' as const }],
  ])('a shape other than 2 × 20 is rejected: %s', async (_name, over) => {
    await expect(credit(makeDb(), exam('chapterexam_l01_c1_1', over))).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('day limit: 14 chapters a day, the rest waits for the next UTC day', () => {
    const full = { ...EMPTY_COIN_WALLET_LIMITS, chapterExamDayKey: '2026-09-28', chapterExamDayCoins: COIN_WALLET_LIMITS.chapterExamMaxPerDay };
    const op = { requestId: 'chapterexam_l05_c1_1', lane: 'base' as const, giftId: 'stars_20', amount: 20, promotionEligibility: 'gameplay' as const };
    const cls = classifyCoinWalletSource(op.requestId);
    expect(() => applyCoinWalletLimits(full, op, cls, MONDAY, 0)).toThrow('coin_wallet_daily_limit_reached');
    expect(applyCoinWalletLimits(full, op, cls, MONDAY + 86_400_000, 0).chapterExamDayCoins).toBe(20);
  });
});
