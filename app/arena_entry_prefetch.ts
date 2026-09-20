import {
  ArenaEntryAccountChangedError,
  createArenaEntryPrefetch,
  type ArenaEntryAccountScope,
} from '../modules/arena/entry_prefetch';
import {
  arenaV2MatchAcceptDispatch,
  arenaV2MatchPlanDispatch,
  rememberArenaViewerSeat,
} from './arena_client';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import type { ArenaStudyTarget } from '../modules/arena/target_registry';

function currentArenaEntryAccountScope(studyTarget: ArenaStudyTarget): ArenaEntryAccountScope | null {
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId
    || !isCurrentAccountGeneration(account, account.stableId)) return null;
  return { stableId: account.stableId, generation: account.generation, studyTarget };
}

function isArenaEntryAccountScopeCurrent(scope: ArenaEntryAccountScope): boolean {
  const account = captureAccountGeneration();
  return account.phase === 'active'
    && account.stableId === scope.stableId
    && account.generation === scope.generation
    && isCurrentAccountGeneration(account, scope.stableId);
}

function arenaEntryAccountToken(scope: ArenaEntryAccountScope): AccountGenerationToken {
  return { stableId: scope.stableId, generation: scope.generation, phase: 'active' };
}

const arenaEntryPrefetch = createArenaEntryPrefetch({
  captureAccountScope: currentArenaEntryAccountScope,
  isAccountScopeCurrent: isArenaEntryAccountScopeCurrent,
  accept: async (matchId, scope) => {
    const dispatch = await arenaV2MatchAcceptDispatch(
      matchId,
      scope.studyTarget,
      arenaEntryAccountToken(scope),
    );
    if (!dispatch) throw new ArenaEntryAccountChangedError();
    return dispatch.networkPromise;
  },
  loadPlan: async (matchId, scope) => {
    const dispatch = await arenaV2MatchPlanDispatch(
      matchId,
      scope.studyTarget,
      arenaEntryAccountToken(scope),
    );
    if (!dispatch) throw new ArenaEntryAccountChangedError();
    return dispatch.networkPromise;
  },
  rememberViewerSeat: rememberArenaViewerSeat,
  nowMs: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

export const arenaEntryPrefetchStart = arenaEntryPrefetch.start;
export const arenaEntryPrefetchPeek = arenaEntryPrefetch.peek;
export const arenaEntryPrefetchClaim = arenaEntryPrefetch.claim;
