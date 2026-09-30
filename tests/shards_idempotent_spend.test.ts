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

// зачем: spendShardsIdempotent — легаси-путь, retired по «Экономической конституции»
// (app/shards_system.ts: clientEconomyConstitutionEnabled() всегда true, см. также
// tests/economy_constitution_contract.test.ts, который проверяет этот же guard по
// исходнику). Функция сохранена только ради бинарной/типовой совместимости и ВСЕГДА
// возвращает 'failed', не трогая баланс и журнал операций. Реальные покупки идут через
// commitShardCompositeOperation (см. tests/client_shard_operation_ledger.test.ts).
// Тест раньше проверял живое (pre-retirement) поведение и падал: возвращалось 'failed'
// вместо 'applied'. Теперь тест — регрессионный барьер против случайного «оживления»
// этого пути.
it('stays retired: never spends, always returns failed, regardless of retry', async () => {
  await expect(spendShardsIdempotent(35, 'avatar_aura', 'customization:same-op'))
    .resolves.toBe('failed');
  await expect(spendShardsIdempotent(35, 'avatar_aura', 'customization:same-op'))
    .resolves.toBe('failed');
  await expect(getShardsBalance()).resolves.toBe(100);
  expect(storage.shard_spend_op_ledger_v1).toBeUndefined();
});
