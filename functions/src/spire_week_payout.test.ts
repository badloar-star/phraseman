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

type Snap = { exists: boolean; data: () => Record<string, unknown> | undefined };
const snap = (data: Record<string, unknown> | null): Snap => ({ exists: data !== null, data: () => data ?? undefined });

function harness(docs: { user: Record<string, unknown> | null; result: Record<string, unknown> | null; receipt: Record<string, unknown> | null }) {
  const writes: Array<{ ref: string; data: Record<string, unknown> }> = [];
  const receiptRef = { path: 'receipt' };
  const userRef = { path: 'user', collection: () => ({ doc: () => receiptRef }) };
  const resultRef = { path: 'result' };
  const tx = {
    get: async (ref: { path: string }) => snap(ref.path === 'user' ? docs.user : ref.path === 'result' ? docs.result : docs.receipt),
    set: (ref: { path: string }, data: Record<string, unknown>) => { writes.push({ ref: ref.path, data }); },
  };
  const db = {
    collection: () => ({ doc: () => userRef }),
    runTransaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };
  return { db: db as never, resultRef: resultRef as never, writes };
}

const input = (resultRef: never) => ({ uid: 'u1', weekId: '2026-W41', lang: 'en', resultRef, weekEndMs: 1_000 });

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
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef));
    expect(out).toEqual(expect.objectContaining({ status: 'paid', coins: 250 }));
    expect(h.writes).toHaveLength(1);
    expect(h.writes[0].data).toEqual(expect.objectContaining({
      rewardStatus: 'paid', rewardPaidCoins: 250, starsBalanceAfter: 890, starsEarnedTotalAfter: 12_000, starsSeq: 41,
    }));
  });

  it('ретрай крона (расписка уже есть): снимок берётся из расписки, журнал не вызывается', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { place: 0, promotion: 100 } }, receipt: { delta: 100, balanceAfter: 500, earnedTotalAfter: 7000, seq: 33 } });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef));
    expect(out.status).toBe('already_paid');
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(h.writes[0].data).toEqual(expect.objectContaining({ rewardStatus: 'paid', rewardPaidCoins: 100, starsBalanceAfter: 500, starsEarnedTotalAfter: 7000, starsSeq: 33 }));
  });

  it('старая расписка без чисел журнала → paid без снимка (полей нет, ничего не выдумываем)', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { promotion: 100 } }, receipt: { delta: 100 } });
    await payoutSpireWeekReward(h.db, input(h.resultRef));
    expect(h.writes[0].data).not.toHaveProperty('starsSeq');
    expect(h.writes[0].data).toEqual(expect.objectContaining({ rewardStatus: 'paid' }));
  });

  it('отказ журнала → в итог ничего не пишется (остаётся pending_wallet, снимка нет)', async () => {
    const h = harness({ user: { stars: {} }, result: { rewardCoins: { promotion: 100 } }, receipt: null });
    mockPrepare.mockResolvedValue({ outcomes: [{ status: 'rejected', errorCode: 'x' }], result: {} });
    const out = await payoutSpireWeekReward(h.db, input(h.resultRef));
    expect(out.status).toBe('rejected');
    expect(h.writes).toHaveLength(0);
  });
});
