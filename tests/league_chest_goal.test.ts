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

    // goal = 400k база + 20k за лигу 1 (владелец поднял базу 2026-08-04).
    expect(snapshot).toMatchObject({ leaguePoints: 205_000, arenaBonus: 10_000, progress: 215_000, goal: 420_000, ready: false });
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

  // зачем 2026-08-04 (владелец): база поднята 200k → 400k. Комнаты теперь
  // дозаполняются жителями, их опыт идёт в общую цель (~159k за неделю с 28
  // жителями), и прежний порог закрывался бы почти без участия человека.
  it('starts copper league at 400k XP and adds 20k per league', () => {
    expect(LEAGUE_CHEST_BASE_GOAL).toBe(400_000);
    expect(LEAGUE_CHEST_GOAL_STEP).toBe(20_000);
    expect(getLeagueChestGoal(0)).toBe(400_000);
    expect(getLeagueChestGoal(1)).toBe(420_000);
    expect(getLeagueChestGoal(5)).toBe(500_000);
  });

  it('falls back to copper goal for invalid league ids', () => {
    expect(getLeagueChestGoal(null)).toBe(400_000);
    expect(getLeagueChestGoal(-3)).toBe(400_000);
    expect(getLeagueChestGoal(Number.NaN)).toBe(400_000);
  });
});
