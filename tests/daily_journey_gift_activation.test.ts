import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  claimDailyJourneyGift,
  commitDailyJourneyGift,
  dailyJourneyGiftClaimPreparedStorageKey,
  dailyJourneyGiftClaimReceiptStorageKey,
  readDailyJourneyGiftClaimState,
  readDailyJourneyGiftProjection,
  type DailyJourneyGiftRewardV1,
} from '../app/daily_journey_gift_inbox';
import {
  applyDailyJourneyGiftActivation,
  finalizeDailyJourneyGiftActivation,
} from '../app/daily_journey_gift_activation';
import { getEffectiveMaxEnergyValue, getEnergyState } from '../app/energy_system';
import { commitDailyJourneyFreezeGrant } from '../app/daily_journey_freeze_ledger';
import { emitAppEvent } from '../app/events';
import {
  applyGift,
  confirmDeferredLocalLevelGiftEffectReceipt,
} from '../app/level_gift_system';
import { enqueueLevelSpinStarGrant } from '../app/level_spin_star_grants';
import { grantLocalDailyJourneySpins } from '../app/local_level_spins';
import { commitShardCreditOperation } from '../app/shards_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) =>
    createHash('sha256').update(value).digest('hex'),
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({ commitShardCreditOperation: jest.fn() }));
jest.mock('../app/level_spin_star_grants', () => ({ enqueueLevelSpinStarGrant: jest.fn() }));
jest.mock('../app/local_level_spins', () => ({ grantLocalDailyJourneySpins: jest.fn() }));
jest.mock('../app/energy_system', () => ({
  getEnergyState: jest.fn(),
  getEffectiveMaxEnergyValue: jest.fn(),
}));
jest.mock('../app/daily_journey_freeze_ledger', () => ({ commitDailyJourneyFreezeGrant: jest.fn() }));
jest.mock('../app/level_gift_system', () => ({
  GIFT_POOL: [
    { id: 'energy_full' },
    { id: 'energy_plus2' },
    { id: 'energy_plus3' },
    { id: 'chain_shield_1' },
  ],
  applyGift: jest.fn(),
  confirmDeferredLocalLevelGiftEffectReceipt: jest.fn(),
}));

const storage: Record<string, string> = {};

const rewardCases: readonly DailyJourneyGiftRewardV1[] = [
  ...[10, 20, 50, 100, 250].map((amount) => ({ kind: 'pearls' as const, amount })),
  ...[100, 200, 300, 400, 500, 600, 700, 750, 800, 1000]
    .map((amount) => ({ kind: 'runes' as const, amount })),
  ...[1, 2, 3, 5].map((amount) => ({ kind: 'spins' as const, amount })),
  { kind: 'energy_full', amount: 1 },
  { kind: 'energy_plus', amount: 2 },
  { kind: 'energy_plus', amount: 3 },
  { kind: 'freeze', amount: 1 },
  { kind: 'freeze', amount: 2 },
];

const runeAmount = (giftId: string): number => Number(giftId.replace('stars_', ''));

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) =>
    keys.map((key) => [key, storage[key] ?? null]));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (commitShardCreditOperation as jest.Mock).mockResolvedValue({ status: 'applied' });
  (enqueueLevelSpinStarGrant as jest.Mock).mockResolvedValue(undefined);
  (grantLocalDailyJourneySpins as jest.Mock).mockResolvedValue(true);
  (getEnergyState as jest.Mock).mockResolvedValue({ current: 2, lastRecoveryTime: 123 });
  (getEffectiveMaxEnergyValue as jest.Mock).mockResolvedValue(5);
  (commitDailyJourneyFreezeGrant as jest.Mock).mockResolvedValue({ status: 'applied' });
  (applyGift as jest.Mock).mockResolvedValue({ success: true });
  (confirmDeferredLocalLevelGiftEffectReceipt as jest.Mock).mockResolvedValue(true);
});

