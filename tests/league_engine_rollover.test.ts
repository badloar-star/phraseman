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
  loadPendingResult,
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

const makeGroupWithMyRank = (total: number, myRank: number): { group: GroupMember[]; myPoints: number } => {
  const myPoints = 1000;
  const group = Array.from({ length: total }, (_, index): GroupMember => {
    const place = index + 1;
    if (place === myRank) {
      return { uid: 'me', name: 'QA Monday', points: myPoints, isMe: true };
    }
    const distance = Math.abs(place - myRank);
    const points = place < myRank
      ? myPoints + (distance + 1) * 100
      : myPoints - distance * 100;
    return { uid: `u${place}`, name: `Bot ${place}`, points, isMe: false };
  });
  return { group: group.sort((a, b) => b.points - a.points), myPoints };
};

const saveState = async (state: LeagueState) => {
  await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
};

describe('league weekly rollover', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('promotes the top result zone with a real group size', () => {
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

  it('keeps fifth place in a sixteen-person group because top zone is three', () => {
    const { group, myPoints } = makeGroupWithMyRank(16, 5);
    const result = calculateResult({
      leagueId: 0,
      weekId: '2026-W19',
      group,
    }, myPoints);

    expect(result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 5,
      totalInGroup: 16,
      promoted: false,
      demoted: false,
    });
  });

  it('repairs a cached group where the current row lost isMe before rollover', async () => {
    const corrupted = makeGroup(1200).map(m => (
      m.name === 'QA Monday' ? { ...m, isMe: false } : m
    ));
    await saveState({
      leagueId: 0,
      weekId: '2026-W19',
      group: corrupted,
    });

    const opened = await checkLeagueOnAppOpen('QA Monday', 0);

    expect(opened.needShowResult).toBe(true);
    expect(opened.result).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
    });
    expect(opened.result?.group.some(m => m.name === 'QA Monday' && m.isMe)).toBe(true);
  });

  it('repairs an already saved pending result with rank 0', async () => {
    await AsyncStorage.setItem('user_name', 'QA Monday');
    const pending = {
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 0,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
      group: makeGroup(1200).map(m => (
        m.name === 'QA Monday' ? { ...m, isMe: false } : m
      )),
    };
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(pending));

    const repaired = await loadPendingResult();
    const savedPending = JSON.parse(await AsyncStorage.getItem('league_result_pending') || '{}');

    expect(repaired).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
    });
    expect(savedPending.myRank).toBe(1);
    expect(savedPending.group.some((m: GroupMember) => m.name === 'QA Monday' && m.isMe)).toBe(true);
  });

  it('recalculates an already saved pending result with the current top-three zone', async () => {
    const { group } = makeGroupWithMyRank(16, 5);
    const stalePending = {
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 5,
      totalInGroup: 16,
      promoted: true,
      demoted: false,
      group,
    };
    await AsyncStorage.setItem('league_result_pending', JSON.stringify(stalePending));
    await AsyncStorage.setItem('league_state_v3', JSON.stringify({ leagueId: 0, weekId: '2026-W20', group }));

    const repaired = await loadPendingResult();
    const savedPending = JSON.parse(await AsyncStorage.getItem('league_result_pending') || '{}');
    const savedState = JSON.parse(await AsyncStorage.getItem('league_state_v3') || '{}');

    expect(repaired).toMatchObject({
      prevLeagueId: 0,
      newLeagueId: 0,
      myRank: 5,
      totalInGroup: 16,
      promoted: false,
      demoted: false,
    });
    expect(savedPending.promoted).toBe(false);
    expect(savedPending.newLeagueId).toBe(0);
    expect(savedState.leagueId).toBe(0);
  });

  it('demotes the bottom result zone and uses stored weekly points from league state', async () => {
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
