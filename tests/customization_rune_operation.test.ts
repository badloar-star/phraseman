import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';

import {
  replayOrdinaryEconomy,
  parseCustomizationRunePurchaseExactResult,
} from '../modules/phone-state/domains/economy';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  levelSpinStarProjectionKey,
  prepareCustomizationRunePurchase,
  recoverAndHydrateLevelSpinStarGrants,
  sessionAttemptRuneOperationStorageKey,
} from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};
let visibleProgress = { stars: 10_000, starsEarnedTotal: 100 };

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 10_000, starsEarnedTotal: 100 };
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
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

async function prepareOne() {
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  return prepareCustomizationRunePurchase({
    token,
    operationId: 'customization_avatar:custom-gen-73:purchase',
    avatarId: 'custom-gen-73',
    ownedValue: 'avatar100-v1|aurora:black',
    avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
    price: 5_600,
    reason: 'custom_avatar',
    createdAtMs: 100,
  });
}

test('prepares one exact Yin debit and avatar grant without writing it', async () => {
  const prepared = await prepareOne();

  expect(prepared).toMatchObject({
    duplicate: false,
    balanceBefore: 10_000,
    balanceAfter: 4_400,
    operation: {
      schemaVersion: 'client-customization-rune-operation.v1',
      operationId: 'customization_avatar:custom-gen-73:purchase',
      avatarId: 'custom-gen-73',
      artVersion: 'avatar100-v1',
      ownedValue: 'avatar100-v1|aurora:black',
      avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
      price: 5_600,
      runeDelta: -5_600,
      balanceBefore: 10_000,
      balanceAfter: 4_400,
      reason: 'custom_avatar',
    },
  });
  expect(parseCustomizationRunePurchaseExactResult(prepared.operation)).toEqual(prepared.operation);
  expect(storage[sessionAttemptRuneOperationStorageKey('account-a', prepared.operation.operationId)])
    .toBeUndefined();
  expect(prepared.durableWrites).toHaveLength(2);

  const composite = {
    operationId: prepared.operation.operationId,
    delta: 0,
    grant: {
      kind: 'customization_rune_purchase',
      entitlementId: prepared.operation.operationId,
      exactResult: prepared.operation,
    },
  };
  expect(replayOrdinaryEconomy([composite], 123).balance).toBe(123);
  expect(() => replayOrdinaryEconomy([{ ...composite, delta: -5_600 }], 123))
    .toThrow('phone_state_economy_composite_invalid');
});

test('rejects insufficient runes before producing durable writes', async () => {
  visibleProgress = { stars: 5_599, starsEarnedTotal: 100 };
  const token = captureAccountGeneration();
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });

  await expect(prepareCustomizationRunePurchase({
    token,
    operationId: 'customization_avatar:custom-gen-73:purchase',
    avatarId: 'custom-gen-73',
    ownedValue: 'avatar100-v1|aurora:black',
    avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
    price: 5_600,
    reason: 'custom_avatar',
  })).rejects.toThrow('customization_runes_insufficient');
  expect(Object.keys(storage).some((key) => key.includes('customization_avatar'))).toBe(false);
});

test('replays an identical durable operation and rejects operation-id reuse', async () => {
  const first = await prepareOne();
  const owner = 'account-a';
  storage[sessionAttemptRuneOperationStorageKey(owner, first.operation.operationId)] = JSON.stringify(first.operation);
  storage[levelSpinStarProjectionKey(owner)] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v3',
    ownerStableId: owner,
    operations: [first.operation],
    acknowledged: {},
    serverBalance: 10_000,
    serverEarnedTotal: 100,
    serverSeq: 0,
  });
  const token = captureAccountGeneration();

  await expect(prepareCustomizationRunePurchase({
    token,
    operationId: first.operation.operationId,
    avatarId: 'custom-gen-73',
    ownedValue: first.operation.ownedValue,
    avatarValue: first.operation.avatarValue,
    price: 5_600,
    reason: 'custom_avatar',
  })).resolves.toMatchObject({ duplicate: true, operation: first.operation, durableWrites: [] });

  await expect(prepareCustomizationRunePurchase({
    token,
    operationId: first.operation.operationId,
    avatarId: 'custom-gen-73',
    ownedValue: 'avatar100-v1|ember:black',
    avatarValue: 'custom:custom-gen-73:ember:black:avatar100-v1',
    price: 5_600,
    reason: 'custom_avatar_restyle',
  })).rejects.toThrow('level_spin_star_request_conflict');

  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'level_spin_star_grants.ts'), 'utf8');
  expect(source).not.toMatch(/export\s+(?:async\s+)?function\s+spendRunes/);
});
