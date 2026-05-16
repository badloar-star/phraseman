import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/firestore_leagues', () => ({
  getOrCreateLeagueGroup: jest.fn(async () => null),
  updateMyGroupPoints: jest.fn(async () => undefined),
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  loadWeekLeaderboard: jest.fn(async () => []),
}));

import {
  calculateResult,
  checkLeagueOnAppOpen,
  clearPendingResult,
  getLeagueResultSignature,
  getWeekId,
  type GroupMember,
  type LeagueState,
} from '../app/league_engine';

const makeGroup = (myPoints: number): GroupMember[] => [
  { uid: 'u1', name: 'Ava', points: 990, isMe: false },
  { uid: 'u2', name: 'Mia', points: 870, isMe: false },
  { uid: 'u3', name: 'Leo', points: 760, isMe: false },
  { uid: 'u4', name: 'Noah', points: 640, isMe: false },
  { uid: 'u5', name: 'Eli', points: 520, isMe: false },
  { uid: 'u6', name: 'Zoe', points: 410, isMe: false },
  { uid: 'u7', name: 'Ivy', points: 300, isMe: false },
  { uid: 'u8', name: 'Max', points: 180, isMe: false },
  { uid: 'u9', name: 'Sol', points: 80, isMe: false },
  { uid: 'me', name: 'QA Monday', points: myPoints, isMe: true },
].sort((a, b) => b.points - a.points);

const saveState = async (state: LeagueState) => {
  await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
};

describe('league weekly rollover', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('promotes top 15 percent with a real group size', () => {
    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group: makeGroup(1200),
    }, 1200);

    expect(result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
    });
  });

  it('demotes bottom 15 percent and uses stored weekly points from league state', async () => {
    await saveState({
      leagueId: 2,
      weekId: '2026-W19',
      group: makeGroup(20),
    });

    const opened = await checkLeagueOnAppOpen('QA Monday', 9999);
    const savedPending = JSON.parse(await AsyncStorage.getItem('league_result_pending') || '{}');
    const savedState = JSON.parse(await AsyncStorage.getItem('league_state_v3') || '{}');

    expect(opened.needShowResult).toBe(true);
    expect(opened.result).toMatchObject({
      prevLeagueId: 2,
      newLeagueId: 1,
      myRank: 10,
      totalInGroup: 10,
      promoted: false,
      demoted: true,
    });
    expect(savedPending).toMatchObject(opened.result!);
    expect(savedState).toMatchObject({
      leagueId: 1,
      weekId: getWeekId(),
    });
  });

  it('keeps middle rank in the same league', () => {
    const result = calculateResult({
      leagueId: 3,
      weekId: '2026-W19',
      group: makeGroup(520),
    }, 520);

    expect(result).toMatchObject({
      prevLeagueId: 3,
      newLeagueId: 3,
      myRank: 6,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
    });
  });

  it('shows an existing pending result before doing any new rollover math', async () => {
    const pending = {
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
      group: makeGroup(1200),
    };
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(pending));

    const opened = await checkLeagueOnAppOpen('QA Monday', 0);

    expect(opened.needShowResult).toBe(true);
    expect(opened.result).toEqual(pending);
    expect(opened.state).toMatchObject({
      leagueId: 1,
      weekId: getWeekId(),
    });
  });

  it('does not regenerate the same modal after pending result is cleared', async () => {
    await saveState({
      leagueId: 0,
      weekId: '2026-W19',
      group: makeGroup(1200),
    });

    const firstOpen = await checkLeagueOnAppOpen('QA Monday', 1200);
    expect(firstOpen.needShowResult).toBe(true);

    await clearPendingResult();
    const secondOpen = await checkLeagueOnAppOpen('QA Monday', 0);

    expect(secondOpen.needShowResult).toBe(false);
    expect(await AsyncStorage.getItem('league_result_pending')).toBeNull();
    expect(await AsyncStorage.getItem('league_result_consumed_sig')).toBe(getLeagueResultSignature(firstOpen.result!));
    expect(secondOpen.state).toMatchObject({
      leagueId: 1,
      weekId: getWeekId(),
    });
  });
});
