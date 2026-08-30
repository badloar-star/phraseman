import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  commitDailyJourneyFreezeGrant,
  consumeDailyJourneyFreeze,
  readDailyJourneyFreezeProjection,
  readEffectiveStreakProtection,
} from '../app/daily_journey_freeze_ledger';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
    createHash('sha256').update(value).digest('hex')),
}));

const storage: Record<string, string> = {};

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
  ) => pairs.forEach(([key, value]) => { storage[key] = value; }));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: readonly string[]) => {
    keys.forEach((key) => delete storage[key]);
  });
});

it('commits an immutable exact grant once and consumes each stable protection use once', async () => {
  const token = beginAccountGeneration('owner-a');
  const input = {
    claimOperationId: 'daily-journey-gift-claim:freeze-grant-0001',
    amount: 2 as const,
    occurrenceFingerprint: 'a'.repeat(64),
  };

  await expect(commitDailyJourneyFreezeGrant(input, token)).resolves.toEqual({ status: 'applied' });
  await expect(commitDailyJourneyFreezeGrant(input, token)).resolves.toEqual({ status: 'already_applied' });
  await expect(consumeDailyJourneyFreeze('missed-day:2026-08-29:2026-08-30', token)).resolves.toBe(true);
  await expect(consumeDailyJourneyFreeze('missed-day:2026-08-29:2026-08-30', token)).resolves.toBe(true);

  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    grantedCount: 2,
    consumedCount: 1,
    remainingCount: 1,
    latestRevision: 2,
  });
  await expect(commitDailyJourneyFreezeGrant({ ...input, amount: 1 }, token))
    .rejects.toThrow('daily_journey_freeze_operation_conflict');
});

it('keeps committed Daily Journey protection effective after cloud restore removes a missing server shield', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-cloud-0001',
    amount: 2,
    occurrenceFingerprint: 'b'.repeat(64),
  }, token);
  storage.chain_shield = JSON.stringify({ daysLeft: 3, grantedAt: 'server' });

  await __cloudSyncTestHooks.applyRestoreFromUserDoc({
    exists: true,
    data: () => ({ progress: { user_total_xp: '0', streak_count: '0' } }),
  });

  await expect(readEffectiveStreakProtection(token)).resolves.toEqual({
    serverShieldDays: 0,
    dailyJourneyFreezeCount: 2,
    totalProtectionCount: 2,
  });
});

it('recovers an occurrence-only torn grant without minting twice', async () => {
  const token = beginAccountGeneration('owner-a');
  let tearOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    if (tearOnce) {
      tearOnce = false;
      const [operation] = pairs;
      storage[operation[0]] = operation[1];
      throw new Error('simulated_freeze_torn_commit');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const input = {
    claimOperationId: 'daily-journey-gift-claim:freeze-torn-0001',
    amount: 2 as const,
    occurrenceFingerprint: 'c'.repeat(64),
  };

  await expect(commitDailyJourneyFreezeGrant(input, token))
    .rejects.toThrow('simulated_freeze_torn_commit');
  await expect(commitDailyJourneyFreezeGrant(input, token))
    .resolves.toEqual({ status: 'already_applied' });
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    grantedCount: 2,
    remainingCount: 2,
    latestRevision: 1,
  });
});

it('rejects a stale owner token at the async storage boundary', async () => {
  const token = beginAccountGeneration('owner-a');
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (key: string, value: string) => {
    storage[key] = value;
    beginAccountGeneration('owner-b');
  });

  await expect(commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-switch-0001',
    amount: 1,
    occurrenceFingerprint: 'd'.repeat(64),
  }, token)).rejects.toThrow('daily_journey_freeze_account_stale');

  const ownerBToken = beginAccountGeneration('owner-b');
  await expect(readDailyJourneyFreezeProjection(ownerBToken)).resolves.toMatchObject({
    grantedCount: 0,
    remainingCount: 0,
  });
});
