import {
  ACCOUNT_MERGE_STARS_MAX_CHUNKS,
  accountMergeStarsOpId,
  commitAccountMergeStarsTransfer,
  planAccountMergeStarsChunks,
  prepareAccountMergeStarsTransfer,
} from './auth_merge_stars_transfer';
import { arenaSeasonWindow } from './arena_v2_core';
import { getWeekKey } from './progress_events';
import {
  STAR_OP_CLASS,
  STAR_OP_MAX_ABS_DELTA,
  STAR_OP_SOURCE,
  beginStarLedgerTransactionAttempt,
  normalizeStars,
} from './stars_ledger';

/**
 * 8T (координатор 03.10): монеты проигравшего при слиянии переходят победителю
 * парой «дебет проигравшего / кредит победителя» через единый журнал, по частям
 * не больше STAR_OP_MAX_ABS_DELTA, идемпотентно по детерминированному opId.
 */

type Doc = Record<string, unknown>;
type Store = Record<string, Doc>;

const NOW = 1_777_000_000_000;
const WEEK = getWeekKey(new Date(NOW).toISOString().slice(0, 10));
const SEASON = arenaSeasonWindow(NOW).seasonId;
const OUTBOX = `merge_${'a'.repeat(64)}`;

function starsOf(partial: Partial<Record<string, unknown>>): Doc {
  return {
    schemaVersion: 'stars.v1', balance: 0, earnedTotal: 0, grantedTotal: 0, spentTotal: 0,
    weekKey: WEEK, weekEarned: 0, prevWeekKey: '', prevWeekEarned: 0,
    seasonId: SEASON, seasonEarned: 0, bySource: {}, seq: 0, lastOpId: '', updatedAtMs: 0,
    ...partial,
  };
}

/** Мини-Firestore: путь → документ, транзакция с буфером записей (обрыв = записи выброшены). */
function makeWorld(initial: Store) {
  const store: Store = { ...initial };
  const ref = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    collection: (child: string) => ({ doc: (id: string) => ref(`${path}/${child}/${id}`) }),
  });
  const snap = (path: string): any => ({
    ref: ref(path),
    exists: path in store,
    data: () => store[path],
  });
  const counters = { reads: 0, writes: 0 };
  const runTx = async <T>(fn: (tx: any) => Promise<T>, opts: { abortBeforeCommit?: boolean } = {}): Promise<T> => {
    const writes: Array<() => void> = [];
    let hasWritten = false;
    const tx: any = {
      get: async (r: any) => {
        if (hasWritten) throw new Error('transaction_read_after_write');
        counters.reads += 1;
        return snap(r.path);
      },
      set: (r: any, data: Doc, options?: { merge?: boolean }) => {
        hasWritten = true;
        writes.push(() => {
          store[r.path] = options?.merge ? { ...(store[r.path] ?? {}), ...data } : { ...data };
        });
      },
      create: (r: any, data: Doc) => {
        hasWritten = true;
        writes.push(() => {
          if (r.path in store) throw new Error(`already_exists:${r.path}`);
          store[r.path] = { ...data };
        });
      },
      update: (r: any, data: Doc) => {
        hasWritten = true;
        writes.push(() => { store[r.path] = { ...(store[r.path] ?? {}), ...data }; });
      },
    };
    beginStarLedgerTransactionAttempt(tx);
    const result = await fn(tx);
    if (opts.abortBeforeCommit) throw new Error('simulated_commit_failure');
    counters.writes += writes.length;
    for (const write of writes) write();
    return result;
  };
  return { store, snap, runTx, counters };
}

