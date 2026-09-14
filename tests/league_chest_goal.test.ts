import * as fs from 'fs';
import * as path from 'path';
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
  it('builds one current progress snapshot from the matching league document', () => {
    const snapshot = buildLeagueBonusProgressSnapshot({
      meta: { weekId: '2026-W28', groupId: 'group-1', leagueId: 1 },
      groupData: {
        weekId: '2026-W28', groupId: 'group-1', leagueId: 1,
        members: { a: { name: 'A', points: 205_000 } },
      },
    });

    // goal = 50k база + 10k за лигу 1 (владелец снизил базу 2026-09-08).
    expect(snapshot).toMatchObject({ leaguePoints: 205_000, progress: 205_000, goal: 60_000, ready: true });
  });

  it('rejects a league document from another week instead of mixing snapshots', () => {
    const snapshot = buildLeagueBonusProgressSnapshot({
      meta: { weekId: '2026-W28', groupId: 'group-1', leagueId: 1 },
      groupData: {
        weekId: '2026-W27', groupId: 'group-1', leagueId: 1,
        members: { a: { name: 'A', points: 215_000 } },
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

  // зачем 2026-09-08: при фактической активности группы база 100k оставалась
  // недостижимой. Владелец выбрал 50k, сохранив шаг 10k между лигами.
  it('starts copper league at 50k runes and adds 10k per league on client and server', () => {
    expect(LEAGUE_CHEST_BASE_GOAL).toBe(50_000);
    expect(LEAGUE_CHEST_GOAL_STEP).toBe(10_000);
    expect(getLeagueChestGoal(0)).toBe(50_000);
    expect(getLeagueChestGoal(1)).toBe(60_000);
    expect(getLeagueChestGoal(5)).toBe(100_000);

    const serverSource = fs.readFileSync(
      path.join(__dirname, '../functions/src/league_chest.ts'),
      'utf8',
    );
    expect(serverSource).toContain('const LEAGUE_CHEST_BASE_GOAL = 50_000;');
    expect(serverSource).toContain('const LEAGUE_CHEST_GOAL_STEP = 10_000;');
  });

  it('falls back to copper goal for invalid league ids', () => {
    expect(getLeagueChestGoal(null)).toBe(50_000);
    expect(getLeagueChestGoal(-3)).toBe(50_000);
    expect(getLeagueChestGoal(Number.NaN)).toBe(50_000);
  });

  // зачем: цель обязана быть достижимой. Сторож ловит возврат XP-шкалы —
  // комната ботов даёт ~55k рун в неделю, и база выше ~110k сделала бы сундук
  // недостижимым снова (тот самый баг, который чинили 2026-08-27).
  it('keeps the goal within reach of a real room', () => {
    const BOT_ROOM_WEEKLY_RUNES = 55_000;
    expect(LEAGUE_CHEST_BASE_GOAL).toBeLessThanOrEqual(BOT_ROOM_WEEKLY_RUNES * 2);
    expect(getLeagueChestGoal(5)).toBeLessThanOrEqual(BOT_ROOM_WEEKLY_RUNES * 3);
  });
});
