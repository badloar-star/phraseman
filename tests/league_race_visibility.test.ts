import {
  LEAGUE_RACE_MIN_PARTICIPANTS,
  canPreviewLeagueRaceInDev,
  shouldShowLeagueRace,
} from '../app/league_race_visibility';

// shouldShowLeagueRace читает DEV_CONTENT_UNLOCK из app/config, а в jest-окружении
// тот вычисляется в true — тесты не могли детерминированно проверить prod-ветку.
// Мокаем app/config с явным сеттером, чтобы каждый тест сам выбирал режим,
// независимо от глобального env.
jest.mock('../app/config', () => {
  const state = { devContentUnlock: false };
  return {
    __esModule: true,
    get DEV_CONTENT_UNLOCK() {
      return state.devContentUnlock;
    },
    __setDevContentUnlockForTest(value: boolean) {
      state.devContentUnlock = value;
    },
  };
});

const configMock = jest.requireMock('../app/config') as {
  __setDevContentUnlockForTest: (value: boolean) => void;
};

describe('league race visibility', () => {
  afterEach(() => {
    configMock.__setDevContentUnlockForTest(false);
  });

  it('is hidden for small public leagues in prod', () => {
    configMock.__setDevContentUnlockForTest(false);
    expect(canPreviewLeagueRaceInDev('Phi5738')).toBe(false);
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS - 1, 'Phi5738')).toBe(false);
  });

  it('is visible in prod when the league has enough participants', () => {
    configMock.__setDevContentUnlockForTest(false);
    expect(shouldShowLeagueRace(LEAGUE_RACE_MIN_PARTICIPANTS, 'anyone')).toBe(true);
  });

  it('is visible in dev for any league size and account', () => {
    configMock.__setDevContentUnlockForTest(true);
    expect(canPreviewLeagueRaceInDev('SomeoneElse')).toBe(true);
    expect(shouldShowLeagueRace(3, 'Phi5738')).toBe(true);
    expect(shouldShowLeagueRace(3, 'SomeoneElse')).toBe(true);
  });
});
