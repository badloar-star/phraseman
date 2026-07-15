describe('league race visibility', () => {
  const originalStoreRelease = process.env.EXPO_PUBLIC_STORE_RELEASE;

  function loadVisibility(storeRelease: boolean) {
    if (storeRelease) process.env.EXPO_PUBLIC_STORE_RELEASE = '1';
    else delete process.env.EXPO_PUBLIC_STORE_RELEASE;
    jest.resetModules();
    return require('../app/league_race_visibility') as typeof import('../app/league_race_visibility');
  }

  afterEach(() => {
    if (originalStoreRelease === undefined) delete process.env.EXPO_PUBLIC_STORE_RELEASE;
    else process.env.EXPO_PUBLIC_STORE_RELEASE = originalStoreRelease;
    jest.resetModules();
  });

  it('is hidden for small public leagues', () => {
    const { LEAGUE_RACE_MIN_PARTICIPANTS, shouldShowLeagueRace } = loadVisibility(true);
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS - 1, 'Phi5738')).toBe(false);
  });

  it('is visible when the league has enough participants', () => {
    const { LEAGUE_RACE_MIN_PARTICIPANTS, shouldShowLeagueRace } = loadVisibility(true);
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS, 'anyone')).toBe(true);
  });

  it('is visible in dev for any league size and account', () => {
    const { shouldShowLeagueRace } = loadVisibility(false);
    expect(shouldShowLeagueRace(3, 'Phi5738')).toBe(true);
    expect(shouldShowLeagueRace(3, 'SomeoneElse')).toBe(true);
  });
});