function transferOnce(world: ReturnType<typeof makeWorld>, opts: {
  abortBeforeCommit?: boolean;
  winnerSnap?: any;
  loserSnap?: any;
  nowMs?: number;
} = {}) {
  return world.runTx(async (tx) => {
    const prepared = await prepareAccountMergeStarsTransfer(tx, {} as any, {
      winnerStableId: 'winner',
      loserStableId: 'loser',
      winnerSnap: opts.winnerSnap ?? world.snap('users/winner'),
      loserSnap: opts.loserSnap ?? world.snap('users/loser'),
      outboxId: OUTBOX,
      authUid: 'auth-1',
      nowMs: opts.nowMs ?? NOW,
    });
    // Победитель/проигравший получают свои обычные записи слияния ПОСЛЕ журнала.
    const record = commitAccountMergeStarsTransfer(tx, prepared);
    return { prepared, record };
  }, { abortBeforeCommit: opts.abortBeforeCommit });
}

const receiptsOf = (store: Store, uid: string): Array<[string, Doc]> => Object.entries(store)
  .filter(([path]) => path.startsWith(`users/${uid}/star_operations/`))
  .map(([path, data]) => [path.split('/').pop() as string, data] as [string, Doc])
  .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }));

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('журнал: причины переноса при слиянии', () => {
  it('кредит победителя — grant (не «заработано»), дебет проигравшего — spend', () => {
    expect(STAR_OP_CLASS.account_merge_in).toBe('grant');
    expect(STAR_OP_CLASS.account_merge_out).toBe('spend');
    expect(STAR_OP_SOURCE.account_merge_in).toBe('other');
  });
});

describe('planAccountMergeStarsChunks', () => {
  it('режет баланс на части не больше STAR_OP_MAX_ABS_DELTA', () => {
    expect(STAR_OP_MAX_ABS_DELTA).toBe(5_000);
    expect(planAccountMergeStarsChunks(1234)).toEqual({ chunks: [1234], remainder: 0 });
    expect(planAccountMergeStarsChunks(12345)).toEqual({ chunks: [5000, 5000, 2345], remainder: 0 });
    expect(planAccountMergeStarsChunks(10000)).toEqual({ chunks: [5000, 5000], remainder: 0 });
    expect(planAccountMergeStarsChunks(0)).toEqual({ chunks: [], remainder: 0 });
    expect(planAccountMergeStarsChunks(-5)).toEqual({ chunks: [], remainder: 0 });
  });

  it('выше потолка частей переносит потолок, остаток отдаёт отдельно', () => {
    const over = ACCOUNT_MERGE_STARS_MAX_CHUNKS * STAR_OP_MAX_ABS_DELTA + 7;
    const plan = planAccountMergeStarsChunks(over);
    expect(plan.chunks).toHaveLength(ACCOUNT_MERGE_STARS_MAX_CHUNKS);
    expect(plan.remainder).toBe(7);
  });

  it('opId детерминирован и проходит формат журнала', () => {
    expect(accountMergeStarsOpId(OUTBOX, 2)).toBe(`account_merge:${OUTBOX}.2`);
    expect(accountMergeStarsOpId(OUTBOX, 2)).toMatch(/^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/);
  });
});

