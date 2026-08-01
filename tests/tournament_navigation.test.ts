import { closeTournamentFlow } from '../app/tournament_navigation';

describe('tournament flow navigation', () => {
  it('pops the native stack to the existing tournament menu', () => {
    const dismissTo = jest.fn();
    const replace = jest.fn();
    closeTournamentFlow({ dismissTo, replace });

    expect(dismissTo).toHaveBeenCalledWith('/tournaments');
    expect(replace).not.toHaveBeenCalled();
  });

  it('falls back to replace when native pop-to is unavailable', () => {
    const replace = jest.fn();
    closeTournamentFlow({ replace });

    expect(replace).toHaveBeenCalledWith('/tournaments');
  });
});
