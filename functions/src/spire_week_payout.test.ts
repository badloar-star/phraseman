// Выплата недели Шпиля: итог недели несёт снимок кошелька после выплаты (координатор 15.10, аудит Optimistic UI).
// зачем: без снимка клиент не видел «+100 за повышение» в шапке до следующего урока. Проверяем, что снимок пишется
// при новой выплате (из журнала) и при ретрае крона (из расписки), а битые числа не пишутся вовсе.
jest.mock('firebase-admin', () => ({
  firestore: { FieldValue: { serverTimestamp: () => 'SERVER_TS' } },
}));
jest.mock('./arena_v2_core', () => ({ arenaSeasonWindow: () => ({ seasonId: 'S1' }) }));
jest.mock('./progress_events', () => ({ getWeekKey: () => '2026-W42', isoDateUtc: () => '2026-10-12' }));
const mockPrepare = jest.fn();
const mockCommit = jest.fn();
jest.mock('./stars_ledger', () => ({
  STAR_OPERATIONS_COLLECTION: 'star_operations',
  STAR_OP_MAX_ABS_DELTA: 100_000, // spire_coins берёт потолок операции отсюда
  beginStarLedgerTransactionAttempt: () => undefined,
  prepareStarOperations: (...args: unknown[]) => mockPrepare(...args),
  commitStarOperations: (...args: unknown[]) => mockCommit(...args),
}));

import { payoutSpireWeekReward, spireWeekPaidWalletFields } from './spire_week_payout';
import { spireFrozenResultDecisionHash } from './spire_finalization_freeze';
import { spireLadderMemberKey } from './spire_finalize_core';

type Snap = { exists: boolean; data: () => Record<string, unknown> | undefined };
type TestRef = { path: string; id: string; collection: (name: string) => { doc: (id: string) => TestRef } };
const snap = (data: Record<string, unknown> | null): Snap => ({ exists: data !== null, data: () => data ?? undefined });