describe('prepare/commit переноса монет при слиянии', () => {
  it('переносит 1234: проигравший 0, победитель +1234 как grant, заработанное не растёт', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({ balance: 500, earnedTotal: 500, weekEarned: 120, seasonEarned: 300, seq: 4 }) },
      'users/loser': { stars: starsOf({ balance: 1234, earnedTotal: 1000, grantedTotal: 300, spentTotal: 66, seq: 9 }) },
    });
    const { record } = await transferOnce(world);

    const winner = normalizeStars(world.store['users/winner'].stars);
    const loser = normalizeStars(world.store['users/loser'].stars);
    expect(winner.balance).toBe(1734);
    expect(winner.grantedTotal).toBe(1234);
    expect(winner.earnedTotal).toBe(500);
    expect(winner.weekEarned).toBe(120);
    expect(winner.seasonEarned).toBe(300);
    expect(winner.bySource.other).toBe(1234);
    expect(loser.balance).toBe(0);
    expect(loser.spentTotal).toBe(66 + 1234);
    expect(loser.earnedTotal).toBe(1000);

    const opId = `account_merge:${OUTBOX}.0`;
    expect(receiptsOf(world.store, 'winner').map(([id]) => id)).toEqual([opId]);
    expect(receiptsOf(world.store, 'loser').map(([id]) => id)).toEqual([opId]);
    expect(receiptsOf(world.store, 'winner')[0][1]).toMatchObject({
      delta: 1234, reason: 'account_merge_in', opClass: 'grant', sourceKind: 'account_merge', sourceId: OUTBOX,
    });
    expect(receiptsOf(world.store, 'loser')[0][1]).toMatchObject({
      delta: -1234, reason: 'account_merge_out', opClass: 'spend', sourceKind: 'account_merge', sourceId: OUTBOX,
    });
    expect(record).toMatchObject({ status: 'transferred', amount: 1234, chunks: 1, remainder: 0 });
  });

  it('переносит 12345 тремя частями 5000/5000/2345 с одинаковыми opId у пары', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({}) },
      'users/loser': { stars: starsOf({ balance: 12345, earnedTotal: 12345 }) },
    });
    await transferOnce(world);

    expect(normalizeStars(world.store['users/winner'].stars).balance).toBe(12345);
    expect(normalizeStars(world.store['users/loser'].stars).balance).toBe(0);
    const winnerReceipts = receiptsOf(world.store, 'winner');
    const loserReceipts = receiptsOf(world.store, 'loser');
    expect(winnerReceipts.map(([, data]) => data.delta)).toEqual([5000, 5000, 2345]);
    expect(loserReceipts.map(([, data]) => data.delta)).toEqual([-5000, -5000, -2345]);
    expect(winnerReceipts.map(([id]) => id)).toEqual(loserReceipts.map(([id]) => id));
  });

  it('повтор транзакции на устаревших снимках не удваивает: расписки → already_applied, записей нет', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({ balance: 10, grantedTotal: 10 }) },
      'users/loser': { stars: starsOf({ balance: 12345, earnedTotal: 12345 }) },
    });
    // Снимки «до» — как если бы повтор прочитал состояние, а коммит уже прошёл.
    const staleWinner = { ...world.snap('users/winner'), data: () => ({ stars: starsOf({ balance: 10, grantedTotal: 10 }) }) };
    const staleLoser = { ...world.snap('users/loser'), data: () => ({ stars: starsOf({ balance: 12345, earnedTotal: 12345 }) }) };
    await transferOnce(world);
    const writesAfterFirst = world.counters.writes;

    const { record } = await transferOnce(world, { winnerSnap: staleWinner, loserSnap: staleLoser });
    expect(record).toMatchObject({ status: 'already_applied' });
    expect(world.counters.writes).toBe(writesAfterFirst);
    expect(normalizeStars(world.store['users/winner'].stars).balance).toBe(12355);
    expect(normalizeStars(world.store['users/loser'].stars).balance).toBe(0);
  });

  it('повторный запуск на свежих данных: у проигравшего 0 — ничего не переносит и не пишет', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({}) },
      'users/loser': { stars: starsOf({ balance: 1234, earnedTotal: 1234 }) },
    });
    await transferOnce(world);
    const writesAfterFirst = world.counters.writes;
    const { record } = await transferOnce(world);
    expect(record).toMatchObject({ status: 'nothing_to_transfer' });
    expect(world.counters.writes).toBe(writesAfterFirst);
    expect(normalizeStars(world.store['users/winner'].stars).balance).toBe(1234);
  });

  it('баланс 0 (или нет карты stars) — ни одного чтения расписок и ни одной записи', async () => {
    const world = makeWorld({ 'users/winner': { stars: starsOf({ balance: 7, grantedTotal: 7 }) }, 'users/loser': {} });
    const { record } = await transferOnce(world);
    expect(record).toMatchObject({ status: 'nothing_to_transfer', amount: 0 });
    expect(world.counters.reads).toBe(0);
    expect(world.counters.writes).toBe(0);
    expect(receiptsOf(world.store, 'winner')).toEqual([]);
  });

  it('обрыв посередине (коммит не прошёл) → ничего не применено; следующий проход переносит ровно один раз', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({}) },
      'users/loser': { stars: starsOf({ balance: 12345, earnedTotal: 12345 }) },
    });
    await expect(transferOnce(world, { abortBeforeCommit: true })).rejects.toThrow('simulated_commit_failure');
    expect(normalizeStars(world.store['users/loser'].stars).balance).toBe(12345);
    expect(normalizeStars(world.store['users/winner'].stars).balance).toBe(0);
    expect(receiptsOf(world.store, 'winner')).toEqual([]);
    expect(receiptsOf(world.store, 'loser')).toEqual([]);

    await transferOnce(world);
    await transferOnce(world);
    expect(normalizeStars(world.store['users/winner'].stars).balance).toBe(12345);
    expect(normalizeStars(world.store['users/loser'].stars).balance).toBe(0);
    expect(receiptsOf(world.store, 'winner')).toHaveLength(3);
  });

  it('несогласованный журнал проигравшего — перенос пропущен, слияние не падает, записей нет', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({}) },
      'users/loser': { stars: starsOf({ balance: 900, earnedTotal: 100, seq: 3 }) },
    });
    const { record } = await transferOnce(world);
    expect(record).toMatchObject({ status: 'skipped', reason: 'loser_prepare_failed' });
    expect(world.counters.writes).toBe(0);
    expect(normalizeStars(world.store['users/loser'].stars).balance).toBe(900);
  });

  it('I-1: повтор на устаревших снимках с ДРУГИМ now — op_conflict у обеих сторон → warn «повтор, безопасно», не error', async () => {
    const world = makeWorld({
      'users/winner': { stars: starsOf({ balance: 10, grantedTotal: 10 }) },
      'users/loser': { stars: starsOf({ balance: 1234, earnedTotal: 1234 }) },
    });
    const staleWinner = { ...world.snap('users/winner'), data: () => ({ stars: starsOf({ balance: 10, grantedTotal: 10 }) }) };
    const staleLoser = { ...world.snap('users/loser'), data: () => ({ stars: starsOf({ balance: 1234, earnedTotal: 1234 }) }) };
    await transferOnce(world);
    const writesAfterFirst = world.counters.writes;
    const errorSpy = console.error as jest.Mock;
    const warnSpy = console.warn as jest.Mock;
    errorSpy.mockClear();
    warnSpy.mockClear();

    const { record } = await transferOnce(world, { winnerSnap: staleWinner, loserSnap: staleLoser, nowMs: NOW + 60_000 });
    expect(record).toMatchObject({ status: 'skipped', reason: 'outcome_mismatch' });
    expect(world.counters.writes).toBe(writesAfterFirst);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('replay_op_conflict'))).toBe(true);
    expect(normalizeStars(world.store['users/winner'].stars).balance).toBe(1244);
  });

  it('чужая расписка под тем же opId у победителя (op_conflict) — пропуск целиком, без половинчатого дебета', async () => {
    const opId = `account_merge:${OUTBOX}.0`;
    const world = makeWorld({
      'users/winner': { stars: starsOf({}) },
      'users/loser': { stars: starsOf({ balance: 1234, earnedTotal: 1234 }) },
      [`users/winner/star_operations/${opId}`]: { opId, delta: 999, reason: 'account_merge_in', seq: 1 },
    });
    const { record } = await transferOnce(world);
    expect(record).toMatchObject({ status: 'skipped', reason: 'outcome_mismatch' });
    expect(world.counters.writes).toBe(0);
    expect(normalizeStars(world.store['users/loser'].stars).balance).toBe(1234);
  });
});
