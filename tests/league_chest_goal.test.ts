import {
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
