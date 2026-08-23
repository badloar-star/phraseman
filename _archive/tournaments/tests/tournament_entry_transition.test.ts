import {
  beginTournamentEntryTransition,
  cancelTournamentEntryTransition,
  markTournamentEntryTransitionAdvanced,
  settleTournamentEntryTransition,
} from '../app/tournament_entry_transition';

describe('tournament optimistic entry transition', () => {
  it('settles an untouched entry as active exactly once', () => {
    const key = beginTournamentEntryTransition();
    expect(settleTournamentEntryTransition(key)).toBe('active');
    expect(settleTournamentEntryTransition(key)).toBe('missing');
  });

  it('cancels a pending entry immediately and invokes the optimistic refund once', () => {
    const refunds: string[] = [];
    const key = beginTournamentEntryTransition(() => refunds.push('refund'));

    expect(cancelTournamentEntryTransition(key)).toBe(true);
    expect(cancelTournamentEntryTransition(key)).toBe(false);
    expect(refunds).toEqual(['refund']);
    expect(settleTournamentEntryTransition(key)).toBe('cancelled');
    expect(settleTournamentEntryTransition(key)).toBe('missing');
  });

  it('records a server-driven handoff so a late join response cannot reopen the lobby', () => {
    const key = beginTournamentEntryTransition();

    expect(markTournamentEntryTransitionAdvanced(key)).toBe(true);
    expect(markTournamentEntryTransitionAdvanced(key)).toBe(false);
    expect(settleTournamentEntryTransition(key)).toBe('advanced');
    expect(settleTournamentEntryTransition(key)).toBe('missing');
  });
});
