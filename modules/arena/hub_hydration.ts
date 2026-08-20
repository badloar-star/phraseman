import { arenaHubCached, arenaHubCurrent, arenaHubFailure, arenaHubNeutral, type ArenaHubFailure, type ArenaHubSlot } from './hub_presentation';

type RecordValue = Record<string, unknown>;
type ArenaTodayState = 'available' | 'in_progress' | 'complete' | 'expired' | 'unavailable';

export type ArenaHubWarmHome = Readonly<{
  ok: true;
  availability: Readonly<{ enabled: boolean; quickEnabled: boolean; rankedEnabled: boolean; friendEnabled: boolean; rewardsEnabled: boolean; spinEnabled: boolean }>;
  profile: Readonly<{
    rating: number;
    rank: number;
    spinsAvailable: number;
    rankName?: string;
    dailyDayKey?: string;
    todayKey?: string;
    dailyMatches?: number;
    dailyFirstAnswers?: number;
    dailyWins?: number;
  }>;
  activeQueue?: Readonly<{ status: 'waiting' | 'matched' | 'cancelled'; mode: 'quick' | 'ranked'; requestId: string; stableUid: string }>;
  activeMatch?: Readonly<{ matchId: string }>;
}>;

export type ArenaHubWarmExpansion = Readonly<{
  ok: true;
  availability: Readonly<{ today: boolean; lab: boolean; ghost: boolean; rival: boolean; mastery: boolean; partner: boolean; store: boolean }>;
  wallet: Readonly<{ walletStars: number }>;
  today?: Readonly<{ completedTasks: number; state: ArenaTodayState }>;
  activeRun?: Readonly<{ runId: string; runKind: 'today' | 'ghost' }>;
}>;

export type ArenaHubHydrationSnapshot = Readonly<{
  home: ArenaHubSlot<ArenaHubWarmHome>;
  expansion: ArenaHubSlot<ArenaHubWarmExpansion>;
  failure: Readonly<{ home: ArenaHubFailure | null; expansion: ArenaHubFailure | null }>;
}>;

function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function count(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= 0;
}

function booleans(value: unknown, keys: readonly string[]): value is RecordValue {
  return record(value) && keys.every((key) => typeof value[key] === 'boolean');
}

function optionalString(value: RecordValue, key: string): string | undefined | null {
  const candidate = value[key];
  return candidate === undefined ? undefined : typeof candidate === 'string' ? candidate : null;
}

function optionalCount(value: RecordValue, key: string): number | undefined | null {
  const candidate = value[key];
  return candidate === undefined ? undefined : count(candidate) ? candidate : null;
}

/** Only admit cache snapshots that the hub can render without inventing data. */
export function arenaWarmHome(value: unknown): ArenaHubWarmHome | null {
  if (!record(value) || value.ok !== true) return null;
  if (!booleans(value.availability, ['enabled', 'quickEnabled', 'rankedEnabled', 'friendEnabled', 'rewardsEnabled', 'spinEnabled'])) return null;
  if (!record(value.profile) || !count(value.profile.rating) || !count(value.profile.rank) || !count(value.profile.spinsAvailable)) return null;
  const rankName = optionalString(value.profile, 'rankName');
  const dailyDayKey = optionalString(value.profile, 'dailyDayKey');
  const todayKey = optionalString(value.profile, 'todayKey');
  const dailyMatches = optionalCount(value.profile, 'dailyMatches');
  const dailyFirstAnswers = optionalCount(value.profile, 'dailyFirstAnswers');
  const dailyWins = optionalCount(value.profile, 'dailyWins');
  if (rankName === null || dailyDayKey === null || todayKey === null || dailyMatches === null || dailyFirstAnswers === null || dailyWins === null) return null;
  return {
    ok: true,
    availability: {
      enabled: value.availability.enabled as boolean,
      quickEnabled: value.availability.quickEnabled as boolean,
      rankedEnabled: value.availability.rankedEnabled as boolean,
      friendEnabled: value.availability.friendEnabled as boolean,
      rewardsEnabled: value.availability.rewardsEnabled as boolean,
      spinEnabled: value.availability.spinEnabled as boolean,
    },
    profile: { rating: value.profile.rating, rank: value.profile.rank, spinsAvailable: value.profile.spinsAvailable, ...(rankName === undefined ? {} : { rankName }), ...(dailyDayKey === undefined ? {} : { dailyDayKey }), ...(todayKey === undefined ? {} : { todayKey }), ...(dailyMatches === undefined ? {} : { dailyMatches }), ...(dailyFirstAnswers === undefined ? {} : { dailyFirstAnswers }), ...(dailyWins === undefined ? {} : { dailyWins }) },
  };
}

