import {
  COIN_RECONCILE_V1_FIELD,
  COIN_RECONCILE_V1_LIMITS,
  coinReconcileV1,
  decideCoinReconcile,
  deliveredSpinStarLanes,
  runCoinReconcileV1,
} from './coin_reconcile_v1';

// зачем: Q-COIN (b), координатор 01.10. Сторож разовой серверной сверки:
// поднимает ТОЛЬКО вверх, ТОЛЬКО по серверным фактам (results спинов без
// расписки), с потолком, идемпотентно, с распиской в stars_ledger; число
// телефона — только в лог.

const NOW = Date.parse('2026-10-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1_000;
const UID = 'account-a';

function spinResult(requestId: string, lanes: Partial<Record<'base' | 'premium', { state: string; selectedGiftId?: string }>>, createdAtMs = NOW - 10 * DAY) {
  return { requestId, createdAtMs, deliveries: lanes, status: 'acknowledged' };
}

/** Минимальный Firestore в памяти: user, level_spin_results, star_operations. */
function makeDb(seed: Record<string, Record<string, unknown>> = {}) {
  const docs = new Map<string, Record<string, unknown>>(Object.entries(seed));
  if (!docs.has(`users/${UID}`)) docs.set(`users/${UID}`, {});
  let commits = 0;
  const ref = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    collection: (name: string) => collection(`${path}/${name}`),
  });
  const collection = (path: string): any => ({
    path,
    doc: (id: string) => ref(`${path}/${id}`),
    limit: (n: number) => ({ path, limit: n, isQuery: true }),
  });
  const snap = (r: any) => {
    const data = docs.get(r.path);
    return { exists: data !== undefined, ref: r, id: r.id, data: () => data };
  };
  const db: any = {
    collection: (name: string) => collection(name),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      const pending: Array<() => void> = [];
      const tx = {
        get: async (target: any) => {
          if (target.isQuery) {
            const prefix = `${target.path}/`;
            const matched = [...docs.keys()]
              .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
              .slice(0, target.limit)
              .map((key) => snap(ref(key)));
            return { docs: matched, size: matched.length };
          }
          return snap(target);
        },
        getAll: async (...refs: any[]) => refs.map((r) => snap(r)),
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
      if (pending.length > 0) commits += 1;
      pending.forEach((apply) => apply());
      return result;
    },
  };
  return { db, docs, commits: () => commits };
}

const run = (world: ReturnType<typeof makeDb>, clientVisibleBalance: number | null = null, nowMs = NOW) => (
  runCoinReconcileV1(world.db, { authUid: 'auth-a', stableUid: UID, nowMs, clientVisibleBalance })
);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('requires auth before anything else', async () => {
  await expect(coinReconcileV1.run({
    auth: undefined, data: {}, rawRequest: { headers: {} }, app: undefined, instanceIdToken: undefined,
  } as never)).rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
});

test('raises only delivered coin lanes without a ledger receipt, under the same opId', async () => {
  const world = makeDb({
    [`users/${UID}`]: {},
    [`users/${UID}/level_spin_results/requestAAAAAAAAAAAA01`]: spinResult('requestAAAAAAAAAAAA01', {
      base: { state: 'delivered', selectedGiftId: 'stars_1000' },
      premium: { state: 'delivered', selectedGiftId: 'stars_100' },
    }),
    // Уже материализовано старым levelSpinStarGrant — не трогаем.
    [`users/${UID}/level_spin_results/requestAAAAAAAAAAAA02`]: spinResult('requestAAAAAAAAAAAA02', {
      base: { state: 'delivered', selectedGiftId: 'stars_250' },
    }),
    [`users/${UID}/star_operations/level_spin:requestAAAAAAAAAAAA02.base`]: { opId: 'level_spin:requestAAAAAAAAAAAA02.base' },
    // Не выдано, не монеты, истекло — не основание.
    [`users/${UID}/level_spin_results/requestAAAAAAAAAAAA03`]: spinResult('requestAAAAAAAAAAAA03', {
      base: { state: 'delivering', selectedGiftId: 'stars_500' },
      premium: { state: 'expired', selectedGiftId: 'stars_100' },
    }),
    [`users/${UID}/level_spin_results/requestAAAAAAAAAAAA04`]: spinResult('requestAAAAAAAAAAAA04', {
      base: { state: 'delivered', selectedGiftId: 'xp_250' },
    }),
  });
  const response = await run(world, 999_999);
  expect(response).toMatchObject({
    status: 'raised', raisedBy: 1_100, starsBalance: 1_100,
    operationIds: ['level_spin:requestAAAAAAAAAAAA01.base', 'level_spin:requestAAAAAAAAAAAA01.premium'],
  });
  const user = world.docs.get(`users/${UID}`) as Record<string, any>;
  expect(user.stars.balance).toBe(1_100);
  // grant, не earn: очки лиги и earnedTotal не двигаются.
  expect(user.stars.earnedTotal).toBe(0);
  expect(user[COIN_RECONCILE_V1_FIELD]).toMatchObject({ status: 'raised', raisedBy: 1_100 });
  const receipt = world.docs.get(`users/${UID}/star_operations/level_spin:requestAAAAAAAAAAAA01.base`) as Record<string, any>;
  expect(receipt).toMatchObject({
    opId: 'level_spin:requestAAAAAAAAAAAA01.base', delta: 1_000, reason: 'level_spin_grant',
    sourceKind: 'coin_reconcile_v1', sourceId: 'requestAAAAAAAAAAAA01.base',
    balanceBefore: 0, balanceAfter: 1_000,
  });
});

