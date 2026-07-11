import { decideArenaReconcile } from '../app/arena_matchmaking_reconcile';

const base = {
  authoritativeSessionId: null,
  searchStillAuthoritative: true,
  rangeExpandDue: false,
  rangeExpanded: false,
  botFallbackDue: false,
  timeoutDue: false,
};

describe('Arena matchmaking reconciliation priority', () => {
  it('always accepts an authoritative match before overdue local transitions', () => {
    for (const due of [
      { rangeExpandDue: true },
      { botFallbackDue: true },
      { timeoutDue: true },
      { rangeExpandDue: true, botFallbackDue: true, timeoutDue: true },
    ]) {
      expect(decideArenaReconcile({
        ...base,
        ...due,
        authoritativeSessionId: 'session-1',
      })).toEqual({ kind: 'match', sessionId: 'session-1' });
    }
  });

  it('stops when the authoritative queue no longer exists', () => {
    expect(decideArenaReconcile({
      ...base,
      searchStillAuthoritative: false,
      botFallbackDue: true,
      timeoutDue: true,
    })).toEqual({ kind: 'stop' });
  });

  it('applies overdue actions in deterministic priority order', () => {
    expect(decideArenaReconcile({ ...base, rangeExpandDue: true })).toEqual({ kind: 'expand_range' });
    expect(decideArenaReconcile({ ...base, botFallbackDue: true })).toEqual({ kind: 'bot_fallback' });
    expect(decideArenaReconcile({ ...base, timeoutDue: true })).toEqual({ kind: 'timeout' });
    expect(decideArenaReconcile(base)).toEqual({ kind: 'none' });
  });
});
