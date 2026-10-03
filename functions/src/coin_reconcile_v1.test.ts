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
function makeDb(seed: Record<string, Record<string, unknown>> = {}, opts: { ignoreWhere?: boolean } = {}) {
  const docs = new Map<string, Record<string, unknown>>(Object.entries(seed));
  if (!docs.has(`users/${UID}`)) docs.set(`users/${UID}`, {});
  let commits = 0;
  const queries: string[] = [];
  const ref = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    collection: (name: string) => collection(`${path}/${name}`),
  });
  const collection = (path: string): any => ({
    path,
    doc: (id: string) => ref(`${path}/${id}`),
    limit: (n: number) => ({ path, limit: n, isQuery: true }),
    // 8S: равенство по полю верхнеуровневых документов коллекции (users.where(canonicalStableId)).
    where: (field: string, op: string, value: unknown) => ({
      limit: (n: number) => ({ path, limit: n, isQuery: true, where: { field, op, value } }),
    }),
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
            queries.push(target.where ? `${target.path}?${target.where.field}==${String(target.where.value)}` : target.path);
            const prefix = `${target.path}/`;
            const matched = [...docs.keys()]
              .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
              .filter((key) => !target.where || opts.ignoreWhere || (target.where.op === '=='
                && (docs.get(key) as Record<string, unknown>)?.[target.where.field] === target.where.value))
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
  return { db, docs, commits: () => commits, queries };
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

// ── Пакет 8S: Spin-призы аккаунтов, скрытых слиянием в этот stableUid ──
// Связь проигравший → победитель: users/{loser}.identityHidden=true +
// canonicalStableId=<победитель> (пишет auth_merge.ts при скрытии; поля только
// серверные по firestore.rules). Строки проигравшего только читаются.

const LOSER = 'account-loser-b';
const hiddenInto = (winner: string) => ({ identityHidden: true, canonicalStableId: winner, duplicateOfStableId: winner });

test('8S: a delivered coin lane of a merged-away account is raised on the winner (loser rows untouched)', async () => {
  const loserResult = spinResult('requestLOSERAAAAAAA01', { base: { state: 'delivered', selectedGiftId: 'stars_500' } });
  const world = makeDb({
    [`users/${UID}/level_spin_results/requestWINNERAAAAAA01`]: spinResult('requestWINNERAAAAAA01', {
      base: { state: 'delivered', selectedGiftId: 'stars_100' },
    }),
    [`users/${LOSER}`]: hiddenInto(UID),
    [`users/${LOSER}/level_spin_results/requestLOSERAAAAAAA01`]: loserResult,
  });
  const loserBefore = JSON.stringify([...world.docs.entries()].filter(([key]) => key.startsWith(`users/${LOSER}`)));
  const response = await run(world);
  expect(response).toMatchObject({
    status: 'raised', raisedBy: 600, starsBalance: 600,
    operationIds: ['level_spin:requestWINNERAAAAAA01.base', 'level_spin:requestLOSERAAAAAAA01.base'],
  });
  expect(world.docs.get(`users/${UID}/star_operations/level_spin:requestLOSERAAAAAAA01.base`))
    .toMatchObject({ delta: 500, sourceKind: 'coin_reconcile_v1', sourceId: 'requestLOSERAAAAAAA01.base' });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ status: 'raised', raisedBy: 600, mergedLoserCount: 1 });
  const loserAfter = JSON.stringify([...world.docs.entries()].filter(([key]) => key.startsWith(`users/${LOSER}`)));
  expect(loserAfter).toBe(loserBefore);
});

