import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable-me'),
}));

jest.mock('../app/firestore_leagues', () => ({
  getOrCreateLeagueGroup: jest.fn(async () => [
    { uid: 'stable-me', name: 'Monday User', points: 0, isMe: true },
  ]),
  updateMyGroupPoints: jest.fn(async () => undefined),
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  loadWeekLeaderboard: jest.fn(async () => []),
  getLastWeekFinalPoints: jest.fn(async () => null),
}));

import { checkLeagueOnAppOpen } from '../app/league_engine';

describe('league rollover server-finalization grace period', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-03T00:04:00.000Z'));
    (AsyncStorage as any).__reset?.();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not permanently finalize a local result while the server cron is still pending', async () => {
    await AsyncStorage.setItem('league_state_v3', JSON.stringify({
      leagueId: 3,
      weekId: '2026-W31',
      group: [
        { uid: 'other', name: 'Other', points: 900, isMe: false },
        { uid: 'stable-me', name: 'Monday User', points: 800, isMe: true },
      ],
    }));

    const opened = await checkLeagueOnAppOpen('Monday User', 0);
    const persisted = JSON.parse(await AsyncStorage.getItem('league_state_v3') || '{}');

    expect(opened).toMatchObject({ needShowResult: false, result: null });
    expect(opened.state.weekId).toBe('2026-W31');
    expect(persisted.weekId).toBe('2026-W31');
    expect(await AsyncStorage.getItem('league_result_pending')).toBeNull();
  });
});
