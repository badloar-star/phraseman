import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getNextD1PersonalizedReminderTime,
  getNextWeeklyRecapTime,
  readWeeklyRecapStatsForNotification,
} from '../app/notifications';
import { getCurrentWeekStartIso, WEEKLY_XP_KEY, WEEKLY_XP_PERIOD_START_KEY } from '../app/weekly_xp';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

beforeEach(() => {
  storage.__reset?.();
});

test('weekly recap uses current weekly_xp instead of lifetime user_total_xp', async () => {
  const now = new Date('2026-05-17T18:00:00Z');
  await AsyncStorage.multiSet([
    ['user_total_xp', '102805'],
    [WEEKLY_XP_KEY, '3495'],
    [WEEKLY_XP_PERIOD_START_KEY, getCurrentWeekStartIso(now)],
    ['week_points_v2', JSON.stringify({ weekKey: '2026-W20', points: 1111 })],
    ['streak_count', '5'],
  ]);

  await expect(readWeeklyRecapStatsForNotification(now)).resolves.toEqual({
    weekXP: 3495,
    streak: 5,
  });
});

test('weekly recap is scheduled at 20:10 to avoid the default 20:00 daily reminder', () => {
  const target = getNextWeeklyRecapTime(new Date(2026, 4, 17, 20, 0, 0, 0));
  expect(target.getHours()).toBe(20);
  expect(target.getMinutes()).toBe(10);
});

test('D+1 personalized reminder is scheduled at 20:20 outside the recap cluster', () => {
  const target = getNextD1PersonalizedReminderTime(new Date(2026, 4, 16, 12, 0, 0, 0));
  expect(target.getDate()).toBe(17);
  expect(target.getHours()).toBe(20);
  expect(target.getMinutes()).toBe(20);
});

test('weekly recap falls back to current week_points_v2 when weekly_xp is stale', async () => {
  const now = new Date('2026-05-17T18:00:00Z');
  await AsyncStorage.multiSet([
    [WEEKLY_XP_KEY, '9999'],
    [WEEKLY_XP_PERIOD_START_KEY, '2026-05-04'],
    ['week_points_v2', JSON.stringify({ weekKey: '2026-W20', points: 2222 })],
    ['streak_count', '7'],
  ]);

  await expect(readWeeklyRecapStatsForNotification(now)).resolves.toEqual({
    weekXP: 2222,
    streak: 7,
  });
});

test('weekly recap can use legacy week_points when v2 is not present', async () => {
  const now = new Date('2026-05-17T18:00:00Z');
  await AsyncStorage.multiSet([
    ['week_points', '808'],
    ['streak_count', '3'],
  ]);

  await expect(readWeeklyRecapStatsForNotification(now)).resolves.toEqual({
    weekXP: 808,
    streak: 3,
  });
});
