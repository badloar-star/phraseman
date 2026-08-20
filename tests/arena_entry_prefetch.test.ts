import {
  ArenaNoOpponentError,
  createArenaEntryPrefetch,
} from '../modules/arena/entry_prefetch';
import type { ArenaMatchPlanWire } from '../modules/arena/duel_plan';

const PLAN = {
  matchId: 'match-1',
  viewerSeat: 'a',
} as ArenaMatchPlanWire;

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

describe('Arena entry prefetch', () => {
  it('shares one strict-identical request while accepting, then loads one plan', async () => {
    const acceptResult = deferred<AcceptResponse>();
    const seats: Array<'a' | 'b'> = [];
    let planCalls = 0;
    const entry = createArenaEntryPrefetch({
      accept: () => acceptResult.promise,
      loadPlan: async () => { planCalls += 1; return PLAN; },
      rememberViewerSeat: (_matchId, seat) => seats.push(seat),
      nowMs: () => 100,
      wait: async () => {},
    });

    const first = entry.start('match-1');
    const second = entry.start('match-1');
    expect(second).toBe(first);
    acceptResult.resolve({ state: 'active', viewerSeat: 'b' });

    await expect(first).resolves.toMatchObject({
      ok: true,
      startedAtMs: 100,
      deadlineAtMs: 12_100,
      plan: PLAN,
    });
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
      loadPlan: async () => PLAN,
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
        return PLAN;
      },
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    expect(entry.peek('match-1')).toBeNull();
    await expect(entry.start('match-1')).rejects.toThrow('network');
    expect(entry.peek('match-1')).toBeNull();
    await expect(entry.start('match-1')).resolves.toMatchObject({ ok: true, plan: PLAN });
    expect(attempts).toBe(2);
    expect(entry.peek('match-1')).toMatchObject({ ok: true, plan: PLAN });
  });

  it('rejects and does not cache a null plan', async () => {
    const entry = createArenaEntryPrefetch({
      accept: async () => ({ state: 'active' }),
      loadPlan: async () => null,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    await expect(entry.start('match-1')).rejects.toThrow('arena_match_plan_invalid');
    expect(entry.peek('match-1')).toBeNull();
  });

  it('uses a typed no-opponent failure for exhausted, aborted, and settled acceptance', async () => {
    for (const state of ['accepting', 'aborted', 'settled']) {
      let now = state === 'accepting' ? 12_000 : 0;
      const entry = createArenaEntryPrefetch({
        accept: async () => ({ state }),
        loadPlan: async () => PLAN,
        rememberViewerSeat: () => {},
        nowMs: () => now,
        wait: async (ms) => { now += ms; },
      });

      await expect(entry.start(`match-${state}`)).rejects.toBeInstanceOf(ArenaNoOpponentError);
      await expect(entry.start(`match-${state}-retry`)).rejects.toThrow('arena_match_no_opponent');
      expect(entry.peek(`match-${state}`)).toBeNull();
    }
  });
});