/** Validate the fields displayed on the first-frame wallet and Today card. */
export function arenaWarmExpansion(value: unknown): ArenaHubWarmExpansion | null {
  if (!record(value) || value.ok !== true) return null;
  if (!booleans(value.availability, ['today', 'lab', 'ghost', 'rival', 'mastery', 'partner', 'store'])) return null;
  if (!record(value.wallet) || !count(value.wallet.walletStars)) return null;
  if (!record(value.today) || !count(value.today.completedTasks) || value.today.completedTasks > 10
    || !['available', 'in_progress', 'complete', 'expired', 'unavailable'].includes(String(value.today.state))) return null;
  let activeRun: ArenaHubWarmExpansion['activeRun'];
  if (value.activeRun !== undefined) {
    if (!record(value.activeRun) || typeof value.activeRun.runId !== 'string' || (value.activeRun.runKind !== 'today' && value.activeRun.runKind !== 'ghost')) return null;
    activeRun = { runId: value.activeRun.runId, runKind: value.activeRun.runKind };
  }
  return {
    ok: true,
    availability: { today: value.availability.today as boolean, lab: value.availability.lab as boolean, ghost: value.availability.ghost as boolean, rival: value.availability.rival as boolean, mastery: value.availability.mastery as boolean, partner: value.availability.partner as boolean, store: value.availability.store as boolean },
    wallet: { walletStars: value.wallet.walletStars },
    today: { completedTasks: value.today.completedTasks, state: value.today.state as ArenaTodayState },
    ...(activeRun === undefined ? {} : { activeRun }),
  };
}

/** Projects an old warm snapshot onto a known UTC day without inventing daily state. */
export function arenaWarmForDay(warm: Readonly<{ home?: unknown; expansion?: unknown }>, todayKey: string, savedDayKey?: string): Readonly<{
  home: ArenaHubWarmHome | null;
  expansion: ArenaHubWarmExpansion | null;
}> {
  const home = arenaWarmHome(warm.home);
  const expansion = arenaWarmExpansion(warm.expansion);
  // savedDayKey is the snapshot's date, unlike dailyDayKey which can remain
  // empty until the player does something today.
  const sameDay = home !== null
    && savedDayKey === todayKey
    && home.profile.todayKey === todayKey;
  if (sameDay) return { home, expansion };
  if (home === null) return { home: null, expansion };
  const { dailyDayKey: _dailyDayKey, todayKey: _todayKey, dailyMatches: _dailyMatches, dailyFirstAnswers: _dailyFirstAnswers, dailyWins: _dailyWins, ...profile } = home.profile;
  const nextExpansion = expansion === null ? null : (() => {
    const { today: _today, activeRun: _activeRun, ...rest } = expansion;
    return rest;
  })();
  return { home: { ...home, profile }, expansion: nextExpansion };
}

/** Monotonic request guard: stale responses and unmounted screens become no-ops. */
export function arenaHubRequestGate() {
  let mounted = true;
  let generation = 0;
  return {
    begin: (): number | null => mounted ? ++generation : null,
    current: (candidate: number) => mounted && candidate === generation,
    mounted: () => mounted,
    dispose: () => { mounted = false; ++generation; },
  } as const;
}

