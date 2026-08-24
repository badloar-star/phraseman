import { arenaDeliverFinishedMatch } from '../modules/arena/finish_delivery';
import { arenaOutboxList, arenaOutboxEnqueue } from '../modules/arena/outbox_storage';
import { ARENA_MATCH_STORE_KEY, type ArenaKeyValueStore } from '../modules/arena/match_store';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';

const A: ArenaOutboxOwnerScope = { stableUid: 'account-a', accountGeneration: 1 };
const B: ArenaOutboxOwnerScope = { stableUid: 'account-b', accountGeneration: 2 };

function fakeStore(): ArenaKeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function saved(ownerStableUid: string, matchId: string): string {
  return JSON.stringify({
    schemaVersion: 'arena-match-store.v2',
    ownerStableUid,
    plan: { matchId },
  });
}

function report(matchId: string): ArenaMatchReport {
  return {
    schemaVersion: 'arena-local-match.v2', matchId, seat: 'a', planHash: 'hash',
    outcomes: [], pairAttemptsByTask: {}, matchStars: 0, tieBreakElapsedMs: 1,
    correctCount: 0, firstCount: 0, longestCombo: 0, clockSuspect: false,
    abandoned: false, startedAtWallMs: 1, finishedAtWallMs: 2,
  } as ArenaMatchReport;
}

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('finished Arena report delivery', () => {
  it('does not send or claim a queue when the durable local write fails', async () => {
    const store = fakeStore();
    store.data.set(ARENA_MATCH_STORE_KEY, saved(A.stableUid, 'm1'));
    store.setItem = async () => { throw new Error('disk_full'); };
    const reserveDispatch = jest.fn(async () => ({ networkPromise: Promise.resolve({ settled: true }) }));

    await expect(arenaDeliverFinishedMatch({
      store,
      scope: A,
      report: report('m1'),
      rulesVersion: 'v',
      wallNowMs: 10,
      isAlive: () => true,
      isScopeCurrent: (scope) => scope === A,
      withTransitionLock: async (work) => work(),
      reserveDispatch,
    })).resolves.toEqual({ status: 'storage_failed' });

    expect(reserveDispatch).not.toHaveBeenCalled();
    expect(store.data.get(ARENA_MATCH_STORE_KEY)).toBe(saved(A.stableUid, 'm1'));
    expect(await arenaOutboxList(store, A)).toEqual([]);
  });

  it('does not send when the owner switches immediately after the durable commit', async () => {
    const store = fakeStore();
    store.data.set(ARENA_MATCH_STORE_KEY, saved(A.stableUid, 'm1'));
    let current = A;
    const send = jest.fn(async () => ({ settled: false }));

    const result = await arenaDeliverFinishedMatch({
      store,
      scope: A,
      report: report('m1'),
      rulesVersion: 'v',
      wallNowMs: 10,
      isAlive: () => true,
      isScopeCurrent: (scope) => scope === current,
      withTransitionLock: async (work) => {
        const value = await work();
        current = B;
        return value;
      },
      reserveDispatch: async () => ({ networkPromise: send() }),
    });

    expect(result.status).toBe('stale');
    expect(send).not.toHaveBeenCalled();
    expect(await arenaOutboxList(store, A)).toHaveLength(1);
  });

  it('cannot clear B current match or A outbox after an in-flight owner switch', async () => {
    const store = fakeStore();
    store.data.set(ARENA_MATCH_STORE_KEY, saved(A.stableUid, 'm1'));
    let current = A;
    const response = deferred<{ settled: true }>();
    const request = arenaDeliverFinishedMatch({
      store,
      scope: A,
      report: report('m1'),
      rulesVersion: 'v',
      wallNowMs: 10,
      isAlive: () => true,
      isScopeCurrent: (scope) => scope === current,
      withTransitionLock: async (work) => work(),
      reserveDispatch: async () => ({ networkPromise: response.promise }),
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    current = B;
    store.data.set(ARENA_MATCH_STORE_KEY, saved(B.stableUid, 'm2'));
    response.resolve({ settled: true });
    await expect(request).resolves.toMatchObject({ status: 'stale' });

    expect(store.data.get(ARENA_MATCH_STORE_KEY)).toBe(saved(B.stableUid, 'm2'));
    expect(await arenaOutboxList(store, A)).toHaveLength(1);
    expect(await arenaOutboxList(store, B)).toEqual([]);
  });

  it('preserves the durable row when the screen unmounts during the callable', async () => {
    const store = fakeStore();
    let alive = true;
    const response = deferred<{ settled: true }>();
    const request = arenaDeliverFinishedMatch({
      store,
      scope: A,
      report: report('m1'),
      rulesVersion: 'v',
      wallNowMs: 10,
      isAlive: () => alive,
      isScopeCurrent: () => true,
      withTransitionLock: async (work) => work(),
      reserveDispatch: async () => ({ networkPromise: response.promise }),
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    alive = false;
    response.resolve({ settled: true });

    await expect(request).resolves.toMatchObject({ status: 'stale' });
    expect(await arenaOutboxList(store, A)).toHaveLength(1);
  });

  it('removes exactly the same owner/match after a current successful completion', async () => {
    const store = fakeStore();
    store.data.set(ARENA_MATCH_STORE_KEY, saved(A.stableUid, 'm1'));
    await arenaOutboxEnqueue(store, B, report('m2'), 1, 'v');

    await expect(arenaDeliverFinishedMatch({
      store,
      scope: A,
      report: report('m1'),
      rulesVersion: 'v',
      wallNowMs: 10,
      isAlive: () => true,
      isScopeCurrent: (scope) => scope === A,
      withTransitionLock: async (work) => work(),
      reserveDispatch: async () => ({ networkPromise: Promise.resolve({ settled: true }) }),
    })).resolves.toMatchObject({ status: 'sent', response: { settled: true } });

    expect(await arenaOutboxList(store, A)).toEqual([]);
    expect(await arenaOutboxList(store, B)).toHaveLength(1);
    expect(store.data.has(ARENA_MATCH_STORE_KEY)).toBe(false);
  });
});
