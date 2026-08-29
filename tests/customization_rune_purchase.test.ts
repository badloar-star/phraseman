import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  commitCustomizationRuneCompositeOperation,
  customizationRunePurchaseOutboxKey,
  syncPendingCustomizationRunePurchases,
} from '../app/customization_rune_purchase';
import { prepareCustomizationRunePurchase } from '../app/level_spin_star_grants';
import { commitPhoneStateNonMonetaryEconomyGrant } from '../app/phone_state_economy_bridge';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/level_spin_star_grants', () => ({
  prepareCustomizationRunePurchase: jest.fn(),
  recoverAndHydrateLevelSpinStarGrants: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
}));

const operation = {
  schemaVersion: 'client-customization-rune-operation.v1' as const,
  operationId: 'customization_avatar:custom-gen-73:purchase',
  ownerStableId: 'account-a',
  accountGeneration: 1,
  avatarId: 'custom-gen-73',
  artVersion: 'avatar100-v1' as const,
  ownedValue: 'avatar100-v1|aurora:black',
  avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
  runeDelta: -5_600,
  price: 5_600,
  balanceBefore: 10_000,
  balanceAfter: 4_400,
  reason: 'custom_avatar' as const,
  createdAtMs: 100,
  requestFingerprint: 'a'.repeat(64),
};

beforeEach(() => {
  jest.clearAllMocks();
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);
  (prepareCustomizationRunePurchase as jest.Mock).mockResolvedValue({
    duplicate: false,
    operation,
    balanceBefore: 10_000,
    balanceAfter: 4_400,
    durableWrites: [
      ['rune-operation', JSON.stringify(operation)],
      ['rune-projection', '{"balance":4400}'],
    ],
  });
  (commitPhoneStateNonMonetaryEconomyGrant as jest.Mock).mockResolvedValue(false);
});

test('atomically commits rune debit, exact grant, ownership, intent and sync outbox', async () => {
  const token = captureAccountGeneration();
  await expect(commitCustomizationRuneCompositeOperation({
    token,
    operationId: operation.operationId,
    avatarId: operation.avatarId,
    ownedValue: operation.ownedValue,
    avatarValue: operation.avatarValue,
    price: operation.price,
    reason: operation.reason,
    localWrites: [
      ['custom_avatar_owned_v1', '{"custom-gen-73":"avatar100-v1|aurora:black"}'],
      ['customization_purchase_intent_v1', '{"phase":"granted"}'],
    ],
  })).resolves.toMatchObject({ duplicate: false, balanceAfter: 4_400 });

  expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.multiSet).toHaveBeenCalledWith(expect.arrayContaining([
    ['rune-operation', JSON.stringify(operation)],
    ['rune-projection', '{"balance":4400}'],
    ['custom_avatar_owned_v1', '{"custom-gen-73":"avatar100-v1|aurora:black"}'],
    ['customization_purchase_intent_v1', '{"phase":"granted"}'],
    [customizationRunePurchaseOutboxKey('account-a'), JSON.stringify([operation])],
  ]));
});

test('keeps the committed local result when Phone State synchronization is unavailable', async () => {
  const token = captureAccountGeneration();
  await commitCustomizationRuneCompositeOperation({
    token,
    operationId: operation.operationId,
    avatarId: operation.avatarId,
    ownedValue: operation.ownedValue,
    avatarValue: operation.avatarValue,
    price: operation.price,
    reason: operation.reason,
    localWrites: [],
  });

  await expect(syncPendingCustomizationRunePurchases(token)).resolves.toEqual({ synced: 0, pending: 0 });
  expect(AsyncStorage.multiSet).toHaveBeenCalled();
});
