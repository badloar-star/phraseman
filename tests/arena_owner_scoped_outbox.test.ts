import {
  arenaOutboxEnqueue,
  arenaOutboxFlush,
  arenaOutboxList,
  arenaOutboxAdoptOwnerGeneration,
} from '../modules/arena/outbox_storage';
import {
  arenaOutboxEntryKey,
  arenaOutboxIndexKey,
  type ArenaOutboxOwnerScope,
} from '../modules/arena/result_outbox';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';

const A: ArenaOutboxOwnerScope = { stableUid: 'account-a', accountGeneration: 1 };
const B: ArenaOutboxOwnerScope = { stableUid: 'account-b', accountGeneration: 2 };

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fakeStore(): ArenaKeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function report(matchId: string): ArenaMatchReport {
  return {
    schemaVersion: 'arena-local-match.v2',
    matchId,
    seat: 'a',
    planHash: 'hash',
    outcomes: [],
    pairAttemptsByTask: {},
    matchStars: 12,
    tieBreakElapsedMs: 5_000,
    correctCount: 4,
    firstCount: 2,
    longestCombo: 3,
    clockSuspect: false,
    abandoned: false,
    startedAtWallMs: 1_000,
    finishedAtWallMs: 60_000,
  } as ArenaMatchReport;
}

describe('Arena result outbox is durably owner-scoped', () => {
  it('uses separate owner indexes and entries and never exposes A rows to B', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, A, report('m1'), 1_000, 'arena-stars.v3');

    expect(store.data.has(arenaOutboxIndexKey(A))).toBe(true);
    expect(store.data.has(arenaOutboxEntryKey(A, 'm1'))).toBe(true);
    expect(await arenaOutboxList(store, A)).toEqual([
      expect.objectContaining({
        ownerStableUid: 'account-a', ownerGeneration: 1, matchId: 'm1',
      }),
    ]);
    expect(await arenaOutboxList(store, B)).toEqual([]);
  });

  it('keeps keys restart-compatible but requires explicit same-owner generation adoption', async () => {
    const store = fakeStore();
    const restartedA: ArenaOutboxOwnerScope = { stableUid: A.stableUid, accountGeneration: 9 };
    await arenaOutboxEnqueue(store, A, report('m1'), 1_000, 'v');

    expect(arenaOutboxIndexKey(restartedA)).toBe(arenaOutboxIndexKey(A));
    expect(arenaOutboxEntryKey(restartedA, 'm1')).toBe(arenaOutboxEntryKey(A, 'm1'));
    expect(await arenaOutboxList(store, restartedA)).toEqual([]);

    await expect(arenaOutboxAdoptOwnerGeneration(store, restartedA)).resolves.toBe(1);
    expect(await arenaOutboxList(store, restartedA)).toEqual([
      expect.objectContaining({ ownerStableUid: 'account-a', ownerGeneration: 9, matchId: 'm1' }),
    ]);
  });

  it('does not call the server when A switched out before the callable boundary', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, A, report('m1'), 1_000, 'v');
    let current = B;
    const send = jest.fn(async () => undefined);

    const result = await arenaOutboxFlush(store, {
      scope: A,
      isScopeCurrent: (scope) => scope === current,
      send,
      wallNowMs: 2_000,
    });

    expect(send).not.toHaveBeenCalled();
    expect(result.kept).toEqual(['m1']);
    expect(await arenaOutboxList(store, A)).toHaveLength(1);
  });

  it('keeps an in-flight A row after switching to B and replays it only as A', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, A, report('m1'), 1_000, 'v');
    let current = A;
    const firstCall = deferred<void>();
    const send = jest.fn(() => firstCall.promise);
    const flushing = arenaOutboxFlush(store, {
      scope: A,
      isScopeCurrent: (scope) => scope === current,
      send,
      wallNowMs: 2_000,
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(send).toHaveBeenCalledTimes(1);

    current = B;
    firstCall.resolve();
    await expect(flushing).resolves.toMatchObject({ sent: [], kept: ['m1'] });
    expect(await arenaOutboxList(store, B)).toEqual([]);
    expect(await arenaOutboxList(store, A)).toHaveLength(1);

    current = A;
    await expect(arenaOutboxFlush(store, {
      scope: A,
      isScopeCurrent: (scope) => scope === current,
      send: async () => undefined,
      wallNowMs: 2_001,
    })).resolves.toMatchObject({ sent: ['m1'] });
    expect(await arenaOutboxList(store, A)).toEqual([]);
  });

  it('quarantines legacy unowned v2 rows instead of assigning them to the current account', async () => {
    const store = fakeStore();
    store.data.set('arena.outbox.v2.index', JSON.stringify(['legacy-match']));
    store.data.set('arena.outbox.v2.legacy-match', JSON.stringify({
      schemaVersion: 'arena-outbox.v2',
      matchId: 'legacy-match',
      report: report('legacy-match'),
      rulesVersion: 'v',
      enqueuedAtWallMs: 1,
      attempts: 0,
      nextAttemptAtWallMs: 1,
      lastFailure: null,
    }));

    expect(await arenaOutboxList(store, A)).toEqual([]);
    expect(await arenaOutboxList(store, B)).toEqual([]);
    expect(store.data.has('arena.outbox.v2.legacy-match')).toBe(true);
  });
});
