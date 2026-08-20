import {
  ARENA_ACCEPT_RETRY_MS,
  arenaEntryStep,
} from './duel_plan';
import type { ArenaMatchPlanWire } from './duel_plan';

export type ArenaPreparedEntry = Readonly<{
  ok: true;
  startedAtMs: number;
  deadlineAtMs: number;
  plan: ArenaMatchPlanWire;
}>;

export type ArenaEntryAcceptResponse = Readonly<{
  state: string;
  viewerSeat?: 'a' | 'b';
}>;

export type ArenaEntryPrefetchDependencies = Readonly<{
  accept: (matchId: string) => Promise<ArenaEntryAcceptResponse>;
  loadPlan: (matchId: string) => Promise<ArenaPreparedEntry | null>;
  rememberViewerSeat: (matchId: string, seat: 'a' | 'b') => void;
  nowMs: () => number;
  wait: (ms: number) => Promise<void>;
}>;

export class ArenaNoOpponentError extends Error {
  readonly failure = 'no_opponent' as const;

  constructor() {
    super('arena_match_no_opponent');
    this.name = 'ArenaNoOpponentError';
  }
}

const MAX_READY_ENTRIES = 8;

export function createArenaEntryPrefetch(deps: ArenaEntryPrefetchDependencies) {
  const requests = new Map<string, Promise<ArenaPreparedEntry>>();
  const ready = new Map<string, ArenaPreparedEntry>();

  const forget = (matchId: string) => {
    requests.delete(matchId);
    ready.delete(matchId);
  };

  const pruneReady = () => {
    while (ready.size > MAX_READY_ENTRIES) {
      const oldestMatchId = ready.keys().next().value as string | undefined;
      if (!oldestMatchId) return;
      ready.delete(oldestMatchId);
      requests.delete(oldestMatchId);
    }
  };

  const prepare = async (matchId: string): Promise<ArenaPreparedEntry> => {
    try {
      const startedAtMs = deps.nowMs();
      while (true) {
        const accepted = await deps.accept(matchId);
        if (accepted.viewerSeat) deps.rememberViewerSeat(matchId, accepted.viewerSeat);

        const step = arenaEntryStep({
          state: accepted.state,
          elapsedSinceEntryMs: deps.nowMs() - startedAtMs,
        });
        if (step === 'give_up') throw new ArenaNoOpponentError();
        if (step === 'accept') {
          await deps.wait(ARENA_ACCEPT_RETRY_MS);
          continue;
        }

        const planned = await deps.loadPlan(matchId);
        if (!planned) throw new Error('arena_match_plan_invalid');
        deps.rememberViewerSeat(matchId, planned.plan.viewerSeat);

        ready.set(matchId, planned);
        pruneReady();
        return planned;
      }
    } catch (error) {
      forget(matchId);
      throw error;
    }
  };

  return {
    start(matchId: string): Promise<ArenaPreparedEntry> {
      const existing = requests.get(matchId);
      if (existing) return existing;

      const request = Promise.resolve().then(() => prepare(matchId));
      requests.set(matchId, request);
      return request;
    },

    peek(matchId: string): ArenaPreparedEntry | null {
      return ready.get(matchId) ?? null;
    },
  };
}
