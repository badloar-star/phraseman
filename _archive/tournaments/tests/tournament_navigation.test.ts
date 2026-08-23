import { closeTournamentFlow } from '../app/tournament_navigation';

describe('tournament flow navigation', () => {
  it('pops the native stack to the release-safe home screen', () => {
    const dismissTo = jest.fn();
    const replace = jest.fn();
    closeTournamentFlow({ dismissTo, replace });

    expect(dismissTo).toHaveBeenCalledWith('/(tabs)/home');
    expect(replace).not.toHaveBeenCalled();
  });

  it('falls back to replace when native pop-to is unavailable', () => {
    const replace = jest.fn();
    closeTournamentFlow({ replace });

    expect(replace).toHaveBeenCalledWith('/(tabs)/home');
  });
});