test('8S: a repeat does not raise twice; a lane receipted in the loser ledger is not raised again', async () => {
  const world = makeDb({
    [`users/${LOSER}`]: hiddenInto(UID),
    [`users/${LOSER}/level_spin_results/requestLOSERBBBBBBB01`]: spinResult('requestLOSERBBBBBBB01', {
      base: { state: 'delivered', selectedGiftId: 'stars_250' },
      premium: { state: 'delivered', selectedGiftId: 'stars_50' },
    }),
    // Уже материализовано на проигравшем (старый levelSpinStarGrant) — не основание.
    [`users/${LOSER}/star_operations/level_spin:requestLOSERBBBBBBB01.premium`]: { opId: 'level_spin:requestLOSERBBBBBBB01.premium' },
  });
  expect(await run(world)).toMatchObject({ status: 'raised', raisedBy: 250, operationIds: ['level_spin:requestLOSERBBBBBBB01.base'] });
  const commitsAfterFirst = world.commits();
  expect(await run(world)).toMatchObject({ status: 'replayed', raisedBy: 250, starsBalance: 250 });
  expect(world.commits()).toBe(commitsAfterFirst);
});

test('8S: unrelated accounts are not counted (not hidden, hidden into someone else)', async () => {
  const world = makeDb({
    [`users/${UID}`]: { canonicalStableId: UID },
    [`users/${UID}/level_spin_results/requestWINNERCCCCCC01`]: spinResult('requestWINNERCCCCCC01', {
      base: { state: 'delivered', selectedGiftId: 'stars_10' },
    }),
    // canonicalStableId указывает сюда, но не скрыт — это не слияние.
    'users/account-visible': { identityHidden: false, canonicalStableId: UID },
    'users/account-visible/level_spin_results/requestVISIBLECCCC01': spinResult('requestVISIBLECCCC01', { base: { state: 'delivered', selectedGiftId: 'stars_1000' } }),
    // Скрыт, но в чужой аккаунт.
    'users/account-foreign': hiddenInto('account-other'),
    'users/account-foreign/level_spin_results/requestFOREIGNCCCC01': spinResult('requestFOREIGNCCCC01', { base: { state: 'delivered', selectedGiftId: 'stars_1000' } }),
  });
  expect(await run(world)).toMatchObject({ status: 'raised', raisedBy: 10, operationIds: ['level_spin:requestWINNERCCCCCC01.base'] });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD]).toMatchObject({ mergedLoserCount: 0 });
});

test('8S: no losers → previous behaviour, one extra index query only', async () => {
  const world = makeDb({
    [`users/${UID}/level_spin_results/requestWINNERDDDDDD01`]: spinResult('requestWINNERDDDDDD01', {
      base: { state: 'delivered', selectedGiftId: 'stars_20' },
    }),
  });
  expect(await run(world)).toMatchObject({ status: 'raised', raisedBy: 20, operationIds: ['level_spin:requestWINNERDDDDDD01.base'] });
  expect(world.queries).toEqual([`users?canonicalStableId==${UID}`, `users/${UID}/level_spin_results`]);
});

test('8S: a chain (A hidden into B, B hidden into winner) is followed; a receipt anywhere in the family counts', async () => {
  const world = makeDb({
    [`users/${LOSER}`]: hiddenInto(UID),
    'users/account-chain-a': hiddenInto(LOSER),
    'users/account-chain-a/level_spin_results/requestCHAINAEEEEE01': spinResult('requestCHAINAEEEEE01', {
      base: { state: 'delivered', selectedGiftId: 'stars_1000' },
      premium: { state: 'delivered', selectedGiftId: 'stars_10' },
    }),
    // B (до своего скрытия) уже провёл premium-дорожку A — второй раз не поднимаем.
    [`users/${LOSER}/star_operations/level_spin:requestCHAINAEEEEE01.premium`]: { opId: 'level_spin:requestCHAINAEEEEE01.premium' },
  });
  expect(await run(world)).toMatchObject({ status: 'raised', raisedBy: 1_000, operationIds: ['level_spin:requestCHAINAEEEEE01.base'] });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD]).toMatchObject({ mergedLoserCount: 2 });
});

