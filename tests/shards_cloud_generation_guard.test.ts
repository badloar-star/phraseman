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
    jest.fn(() => ({ collection: () => ({ doc: () => ({ get: cloudGet }) }) })),
    { FieldValue: { serverTimestamp: jest.fn(() => 'ts') } },
  ),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => emitAppEvent(...args) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-a') }));
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

test('stale cloud shard load does not populate process memory after deferred multiSet completes', async () => {
  let release!: () => void;
  let current = true;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(() => (
    new Promise<void>((resolve) => { release = resolve; })
  ));

  const loading = loadShardsFromCloud(() => current);
  for (let i = 0; i < 10 && !(AsyncStorage.multiSet as jest.Mock).mock.calls.length; i += 1) {
    await Promise.resolve();
  }
  expect(AsyncStorage.multiSet).toHaveBeenCalled();
  current = false;
  release();
  await loading;

  expect(peekLastKnownShardsBalance()).toBe(0);
  expect(emitAppEvent).not.toHaveBeenCalled();
});