it.each(rewardCases)('maps $kind amount $amount exactly and activates only on claim', async (reward) => {
  const token = beginAccountGeneration('owner-a');
  const operationId = `daily-map-${reward.kind}-${reward.amount}`;
  const committed = await commitDailyJourneyGift({
    operationId,
    source: 'daily_journey_dev',
    cycle: 1,
    day: 1,
    reward,
  }, token);

  expect(commitShardCreditOperation).not.toHaveBeenCalled();
  expect(enqueueLevelSpinStarGrant).not.toHaveBeenCalled();
  expect(grantLocalDailyJourneySpins).not.toHaveBeenCalled();
  expect(getEnergyState).not.toHaveBeenCalled();
  expect(applyGift).not.toHaveBeenCalled();

  await expect(claimDailyJourneyGift(operationId, token)).resolves.toEqual({ status: 'claimed' });

  const claimOperationId = `daily-journey-gift-claim:${operationId}`;
  if (reward.kind === 'pearls') {
    expect(commitShardCreditOperation).toHaveBeenCalledWith(expect.objectContaining({
      amount: reward.amount,
      reason: 'daily_journey_pearls',
      grant: expect.objectContaining({
        kind: 'daily_journey_reward',
        payload: expect.objectContaining({
          operationId,
          occurrenceFingerprint: committed.occurrence.payloadFingerprint,
          reward,
        }),
      }),
      accountToken: token,
    }));
  } else if (reward.kind === 'runes') {
    const calls = (enqueueLevelSpinStarGrant as jest.Mock).mock.calls;
    expect(calls.reduce((sum, [input]) => sum + runeAmount(input.giftId), 0)).toBe(reward.amount);
    expect(new Set(calls.map(([input]) => input.requestId)).size).toBe(calls.length);
    calls.forEach(([input]) => expect(input.token).toBe(token));
  } else if (reward.kind === 'spins') {
    expect(grantLocalDailyJourneySpins).toHaveBeenCalledWith(
      claimOperationId,
      reward.amount,
      token,
    );
  } else if (reward.kind === 'freeze') {
    expect(commitDailyJourneyFreezeGrant).toHaveBeenCalledWith({
      claimOperationId,
      amount: reward.amount,
      occurrenceFingerprint: committed.occurrence.payloadFingerprint,
    }, token);
    expect(applyGift).not.toHaveBeenCalled();
  } else {
    const expectedGiftId = reward.kind === 'energy_full'
      ? 'energy_full'
      : `energy_plus${reward.amount}`;
    expect(applyGift).toHaveBeenCalledTimes(1);
    (applyGift as jest.Mock).mock.calls.forEach(([gift, _name, _current, _max, _set, options]) => {
      expect(gift.id).toBe(expectedGiftId);
      expect(options).toEqual(expect.objectContaining({
        localOnly: true,
        accountToken: token,
        deferEffectReceiptConfirmation: true,
      }));
    });
  }
  expect(await readDailyJourneyGiftClaimState(operationId, token)).toBe('claimed');
});

it('returns already_claimed without applying a duplicate effect', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationId = 'daily-duplicate-claim-0001';
  await commitDailyJourneyGift({
    operationId, source: 'daily_journey_dev', cycle: 1, day: 1,
    reward: { kind: 'pearls', amount: 20 },
  }, token);

  expect(await claimDailyJourneyGift(operationId, token)).toEqual({ status: 'claimed' });
  expect(await claimDailyJourneyGift(operationId, token)).toEqual({ status: 'already_claimed' });
  expect(commitShardCreditOperation).toHaveBeenCalledTimes(1);
});

it('re-emits invalidation when prepared removal deleted durable state and then threw', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationId = 'daily-remove-then-throw-0001';
  await commitDailyJourneyGift({
    operationId,
    source: 'daily_journey_dev',
    cycle: 1,
    day: 1,
    reward: { kind: 'pearls', amount: 10 },
  }, token);
  const preparedKey = dailyJourneyGiftClaimPreparedStorageKey('owner-a');
  let throwAfterPreparedDelete = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
    if (key === preparedKey && throwAfterPreparedDelete) {
      throwAfterPreparedDelete = false;
      throw new Error('simulated_process_death_after_remove');
    }
  });

  await expect(claimDailyJourneyGift(operationId, token))
    .rejects.toThrow('simulated_process_death_after_remove');
  expect(commitShardCreditOperation).toHaveBeenCalledTimes(1);
  (emitAppEvent as jest.Mock).mockClear();

  await expect(claimDailyJourneyGift(operationId, token))
    .resolves.toEqual({ status: 'already_claimed' });
  expect(commitShardCreditOperation).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).toHaveBeenCalledWith('daily_journey_gifts_changed');
});

