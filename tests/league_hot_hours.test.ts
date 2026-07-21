jest.mock('../app/firestore_leagues', () => ({
  getOrCreateLeagueGroup: jest.fn(async () => null),
  updateMyGroupPoints: jest.fn(async () => undefined),
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  loadWeekLeaderboard: jest.fn(async () => []),
  getLastWeekFinalPoints: jest.fn(async () => null),
}));

import {
  isLeagueHotHoursActive,
  leagueWeekEndsAtUtcMs,
  resolveLeagueHotHoursMultiplier,
  LEAGUE_HOT_HOURS_MULTIPLIER,
  LEAGUE_HOT_HOURS_WINDOW_MS,
} from '../app/league_hot_hours';

// 2026-07-19 — воскресенье; неделя лиги заканчивается в понедельник 2026-07-20 00:00 UTC.
const HOT_NOW = Date.UTC(2026, 6, 19, 22, 30); // 1,5 часа до конца недели
const COLD_NOW = Date.UTC(2026, 6, 19, 20, 0); // 4 часа до конца недели
const WEEK_END = Date.UTC(2026, 6, 20, 0, 0);

const member = (points: number, isMe = false) => ({ points, isMe });
/** Группа из n человек, я на ранге meRank (1 = лидер). */
const groupOf = (n: number, meRank: number) =>
  Array.from({ length: n }, (_, i) => member((n - i) * 100, i + 1 === meRank));

describe('league hot hours — ×2 для зоны вылета в конце недели', () => {
  it('week end is Monday 00:00 UTC, matching the league ISO week', () => {
    expect(leagueWeekEndsAtUtcMs(HOT_NOW)).toBe(WEEK_END);
    expect(leagueWeekEndsAtUtcMs(COLD_NOW)).toBe(WEEK_END);
  });

  it('is active only within the last 2 hours of the week', () => {
    expect(isLeagueHotHoursActive(HOT_NOW)).toBe(true);
    expect(isLeagueHotHoursActive(COLD_NOW)).toBe(false);
    expect(isLeagueHotHoursActive(WEEK_END)).toBe(false); // неделя уже кончилась
    expect(isLeagueHotHoursActive(WEEK_END - LEAGUE_HOT_HOURS_WINDOW_MS)).toBe(true); // ровная граница
    expect(isLeagueHotHoursActive(WEEK_END - LEAGUE_HOT_HOURS_WINDOW_MS - 1)).toBe(false);
  });

  it('gives ×2 to relegation-zone members during hot hours', () => {
    // 30 участников: зона вылета = 5 мест (15%) → ранги 26–30.
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: groupOf(30, 30) })).toBe(LEAGUE_HOT_HOURS_MULTIPLIER);
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: groupOf(30, 26) })).toBe(LEAGUE_HOT_HOURS_MULTIPLIER);
  });

  it('stays neutral for safe and promotion ranks', () => {
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: groupOf(30, 1) })).toBe(1);
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: groupOf(30, 10) })).toBe(1);
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: groupOf(30, 25) })).toBe(1); // последний безопасный
  });

  it('stays neutral outside the window even for the last place', () => {
    expect(resolveLeagueHotHoursMultiplier({ now: COLD_NOW, group: groupOf(30, 30) })).toBe(1);
    expect(resolveLeagueHotHoursMultiplier({ now: WEEK_END, group: groupOf(30, 30) })).toBe(1);
  });

  it('stays neutral for empty, tiny or me-less groups', () => {
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: [] })).toBe(1);
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: groupOf(1, 1) })).toBe(1);
    const noMe = Array.from({ length: 30 }, (_, i) => member((30 - i) * 100));
    expect(resolveLeagueHotHoursMultiplier({ now: HOT_NOW, group: noMe })).toBe(1);
  });
});