type ArenaHubHydrationOptions<Home extends ArenaHubWarmHome, Expansion extends ArenaHubWarmExpansion> = Readonly<{
  initialHome?: unknown;
  initialExpansion?: unknown;
  todayKey?: string;
  warmDayKey?: string;
  fetchHome: () => Promise<Home>;
  fetchExpansion: () => Promise<Expansion>;
  remember: (value: Readonly<{ home?: Home; expansion?: Expansion }>) => void;
  onSnapshot: (snapshot: ArenaHubHydrationSnapshot) => void;
}>;

/** Small UI-agnostic coordinator for warm cache, parallel refresh, and unmount safety. */
export function createArenaHubHydrationController<Home extends ArenaHubWarmHome, Expansion extends ArenaHubWarmExpansion>(options: ArenaHubHydrationOptions<Home, Expansion>) {
  const gate = arenaHubRequestGate();
  const projectWarm = (warm: Readonly<{ home?: unknown; expansion?: unknown; savedDayKey?: string }>) => arenaWarmForDay(warm, options.todayKey ?? '', warm.savedDayKey ?? options.warmDayKey);
  const initialWarm = projectWarm({ home: options.initialHome, expansion: options.initialExpansion, savedDayKey: options.warmDayKey });
  let snapshot: ArenaHubHydrationSnapshot = {
    home: arenaHubCached(arenaHubNeutral<ArenaHubWarmHome>(), initialWarm.home),
    expansion: arenaHubCached(arenaHubNeutral<ArenaHubWarmExpansion>(), initialWarm.expansion),
    failure: { home: null, expansion: null },
  };
  const publish = () => { if (gate.mounted()) options.onSnapshot(snapshot); };
  const update = (next: ArenaHubHydrationSnapshot) => { snapshot = next; publish(); };
  const acceptHome = (generation: number, response: Home) => {
    if (!gate.current(generation)) return;
    update({ ...snapshot, home: arenaHubCurrent(response), failure: { ...snapshot.failure, home: null } });
    options.remember({ home: response });
  };
  const acceptExpansion = (generation: number, response: Expansion) => {
    if (!gate.current(generation)) return;
    update({ ...snapshot, expansion: arenaHubCurrent(response), failure: { ...snapshot.failure, expansion: null } });
    options.remember({ expansion: response });
  };
  return {
    snapshot: () => snapshot,
    hydrate: (warm: Readonly<{ home?: unknown; expansion?: unknown; savedDayKey?: string }>) => {
      if (!gate.mounted()) return;
      const projected = projectWarm(warm);
      update({ ...snapshot, home: arenaHubCached(snapshot.home, projected.home), expansion: arenaHubCached(snapshot.expansion, projected.expansion) });
    },
    refresh: (): number | null => {
      const generation = gate.begin();
      if (generation === null) return null;
      void options.fetchHome().then((response) => acceptHome(generation, response)).catch((error: unknown) => {
        if (gate.current(generation)) update({ ...snapshot, failure: { ...snapshot.failure, home: arenaHubFailure(error) } });
      });
      void options.fetchExpansion().then((response) => acceptExpansion(generation, response)).catch((error: unknown) => {
        if (gate.current(generation)) update({ ...snapshot, failure: { ...snapshot.failure, expansion: arenaHubFailure(error) } });
      });
      return generation;
    },
    current: gate.current,
    mounted: gate.mounted,
    dispose: gate.dispose,
  } as const;
}

/** Runs a spin without allowing a late completion to refresh an unmounted screen. */
export function runArenaHubSpin(input: Readonly<{
  controller: Pick<ReturnType<typeof createArenaHubHydrationController>, 'mounted'>;
  claim: () => Promise<unknown>;
  onBusy: (busy: boolean) => void;
  onAccepted: () => void;
}>): void {
  if (!input.controller.mounted()) return;
  input.onBusy(true);
  void input.claim().then(() => {
    if (input.controller.mounted()) input.onAccepted();
  }).catch(() => {
    // The row has no error surface; preserve its existing silent failure policy.
  }).finally(() => {
    if (input.controller.mounted()) input.onBusy(false);
  });
}
