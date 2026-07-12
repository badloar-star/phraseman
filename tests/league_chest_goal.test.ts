import {
  buildLeagueBonusProgressSnapshot,
  buildLeagueBonusSeenKey,
  reserveLeagueBonusNotice,
  getLeagueChestGoal,
  LEAGUE_CHEST_BASE_GOAL,
  LEAGUE_CHEST_GOAL_STEP,
} from '../app/services/league_chest_rewards';

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn() }));
jest.mock('../app/shards_system', () => ({ replaceShardsBalanceLocal: jest.fn() }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/league_race_visibility', () => ({ LEAGUE_RACE_MIN_PARTICIPANTS: 10 }));

describe('league chest goal', () => {
  it('builds one current progress snapshot from matching league and arena documents', () => {
    const snapshot = buildLeagueBonusProgressSnapshot({
      meta: { weekId: '2026-W28', groupId: 'group-1', leagueId: 1 },
      groupData: {
        weekId: '2026-W28', groupId: 'group-1', leagueId: 1,
        members: { a: { name: 'A', points: 205_000 } },
      },
      arenaData: {
        weekId: '2026-W28', groupId: 'group-1', leagueId: 1, totalPoints: 10_000,
      },
    });

    expect(snapshot).toMatchObject({ leaguePoints: 205_000, arenaBonus: 10_000, progress: 215_000, goal: 220_000, ready: false });
  });

  it('rejects an arena document from another league context instead of mixing snapshots', () => {
    const snapshot = buildLeagueBonusProgressSnapshot({
      meta: { weekId: '2026-W28', groupId: 'group-1', leagueId: 1 },
      groupData: {
        weekId: '2026-W28', groupId: 'group-1', leagueId: 1,
        members: { a: { name: 'A', points: 215_000 } },
      },
      arenaData: {
        weekId: '2026-W27', groupId: 'group-1', leagueId: 1, totalPoints: 10_000,
      },
    });

    expect(snapshot).toBeNull();
  });

  it('reserves one notice per user and week even if the group changes', () => {
    const reservations = new Set<string>();
    const firstKey = buildLeagueBonusSeenKey('user-a', '2026-W28');
    const relocatedKey = buildLeagueBonusSeenKey('user-a', '2026-W28');
    const otherUserKey = buildLeagueBonusSeenKey('user-b', '2026-W28');

    expect(reserveLeagueBonusNotice(reservations, firstKey)).toBe(true);
    expect(reserveLeagueBonusNotice(reservations, relocatedKey)).toBe(false);
    expect(reserveLeagueBonusNotice(reservations, otherUserKey)).toBe(true);
  });

  it('starts copper league at 200k XP and adds 20k per league', () => {
    expect(LEAGUE_CHEST_BASE_GOAL).toBe(200_000);
    expect(LEAGUE_CHEST_GOAL_STEP).toBe(20_000);
    expect(getLeagueChestGoal(0)).toBe(200_000);
    expect(getLeagueChestGoal(1)).toBe(220_000);
    expect(getLeagueChestGoal(5)).toBe(300_000);
  });

  it('falls back to copper goal for invalid league ids', () => {
    expect(getLeagueChestGoal(null)).toBe(200_000);
    expect(getLeagueChestGoal(-3)).toBe(200_000);
    expect(getLeagueChestGoal(Number.NaN)).toBe(200_000);
  });
});