function harness(docs: { user: Record<string, unknown> | null; result: Record<string, unknown> | null; receipt: Record<string, unknown> | null; room?: Record<string, unknown> | null }) {
  const writes: Array<{ ref: string; data: Record<string, unknown> }> = [];
  const ref = (path: string): TestRef => ({
    path,
    id: path.split('/').at(-1) ?? '',
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const userRef = ref('users/u1');
  const resultRef = ref('users/u1/spire_week_results/2026-W41_en');
  const roomRef = ref('spire_groups/g1');
  const room = docs.room ?? {
    weekId: '2026-W41', lang: 'en', members: { u1: { name: 'One' } },
    finalizationFreeze: {
      schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: '2026-W41', lang: 'en', rankBy: 'steps',
      frozenResultCount: 1, removedAfterFreezeCount: 0,
      resultsDigest: 'a'.repeat(64), configEvidenceSchema: 'spire-finalization-config-evidence.v1', configEvidenceHash: 'b'.repeat(64),
      inputEvidenceSchema: 'spire-finalization-input-evidence.v1', inputEvidenceHash: 'c'.repeat(64), frozenAt: 'TS',
    },
  };
  let result = docs.result;
  if (result && result.groupId === undefined) {
    const base = {
      schema: 'spire-week-result.v1', groupId: 'g1', weekId: '2026-W41', lang: 'en',
      roomDigest: 'c'.repeat(64), memberKey: spireLadderMemberKey('g1', 'u1'),
      prevTier: 3, newTier: 3, ...result,
    };
    result = { ...base, decisionHash: spireFrozenResultDecisionHash(base) };
  }
  const tx = {
    get: async (target: { path: string }) => snap(
      target.path === userRef.path ? docs.user
        : target.path.includes('/spire_week_results/') ? result
          : target.path === roomRef.path ? room
            : target.path.includes('/star_operations/') ? docs.receipt
              : null,
    ),
    set: (ref: { path: string }, data: Record<string, unknown>) => { writes.push({ ref: ref.path, data }); },
  };
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };
  return { db: db as never, ref, resultRef: resultRef as never, roomRef: roomRef as never, writes };
}

const input = (resultRef: never, roomRef: never) => ({ uid: 'u1', groupId: 'g1', weekId: '2026-W41', lang: 'en', resultRef, roomRef, weekEndMs: 1_000 });

describe('spireWeekPaidWalletFields', () => {
  it('целые неотрицательные числа → три поля снимка', () => {
    expect(spireWeekPaidWalletFields({ balance: 640, earnedTotal: 9000, seq: 57 })).toEqual({ starsBalanceAfter: 640, starsEarnedTotalAfter: 9000, starsSeq: 57 });
  });
  it('битое число или seq 0 → полей нет (клиент без снимка ничего не вливает)', () => {
    expect(spireWeekPaidWalletFields({ balance: undefined, earnedTotal: 1, seq: 2 })).toEqual({});
    expect(spireWeekPaidWalletFields({ balance: -1, earnedTotal: 1, seq: 2 })).toEqual({});
    expect(spireWeekPaidWalletFields({ balance: 1, earnedTotal: 1, seq: 0 })).toEqual({});
    expect(spireWeekPaidWalletFields({ balance: 1.5, earnedTotal: 1, seq: 2 })).toEqual({});
  });
});

describe('payoutSpireWeekReward → снимок кошелька в итоге недели', () => {
  beforeEach(() => { mockPrepare.mockReset(); mockCommit.mockReset(); });

  it('новая выплата: в итог пишутся paid + баланс/итог/seq ПОСЛЕ выплаты из журнала', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { place: 150, promotion: 100 }, liveRank: 3 }, receipt: null });
    const ledgerResult = { balance: 890, earnedTotal: 12_000, seq: 41 };
    mockPrepare.mockResolvedValue({ outcomes: [{ status: 'applied' }], result: ledgerResult });
    mockCommit.mockReturnValue(ledgerResult);
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    expect(out).toEqual(expect.objectContaining({ status: 'paid', coins: 250 }));
    expect(h.writes).toHaveLength(2);
    expect(h.writes.find((write) => write.ref === 'users/u1/spire_week_results/2026-W41_en')?.data).toEqual(expect.objectContaining({
      rewardStatus: 'paid', settlementStatus: 'settled', rewardPaidCoins: 250, starsBalanceAfter: 890, starsEarnedTotalAfter: 12_000, starsSeq: 41,
    }));
  });

  it('ретрай крона (расписка уже есть): снимок берётся из расписки, журнал не вызывается', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { place: 0, promotion: 100 } }, receipt: { delta: 100, balanceAfter: 500, earnedTotalAfter: 7000, seq: 33 } });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    expect(out.status).toBe('already_paid');
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(h.writes.find((write) => write.ref === 'users/u1/spire_week_results/2026-W41_en')?.data).toEqual(expect.objectContaining({ rewardStatus: 'paid', settlementStatus: 'settled', rewardPaidCoins: 100, starsBalanceAfter: 500, starsEarnedTotalAfter: 7000, starsSeq: 33 }));
  });

  it('старая расписка без чисел журнала → paid без снимка (полей нет, ничего не выдумываем)', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { promotion: 100 } }, receipt: { delta: 100 } });
    await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    const resultWrite = h.writes.find((write) => write.ref === 'users/u1/spire_week_results/2026-W41_en')?.data;
    expect(resultWrite).not.toHaveProperty('starsSeq');
    expect(resultWrite).toEqual(expect.objectContaining({ rewardStatus: 'paid' }));
  });

  it('отказ журнала → в итог ничего не пишется (остаётся pending_wallet, снимка нет)', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { promotion: 100 } }, receipt: null });
    mockPrepare.mockResolvedValue({ outcomes: [{ status: 'rejected', errorCode: 'x' }], result: {} });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    expect(out.status).toBe('rejected');
    expect(h.writes).toHaveLength(0);
  });

  it('расписка с другой суммой не легализует изменённый итог', async () => {
    const h = harness({
      user: { stars: {} },
      result: { rewardCoins: { place: 150, promotion: 100, total: 250 }, liveRank: 3 },
      receipt: { delta: 100, balanceAfter: 500, earnedTotalAfter: 7000, seq: 33 },
    });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    expect(out).toEqual(expect.objectContaining({ status: 'rejected', errorCode: 'receipt_delta_mismatch' }));
    expect(h.writes).toHaveLength(0);
  });

  it('не платит строку, чей roomDigest/memberKey не привязан к комнате и uid', async () => {
    const h = harness({
      user: { stars: {} }, receipt: null,
      result: {
        schema: 'spire-week-result.v1', groupId: 'g1', weekId: '2026-W41', lang: 'en',
        roomDigest: 'other-room', memberKey: 'swapped-key', decisionHash: 'x',
        rewardCoins: { place: 150, promotion: 0, total: 150 }, liveRank: 3,
      },
    });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    expect(out).toEqual(expect.objectContaining({ status: 'rejected', errorCode: 'frozen_result_binding_mismatch' }));
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });

  it.each([
    ['wrong week', { weekId: '2026-W40' }],
    ['wrong language', { lang: 'de' }],
  ])('rejects caller binding before every financial write: %s', async (_name, override) => {
    const h = harness({
      user: { stars: {} },
      result: { rewardCoins: { place: 100, promotion: 0, total: 100 }, liveRank: 1 },
      receipt: { delta: 100, balanceAfter: 500, earnedTotalAfter: 7000, seq: 33 },
    });
    const out = await payoutSpireWeekReward(h.db, { ...input(h.resultRef, h.roomRef), ...override });
    expect(out).toEqual(expect.objectContaining({ status: 'rejected', errorCode: 'frozen_result_caller_mismatch' }));
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });

  it('rejects a result reference outside the exact room-derived path before every financial write', async () => {
    const h = harness({
      user: { stars: {} },
      result: { rewardCoins: { place: 100, promotion: 0, total: 100 }, liveRank: 1 },
      receipt: { delta: 100, balanceAfter: 500, earnedTotalAfter: 7000, seq: 33 },
    });
    const wrongRef = h.ref('users/u1/spire_week_results/forged') as never;
    const out = await payoutSpireWeekReward(h.db, input(wrongRef, h.roomRef));
    expect(out).toEqual(expect.objectContaining({ status: 'rejected', errorCode: 'frozen_result_caller_mismatch' }));
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });

  it.each([null, false, 0, ''])('any present room hold blocks every financial write: %p', async (hold) => {
    const h = harness({
      user: { stars: {} },
      result: { rewardCoins: { place: 100, promotion: 0, total: 100 }, liveRank: 1 },
      receipt: { delta: 100, balanceAfter: 500, earnedTotalAfter: 7000, seq: 33 },
      room: {
        weekId: '2026-W41', lang: 'en', members: { u1: { name: 'One' } },
        finalizationIntegrityHold: hold,
        finalizationFreeze: {
          schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: '2026-W41', lang: 'en', rankBy: 'steps',
          frozenResultCount: 1, removedAfterFreezeCount: 0, resultsDigest: 'a'.repeat(64),
          configEvidenceSchema: 'spire-finalization-config-evidence.v1', configEvidenceHash: 'b'.repeat(64),
          inputEvidenceSchema: 'spire-finalization-input-evidence.v1', inputEvidenceHash: 'c'.repeat(64), frozenAt: 'TS',
        },
      },
    });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef, h.roomRef));
    expect(out).toEqual(expect.objectContaining({ status: 'integrity_room_hold', errorCode: 'integrity_room_hold' }));
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });
});

