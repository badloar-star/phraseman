import {
  createArenaHubHydrationController,
  runArenaHubSpin,
  arenaHubRequestGate,
  arenaWarmExpansion,
  arenaWarmHome,
  arenaWarmForDay,
  type ArenaHubWarmExpansion,
  type ArenaHubWarmHome,
} from '../modules/arena/hub_hydration';
import * as fs from 'fs';
import * as path from 'path';

const validHome: ArenaHubWarmHome = {
  ok: true,
  availability: { enabled: true, quickEnabled: true, rankedEnabled: true, friendEnabled: true, rewardsEnabled: true, spinEnabled: true },
  profile: { rating: 900, rank: 3, spinsAvailable: 0 },
};
const validExpansion: ArenaHubWarmExpansion = {
  ok: true,
  availability: { today: true, lab: true, ghost: true, rival: true, mastery: true, partner: true, store: true },
  wallet: { walletStars: 20 },
  today: { completedTasks: 10, state: 'available' },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('Arena hub hydration safety', () => {
  it('rejects malformed current-schema warm data without fabricating a rank', () => {
    expect(arenaWarmHome({})).toBeNull();
    expect(arenaWarmHome({ ...validHome, profile: {} })).toBeNull();
    expect(arenaWarmHome({ ...validHome, availability: { enabled: true } })).toBeNull();
    expect(arenaWarmHome({ ...validHome, profile: { ...validHome.profile, rating: -1 } })).toBeNull();
    expect(arenaWarmHome({ ...validHome, profile: { ...validHome.profile, rank: 1.5 } })).toBeNull();
    expect(arenaWarmHome({ ...validHome, profile: { ...validHome.profile, spinsAvailable: -1 } })).toBeNull();
    const { rank: _rank, ...profileWithoutRank } = validHome.profile;
    expect(arenaWarmHome({ ...validHome, profile: profileWithoutRank })).toBeNull();
    expect(arenaWarmHome(validHome)?.profile.rank).toBe(3);
    expect(arenaWarmExpansion({})).toBeNull();
    expect(arenaWarmExpansion({ ...validExpansion, wallet: {} })).toBeNull();
    expect(arenaWarmExpansion({ ...validExpansion, wallet: { walletStars: -1 } })).toBeNull();
    expect(arenaWarmExpansion({ ...validExpansion, today: { completedTasks: 0, state: 'garbage' } })).toBeNull();
    expect(arenaWarmExpansion({ ...validExpansion, today: { completedTasks: 11, state: 'available' } })).toBeNull();
    expect(arenaWarmExpansion(validExpansion)?.wallet.walletStars).toBe(20);
  });

  it('accepts only the latest mounted request generation', () => {
    const gate = arenaHubRequestGate();
    const older = gate.begin();
    const latest = gate.begin();
    if (older === null || latest === null) throw new Error('mounted gate must issue a generation');
    expect(gate.current(older)).toBe(false);
    expect(gate.current(latest)).toBe(true);
    gate.dispose();
    expect(gate.current(latest)).toBe(false);
  });

  it('returns no request generation after disposal', () => {
    const gate = arenaHubRequestGate();
    gate.dispose();
    expect(gate.begin()).toBeNull();
  });

  it('keeps yesterday warm rank and wallet but removes daily claims and active run', () => {
    const yesterday = '2026-08-19';
    const today = '2026-08-20';
    const warm = arenaWarmForDay({
      home: { ...validHome, profile: { ...validHome.profile, dailyDayKey: yesterday, todayKey: yesterday, dailyMatches: 3, dailyFirstAnswers: 8, dailyWins: 1 } },
      expansion: { ...validExpansion, activeRun: { runId: 'old-run', runKind: 'today' } },
    }, today, yesterday);
    expect(warm.home?.profile.rating).toBe(900);
    expect(warm.home?.profile.dailyMatches).toBeUndefined();
    expect(warm.expansion?.wallet.walletStars).toBe(20);
    expect(warm.expansion?.today).toBeUndefined();
    expect(warm.expansion?.activeRun).toBeUndefined();
  });

  it('preserves same-day zero progress before the first activity', () => {
    const today = '2026-08-20';
    const warm = arenaWarmForDay({
      home: { ...validHome, profile: { ...validHome.profile, dailyDayKey: '', todayKey: today, dailyMatches: 0, dailyFirstAnswers: 0, dailyWins: 0 } },
      expansion: { ...validExpansion, activeRun: { runId: 'today-run', runKind: 'today' } },
    }, today, today);
    expect(warm.home?.profile.dailyMatches).toBe(0);
    expect(warm.expansion?.today?.completedTasks).toBe(10);
    expect(warm.expansion?.activeRun?.runId).toBe('today-run');
  });

  it('strips expansion daily state when no validated home proves its day', () => {
    const warm = arenaWarmForDay({
      expansion: { ...validExpansion, activeRun: { runId: 'old', runKind: 'today' } },
    }, '2026-08-20', '2026-08-20');
    expect(warm.expansion?.wallet.walletStars).toBe(20);
    expect(warm.expansion?.today).toBeUndefined();
    expect(warm.expansion?.activeRun).toBeUndefined();
  });

  it('orchestrates a valid cache, ignores malformed cache, and keeps cached values on failure', async () => {
    const home = deferred<typeof validHome>();
    const expansion = deferred<typeof validExpansion>();
    const snapshots: unknown[] = [];
    const controller = createArenaHubHydrationController({
      initialHome: validHome,
      initialExpansion: { bad: true },
      fetchHome: () => home.promise,
      fetchExpansion: () => expansion.promise,
      remember: () => {},
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    expect(controller.snapshot().home.source).toBe('cached');
    expect(controller.snapshot().expansion.source).toBe('neutral');
    controller.refresh();
    home.reject(new Error('network offline'));
    expansion.reject(new Error('network offline'));
    await flush();

    expect(controller.snapshot().home.value?.profile.rank).toBe(3);
    expect(controller.snapshot().home.source).toBe('cached');
    expect(controller.snapshot().failure.home?.kind).toBe('offline');
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it('accepts only the latest retry and persists only its accepted responses', async () => {
    const firstHome = deferred<typeof validHome>();
    const latestHome = deferred<typeof validHome>();
    const firstExpansion = deferred<typeof validExpansion>();
    const latestExpansion = deferred<typeof validExpansion>();
    const homeFetches = [firstHome, latestHome];
    const expansionFetches = [firstExpansion, latestExpansion];
    const remembered: unknown[] = [];
    const controller = createArenaHubHydrationController({
      fetchHome: () => homeFetches.shift()!.promise,
      fetchExpansion: () => expansionFetches.shift()!.promise,
      remember: (value) => remembered.push(value),
      onSnapshot: () => {},
    });

    controller.refresh();
    controller.refresh();
    latestHome.resolve({ ...validHome, profile: { ...validHome.profile, rank: 7 } });
    latestExpansion.resolve({ ...validExpansion, wallet: { walletStars: 77 } });
    await flush();
    firstHome.resolve(validHome);
    firstExpansion.resolve(validExpansion);
    await flush();

    expect(controller.snapshot().home.value?.profile.rank).toBe(7);
    expect(controller.snapshot().expansion.value?.wallet.walletStars).toBe(77);
    expect(remembered).toHaveLength(3);
    controller.hydrate({ home: validHome, expansion: validExpansion });
    expect(controller.snapshot().home.value?.profile.rank).toBe(7);
  });

  it('keeps the latest retry failure when an older request later succeeds', async () => {
    const olderHome = deferred<ArenaHubWarmHome>();
    const latestHome = deferred<ArenaHubWarmHome>();
    const olderExpansion = deferred<ArenaHubWarmExpansion>();
    const latestExpansion = deferred<ArenaHubWarmExpansion>();
    const homes = [olderHome, latestHome];
    const expansions = [olderExpansion, latestExpansion];
    const controller = createArenaHubHydrationController({
      fetchHome: () => homes.shift()!.promise,
      fetchExpansion: () => expansions.shift()!.promise,
      remember: () => {},
      onSnapshot: () => {},
    });
    controller.refresh();
    controller.refresh();
    latestHome.reject(new Error('server rejected'));
    latestExpansion.reject(new Error('server rejected'));
    await flush();
    olderHome.resolve(validHome);
    olderExpansion.resolve(validExpansion);
    await flush();

    expect(controller.snapshot().failure.home?.kind).toBe('server');
    expect(controller.snapshot().failure.expansion?.kind).toBe('server');
    expect(controller.snapshot().home.value).toBeNull();
  });

  it('does not mutate state or cache when disposed before deferred responses settle', async () => {
    const home = deferred<typeof validHome>();
    const expansion = deferred<typeof validExpansion>();
    const onSnapshot = jest.fn();
    const remember = jest.fn();
    const controller = createArenaHubHydrationController({
      fetchHome: () => home.promise,
      fetchExpansion: () => expansion.promise,
      remember,
      onSnapshot,
    });
    controller.refresh();
    controller.dispose();
    home.resolve(validHome);
    expansion.resolve(validExpansion);
    await flush();

    expect(onSnapshot).not.toHaveBeenCalled();
    expect(remember).not.toHaveBeenCalled();
  });

  it('does not refresh or change spin state after an unmounted spin completes', async () => {
    const claim = deferred<void>();
    const controller = createArenaHubHydrationController({
      fetchHome: async () => validHome,
      fetchExpansion: async () => validExpansion,
      remember: () => {},
      onSnapshot: () => {},
    });
    const onBusy = jest.fn();
    const onAccepted = jest.fn();
    runArenaHubSpin({ controller, claim: () => claim.promise, onBusy, onAccepted });
    controller.dispose();
    claim.resolve();
    await flush();

    expect(onBusy).toHaveBeenCalledTimes(1);
    expect(onBusy).toHaveBeenLastCalledWith(true);
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('releases spin state without refreshing when the claim is rejected', async () => {
    const claim = deferred<void>();
    const controller = createArenaHubHydrationController({
      fetchHome: async () => validHome,
      fetchExpansion: async () => validExpansion,
      remember: () => {},
      onSnapshot: () => {},
    });
    const onBusy = jest.fn();
    const onAccepted = jest.fn();
    runArenaHubSpin({ controller, claim: () => claim.promise, onBusy, onAccepted });
    claim.reject(new Error('claim failed'));
    await flush();

    expect(onBusy).toHaveBeenNthCalledWith(1, true);
    expect(onBusy).toHaveBeenLastCalledWith(false);
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('wires validated warm values and latest-only responses into the screen', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena.tsx'), 'utf8');
    expect(source).toContain('createArenaHubHydrationController');
    expect(source).toContain('runArenaHubSpin');
    expect(source).toContain('quickDisabledHint');
  });
});
