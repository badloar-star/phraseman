import AsyncStorage from '@react-native-async-storage/async-storage';
import { getShardsBalance, spendShardsIdempotent } from '../app/shards_system';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const storage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('test-owner');
  Object.keys(storage).forEach((key) => delete storage[key]);
  storage.shards_balance = '100';
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
});

it('deducts a stable operation id only once across a retry', async () => {
  await expect(spendShardsIdempotent(35, 'avatar_aura', 'customization:same-op'))
    .resolves.toBe('applied');
  await expect(spendShardsIdempotent(35, 'avatar_aura', 'customization:same-op'))
    .resolves.toBe('already-applied');
  await expect(getShardsBalance()).resolves.toBe(65);
  expect(JSON.parse(storage.shard_spend_op_ledger_v1)).toContain('customization:same-op');
});
