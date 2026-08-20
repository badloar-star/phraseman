import {
  ArenaNoOpponentError,
  createArenaEntryPrefetch,
  type ArenaPreparedEntry,
} from '../modules/arena/entry_prefetch';
import type { ArenaMatchPlanWire } from '../modules/arena/duel_plan';
import fs from 'fs';
import path from 'path';

const PLAN = {
  matchId: 'match-1',
  viewerSeat: 'a',
} as ArenaMatchPlanWire;

const PREPARED = {
  ok: true,
  startedAtMs: 4_200,
  deadlineAtMs: 16_200,
  plan: PLAN,
} satisfies ArenaPreparedEntry;

type AcceptResponse = Readonly<{ state: string; viewerSeat?: 'a' | 'b' }>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function captureFailure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected_request_failure');
}

function preparedFor(matchId: string): ArenaPreparedEntry {
  return { ...PREPARED, plan: { ...PLAN, matchId } } satisfies ArenaPreparedEntry;
}

describe('Arena entry prefetch', () => {
  it('shares one strict-identical request while accepting, then loads one plan', async () => {
    const acceptResult = deferred<AcceptResponse>();
    const seats: ('a' | 'b')[] = [];
    let planCalls = 0;
    const entry = createArenaEntryPrefetch({
      accept: () => acceptResult.promise,
      loadPlan: async () => { planCalls += 1; return PREPARED; },
      rememberViewerSeat: (_matchId, seat) => seats.push(seat),
      nowMs: () => 100,
      wait: async () => {},
    });

    const first = entry.start('match-1');
    const second = entry.start('match-1');
    expect(second).toBe(first);
    acceptResult.resolve({ state: 'active', viewerSeat: 'b' });

    const prepared = await first;
    expect(prepared).toBe(PREPARED);
    expect(prepared.startedAtMs).toBe(4_200);
    expect(prepared.deadlineAtMs).toBe(16_200);
    expect(planCalls).toBe(1);
    expect(seats).toEqual(['b', 'a']);
    expect(entry.start('match-1')).toBe(first);
  });

  it('retries accepting responses on the shared accept retry cadence before loading', async () => {
    let now = 10;
    let accepts = 0;
    const waits: number[] = [];
    const entry = createArenaEntryPrefetch({
      accept: async () => {
        accepts += 1;
        return accepts === 1 ? { state: 'accepting', viewerSeat: 'a' } : { state: 'active', viewerSeat: 'b' };
      },
      loadPlan: async () => PREPARED,
      rememberViewerSeat: () => {},
      nowMs: () => now,
      wait: async (ms) => { waits.push(ms); now += ms; },
    });

    await entry.start('match-1');

    expect(accepts).toBe(2);
    expect(waits).toEqual([1_200]);
  });

  it('peeks only a successfully prepared entry and evicts a failed request for retry', async () => {
    let attempts = 0;
    const entry = createArenaEntryPrefetch({
      accept: async () => ({ state: 'active', viewerSeat: 'a' }),
      loadPlan: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('network');
        return PREPARED;
      },
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    expect(entry.peek('match-1')).toBeNull();
    const failure = await captureFailure(entry.start('match-1'));
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('network');
    expect(entry.peek('match-1')).toBeNull();
    expect(await entry.start('match-1')).toBe(PREPARED);
    expect(attempts).toBe(2);
    expect(entry.peek('match-1')).toBe(PREPARED);
  });

  it('rejects and does not cache a null plan', async () => {
    const entry = createArenaEntryPrefetch({
      accept: async () => ({ state: 'active' }),
      loadPlan: async () => null,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    const failure = await captureFailure(entry.start('match-1'));
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('arena_match_plan_invalid');
    expect(entry.peek('match-1')).toBeNull();
  });

  it('uses a typed no-opponent failure for exhausted, aborted, and settled acceptance', async () => {
    for (const state of ['accepting', 'aborted', 'settled']) {
      let now = state === 'accepting' ? 12_000 : 0;
      const entry = createArenaEntryPrefetch({
        accept: async () => ({ state }),
        loadPlan: async () => PREPARED,
        rememberViewerSeat: () => {},
        nowMs: () => now,
        wait: async (ms) => { now += ms; },
      });

      const failure = await captureFailure(entry.start(`match-${state}`));
      expect(failure).toBeInstanceOf(ArenaNoOpponentError);
      expect((failure as Error).message).toBe('arena_match_no_opponent');
      const retryFailure = await captureFailure(entry.start(`match-${state}-retry`));
      expect(retryFailure).toBeInstanceOf(ArenaNoOpponentError);
      expect((retryFailure as Error).message).toBe('arena_match_no_opponent');
      expect(entry.peek(`match-${state}`)).toBeNull();
    }
  });

  it('evicts an initial clock failure so a later start can prepare the match', async () => {
    let clockCalls = 0;
    const entry = createArenaEntryPrefetch({
      accept: async () => ({ state: 'active', viewerSeat: 'a' }),
      loadPlan: async () => PREPARED,
      rememberViewerSeat: () => {},
      nowMs: () => {
        clockCalls += 1;
        if (clockCalls === 1) throw new Error('clock unavailable');
        return 0;
      },
      wait: async () => {},
    });

    const failed = entry.start('match-1');
    const failure = await captureFailure(failed);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('clock unavailable');
    const retried = entry.start('match-1');
    expect(retried).not.toBe(failed);
    expect(await retried).toBe(PREPARED);
    expect(entry.peek('match-1')).toBe(PREPARED);
  });

  it('bounds ready entries without evicting an in-flight request', async () => {
    const tenthPlan = deferred<ArenaPreparedEntry>();
    const preparedEntries = new Map<string, ArenaPreparedEntry>();
    for (let index = 1; index <= 9; index += 1) {
      const matchId = `match-${index}`;
      preparedEntries.set(matchId, preparedFor(matchId));
    }
    const entry = createArenaEntryPrefetch({
      accept: async () => ({ state: 'active' }),
      loadPlan: async (matchId) => matchId === 'match-10'
        ? tenthPlan.promise
        : preparedEntries.get(matchId) ?? null,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    const inFlight = entry.start('match-10');
    const preparedTenth = preparedFor('match-10');
    try {
      await Promise.resolve();
      await Promise.resolve();
      for (let index = 1; index <= 9; index += 1) {
        await entry.start(`match-${index}`);
      }
      expect(entry.peek('match-1')).toBeNull();
      for (let index = 2; index <= 9; index += 1) {
        expect(entry.peek(`match-${index}`)).toBe(preparedEntries.get(`match-${index}`));
      }
      expect(entry.start('match-10')).toBe(inFlight);
    } finally {
      tenthPlan.resolve(preparedTenth);
      await inFlight;
    }
    expect(await inFlight).toBe(preparedTenth);
  });
});

describe('Arena entry prefetch production singleton source contract', () => {
  test('wires one coordinator to the production match APIs', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../app/arena_entry_prefetch.ts'), 'utf8');

    expect(source.match(/createArenaEntryPrefetch\(\{/g)).toHaveLength(1);
    expect(source).toContain('accept: arenaV2MatchAccept');
    expect(source).toContain('loadPlan: arenaV2MatchPlan');
    expect(source).toContain('rememberViewerSeat: rememberArenaViewerSeat');
    expect(source).toContain('nowMs: () => Date.now()');
    expect(source).toContain('wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))');
    expect(source).toContain('export const arenaEntryPrefetchStart');
    expect(source).toContain('export const arenaEntryPrefetchPeek');
  });
});
