import AsyncStorage from '@react-native-async-storage/async-storage';
import * as shards from '../app/shards_system';
import { getShardsBalance } from '../app/shards_system';
import { __resetAccountGenerationForTests, beginAccountGeneration, invalidateAccountGeneration } from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/stable_id', () => ({
  getStableId: jest.fn(async () => 'test-owner'),
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null)
  );
  __resetAccountGenerationForTests();
  beginAccountGeneration('test-owner');
});

// зачем (PM-289 этап 2, D70/D78): начисления, траты, разовые награды и память
// баланса жемчуга удалены целиком. Остался только остаток, который ещё вызывают
// обнуление (pearl_retire_d70) и вход/выход (auth_provider, этап 3).
describe('shards_system: остаток удалённой валюты', () => {
  it('exports only what pearl retirement and auth still call', () => {
    expect(Object.keys(shards).sort()).toEqual([
      'default',
      'forceSyncShardsToCloud',
      'getShardsBalance',
      'loadShardsFromCloud',
      'preparePendingShardDeltasForAccountSwitch',
      'resumePendingShardDeltas',
    ]);
  });

  it('reads the local projection of the current account', async () => {
    mockStorage.shards_balance = '17';
    await expect(getShardsBalance()).resolves.toBe(17);
  });

  it('treats a missing or broken value as zero', async () => {
    await expect(getShardsBalance()).resolves.toBe(0);
    mockStorage.shards_balance = 'garbage';
    await expect(getShardsBalance()).resolves.toBe(0);
  });

  it('returns safe zero from a late account A read after switching to B', async () => {
    beginAccountGeneration('account-a');
    let resolveRead!: (value: string | null) => void;
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(
      () => new Promise<string | null>((resolve) => { resolveRead = resolve; }),
    );

    const pendingBalance = getShardsBalance();
    invalidateAccountGeneration();
    beginAccountGeneration('account-b');
    resolveRead('17');

    await expect(pendingBalance).resolves.toBe(0);
  });

  it('returns safe zero when the storage read rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage down'));
    await expect(getShardsBalance()).resolves.toBe(0);
  });
});
