import { DEV_CONTENT_UNLOCK } from '../app/config';
import { canPreviewLeagueRaceInDev, LEAGUE_RACE_MIN_PARTICIPANTS, shouldShowLeagueRace } from '../app/league_race_visibility';

describe('league race visibility', () => {
  it('is hidden for small public leagues', () => {
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS - 1, 'Phi5738')).toBe(DEV_CONTENT_UNLOCK);
  });

  it('is visible when the league has enough participants', () => {
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS, 'anyone')).toBe(true);
  });

  it('is visible in dev for any league size and account', () => {
    expect(canPreviewLeagueRaceInDev('Phi5738')).toBe(DEV_CONTENT_UNLOCK);
    expect(canPreviewLeagueRaceInDev('SomeoneElse')).toBe(DEV_CONTENT_UNLOCK);
  });
});