type StatefulDoc = Record<string, unknown>;
const deepClone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));

function raceHarness() {
  const roomPath = 'spire_groups/g1';
  const userPath = 'users/B';
  const resultPath = 'users/B/spire_week_results/2026-W41_en';
  const receiptPath = 'users/B/star_operations/spire_week:en_2026-W41';
  const leaderboardPath = 'leaderboard/B';
  const docs = new Map<string, StatefulDoc>();
  const versions = new Map<string, number>();
  const ref = (path: string): any => ({
    path,
    id: path.split('/').at(-1),
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const room: StatefulDoc = {
    weekId: '2026-W41', lang: 'en', members: { A: { name: 'A' }, B: { name: 'B' } },
    finalizationFreeze: {
      schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: '2026-W41', lang: 'en', rankBy: 'steps',
      frozenResultCount: 2, removedAfterFreezeCount: 0, resultsDigest: 'a'.repeat(64),
      configEvidenceSchema: 'spire-finalization-config-evidence.v1', configEvidenceHash: 'b'.repeat(64),
      inputEvidenceSchema: 'spire-finalization-input-evidence.v1', inputEvidenceHash: 'c'.repeat(64), frozenAt: 'TS',
    },
  };
  const resultBase: StatefulDoc = {
    schema: 'spire-week-result.v1', groupId: 'g1', weekId: '2026-W41', lang: 'en', roomDigest: 'c'.repeat(64),
    memberKey: spireLadderMemberKey('g1', 'B'), prevTier: 3, newTier: 4, liveRank: 1,
    rewardCoins: { place: 100, promotion: 50, total: 150 }, rewardStatus: 'pending_wallet',
  };
  const result = { ...resultBase, decisionHash: spireFrozenResultDecisionHash(resultBase) };
  for (const [path, value] of Object.entries({
    [roomPath]: room,
    [userPath]: {
      stars: {
        balance: 10, earnedTotal: 20, grantedTotal: 0, spentTotal: 10,
        weekKey: '2026-W41', weekEarned: 20, prevWeekKey: '2026-W40', prevWeekEarned: 0,
        seasonId: 'S1', seasonEarned: 20, seq: 2, lastOpId: 'before', bySource: {},
      },
    },
    [resultPath]: result,
    [leaderboardPath]: { spireTiers: { en: 3 }, spireEnergyDeltas: {} },
  })) {
    docs.set(path, deepClone(value));
    versions.set(path, 1);
  }
  const directWrite = (path: string, value: StatefulDoc): void => {
    docs.set(path, deepClone(value));
    versions.set(path, (versions.get(path) ?? 0) + 1);
  };
  const commitHold = (): void => {
    const next = deepClone(docs.get(roomPath) ?? {});
    delete (next.members as StatefulDoc).A;
    next.finalizationIntegrityHold = {
      schema: 'spire-finalization-integrity-hold.v1', reason: 'invalid_freeze_during_member_deletion', heldAtMs: 1,
    };
    directWrite(roomPath, next);
  };
  let afterReadsOnce: (() => void) | null = null;
  let attempts = 0;
  const attemptedWritePaths: string[] = [];
  const discardedWritePaths: string[] = [];
  const db: any = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      for (let retry = 0; retry < 5; retry += 1) {
        attempts += 1;
        const reads = new Map<string, number>();
        const staged: Array<{ path: string; write: () => void }> = [];
        const tx = {
          get: async (target: { path: string }) => {
            reads.set(target.path, versions.get(target.path) ?? 0);
            const value = deepClone(docs.get(target.path));
            return snap(value ?? null);
          },
          set: (target: { path: string }, patch: StatefulDoc) => {
            attemptedWritePaths.push(target.path);
            staged.push({
              path: target.path,
              write: () => directWrite(target.path, { ...(docs.get(target.path) ?? {}), ...deepClone(patch) }),
            });
          },
          create: (target: { path: string }, data: StatefulDoc) => {
            attemptedWritePaths.push(target.path);
            staged.push({
              path: target.path,
              write: () => {
                if (docs.has(target.path)) throw new Error(`already-exists:${target.path}`);
                directWrite(target.path, data);
              },
            });
          },
        };
        const outcome = await fn(tx);
        if (afterReadsOnce) {
          const hook = afterReadsOnce;
          afterReadsOnce = null;
          hook();
        }
        if ([...reads].some(([path, version]) => (versions.get(path) ?? 0) !== version)) {
          discardedWritePaths.push(...staged.map(({ path }) => path));
          continue;
        }
        staged.forEach(({ write }) => write());
        return outcome;
      }
      throw new Error('transaction-contention');
    },
  };
  const snapshotFinancialState = () => ({
    tier: deepClone((docs.get(leaderboardPath)?.spireTiers as StatefulDoc | undefined)?.en),
    energy: deepClone((docs.get(leaderboardPath)?.spireEnergyDeltas as StatefulDoc | undefined)?.en),
    walletBalance: (docs.get(userPath)?.stars as StatefulDoc | undefined)?.balance,
    walletEarnedTotal: (docs.get(userPath)?.stars as StatefulDoc | undefined)?.earnedTotal,
    walletSeq: (docs.get(userPath)?.stars as StatefulDoc | undefined)?.seq,
    rewardStatus: docs.get(resultPath)?.rewardStatus,
    rewardOpId: docs.get(resultPath)?.rewardOpId,
    rewardPaidCoins: docs.get(resultPath)?.rewardPaidCoins,
    starsBalanceAfter: docs.get(resultPath)?.starsBalanceAfter,
    starsEarnedTotalAfter: docs.get(resultPath)?.starsEarnedTotalAfter,
    starsSeq: docs.get(resultPath)?.starsSeq,
    settlementStatus: docs.get(resultPath)?.settlementStatus,
    receipt: deepClone(docs.get(receiptPath)),
  });
  return {
    db, docs, roomPath, resultPath, receiptPath, commitHold,
    afterSettlementReadsOnce: (hook: () => void) => { afterReadsOnce = hook; },
    attempts: () => attempts,
    attemptedWritePaths,
    discardedWritePaths,
    snapshotFinancialState,
    settle: () => payoutSpireWeekReward(db, {
      uid: 'B', groupId: 'g1', weekId: '2026-W41', lang: 'en',
      roomRef: ref(roomPath), resultRef: ref(resultPath), weekEndMs: 1_000,
    }),
  };
}

