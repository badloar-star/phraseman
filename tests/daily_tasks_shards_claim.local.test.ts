import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimDailyTasksAllShardsReward, SHARD_REWARDS } from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('test-owner');
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  // Экономика «Монеты и Звёзды» (docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §7)
  // обнулила игровые начисления монет: в проде daily_tasks_all = 0, claim выключен.
  // Тесты механики claim ниже явно поднимают каталог до 1, как было до миграции.
  SHARD_REWARDS.daily_tasks_all = 1;
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

afterEach(() => {
  SHARD_REWARDS.daily_tasks_all = 0;
});

describe('claimDailyTasksAllShardsReward (local / Expo Go)', () => {
  it('awards once and blocks duplicate for same dayKey', async () => {
    mockStorage.shards_balance = '2';
    await expect(claimDailyTasksAllShardsReward('2026-04-24')).resolves.toBe(true);
    await expect(claimDailyTasksAllShardsReward('2026-04-24')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('3');
    expect(mockStorage['daily_tasks_all_shards_2026-04-24']).toBe('1');
  });

  it('returns false when reward key already set', async () => {
    mockStorage.shards_balance = '0';
    mockStorage['daily_tasks_all_shards_2026-05-01'] = '1';
    await expect(claimDailyTasksAllShardsReward('2026-05-01')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('0');
  });

  it('is a no-op while the coins economy is migrated to stars (reward = 0)', async () => {
    SHARD_REWARDS.daily_tasks_all = 0; // текущий прод-каталог: учебная награда ушла в звёзды
    mockStorage.shards_balance = '2';
    await expect(claimDailyTasksAllShardsReward('2026-04-24')).resolves.toBe(false);
    expect(mockStorage.shards_balance).toBe('2');
    expect(mockStorage['daily_tasks_all_shards_2026-04-24']).toBeUndefined();
  });
});
