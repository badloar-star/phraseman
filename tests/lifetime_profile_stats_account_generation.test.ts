import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests } from '../app/account_generation';

jest.mock('../app/flashcards/storage', () => ({ readCustomCards: jest.fn(async () => []) }));
jest.mock('../app/foreground_usage_ms', () => ({ getForegroundDailyMsMap: jest.fn(async () => ({})) }));
jest.mock('../app/cloud_sync', () => ({ syncToCloud: jest.fn(async () => undefined) }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

beforeEach(() => {
  storage.__reset?.();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
});

// зачем (PM-289, D70/D78): счётчики жемчуга «за всё время» удалены вместе с валютой.
test('lifetime stats no longer expose pearl counters', async () => {
  const lifetime = await import('../app/lifetime_profile_stats');
  expect(lifetime).not.toHaveProperty('bumpLifetimeShardsEarned');
  expect(lifetime).not.toHaveProperty('bumpLifetimeShardsSpent');
});

test('uninitialized identity cannot enter the daily-stat mutation boundary', async () => {
  const { bumpStatsDaily } = await import('../app/stats_daily_breakdown');

  await bumpStatsDaily('words_learned', 3);

  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
