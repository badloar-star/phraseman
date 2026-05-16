import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { awardOneTime } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'uid-1'),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  (firestore as any).__resetTestState?.();
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

describe('awardOneTime (Firestore claim)', () => {
  it('awards exam_excellent once across devices', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 10;
    mockStorage.shards_balance = '4';

    await expect(awardOneTime('exam_excellent')).resolves.toBe(3);
    expect(mockStorage.shards_balance).toBe('13');
    expect(JSON.parse(mockStorage.shards_one_time_events)).toContain('exam_excellent');
    expect(fs.__testState.rewardClaimExists).toBe(true);
    expect(fs.__testState.userShards).toBe(13);

    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    mockStorage.shards_balance = '0';

    await expect(awardOneTime('exam_excellent')).resolves.toBe(0);
    expect(mockStorage.shards_balance).toBe('0');
    expect(JSON.parse(mockStorage.shards_one_time_events)).toContain('exam_excellent');
  });

  it('migrates an existing local one-time marker to cloud without awarding again', async () => {
    const fs = firestore as any;
    fs.__testState.rewardClaimExists = false;
    fs.__testState.userDocExists = true;
    fs.__testState.userShards = 7;
    mockStorage.shards_balance = '7';
    mockStorage.shards_one_time_events = JSON.stringify(['diagnostic_test']);

    await expect(awardOneTime('diagnostic_test')).resolves.toBe(0);
    expect(mockStorage.shards_balance).toBe('7');
    expect(fs.__testState.rewardClaimExists).toBe(true);
    expect(fs.__testState.userShards).toBe(7);
  });
});
