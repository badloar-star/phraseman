import AsyncStorage from '@react-native-async-storage/async-storage';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const emitAppEvent = jest.fn();
const cloudGet = jest.fn(async () => ({
  data: () => ({
    shards: 10,
    shards_updated_at_ms: 2_000,
    shards_updated_op: 'earn',
    shards_updated_reason: 'cloud_restore',
  }),
}));

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn(() => ({
      collection: () => ({
        doc: () => ({
          get: cloudGet,
          collection: () => ({ doc: () => ({ get: cloudGet }) }),
        }),
      }),
    })),
    { FieldValue: { serverTimestamp: jest.fn(() => 'ts') } },
  ),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => emitAppEvent(...args) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-a') }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-a') }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));
jest.mock('../app/storage_mutex', () => ({ withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()) }));
jest.mock('../app/achievements', () => ({ checkAchievements: jest.fn() }));
jest.mock('../app/shards_delta_queue', () => ({
  enqueueShardDelta: jest.fn(async () => undefined),
  newShardOpId: jest.fn(() => 'op-test'),
  readShardDeltaQueue: jest.fn(async () => []),
  removeShardDeltas: jest.fn(async () => undefined),
}));

import { loadShardsFromCloud, peekLastKnownShardsBalance } from '../app/shards_system';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

test('caller cancellation prevents a deferred cloud load from publishing', async () => {
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  let release!: (value: ReturnType<typeof cloudSnapshot>) => void;
  let current = true;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  cloudGet.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));

  const loading = loadShardsFromCloud(() => current);
  for (let i = 0; i < 10 && !cloudGet.mock.calls.length; i += 1) {
    await Promise.resolve();
  }
  expect(cloudGet).toHaveBeenCalled();
  current = false;
  release(cloudSnapshot());
  await loading;

  expect(peekLastKnownShardsBalance()).toBeNull();
  expect(emitAppEvent).not.toHaveBeenCalled();
});

function cloudSnapshot() {
  return {
    exists: true,
    data: () => ({
      shards: 10,
      openingBalance: 10,
      shards_updated_at_ms: 2_000,
      shards_updated_op: 'earn',
      shards_updated_reason: 'cloud_restore',
    }),
  };
}

test('default callback is still fenced by an account-generation switch', async () => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  let release!: (value: ReturnType<typeof cloudSnapshot>) => void;
  cloudGet.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));

  const loading = loadShardsFromCloud();
  for (let i = 0; i < 20 && !cloudGet.mock.calls.length; i += 1) await Promise.resolve();
  expect(cloudGet).toHaveBeenCalled();
  beginAccountGeneration('stable-b');
  release(cloudSnapshot());
  await loading;

  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  expect(peekLastKnownShardsBalance()).toBeNull();
  expect(emitAppEvent).not.toHaveBeenCalled();
});
