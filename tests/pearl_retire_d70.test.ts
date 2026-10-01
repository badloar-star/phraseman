// зачем: D70 + D84 — остаток жемчуга обнуляется на устройстве одной операцией
// журнала; повтор идемпотентен; исторические открытия уроков не трогаются.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  clientShardLedgerStateStorageKey,
  initializeClientShardLedgerOpeningBalance,
} from '../app/economy/client_shard_operation_ledger';
import {
  PEARL_RETIRE_RECEIPT_PREFIX,
  parsePearlLedgerState,
  retireLocalPearlBalance,
} from '../app/pearl_retire_d70';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'owner-1') }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('@react-native-async-storage/async-storage');
    return Number((await storage.getItem('shards_balance')) ?? 0);
  }),
}));

const storage: Record<string, string> = {};
const LESSON_UNLOCK_KEY = 'lessons_pearl_unlocked_v1';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  __resetAccountGenerationForTests();
  beginAccountGeneration('owner-1');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: readonly string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
});

const ledgerBalance = (): number => JSON.parse(storage[clientShardLedgerStateStorageKey('owner-1')]).balance;

it('zeroes a positive pearl balance with one journal debit and leaves historic lesson unlocks alone', async () => {
  storage[LESSON_UNLOCK_KEY] = JSON.stringify([3, 7]);
  await initializeClientShardLedgerOpeningBalance(137, 'owner-1');

  await expect(retireLocalPearlBalance(captureAccountGeneration())).resolves.toBe('retired');

  expect(ledgerBalance()).toBe(0);
  expect(storage.shards_balance).toBe('0');
  expect(storage[LESSON_UNLOCK_KEY]).toBe(JSON.stringify([3, 7]));
  const receipt = JSON.parse(storage[`${PEARL_RETIRE_RECEIPT_PREFIX}owner-1`]);
  expect(receipt).toMatchObject({ decision: 'D70/D84', retiredAmount: 137 });
});

it('is idempotent: a second run finds nothing to retire', async () => {
  await initializeClientShardLedgerOpeningBalance(20, 'owner-1');
  await expect(retireLocalPearlBalance(captureAccountGeneration())).resolves.toBe('retired');
  await expect(retireLocalPearlBalance(captureAccountGeneration())).resolves.toBe('nothing_to_retire');
  expect(ledgerBalance()).toBe(0);
});

it('waits for the ledger instead of inventing a balance when the journal is not open yet', async () => {
  storage.shards_balance = '50';
  await expect(retireLocalPearlBalance(captureAccountGeneration())).resolves.toBe('ledger_not_initialized');
  expect(storage.shards_balance).toBe('50');
});

it('does nothing for an inactive account token', async () => {
  await initializeClientShardLedgerOpeningBalance(20, 'owner-1');
  const stale = captureAccountGeneration();
  __resetAccountGenerationForTests();
  await expect(retireLocalPearlBalance(stale)).resolves.toBe('account_inactive');
});

it('rejects a corrupt or foreign ledger state', () => {
  expect(parsePearlLedgerState('{', 'owner-1')).toBe('corrupt');
  expect(parsePearlLedgerState(JSON.stringify({
    schemaVersion: 'client-shard-ledger-state.v1', ownerStableId: 'someone-else', balance: 1, revision: 0, headOperationId: null,
  }), 'owner-1')).toBe('corrupt');
  expect(parsePearlLedgerState(null, 'owner-1')).toBeNull();
});
