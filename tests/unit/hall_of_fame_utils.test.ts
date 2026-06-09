/**
 * tests/unit/hall_of_fame_utils.test.ts
 * Unit tests for hall_of_fame_utils.ts — getMyWeekPoints(), checkStreakLossPending(), getWeekKey()
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWeekKey,
  getMyWeekPoints,
  checkStreakLossPending,
  streakMultiplier,
  pointsForAnswer,
} from '../../app/hall_of_fame_utils';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../app/achievements', () => ({ checkAchievements: jest.fn() }));
jest.mock('../../app/streak_repair', () => ({ wasRepairedToday: jest.fn().mockResolvedValue(false) }));
jest.mock('../../app/streak_wager', () => ({ checkWagerProgress: jest.fn() }));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('hall_of_fame_utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getWeekKey ─────────────────────────────────────────────────────────────

  describe('getWeekKey', () => {
    it('returns string in YYYY-Www format', () => {
      const key = getWeekKey(new Date('2026-01-05'));
      expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('same week dates produce the same key', () => {
      // 2026-04-06 (Mon) and 2026-04-12 (Sun) are the same ISO week
      const monday = getWeekKey(new Date('2026-04-06'));
      const sunday = getWeekKey(new Date('2026-04-12'));
      expect(monday).toBe(sunday);
    });

    it('adjacent weeks produce different keys', () => {
      const week1 = getWeekKey(new Date('2026-04-06'));
      const week2 = getWeekKey(new Date('2026-04-13'));
      expect(week1).not.toBe(week2);
    });

    it('year boundary: last week of 2025 vs first week of 2026', () => {
      const dec29 = getWeekKey(new Date('2025-12-29'));
      const jan05 = getWeekKey(new Date('2026-01-05'));
      expect(dec29).not.toBe(jan05);
    });

    it('week number is zero-padded to 2 digits', () => {
      // Week 1 of 2026
      const key = getWeekKey(new Date('2026-01-01'));
      expect(key).toMatch(/-W\d{2}$/);
    });
  });

  // ── getMyWeekPoints ────────────────────────────────────────────────────────

  describe('getMyWeekPoints', () => {
    it('returns 0 when storage is empty', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      const pts = await getMyWeekPoints();
      expect(pts).toBe(0);
    });

    it('returns points when week key matches current week', async () => {
      const currentWeekKey = getWeekKey(new Date());
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify({ weekKey: currentWeekKey, points: 42 })
      );
      const pts = await getMyWeekPoints();
      expect(pts).toBe(42);
    });

    it('returns 0 when stored week key is from a different week', async () => {
      mockStorage.getItem.mockResolvedValue(
        JSON.stringify({ weekKey: '2020-W01', points: 999 })
      );
      const pts = await getMyWeekPoints();
      expect(pts).toBe(0);
    });

    it('returns 0 on storage error', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const pts = await getMyWeekPoints();
      expect(pts).toBe(0);
    });
  });

  // ── checkStreakLossPending ─────────────────────────────────────────────────

  describe('checkStreakLossPending', () => {
    it('returns willLose=false when no last_active_date in storage', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(false);
    });

    it('returns willLose=false when user was active today', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'last_active_date') return Promise.resolve(today);
        return Promise.resolve(null);
      });
      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(false);
    });

    it('returns willLose=false when user was active yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'last_active_date') return Promise.resolve(yesterdayStr);
        return Promise.resolve(null);
      });
      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(false);
    });

    it('returns willLose=true when streak > 1 and missed exactly 1 day (no freeze)', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'last_active_date') return Promise.resolve(twoDaysAgoStr);
        if (key === 'streak_count') return Promise.resolve('7');
        if (key === 'streak_freeze') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(true);
      expect(result.streakBefore).toBe(7);
    });

    it('returns willLose=false when freeze is active', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'last_active_date') return Promise.resolve(twoDaysAgoStr);
        if (key === 'streak_count') return Promise.resolve('5');
        if (key === 'streak_freeze') return Promise.resolve(JSON.stringify({ active: true, date: today }));
        return Promise.resolve(null);
      });

      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(false);
    });

    it('returns willLose=false when streak <= 1 (nothing to lose)', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === 'last_active_date') return Promise.resolve(twoDaysAgoStr);
        if (key === 'streak_count') return Promise.resolve('1');
        return Promise.resolve(null);
      });

      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(false);
    });

    it('returns willLose=false on storage error', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('fail'));
      const result = await checkStreakLossPending();
      expect(result.willLose).toBe(false);
    });
  });

  // ── streakMultiplier ───────────────────────────────────────────────────────

  describe('streakMultiplier', () => {
    it('returns 1.0 for streak < 3', () => {
      expect(streakMultiplier(0)).toBe(1);
      expect(streakMultiplier(2)).toBe(1);
    });

    it('returns 1.2 for streak 3-6', () => {
      expect(streakMultiplier(3)).toBe(1.2);
      expect(streakMultiplier(6)).toBe(1.2);
    });

    it('returns 1.4 for streak 7-13', () => {
      expect(streakMultiplier(7)).toBe(1.4);
    });

    it('returns 1.8 for streak >= 30', () => {
      expect(streakMultiplier(30)).toBe(1.8);
      expect(streakMultiplier(100)).toBe(1.8);
    });
  });

  // ── pointsForAnswer ────────────────────────────────────────────────────────

  describe('pointsForAnswer', () => {
    it('returns positive value for valid level and streak', () => {
      const pts = pointsForAnswer('easy', 0);
      expect(pts).toBeGreaterThan(0);
    });

    it('hard level gives more points than easy', () => {
      const easy = pointsForAnswer('easy', 0);
      const hard = pointsForAnswer('hard', 0);
      expect(hard).toBeGreaterThan(easy);
    });

    it('higher streak gives more points (same level)', () => {
      const low = pointsForAnswer('medium', 0);
      const high = pointsForAnswer('medium', 30);
      expect(high).toBeGreaterThan(low);
    });
  });
});
