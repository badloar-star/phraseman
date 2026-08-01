import AsyncStorage from '@react-native-async-storage/async-storage';

const ensureAnonUserMock = jest.fn(async () => 'stable-me');

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: ensureAnonUserMock,
  ensureStableAuthLink: jest.fn(async () => true),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => false),
}));
jest.mock('../app/hall_of_fame_utils', () => ({
  getMyWeekPoints: jest.fn(async () => 0),
  loadWeekLeaderboard: jest.fn(async () => []),
  getLastWeekFinalPoints: jest.fn(async () => null),
}));

import { registerInLeagueGroupSilently } from '../app/firestore_leagues';

describe('league startup registration week guard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-03T00:04:00.000Z'));
    jest.clearAllMocks();
    (AsyncStorage as any).__reset?.();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not join the current week using a stale previous-week league tier', async () => {
    await AsyncStorage.multiSet([
      ['user_name', 'Monday User'],
      ['league_state_v3', JSON.stringify({ leagueId: 3, weekId: '2026-W31', group: [] })],
    ]);

    await registerInLeagueGroupSilently();

    expect(ensureAnonUserMock).not.toHaveBeenCalled();
  });
});