describe('stateful finalization hold settlement races', () => {
  beforeEach(() => {
    mockPrepare.mockReset().mockImplementation(async (
      _tx: unknown,
      db: { collection: (name: string) => { doc: (id: string) => TestRef } },
      uid: string,
      userSnap: Snap,
      operations: Array<{ opId: string; delta: number }>,
    ) => {
      const op = operations[0];
      const userRef = db.collection('users').doc(uid);
      const before = deepClone((userSnap.data()?.stars ?? {}) as StatefulDoc);
      const after: StatefulDoc = {
        ...before,
        balance: Number(before.balance) + op.delta,
        earnedTotal: Number(before.earnedTotal) + op.delta,
        weekEarned: Number(before.weekEarned) + op.delta,
        seasonEarned: Number(before.seasonEarned) + op.delta,
        seq: Number(before.seq) + 1,
        lastOpId: op.opId,
      };
      const result = {
        balance: after.balance,
        earnedTotal: after.earnedTotal,
        grantedTotal: after.grantedTotal,
        spentTotal: after.spentTotal,
        weekKey: after.weekKey,
        weekEarned: after.weekEarned,
        seasonId: after.seasonId,
        seasonEarned: after.seasonEarned,
        seq: after.seq,
      };
      return {
        outcomes: [{ status: 'applied', opId: op.opId, seq: after.seq, appliedDelta: op.delta }],
        userRef,
        after,
        receipts: [{
          ref: userRef.collection('star_operations').doc(op.opId),
          data: {
            opId: op.opId,
            delta: op.delta,
            balanceBefore: before.balance,
            balanceAfter: after.balance,
            earnedTotalAfter: after.earnedTotal,
            seq: after.seq,
          },
        }],
        noop: false,
        result,
      };
    });
    mockCommit.mockReset().mockImplementation((tx: {
      set: (ref: TestRef, data: StatefulDoc, options: { merge: boolean }) => void;
      create: (ref: TestRef, data: StatefulDoc) => void;
    }, prepared: {
      userRef: TestRef;
      after: StatefulDoc;
      receipts: Array<{ ref: TestRef; data: StatefulDoc }>;
      result: StatefulDoc;
    }) => {
      tx.set(prepared.userRef, { stars: prepared.after, updatedAt: 'SERVER_TS' }, { merge: true });
      for (const receipt of prepared.receipts) tx.create(receipt.ref, receipt.data);
      return prepared.result;
    });
  });

  it('faithful ledger control commits wallet, receipt, tier, energy, reward, and settlement writes', async () => {
    const store = raceHarness();
    const before = store.snapshotFinancialState();

    await expect(store.settle()).resolves.toMatchObject({ status: 'paid', coins: 150 });

    const after = store.snapshotFinancialState();
    expect(after).not.toEqual(before);
    expect(after).toEqual(expect.objectContaining({
      tier: 4,
      energy: { '2026-W41': 1 },
      walletBalance: 160,
      walletEarnedTotal: 170,
      walletSeq: 3,
      rewardStatus: 'paid',
      rewardPaidCoins: 150,
      starsBalanceAfter: 160,
      starsEarnedTotalAfter: 170,
      starsSeq: 3,
      settlementStatus: 'settled',
      receipt: expect.objectContaining({ delta: 150, balanceAfter: 160, earnedTotalAfter: 170, seq: 3 }),
    }));
    expect(store.attemptedWritePaths).toEqual(expect.arrayContaining([
      'users/B',
      'users/B/star_operations/spire_week:en_2026-W41',
      'leaderboard/B',
      'users/B/spire_week_results/2026-W41_en',
    ]));
    expect(store.discardedWritePaths).toEqual([]);
  });

  it.each(['after_loader_before_tx_read', 'between_tx_read_and_commit'] as const)(
    'hold blocks every financial write: %s',
    async (phase) => {
      const store = raceHarness();
      const before = store.snapshotFinancialState();
      if (phase === 'after_loader_before_tx_read') store.commitHold();
      else store.afterSettlementReadsOnce(store.commitHold);

      await expect(store.settle()).resolves.toMatchObject({ status: 'integrity_room_hold' });
      expect(store.snapshotFinancialState()).toEqual(before);
      expect(store.docs.get(store.receiptPath)).toBeUndefined();
      expect(store.docs.get(store.roomPath)?.finalizedAt).toBeUndefined();
      if (phase === 'between_tx_read_and_commit') {
        expect(store.attempts()).toBeGreaterThanOrEqual(2);
        expect(mockCommit).toHaveBeenCalled();
        expect(store.attemptedWritePaths).toEqual(expect.arrayContaining([
          'users/B',
          'users/B/star_operations/spire_week:en_2026-W41',
          'leaderboard/B',
          'users/B/spire_week_results/2026-W41_en',
        ]));
        expect(store.discardedWritePaths).toEqual(expect.arrayContaining([
          'users/B',
          'users/B/star_operations/spire_week:en_2026-W41',
          'leaderboard/B',
          'users/B/spire_week_results/2026-W41_en',
        ]));
      } else {
        expect(store.attemptedWritePaths).toEqual([]);
        expect(store.discardedWritePaths).toEqual([]);
      }
    },
  );
});
