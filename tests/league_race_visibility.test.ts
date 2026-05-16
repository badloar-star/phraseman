import { LEAGUE_RACE_MIN_PARTICIPANTS, shouldShowLeagueRace } from '../app/league_race_visibility';

describe('league race visibility', () => {
  const originalDev = (globalThis as any).__DEV__;

  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('is hidden for small public leagues', () => {
    (globalThis as any).__DEV__ = false;
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS - 1, 'Phi5738')).toBe(false);
  });

  it('is visible when the league has enough participants', () => {
    (globalThis as any).__DEV__ = false;
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS, 'anyone')).toBe(true);
  });

  it('is visible in dev for any league size and account', () => {
    (globalThis as any).__DEV__ = true;
    expect(shouldShowLeagueRace(3, 'Phi5738')).toBe(true);
    expect(shouldShowLeagueRace(3, 'SomeoneElse')).toBe(true);
  });
});