test('client number is never a basis: no server facts → nothing raised, regardless of the phone', async () => {
  const world = makeDb();
  const response = await run(world, 9_830);
  expect(response).toMatchObject({ status: 'nothing_to_raise', raisedBy: 0, starsBalance: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>).stars).toBeUndefined();
});

test('idempotent: a repeat call returns the stored result and writes nothing', async () => {
  const world = makeDb({
    [`users/${UID}/level_spin_results/requestBBBBBBBBBBBB01`]: spinResult('requestBBBBBBBBBBBB01', {
      base: { state: 'delivered', selectedGiftId: 'stars_500' },
    }),
  });
  await run(world);
  const commitsAfterFirst = world.commits();
  const replay = await run(world);
  expect(replay).toMatchObject({ status: 'replayed', raisedBy: 500, starsBalance: 500, operationIds: ['level_spin:requestBBBBBBBBBBBB01.base'] });
  expect(world.commits()).toBe(commitsAfterFirst);
  expect((world.docs.get(`users/${UID}`) as Record<string, any>).stars.balance).toBe(500);
});

test('only upward: existing balance is preserved and grows by the missing lanes', async () => {
  const world = makeDb({
    [`users/${UID}`]: { stars: { schemaVersion: 'stars.v1', balance: 40, earnedTotal: 40, grantedTotal: 0, spentTotal: 0,
      weekKey: '', weekEarned: 0, prevWeekKey: '', prevWeekEarned: 0, seasonId: '', seasonEarned: 0,
      bySource: { learning: 40 }, seq: 3, lastOpId: 'practice:x', updatedAtMs: NOW - DAY } },
    [`users/${UID}/level_spin_results/requestCCCCCCCCCCCC01`]: spinResult('requestCCCCCCCCCCCC01', {
      base: { state: 'delivered', selectedGiftId: 'stars_50' },
    }),
  });
  expect(await run(world)).toMatchObject({ status: 'raised', raisedBy: 50, starsBalance: 90, starsSeq: 4 });
});

test('over the lifetime cap nothing is raised automatically (review), and it stays closed', async () => {
  const seed: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < 21; i += 1) {
    const id = `requestDDDDDDDDDD${String(i).padStart(4, '0')}`;
    seed[`users/${UID}/level_spin_results/${id}`] = spinResult(id, { base: { state: 'delivered', selectedGiftId: 'stars_1000' } });
  }
  const world = makeDb(seed);
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0, starsBalance: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ status: 'over_cap_review', foundTotal: 21_000 });
  expect(await run(world)).toMatchObject({ status: 'replayed', raisedBy: 0 });
});

test('results older than the receipt retention window are not evidence', () => {
  const old = NOW - 400 * DAY;
  const lanes = deliveredSpinStarLanes([{
    id: 'requestEEEEEEEEEEEE01',
    data: spinResult('requestEEEEEEEEEEEE01', { base: { state: 'delivered', selectedGiftId: 'stars_1000' } }, old),
  }], NOW);
  expect(lanes).toEqual([]);
});

test('malformed results are skipped (id mismatch, future date, stars_2000 not a spin prize)', () => {
  expect(deliveredSpinStarLanes([
    { id: 'requestFFFFFFFFFFFF01', data: spinResult('requestOTHER0000000001', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }) },
    { id: 'requestFFFFFFFFFFFF02', data: spinResult('requestFFFFFFFFFFFF02', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }, NOW + DAY) },
    { id: 'requestFFFFFFFFFFFF03', data: spinResult('requestFFFFFFFFFFFF03', { base: { state: 'delivered', selectedGiftId: 'stars_2000' } }) },
  ], NOW)).toEqual([]);
});

test('decision table: cap is exactly the documented limit', () => {
  const lane = (amount: number, i: number) => ({
    requestId: `r${i}`, lane: 'base' as const, giftId: 'stars_1000', amount, createdAtMs: NOW, operationId: `level_spin:r${i}.base`,
  });
  const atCap = Array.from({ length: 20 }, (_, i) => lane(1_000, i));
  expect(decideCoinReconcile(atCap)).toMatchObject({ status: 'raised', foundTotal: COIN_RECONCILE_V1_LIMITS.maxRaiseLifetime });
  expect(decideCoinReconcile([...atCap, lane(10, 99)]).status).toBe('over_cap_review');
  expect(decideCoinReconcile([]).status).toBe('nothing_to_raise');
});
