import type { ArenaExpansionHome } from './expansion_contract';
import type { ArenaHomeResponse } from '../../app/arena_client';

type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function booleans(value: unknown, keys: readonly string[]): value is RecordValue {
  return record(value) && keys.every((key) => typeof value[key] === 'boolean');
}

/** Only admit cache snapshots that the hub can render without inventing data. */
export function arenaWarmHome(value: unknown): ArenaHomeResponse | null {
  if (!record(value) || value.ok !== true) return null;
  if (!booleans(value.availability, ['enabled', 'quickEnabled', 'rankedEnabled', 'friendEnabled', 'rewardsEnabled', 'spinEnabled'])) return null;
  if (!record(value.profile) || !finiteNumber(value.profile.rating) || !finiteNumber(value.profile.rank) || !finiteNumber(value.profile.spinsAvailable)) return null;
  if (value.profile.rankName !== undefined && typeof value.profile.rankName !== 'string') return null;
  return value as ArenaHomeResponse;
}

/** Validate the fields displayed on the first-frame wallet and Today card. */
export function arenaWarmExpansion(value: unknown): ArenaExpansionHome | null {
  if (!record(value) || value.ok !== true) return null;
  if (!booleans(value.availability, ['today', 'lab', 'ghost', 'rival', 'mastery', 'partner', 'store'])) return null;
  if (!record(value.wallet) || !finiteNumber(value.wallet.walletStars)) return null;
  if (!record(value.today) || !finiteNumber(value.today.completedTasks) || typeof value.today.state !== 'string') return null;
  return value as ArenaExpansionHome;
}

/** Monotonic request guard: stale responses and unmounted screens become no-ops. */
export function arenaHubRequestGate() {
  let mounted = true;
  let generation = 0;
  return {
    begin: () => ++generation,
    current: (candidate: number) => mounted && candidate === generation,
    dispose: () => { mounted = false; ++generation; },
  } as const;
}
