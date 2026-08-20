import {
  createArenaEntryPrefetch,
  type ArenaEntryAccountScope,
} from '../modules/arena/entry_prefetch';
import {
  arenaV2MatchAccept,
  arenaV2MatchPlan,
  rememberArenaViewerSeat,
} from './arena_client';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';

function currentArenaEntryAccountScope(): ArenaEntryAccountScope | null {
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId
    || !isCurrentAccountGeneration(account, account.stableId)) return null;
  return { stableId: account.stableId, generation: account.generation };
}

function isArenaEntryAccountScopeCurrent(scope: ArenaEntryAccountScope): boolean {
  const account = captureAccountGeneration();
  return account.phase === 'active'
    && account.stableId === scope.stableId
    && account.generation === scope.generation
    && isCurrentAccountGeneration(account, scope.stableId);
}

const arenaEntryPrefetch = createArenaEntryPrefetch({
  captureAccountScope: currentArenaEntryAccountScope,
  isAccountScopeCurrent: isArenaEntryAccountScopeCurrent,
  accept: arenaV2MatchAccept,
  loadPlan: arenaV2MatchPlan,
  rememberViewerSeat: rememberArenaViewerSeat,
  nowMs: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

export const arenaEntryPrefetchStart = arenaEntryPrefetch.start;
export const arenaEntryPrefetchPeek = arenaEntryPrefetch.peek;
export const arenaEntryPrefetchClaim = arenaEntryPrefetch.claim;
