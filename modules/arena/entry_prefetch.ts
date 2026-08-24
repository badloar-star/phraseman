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

export type ArenaEntryAccountScope = Readonly<{
  stableId: string;
  generation: number;
}>;

export type ArenaEntryPrefetchDependencies = Readonly<{
  captureAccountScope: () => ArenaEntryAccountScope | null;
  isAccountScopeCurrent: (scope: ArenaEntryAccountScope) => boolean;
  accept: (matchId: string, scope: ArenaEntryAccountScope) => Promise<ArenaEntryAcceptResponse>;
  loadPlan: (matchId: string, scope: ArenaEntryAccountScope) => Promise<ArenaPreparedEntry | null>;
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

export class ArenaTerminalMatchError extends Error {
  readonly failure = 'terminal' as const;

  constructor() {
    super('arena_match_terminal');
    this.name = 'ArenaTerminalMatchError';
  }
}

export class ArenaEntryAccountChangedError extends Error {
  readonly failure = 'account_changed' as const;

  constructor() {
    super('arena_entry_account_changed');
    this.name = 'ArenaEntryAccountChangedError';
  }
}

const MAX_READY_ENTRIES = 8;

export function createArenaEntryPrefetch(deps: ArenaEntryPrefetchDependencies) {
  const requests = new Map<string, Promise<ArenaPreparedEntry>>();
  const ready = new Map<string, ArenaPreparedEntry>();
  const completed = new Map<string, true>();

  const scopedKey = (matchId: string, scope: ArenaEntryAccountScope) =>
    `${scope.generation}:${scope.stableId.length}:${scope.stableId}:${matchId}`;

  const currentScope = (): ArenaEntryAccountScope | null => {
    const scope = deps.captureAccountScope();
    return scope && deps.isAccountScopeCurrent(scope) ? scope : null;
  };

  const assertCurrentScope = (scope: ArenaEntryAccountScope): void => {
    if (!deps.isAccountScopeCurrent(scope)) throw new ArenaEntryAccountChangedError();
  };

  const forget = (key: string) => {
    requests.delete(key);
    ready.delete(key);
    completed.delete(key);
  };

  const pruneCompleted = () => {
    while (completed.size > MAX_READY_ENTRIES) {
      const oldestKey = completed.keys().next().value as string | undefined;
      if (!oldestKey) return;
      completed.delete(oldestKey);
      ready.delete(oldestKey);
      requests.delete(oldestKey);
    }
  };

  const prepare = async (
    matchId: string,
    scope: ArenaEntryAccountScope,
    key: string,
  ): Promise<ArenaPreparedEntry> => {
    try {
      assertCurrentScope(scope);
      const startedAtMs = deps.nowMs();
      while (true) {
        assertCurrentScope(scope);
        const accepted = await deps.accept(matchId, scope);
        assertCurrentScope(scope);
        if (accepted.viewerSeat) deps.rememberViewerSeat(matchId, accepted.viewerSeat);

        const step = arenaEntryStep({
          state: accepted.state,
          elapsedSinceEntryMs: deps.nowMs() - startedAtMs,
        });
        if (step === 'give_up') throw new ArenaNoOpponentError();
        if (step === 'terminal') throw new ArenaTerminalMatchError();
        if (step === 'accept') {
          await deps.wait(ARENA_ACCEPT_RETRY_MS);
          assertCurrentScope(scope);
          continue;
        }

        const planned = await deps.loadPlan(matchId, scope);
        assertCurrentScope(scope);
        if (!planned) throw new Error('arena_match_plan_invalid');
        deps.rememberViewerSeat(matchId, planned.plan.viewerSeat);

        ready.set(key, planned);
        completed.delete(key);
        completed.set(key, true);
        pruneCompleted();
        return planned;
      }
    } catch (error) {
      forget(key);
      throw error;
    }
  };

  return {
    start(matchId: string): Promise<ArenaPreparedEntry> {
      const scope = currentScope();
      if (!scope) return Promise.reject(new ArenaEntryAccountChangedError());
      const key = scopedKey(matchId, scope);
      const existing = requests.get(key);
      if (existing) return existing;

      const request = Promise.resolve().then(() => prepare(matchId, scope, key));
      requests.set(key, request);
      return request;
    },

    peek(matchId: string): ArenaPreparedEntry | null {
      const scope = currentScope();
      return scope ? ready.get(scopedKey(matchId, scope)) ?? null : null;
    },

    claim(matchId: string): ArenaPreparedEntry | null {
      const scope = currentScope();
      if (!scope) return null;
      const key = scopedKey(matchId, scope);
      const prepared = ready.get(key) ?? null;
      if (prepared) ready.delete(key);
      return prepared;
    },
  };
}