test('8S: too many merged accounts → review, nothing raised, closed; logged', async () => {
  const seed: Record<string, Record<string, unknown>> = {
    [`users/${UID}/level_spin_results/requestWINNERFFFFFF01`]: spinResult('requestWINNERFFFFFF01', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }),
  };
  for (let i = 0; i <= COIN_RECONCILE_V1_LIMITS.maxMergedAccounts; i += 1) seed[`users/account-many-${i}`] = hiddenInto(UID);
  const world = makeDb(seed);
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0, starsBalance: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ status: 'over_cap_review', reviewReason: 'merged_accounts_overflow' });
  const warned = (console.warn as jest.Mock).mock.calls.map((call) => String(call[0]));
  expect(warned.some((line) => line.includes('merged_accounts_overflow'))).toBe(true);
});

test('8S: the coinReconcileV1 response keeps exactly the 1.6.24 shape', async () => {
  const world = makeDb({
    [`users/${LOSER}`]: hiddenInto(UID),
    [`users/${LOSER}/level_spin_results/requestLOSERGGGGGGG01`]: spinResult('requestLOSERGGGGGGG01', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }),
  });
  const shape = ['operationIds', 'raisedBy', 'starsBalance', 'starsEarnedTotal', 'starsSeq', 'status'];
  expect(Object.keys(await run(world)).sort()).toEqual(shape);
  expect(Object.keys(await run(world)).sort()).toEqual(shape);
});

test('8S: logs name sources without full uids', async () => {
  const world = makeDb({
    [`users/${LOSER}`]: hiddenInto(UID),
    [`users/${LOSER}/level_spin_results/requestLOSERHHHHHHH01`]: spinResult('requestLOSERHHHHHHH01', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }),
  });
  await run(world);
  const lines = (console.log as jest.Mock).mock.calls.map((call) => String(call[0]));
  const sources = lines.find((line) => line.startsWith('[COIN-RECONCILE] sources='));
  expect(sources).toBeDefined();
  expect(sources).toContain(`loser_ids=${LOSER.slice(0, 8)}`);
  expect(sources).toContain('lanes=');
  expect(lines.join('\n')).not.toContain(LOSER);
});

test('8S: a returned row is re-checked (canonical must equal the parent), not trusted from the index', async () => {
  // Индекс игнорируется — запрос вернёт всех; проверка документа обязана отсеять чужих.
  const world = makeDb({
    'users/account-foreign': hiddenInto('account-other'),
    'users/account-foreign/level_spin_results/requestFOREIGNIIII01': spinResult('requestFOREIGNIIII01', { base: { state: 'delivered', selectedGiftId: 'stars_1000' } }),
  }, { ignoreWhere: true });
  expect(await run(world)).toMatchObject({ status: 'nothing_to_raise', raisedBy: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD]).toMatchObject({ mergedLoserCount: 0 });
});

test('8S: receipt reads over budget (lanes × family ledgers) → review, no giant transaction', async () => {
  const seed: Record<string, Record<string, unknown>> = {
    [`users/${LOSER}`]: hiddenInto(UID),
    [`users/${LOSER}/level_spin_results/requestLOSERJJJJJJJ01`]: spinResult('requestLOSERJJJJJJJ01', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }),
    // Ревью 8S (03.10): выдача ровно на пределе теперь = results_truncated; бюджет расписок проверяем
    // на 499 результатах и ВТОРОМ слитом аккаунте (999 дорожек × 3 книги > 2000).
    'users/account-loser-c': hiddenInto(UID),
    'users/account-loser-c/level_spin_results/requestLOSERCCCCCCC01': spinResult('requestLOSERCCCCCCC01', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }),
  };
  for (let i = 0; i < COIN_RECONCILE_V1_LIMITS.maxResultsScanned - 1; i += 1) {
    const id = `requestBUDGETJJ${String(i).padStart(6, '0')}`;
    seed[`users/${UID}/level_spin_results/${id}`] = spinResult(id, {
      base: { state: 'delivered', selectedGiftId: 'stars_10' }, premium: { state: 'delivered', selectedGiftId: 'stars_10' },
    });
  }
  const world = makeDb(seed);
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ status: 'over_cap_review', reviewReason: 'receipt_budget', foundTotal: 10_000, mergedLoserCount: 2 });
});

