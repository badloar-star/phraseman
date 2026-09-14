import {
  isLeagueHotHoursActive,
  leagueWeekEndsAtUtcMs,
  resolveLeagueHotHoursMultiplier,
  LEAGUE_HOT_HOURS_MULTIPLIER,
  LEAGUE_HOT_HOURS_WINDOW_MS,
} from '../app/league_hot_hours';

const SUNDAY_START = Date.UTC(2026, 6, 19, 0, 0);
const SUNDAY_NOON = Date.UTC(2026, 6, 19, 12, 0);
const MONDAY_START = Date.UTC(2026, 6, 20, 0, 0);
const groupOf = (isMeAt: number) => Array.from({ length: 30 }, (_, index) => ({
  points: (30 - index) * 100,
  isMe: index + 1 === isMeAt,
}));

describe('league hot-hours compatibility facade — Super Sunday', () => {
  it('uses the full UTC Sunday and the same Monday week boundary', () => {
    expect(LEAGUE_HOT_HOURS_WINDOW_MS).toBe(24 * 60 * 60 * 1_000);
    expect(leagueWeekEndsAtUtcMs(SUNDAY_NOON)).toBe(MONDAY_START);
    expect(isLeagueHotHoursActive(SUNDAY_START)).toBe(true);
    expect(isLeagueHotHoursActive(MONDAY_START - 1)).toBe(true);
    expect(isLeagueHotHoursActive(SUNDAY_START - 1)).toBe(false);
    expect(isLeagueHotHoursActive(MONDAY_START)).toBe(false);
  });

  it('is rank-independent throughout Sunday', () => {
    expect(resolveLeagueHotHoursMultiplier({ now: SUNDAY_NOON, group: groupOf(30) }))
      .toBe(LEAGUE_HOT_HOURS_MULTIPLIER);
    expect(resolveLeagueHotHoursMultiplier({ now: SUNDAY_NOON, group: groupOf(1) }))
      .toBe(LEAGUE_HOT_HOURS_MULTIPLIER);
    expect(resolveLeagueHotHoursMultiplier({ now: SUNDAY_NOON, group: [] }))
      .toBe(LEAGUE_HOT_HOURS_MULTIPLIER);
    expect(resolveLeagueHotHoursMultiplier({ now: MONDAY_START, group: groupOf(30) }))
      .toBe(1);
  });
});
