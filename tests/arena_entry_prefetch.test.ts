import {
  ArenaEntryAccountChangedError,
  ArenaNoOpponentError,
  ArenaTerminalMatchError,
  createArenaEntryPrefetch,
  type ArenaEntryAccountScope,
  type ArenaPreparedEntry,
} from '../modules/arena/entry_prefetch';
import type { ArenaMatchPlanWire } from '../modules/arena/duel_plan';
import fs from 'fs';
import path from 'path';

const PLAN = {
  matchId: 'match-1',
  viewerSeat: 'a',
  studyTarget: 'en',
  publicationFingerprint: 'a'.repeat(64),
} as ArenaMatchPlanWire;

const PREPARED = {
  ok: true,
  startedAtMs: 4_200,
  deadlineAtMs: 16_200,
  plan: PLAN,
} satisfies ArenaPreparedEntry;

const ACCOUNT_A = { stableId: 'account-a', generation: 1, studyTarget: 'en' } satisfies ArenaEntryAccountScope;

function fixedAccountScope(account: ArenaEntryAccountScope = ACCOUNT_A) {
  return {
    captureAccountScope: () => account,
    isAccountScopeCurrent: (candidate: ArenaEntryAccountScope) =>
      candidate.stableId === account.stableId && candidate.generation === account.generation,
  };
}

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
      ...fixedAccountScope(),
      accept: () => acceptResult.promise,
      loadPlan: async () => { planCalls += 1; return PREPARED; },
      rememberViewerSeat: (_matchId, seat) => seats.push(seat),
      nowMs: () => 100,
      wait: async () => {},
    });

    const first = entry.start('match-1', 'en');
    const second = entry.start('match-1', 'en');
    expect(second).toBe(first);
    acceptResult.resolve({ state: 'active', viewerSeat: 'b' });

    const prepared = await first;
    expect(prepared).toBe(PREPARED);
    expect(prepared.startedAtMs).toBe(4_200);
    expect(prepared.deadlineAtMs).toBe(16_200);
    expect(planCalls).toBe(1);
    expect(seats).toEqual(['b', 'a']);
    expect(entry.start('match-1', 'en')).toBe(first);
  });

  it('passes the captured account scope through both reserved entry dispatches', async () => {
    const dispatchedScopes: ArenaEntryAccountScope[] = [];
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
      accept: async (_matchId, scope) => {
        dispatchedScopes.push(scope);
        return { state: 'active', viewerSeat: 'a' };
      },
      loadPlan: async (_matchId, scope) => {
        dispatchedScopes.push(scope);
        return PREPARED;
      },
      rememberViewerSeat: () => {},
      nowMs: () => 100,
      wait: async () => {},
    });

    await entry.start('match-1', 'en');

    expect(dispatchedScopes).toEqual([ACCOUNT_A, ACCOUNT_A]);
    expect(dispatchedScopes[0]).toBe(dispatchedScopes[1]);
  });

  it('retries accepting responses on the shared accept retry cadence before loading', async () => {
    let now = 10;
    let accepts = 0;
    const waits: number[] = [];
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
      accept: async () => {
        accepts += 1;
        return accepts === 1 ? { state: 'accepting', viewerSeat: 'a' } : { state: 'active', viewerSeat: 'b' };
      },
      loadPlan: async () => PREPARED,
      rememberViewerSeat: () => {},
      nowMs: () => now,
      wait: async (ms) => { waits.push(ms); now += ms; },
    });

    await entry.start('match-1', 'en');

    expect(accepts).toBe(2);
    expect(waits).toEqual([1_200]);
  });

  it('peeks only a successfully prepared entry and evicts a failed request for retry', async () => {
    let attempts = 0;
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
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

    expect(entry.peek('match-1', 'en')).toBeNull();
    const failure = await captureFailure(entry.start('match-1', 'en'));
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('network');
    expect(entry.peek('match-1', 'en')).toBeNull();
    expect(await entry.start('match-1', 'en')).toBe(PREPARED);
    expect(attempts).toBe(2);
    expect(entry.peek('match-1', 'en')).toBe(PREPARED);
  });

  it('fences an in-flight account A request before it can cache or remember data under B', async () => {
    let current = ACCOUNT_A;
    const accepted = deferred<AcceptResponse>();
    const seats: ('a' | 'b')[] = [];
    let planCalls = 0;
    const entry = createArenaEntryPrefetch({
      captureAccountScope: () => current,
      isAccountScopeCurrent: (candidate) =>
        candidate.stableId === current.stableId && candidate.generation === current.generation,
      accept: () => accepted.promise,
      loadPlan: async () => { planCalls += 1; return PREPARED; },
      rememberViewerSeat: (_matchId, seat) => seats.push(seat),
      nowMs: () => 0,
      wait: async () => {},
    });

    const requestA = entry.start('match-1', 'en');
    current = { stableId: 'account-b', generation: 2, studyTarget: 'en' };
    accepted.resolve({ state: 'active', viewerSeat: 'a' });

    const failure = await captureFailure(requestA);
    expect(failure).toBeInstanceOf(ArenaEntryAccountChangedError);
    expect(planCalls).toBe(0);
    expect(seats).toEqual([]);
    expect(entry.peek('match-1', 'en')).toBeNull();
    expect(entry.claim('match-1', 'en')).toBeNull();
  });

  it('scopes ready entries by account and consumes the prepared bypass only once', async () => {
    let current: ArenaEntryAccountScope = ACCOUNT_A;
    let acceptCalls = 0;
    const entry = createArenaEntryPrefetch({
      captureAccountScope: () => current,
      isAccountScopeCurrent: (candidate) =>
        candidate.stableId === current.stableId && candidate.generation === current.generation,
      accept: async () => { acceptCalls += 1; return { state: 'active', viewerSeat: 'a' }; },
      /*
       * zachem plan POD ZAPROSHENNYY match (pravka 2026-09-20): prefetch
       * otvergaet plan chuzhogo matcha ('arena_match_plan_match_mismatch') —
       * eto zashchita ot samogo hudshego ishoda, kogda chelovek popadaet v
       * chuzhuyu igru. Test zhe vydaval odin i tot zhe PREPARED (match-1) na
       * lyuboy zapros, vklyuchaya match-2, i padal na sobstvennoy fixture.
       */
      loadPlan: async (matchId) => preparedFor(matchId),
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    const requestA = entry.start('match-1', 'en');
    await requestA;
    expect(entry.claim('match-1', 'en')).toEqual(preparedFor('match-1'));
    expect(entry.claim('match-1', 'en')).toBeNull();
    expect(entry.peek('match-1', 'en')).toBeNull();
    expect(entry.start('match-1', 'en')).toBe(requestA);
    expect(acceptCalls).toBe(1);

    await entry.start('match-2', 'en');
    expect(entry.peek('match-2', 'en')).toEqual(preparedFor('match-2'));

    current = { stableId: 'account-b', generation: 2, studyTarget: 'en' };
    expect(entry.peek('match-1', 'en')).toBeNull();
    expect(entry.claim('match-1', 'en')).toBeNull();
    expect(entry.peek('match-2', 'en')).toBeNull();
    expect(entry.claim('match-2', 'en')).toBeNull();
    const requestB = entry.start('match-1', 'en');
    expect(requestB).not.toBe(requestA);
    await requestB;
    expect(acceptCalls).toBe(3);
  });

  it('rejects and does not cache a null plan', async () => {
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
      accept: async () => ({ state: 'active' }),
      loadPlan: async () => null,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    const failure = await captureFailure(entry.start('match-1', 'en'));
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('arena_match_plan_invalid');
    expect(entry.peek('match-1', 'en')).toBeNull();
  });

  it('rejects and does not cache a plan for a different match id', async () => {
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
      accept: async () => ({ state: 'active' }),
      loadPlan: async () => preparedFor('other-match'),
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    const failure = await captureFailure(entry.start('match-1', 'en'));
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('arena_match_plan_match_mismatch');
    expect(entry.peek('match-1', 'en')).toBeNull();
  });

  it('uses a typed no-opponent failure only when the accept window is exhausted', async () => {
    let now = 12_000;
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
      accept: async () => ({ state: 'accepting' }),
      loadPlan: async () => PREPARED,
      rememberViewerSeat: () => {},
      nowMs: () => now,
      wait: async (ms) => { now += ms; },
    });

    const failure = await captureFailure(entry.start('match-accepting', 'en'));
    expect(failure).toBeInstanceOf(ArenaNoOpponentError);
    expect((failure as Error).message).toBe('arena_match_no_opponent');
    expect(entry.peek('match-accepting', 'en')).toBeNull();
  });

  it('surfaces aborted and settled matches as terminal instead of no-opponent', async () => {
    for (const state of ['aborted', 'settled']) {
      const entry = createArenaEntryPrefetch({
        ...fixedAccountScope(),
        accept: async () => ({ state }),
        loadPlan: async () => PREPARED,
        rememberViewerSeat: () => {},
        nowMs: () => 0,
        wait: async () => {},
      });

      const failure = await captureFailure(entry.start(`match-${state}`, 'en'));
      expect(failure).toBeInstanceOf(ArenaTerminalMatchError);
      expect(failure).not.toBeInstanceOf(ArenaNoOpponentError);
      expect((failure as Error).message).toBe('arena_match_terminal');
      expect(entry.peek(`match-${state}`, 'en')).toBeNull();
    }
  });

  it('evicts an initial clock failure so a later start can prepare the match', async () => {
    let clockCalls = 0;
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
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

    const failed = entry.start('match-1', 'en');
    const failure = await captureFailure(failed);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('clock unavailable');
    const retried = entry.start('match-1', 'en');
    expect(retried).not.toBe(failed);
    expect(await retried).toBe(PREPARED);
    expect(entry.peek('match-1', 'en')).toBe(PREPARED);
  });

  it('bounds ready entries without evicting an in-flight request', async () => {
    const tenthPlan = deferred<ArenaPreparedEntry>();
    const preparedEntries = new Map<string, ArenaPreparedEntry>();
    for (let index = 1; index <= 9; index += 1) {
      const matchId = `match-${index}`;
      preparedEntries.set(matchId, preparedFor(matchId));
    }
    const entry = createArenaEntryPrefetch({
      ...fixedAccountScope(),
      accept: async () => ({ state: 'active' }),
      loadPlan: async (matchId) => matchId === 'match-10'
        ? tenthPlan.promise
        : preparedEntries.get(matchId) ?? null,
      rememberViewerSeat: () => {},
      nowMs: () => 0,
      wait: async () => {},
    });

    const inFlight = entry.start('match-10', 'en');
    const preparedTenth = preparedFor('match-10');
    try {
      await Promise.resolve();
      await Promise.resolve();
      for (let index = 1; index <= 9; index += 1) {
        await entry.start(`match-${index}`, 'en');
      }
      expect(entry.peek('match-1', 'en')).toBeNull();
      for (let index = 2; index <= 9; index += 1) {
        expect(entry.peek(`match-${index}`, 'en')).toBe(preparedEntries.get(`match-${index}`));
      }
      expect(entry.start('match-10', 'en')).toBe(inFlight);
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
    const clientSource = fs.readFileSync(path.resolve(__dirname, '../app/arena_client.ts'), 'utf8');

    expect(source.match(/createArenaEntryPrefetch\(\{/g)).toHaveLength(1);
    /*
     * zachem pravka storozha 2026-09-20: Arena perestala ugadyvat yazyk —
     * kontur obucheniya (studyTarget) peredaetsya YAVNO na kazhdom zvene
     * (gate arena_target_gate). Storozh zhdal staruyu odnoargumentnuyu formu,
     * kotoroy bolshe net, i lomal sborku na verno napisannom kode.
     */
    expect(source).toContain('arenaV2MatchAcceptDispatch(');
    expect(source).toContain('arenaV2MatchPlanDispatch(');
    expect(source).toContain('scope.studyTarget,');
    expect(source).toContain('arenaEntryAccountToken(scope),');
    expect(source).not.toContain('accept: arenaV2MatchAccept');
    expect(source).not.toContain('loadPlan: arenaV2MatchPlan');
    expect(clientSource).toContain("'arenaV2MatchAccept', { matchId, studyTarget }, account,");
    expect(clientSource).toContain("const dispatch = await reserveArenaCall<ArenaMatchPlanResponseWire>(");
    expect(source).toContain('rememberViewerSeat: rememberArenaViewerSeat');
    expect(source).toContain('captureAccountScope: currentArenaEntryAccountScope');
    expect(source).toContain('isAccountScopeCurrent: isArenaEntryAccountScopeCurrent');
    expect(source).toContain('nowMs: () => Date.now()');
    expect(source).toContain('wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))');
    expect(source).toContain('export const arenaEntryPrefetchStart = arenaEntryPrefetch.start;');
    expect(source).toContain('export const arenaEntryPrefetchClaim = arenaEntryPrefetch.claim;');
  });

  /*
   * zachem pravka storozha 2026-09-20: vhod v match PEREEHAL s ekrana poiska
   * v tost nahodki (ArenaOpponentFoundHost) — poisk zhivet vne ekrana Areny i
   * perezhivaet ego. Oba testa nizhe opisyvali UDALENNUYU arhitekturu
   * (entryRetryTick, resumeSearchAfterAssignedMatch) i storozhili mertvyy
   * adres. Sami trebovaniya ne izmenilis: plan gotovitsya DO perehoda, a
   * neudavshiysya vhod vozvrashchaet cheloveka v poisk, a ne v tupik.
   */
  test('keeps the offer visible until the shared prepared entry succeeds', () => {
    const host = fs.readFileSync(
      path.resolve(__dirname, '../components/arena/ArenaOpponentFoundHost.tsx'), 'utf8');
    const prefetchAt = host.indexOf('arenaEntryPrefetchStart(matchId, studyTarget)');
    const navigationAt = host.indexOf("params: { matchId, studyTarget, prepared: '1' }");

    expect(host).toContain("import { arenaEntryPrefetchStart } from '../../app/arena_entry_prefetch';");
    expect(prefetchAt).toBeGreaterThan(0);
    // Plan gotovitsya RANSHE perehoda: vojti v match bez plana huzhe, chem zhdat.
    expect(navigationAt).toBeGreaterThan(prefetchAt);
    expect(host).not.toContain("params: { matchId, intro: '1' }");
    // Reshenie po matchu prinimaetsya rovno odin raz — zashchita ot dvoynogo tapa.
    expect(host).toContain('decidedRef.current = found.matchId;');
  });

  test('a match that cannot start returns the player to the search, not a dead end', () => {
    const host = fs.readFileSync(
      path.resolve(__dirname, '../components/arena/ArenaOpponentFoundHost.tsx'), 'utf8');
    const screen = fs.readFileSync(path.resolve(__dirname, '../app/arena_matchmaking.tsx'), 'utf8');

    // Mertvyy match: vozvrat energii, ostanovka poiska i CHESTNAYA prichina.
    expect(host).toContain('refundActivityStart(energyIntent.operationId');
    expect(host).toContain('setEntryFailure(failure);');
    expect(host).toContain('<ArenaEntryFailureToast');
    // Ekran poiska bolshe ne vladelec vhoda: emu nechego znat ob otkazah.
    expect(screen).not.toContain('setEntryFailure(');
    expect(screen).not.toContain('assignedFailure');
    expect(screen).not.toContain('arenaEntryPrefetchStart');
  });
});