test('8S: the same spin result seen under two family accounts is raised once', async () => {
  const twin = spinResult('requestTWINKKKKKKKKK01', { base: { state: 'delivered', selectedGiftId: 'stars_100' } });
  const world = makeDb({
    [`users/${UID}/level_spin_results/requestTWINKKKKKKKKK01`]: twin,
    [`users/${LOSER}`]: hiddenInto(UID),
    [`users/${LOSER}/level_spin_results/requestTWINKKKKKKKKK01`]: twin,
  });
  expect(await run(world)).toMatchObject({ status: 'raised', raisedBy: 100, starsBalance: 100, operationIds: ['level_spin:requestTWINKKKKKKKKK01.base'] });
});

test('8S: a chain deeper than maxMergeDepth → review (merge_depth_overflow), nothing raised', async () => {
  const seed: Record<string, Record<string, unknown>> = {};
  let parent = UID;
  for (let depth = 1; depth <= COIN_RECONCILE_V1_LIMITS.maxMergeDepth + 1; depth += 1) {
    seed[`users/account-depth-${depth}`] = hiddenInto(parent);
    parent = `account-depth-${depth}`;
  }
  seed[`users/${parent}/level_spin_results/requestDEEPLLLLLLLLL01`] = spinResult('requestDEEPLLLLLLLLL01', { base: { state: 'delivered', selectedGiftId: 'stars_10' } });
  const world = makeDb(seed);
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ reviewReason: 'merge_depth_overflow' });
});

// Ревью 8S (03.10): три защиты до выкладки.
test('8S review: a hidden account reconciling itself raises nothing (no double credit after the winner)', async () => {
  const world = makeDb({
    [`users/${UID}`]: hiddenInto('winner-account-xyz'),
    [`users/${UID}/level_spin_results/requestHIDDENAAAAAA01`]: spinResult('requestHIDDENAAAAAA01', {
      base: { state: 'delivered', selectedGiftId: 'stars_500' },
    }),
  });
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ status: 'over_cap_review', reviewReason: 'caller_hidden' });
  expect(world.queries.some((q) => q.includes('canonicalStableId'))).toBe(false);
  expect(world.docs.has(`users/${UID}/star_operations/level_spin:requestHIDDENAAAAAA01.base`)).toBe(false);
});

test('8S review: a saturated merge-link query (noise fills the limit) → review, nothing raised', async () => {
  const seed: Record<string, Record<string, unknown>> = {
    [`users/${UID}/level_spin_results/requestWINNERSAT00001`]: spinResult('requestWINNERSAT00001', { base: { state: 'delivered', selectedGiftId: 'stars_10' } }),
  };
  for (let i = 0; i <= COIN_RECONCILE_V1_LIMITS.maxMergedAccounts; i += 1) {
    seed[`users/account-noise-${i}`] = { identityHidden: false, canonicalStableId: UID };
  }
  const world = makeDb(seed);
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ reviewReason: 'merge_link_query_saturated' });
});

test('8S review: results exactly at the scan limit (truncated) → review, nothing raised', async () => {
  const seed: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < COIN_RECONCILE_V1_LIMITS.maxResultsScanned; i += 1) {
    const id = `requestTRUNC${String(i).padStart(9, '0')}`;
    seed[`users/${UID}/level_spin_results/${id}`] = spinResult(id, { base: { state: 'delivered', selectedGiftId: 'stars_10' } });
  }
  const world = makeDb(seed);
  expect(await run(world)).toMatchObject({ status: 'over_cap_review', raisedBy: 0 });
  expect((world.docs.get(`users/${UID}`) as Record<string, any>)[COIN_RECONCILE_V1_FIELD])
    .toMatchObject({ reviewReason: 'results_truncated' });
});
