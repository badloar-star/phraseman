import { decideArenaReconcile } from './arena_matchmaking_reconcile';

export type AuthoritativeSearchState =
  | { kind: 'matched'; sessionId: string }
  | { kind: 'queued'; queueId: string }
  | { kind: 'absent' };

export type ArenaControlSearch = {
  generation: number;
  userId: string;
  originalStartedAt: number;
  rangeDeadlineAt: number;
  botFallbackDeadlineAt: number | null;
  timeoutDeadlineAt: number;
  rangeExpanded: boolean;
};

export type ArenaControlClockDeps = {
  now(): number;
  setTimeout(listener: () => void, delayMs: number): unknown;
  clearTimeout(id: unknown): void;
  readAuthoritativeState(userId: string): Promise<AuthoritativeSearchState>;
  onMatch(sessionId: string, generation: number): Promise<void> | void;
  onExpand(generation: number): Promise<void> | void;
  onBotFallback(generation: number): Promise<number | null | void> | number | null | void;
  onTimeout(generation: number): Promise<void> | void;
  onStop(generation: number): Promise<void> | void;
};

type TimerSlot = 'range' | 'bot' | 'timeout' | 'retry';

export function createArenaMatchmakingControlClock(deps: ArenaControlClockDeps) {
  let appActive = true;
  let search: ArenaControlSearch | null = null;
  let reconcilePending = false;
  let reconcilePromise: Promise<void> | null = null;
  let pendingMatchedSession: { generation: number; sessionId: string } | null = null;
  let authoritativeReads = 0;
  const timers: Record<TimerSlot, unknown | null> = {
    range: null,
    bot: null,
    timeout: null,
    retry: null,
  };
  const applied = {
    match: false,
    range: false,
    bot: false,
    timeout: false,
    stop: false,
  };

  const clearTimer = (slot: TimerSlot) => {
    if (timers[slot] !== null) deps.clearTimeout(timers[slot]);
    timers[slot] = null;
  };

  const clearTimers = () => {
    clearTimer('range');
    clearTimer('bot');
    clearTimer('timeout');
    clearTimer('retry');
  };

  const resetApplied = (next: ArenaControlSearch) => {
    applied.match = false;
    applied.range = next.rangeExpanded;
    applied.bot = false;
    applied.timeout = false;
    applied.stop = false;
  };

  const finish = (generation: number) => {
    if (search?.generation !== generation) return false;
    clearTimers();
    search = null;
    pendingMatchedSession = null;
    return true;
  };

  let requestReconcile: (trigger: string) => Promise<void>;

  const scheduleRetry = () => {
    if (!appActive || !search || timers.retry !== null) return;
    timers.retry = deps.setTimeout(() => {
      timers.retry = null;
      void requestReconcile('transition_retry');
    }, 1_000);
  };

  const readState = async (current: ArenaControlSearch): Promise<AuthoritativeSearchState> => {
    const pending = pendingMatchedSession;
    if (pending?.generation === current.generation) {
      pendingMatchedSession = null;
      return { kind: 'matched', sessionId: pending.sessionId };
    }
    authoritativeReads += 1;
    const state = await deps.readAuthoritativeState(current.userId);
    const afterReadMatch = pendingMatchedSession;
    if (afterReadMatch?.generation === current.generation) {
      pendingMatchedSession = null;
      return { kind: 'matched', sessionId: afterReadMatch.sessionId };
    }
    return state;
  };

  const deferWhileBackgrounded = (
    state: AuthoritativeSearchState,
    current: ArenaControlSearch,
  ): boolean => {
    if (appActive) return false;
    if (state.kind === 'matched') {
      pendingMatchedSession = {
        generation: current.generation,
        sessionId: state.sessionId,
      };
    }
    return true;
  };

  const applyMatch = async (sessionId: string, generation: number) => {
    if (applied.match || search?.generation !== generation) return;
    applied.match = true;
    clearTimers();
    try {
      await deps.onMatch(sessionId, generation);
      finish(generation);
    } catch {
      if (search?.generation !== generation) return;
      applied.match = false;
      scheduleRetry();
    }
  };

  const applyStop = async (generation: number) => {
    if (applied.stop || search?.generation !== generation) return;
    applied.stop = true;
    clearTimers();
    try {
      await deps.onStop(generation);
      finish(generation);
    } catch {
      if (search?.generation !== generation) return;
      applied.stop = false;
      scheduleRetry();
    }
  };

  const schedule = (slot: TimerSlot, deadlineAt: number) => {
    clearTimer(slot);
    timers[slot] = deps.setTimeout(() => {
      timers[slot] = null;
      void requestReconcile(`${slot}_deadline`);
    }, Math.max(0, deadlineAt - deps.now()));
  };

  const scheduleDeadlines = () => {
    if (!appActive || !search) return;
    if (!applied.range) schedule('range', search.rangeDeadlineAt);
    if (!applied.bot && search.botFallbackDeadlineAt !== null) {
      schedule('bot', search.botFallbackDeadlineAt);
    }
    if (!applied.timeout) schedule('timeout', search.timeoutDeadlineAt);
  };

  const reconcileOnce = async () => {
    const current = search;
    if (!appActive || !current) return;
    let authoritative: AuthoritativeSearchState;
    try {
      authoritative = await readState(current);
    } catch {
      if (search?.generation === current.generation) scheduleRetry();
      return;
    }
    if (search?.generation !== current.generation) return;
    if (deferWhileBackgrounded(authoritative, current)) return;

    const now = deps.now();
    const decision = decideArenaReconcile({
      authoritativeSessionId: authoritative.kind === 'matched' ? authoritative.sessionId : null,
      searchStillAuthoritative: authoritative.kind === 'queued',
      rangeExpandDue: now >= current.rangeDeadlineAt,
      rangeExpanded: applied.range,
      botFallbackDue: current.botFallbackDeadlineAt !== null && now >= current.botFallbackDeadlineAt,
      timeoutDue: now >= current.timeoutDeadlineAt,
    });

    if (decision.kind === 'match') {
      await applyMatch(decision.sessionId, current.generation);
      return;
    }
    if (decision.kind === 'stop') {
      await applyStop(current.generation);
      return;
    }
    if (decision.kind === 'none') {
      scheduleDeadlines();
      return;
    }

    let finalState: AuthoritativeSearchState;
    try {
      finalState = await readState(current);
    } catch {
      if (search?.generation === current.generation) scheduleRetry();
      return;
    }
    if (search?.generation !== current.generation) return;
    if (deferWhileBackgrounded(finalState, current)) return;
    if (finalState.kind === 'matched') {
      await applyMatch(finalState.sessionId, current.generation);
      return;
    }
    if (finalState.kind === 'absent') {
      await applyStop(current.generation);
      return;
    }

    if (decision.kind === 'expand_range' && !applied.range) {
      try {
        await deps.onExpand(current.generation);
      } catch {
        if (search?.generation === current.generation) scheduleRetry();
        return;
      }
      if (search?.generation !== current.generation) return;
      applied.range = true;
      search = { ...current, rangeExpanded: true };
      scheduleDeadlines();
      return;
    }
    if (decision.kind === 'bot_fallback' && !applied.bot) {
      applied.bot = true;
      let nextDeadlineAt: number | null | void;
      try {
        nextDeadlineAt = await deps.onBotFallback(current.generation);
      } catch {
        if (search?.generation !== current.generation) return;
        applied.bot = false;
        scheduleRetry();
        return;
      }
      if (search?.generation !== current.generation) return;
      if (typeof nextDeadlineAt === 'number' && nextDeadlineAt > deps.now()) {
        applied.bot = false;
        search = { ...current, botFallbackDeadlineAt: nextDeadlineAt };
        scheduleDeadlines();
        return;
      }
      finish(current.generation);
      return;
    }
    if (decision.kind === 'timeout' && !applied.timeout) {
      applied.timeout = true;
      clearTimers();
      try {
        await deps.onTimeout(current.generation);
        finish(current.generation);
      } catch {
        if (search?.generation !== current.generation) return;
        applied.timeout = false;
        scheduleRetry();
      }
    }
  };

  requestReconcile = (_trigger: string) => {
    reconcilePending = true;
    if (reconcilePromise) return reconcilePromise;
    reconcilePromise = (async () => {
      while (reconcilePending) {
        reconcilePending = false;
        await reconcileOnce();
      }
    })().finally(() => {
      reconcilePromise = null;
      if (reconcilePending) void requestReconcile('pending_rerun');
    });
    return reconcilePromise;
  };

  return {
    start(next: ArenaControlSearch) {
      clearTimers();
      search = { ...next };
      pendingMatchedSession = null;
      resetApplied(next);
      if (appActive) void requestReconcile('start');
    },
    setAppActive(nextActive: boolean): Promise<void> {
      appActive = nextActive;
      if (!nextActive) {
        clearTimers();
        return Promise.resolve();
      }
      return requestReconcile('foreground');
    },
    notifyMatch(sessionId: string): Promise<void> {
      if (!search || !sessionId) return Promise.resolve();
      pendingMatchedSession = { generation: search.generation, sessionId };
      return requestReconcile('match_listener');
    },
    requestReconcile,
    cancel(generation?: number) {
      if (generation !== undefined && search?.generation !== generation) return;
      clearTimers();
      search = null;
      pendingMatchedSession = null;
      reconcilePending = false;
    },
    debug: () => ({
      generation: search?.generation ?? null,
      originalStartedAt: search?.originalStartedAt ?? null,
      botFallbackDeadlineAt: search?.botFallbackDeadlineAt ?? null,
      timeoutDeadlineAt: search?.timeoutDeadlineAt ?? null,
      authoritativeReads,
      timerCount: Object.values(timers).filter((timer) => timer !== null).length,
    }),
  };
}