it('keeps a failed effect intent pending and retries with the same stable downstream id', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationId = 'daily-effect-retry-0001';
  await commitDailyJourneyGift({
    operationId, source: 'daily_journey_dev', cycle: 1, day: 1,
    reward: { kind: 'pearls', amount: 50 },
  }, token);
  (commitShardCreditOperation as jest.Mock)
    .mockRejectedValueOnce(new Error('simulated_effect_failure'))
    .mockResolvedValueOnce({ status: 'applied' });

  await expect(claimDailyJourneyGift(operationId, token)).rejects.toThrow('simulated_effect_failure');
  expect(await readDailyJourneyGiftClaimState(operationId, token)).toBe('pending');
  expect(storage[dailyJourneyGiftClaimPreparedStorageKey('owner-a')]).toBeDefined();

  await expect(claimDailyJourneyGift(operationId, token)).resolves.toEqual({ status: 'claimed' });
  const effectIds = (commitShardCreditOperation as jest.Mock).mock.calls.map(([input]) => input.operationId);
  expect(effectIds).toHaveLength(2);
  expect(new Set(effectIds).size).toBe(1);
});

it('recovers a torn receipt response without applying the effect twice', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationId = 'daily-torn-receipt-0001';
  await commitDailyJourneyGift({
    operationId, source: 'daily_journey_dev', cycle: 1, day: 1,
    reward: { kind: 'pearls', amount: 100 },
  }, token);
  const receiptKey = dailyJourneyGiftClaimReceiptStorageKey('owner-a', operationId);
  let tearReceiptResponse = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
    if (key === receiptKey && tearReceiptResponse) {
      tearReceiptResponse = false;
      throw new Error('simulated_torn_receipt_response');
    }
  });

  await expect(claimDailyJourneyGift(operationId, token))
    .rejects.toThrow('simulated_torn_receipt_response');
  expect(storage[receiptKey]).toBeDefined();
  expect(commitShardCreditOperation).toHaveBeenCalledTimes(1);

  await expect(claimDailyJourneyGift(operationId, token))
    .resolves.toEqual({ status: 'already_claimed' });
  expect(commitShardCreditOperation).toHaveBeenCalledTimes(1);
  expect(storage[dailyJourneyGiftClaimPreparedStorageKey('owner-a')]).toBeUndefined();
});

it('fails stale after an account switch inside the downstream async boundary', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationId = 'daily-claim-account-switch';
  await commitDailyJourneyGift({
    operationId, source: 'daily_journey_dev', cycle: 1, day: 1,
    reward: { kind: 'pearls', amount: 10 },
  }, token);
  (commitShardCreditOperation as jest.Mock).mockImplementationOnce(async () => {
    beginAccountGeneration('owner-b');
    return { status: 'applied' };
  });

  await expect(claimDailyJourneyGift(operationId, token)).rejects.toThrow('daily_journey_account_stale');
  expect(storage[dailyJourneyGiftClaimReceiptStorageKey('owner-a', operationId)]).toBeUndefined();
  expect(await readDailyJourneyGiftProjection()).toMatchObject({ pendingCount: 0, unreadCount: 0 });
});

it('rejects an activation request whose stable claim identity does not match the occurrence', async () => {
  const token = beginAccountGeneration('owner-a');
  const { occurrence } = await commitDailyJourneyGift({
    operationId: 'daily-activation-id-mismatch', source: 'daily_journey_dev', cycle: 1, day: 1,
    reward: { kind: 'spins', amount: 1 },
  }, token);

  await expect(applyDailyJourneyGiftActivation(
    occurrence,
    'daily-journey-gift-claim:another-operation',
    token,
  )).rejects.toThrow('daily_journey_claim_identity_mismatch');
  expect(grantLocalDailyJourneySpins).not.toHaveBeenCalled();
});

it('fails closed for a non-catalog reward and leaves the occurrence pending', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationId = 'daily-unsupported-freeze-0001';
  const { occurrence } = await commitDailyJourneyGift({
    operationId, source: 'daily_journey_dev', cycle: 1, day: 1,
    reward: { kind: 'freeze', amount: 3 },
  }, token);

  await expect(claimDailyJourneyGift(operationId, token))
    .rejects.toThrow('daily_journey_activation_reward_unsupported');
  expect(applyGift).not.toHaveBeenCalled();
  expect(await readDailyJourneyGiftClaimState(operationId, token)).toBe('pending');
  expect((await readDailyJourneyGiftProjection(token)).pendingCount).toBe(1);
  await expect(finalizeDailyJourneyGiftActivation(
    occurrence,
    `daily-journey-gift-claim:${operationId}`,
    token,
  )).rejects.toThrow('daily_journey_activation_reward_unsupported');
  expect(confirmDeferredLocalLevelGiftEffectReceipt).not.toHaveBeenCalled();
});
