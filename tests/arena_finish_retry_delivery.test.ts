import {
  arenaRetryQueuedFinishDelivery,
  type ArenaFinishRetryResult,
} from '../modules/arena/finish_retry';
import { arenaOutboxEnqueue, arenaOutboxList } from '../modules/arena/outbox_storage';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';

const SCOPE: ArenaOutboxOwnerScope = { stableUid: 'account-a', accountGeneration: 7 };

function fakeStore(): ArenaKeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function report(matchId: string): ArenaMatchReport {
  return {
    schemaVersion: 'arena-local-match.v2', matchId, seat: 'a', planHash: 'hash',
    outcomes: [], pairAttemptsByTask: {}, matchStars: 0, tieBreakElapsedMs: 1,
    correctCount: 0, firstCount: 0, longestCombo: 0, clockSuspect: false,
    abandoned: false, startedAtWallMs: 1, finishedAtWallMs: 2,
  } as ArenaMatchReport;
}

describe('current Arena match queued-finish retry', () => {
  it('returns the full sent-but-unsettled response instead of a count', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, SCOPE, report('m1'), 1_000, 'rules-v1');
    const response = {
      settled: false,
      settleProbeAtMs: 9_000,
      viewerReview: [{ taskIndex: 0 }],
      match: { matchId: 'm1', state: 'active' },
      viewerSeat: 'a' as const,
    };

    const result: ArenaFinishRetryResult<typeof response> = await arenaRetryQueuedFinishDelivery({
      store,
      scope: SCOPE,
      matchId: 'm1',
      wallNowMs: 2_000,
      isAlive: () => true,
      isScopeCurrent: () => true,
      withTransitionLock: async (work) => work(),
      reserveDispatch: async () => ({ networkPromise: Promise.resolve(response) }),
    });

    expect(result).toEqual({ status: 'sent', response });
    expect(await arenaOutboxList(store, SCOPE)).toEqual([]);
  });

  it('surfaces a permanent rejection instead of collapsing it into dropped', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, SCOPE, report('m1'), 1_000, 'rules-v1');

    const result = await arenaRetryQueuedFinishDelivery({
      store,
      scope: SCOPE,
      matchId: 'm1',
      wallNowMs: 2_000,
      isAlive: () => true,
      isScopeCurrent: () => true,
      withTransitionLock: async (work) => work(),
      reserveDispatch: async () => ({
        networkPromise: Promise.reject(new Error('arena_report_plan_mismatch')),
      }),
    });

    expect(result).toEqual({ status: 'rejected' });
    expect(await arenaOutboxList(store, SCOPE)).toEqual([]);
  });

  it('keeps the durable row when account ownership changes in flight', async () => {
    const store = fakeStore();
    await arenaOutboxEnqueue(store, SCOPE, report('m1'), 1_000, 'rules-v1');
    let current = true;
    let resolve!: (value: { settled: true }) => void;
    const networkPromise = new Promise<{ settled: true }>((done) => { resolve = done; });
    const request = arenaRetryQueuedFinishDelivery({
      store,
      scope: SCOPE,
      matchId: 'm1',
      wallNowMs: 2_000,
      isAlive: () => true,
      isScopeCurrent: () => current,
      withTransitionLock: async (work) => work(),
      reserveDispatch: async () => ({ networkPromise }),
    });
    await new Promise<void>((done) => setImmediate(done));
    current = false;
    resolve({ settled: true });

    await expect(request).resolves.toEqual({ status: 'stale' });
    current = true;
    expect(await arenaOutboxList(store, SCOPE)).toHaveLength(1);
  });
});
