import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  levelSpinStarProjectionKey,
  mergeLevelSpinServerStars,
  prepareDialogExtraRepliesRunePurchase,
  readUnifiedLevelSpinStars,
  recoverAndHydrateLevelSpinStarGrants,
} from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};
let visibleProgress = { stars: 600, starsEarnedTotal: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 600, starsEarnedTotal: 0 };
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => keys.map((key) => [key, storage[key] ?? null]));
  const bridge = jest.requireMock('../app/phone_state_economy_bridge') as { readPhoneStateStarCreditState: jest.Mock };
  bridge.readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  const snapshot = jest.requireMock('../app/app_snapshot_store') as { getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { ...visibleProgress } }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: typeof visibleProgress }) => {
    const next = updater({ progress: { ...visibleProgress } });
    if (next.progress) visibleProgress = { ...visibleProgress, ...next.progress };
  });
});

async function prepare(requestId: string, createdAtMs: number) {
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  return prepareDialogExtraRepliesRunePurchase({ token, requestId, createdAtMs });
}

async function persist(writes: readonly (readonly [string, string])[]) {
  await AsyncStorage.multiSet(writes as [string, string][]);
}

test('prepares one immutable -300/+10 operation and replays the same request without another debit', async () => {
  const first = await prepare('der1234567890123456', 100);
  expect(first).toMatchObject({
    duplicate: false,
    balanceBefore: 600,
    balanceAfter: 300,
    operation: {
      schemaVersion: 'client-dialog-extra-replies-rune-operation.v1',
      operationId: 'dialog_extra_replies:der1234567890123456',
      runeDelta: -300,
      repliesGranted: 10,
    },
  });
  await persist(first.durableWrites);

  await expect(prepareDialogExtraRepliesRunePurchase({
    token: captureAccountGeneration(), requestId: 'der1234567890123456', createdAtMs: 999,
  })).resolves.toMatchObject({ duplicate: true, balanceBefore: 600, balanceAfter: 300 });
});

test('two different purchases debit exactly twice and a newer unrelated server observation preserves both', async () => {
  const first = await prepare('der1234567890123456', 100);
  await persist(first.durableWrites);
  const second = await prepareDialogExtraRepliesRunePurchase({
    token: captureAccountGeneration(), requestId: 'der1234567890123457', createdAtMs: 101,
  });
  expect(second.balanceAfter).toBe(0);
  await persist(second.durableWrites);
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(0);

  const observed = await mergeLevelSpinServerStars(captureAccountGeneration(), { stars: 1_000, starsSeq: 1 });
  expect(observed.balance).toBe(400);
  expect(JSON.parse(storage[levelSpinStarProjectionKey('account-a')]).operations).toHaveLength(2);
  await recoverAndHydrateLevelSpinStarGrants(captureAccountGeneration(), { syncNow: false });
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(400);
  expect(JSON.parse(storage[levelSpinStarProjectionKey('account-a')]).operations).toHaveLength(2);
  await expect(prepareDialogExtraRepliesRunePurchase({
    token: captureAccountGeneration(), requestId: 'der1234567890123456', createdAtMs: 999,
  })).resolves.toMatchObject({ duplicate: true, balanceAfter: 300 });
  expect((await readUnifiedLevelSpinStars(captureAccountGeneration())).balance).toBe(400);
});

test('insufficient balance produces no durable operation writes', async () => {
  visibleProgress = { stars: 299, starsEarnedTotal: 0 };
  await expect(prepare('der1234567890123456', 100)).rejects.toThrow('dialog_extra_replies_runes_insufficient');
  expect(Object.keys(storage).some((key) => key.includes('dialog_extra_replies:'))).toBe(false);
});
