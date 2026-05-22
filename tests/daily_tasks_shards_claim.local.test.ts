import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimDailyTasksAllShardsReward } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
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
});
