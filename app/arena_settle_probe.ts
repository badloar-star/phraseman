import {
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { arenaV2MatchSettleDispatch } from './arena_client';
import { createArenaSettleProbeOrchestrator } from '../modules/arena/settle_probe';
import type { ArenaStudyTarget } from '../modules/arena/target_registry';

const settleProbes = createArenaSettleProbeOrchestrator({
  setTimer: (listener, delayMs) => setTimeout(listener, delayMs),
  clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
});

/**
 * Process-level one-shot probe. It deliberately outlives the match component,
 * while account-generation subscription cancels it immediately on A→B.
 */
export function arenaScheduleMatchSettleProbe(input: Readonly<{
  matchId: string;
  studyTarget: ArenaStudyTarget;
  dueAtMs: number;
  account: AccountGenerationToken;
}>): boolean {
  const stableUid = input.account.phase === 'active' ? input.account.stableId : null;
  if (!stableUid) return false;
  const ownerKey = `${encodeURIComponent(stableUid)}:${input.account.generation}:${input.studyTarget}`;
  return settleProbes.schedule({
    ownerKey,
    matchId: input.matchId,
    dueAtMs: input.dueAtMs,
    wallNowMs: Date.now(),
    isOwnerCurrent: () => isCurrentAccountGeneration(input.account, stableUid),
    subscribeOwner: (listener) => subscribeAccountGeneration(() => listener()),
    dispatch: async () => {
      // Reservation rechecks identity after async auth/App Check preflight and
      // creates the native network promise before account transition proceeds.
      const dispatch = await arenaV2MatchSettleDispatch(input.matchId, input.studyTarget, input.account);
      if (dispatch) await dispatch.networkPromise;
    },
  });
}
