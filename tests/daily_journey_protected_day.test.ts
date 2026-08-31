import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import {
  commitDailyJourneyFreezeGrant,
  readDailyJourneyFreezeProjection,
} from '../app/daily_journey_freeze_ledger';
import {
  commitDailyJourneyProtectedDay,
  recoverDailyJourneyProtectedDay,
} from '../app/daily_journey_protected_day';
import { consumeFriendChainShield } from '../app/friend_gifts';
import { updateStreakOnActivity } from '../app/hall_of_fame_utils';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/friend_gifts', () => ({
  consumeFriendChainShield: jest.fn(),
}));
// This unit owns streak/freeze durability, not the fire-and-forget achievement
// pipeline spawned by hall_of_fame_utils after a successful active day.
jest.mock('../app/achievements', () => ({
  checkAchievements: jest.fn(async () => []),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
    createHash('sha256').update(value).digest('hex')),
}));

const storage: Record<string, string> = {};
const protectedPreparedKey = 'daily_journey_protected_day_prepared_v1:owner-a';

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
  (consumeFriendChainShield as jest.Mock).mockResolvedValue(null);
});

afterEach(() => jest.useRealTimers());

const protectedInput = Object.freeze({
  useOperationId: 'daily-journey-missed-day:2026-08-28:2026-08-30',
  lastActiveDate: '2026-08-28',
  protectedDayDate: '2026-08-30',
  streakCount: 9,
});

async function seedFreeze(token: ReturnType<typeof beginAccountGeneration>): Promise<void> {
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:protected-day-freeze-0001',
    amount: 1,
    occurrenceFingerprint: 'a'.repeat(64),
  }, token);
  storage.streak_count = '9';
  storage.last_active_date = '2026-08-28';
}

it('replays the exact streak result after a crash following durable freeze consumption', async () => {
  const token = beginAccountGeneration('owner-a');
  await seedFreeze(token);
  let crashBeforeStreakWrite = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === 'streak_count' && crashBeforeStreakWrite) {
      crashBeforeStreakWrite = false;
      throw new Error('simulated_crash_after_freeze_consume');
    }
    storage[key] = value;
  });

  await expect(commitDailyJourneyProtectedDay(protectedInput, token))
    .rejects.toThrow('simulated_crash_after_freeze_consume');
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    consumedCount: 1,
    remainingCount: 0,
  });
  expect(storage[protectedPreparedKey]).toBeDefined();
  expect(storage.last_active_date).toBe('2026-08-28');

  await expect(recoverDailyJourneyProtectedDay(token)).resolves.toEqual({
    protectedDayDate: '2026-08-30',
    streakCount: 9,
  });
  expect(storage.streak_count).toBe('9');
  expect(storage.last_active_date).toBe('2026-08-30');
  expect(storage[protectedPreparedKey]).toBeUndefined();
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({ consumedCount: 1 });
});

it('never writes old-account streak state when generation changes after freeze consumption', async () => {
  const token = beginAccountGeneration('owner-a');
  await seedFreeze(token);
  let switchAfterConsume = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
    if (key === 'daily_journey_freeze_prepared_v1:owner-a' && switchAfterConsume) {
      switchAfterConsume = false;
      beginAccountGeneration('owner-b');
    }
  });

  await expect(commitDailyJourneyProtectedDay(protectedInput, token))
    .rejects.toThrow('daily_journey_freeze_account_stale');
  expect(storage.streak_count).toBe('9');
  expect(storage.last_active_date).toBe('2026-08-28');

  const ownerAToken = beginAccountGeneration('owner-a');
  await expect(recoverDailyJourneyProtectedDay(ownerAToken)).resolves.toEqual({
    protectedDayDate: '2026-08-30',
    streakCount: 9,
  });
  expect(storage.streak_count).toBe('9');
  expect(storage.last_active_date).toBe('2026-08-30');
  await expect(readDailyJourneyFreezeProjection(ownerAToken)).resolves.toMatchObject({ consumedCount: 1 });
});

it('reuses an inherited account-transition lease without deadlocking the activity flow', async () => {
  const token = beginAccountGeneration('owner-a');
  await seedFreeze(token);

  await expect(withAccountTransitionLock((lease) => (
    commitDailyJourneyProtectedDay(protectedInput, token, lease)
  ))).resolves.toBe(true);
  expect(storage.last_active_date).toBe('2026-08-30');
});

it('immediately recovers the same protected day idempotently without another transition', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
  const token = beginAccountGeneration('owner-a');
  await seedFreeze(token);
  let failProtectedClear = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === protectedPreparedKey && failProtectedClear) {
      failProtectedClear = false;
      throw new Error('simulated_protected_clear_failure');
    }
    delete storage[key];
  });

  await expect(commitDailyJourneyProtectedDay(protectedInput, token))
    .rejects.toThrow('simulated_protected_clear_failure');
  await expect(updateStreakOnActivity(token)).resolves.toBe(9);

  expect(storage.streak_count).toBe('9');
  expect(storage.last_active_date).toBe('2026-08-30');
  expect(storage[protectedPreparedKey]).toBeUndefined();
  expect(consumeFriendChainShield).not.toHaveBeenCalled();
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({ consumedCount: 1 });
});

it('continues and durably persists the next day after recovering yesterday', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
  const token = beginAccountGeneration('owner-a');
  await seedFreeze(token);
  let failProtectedClear = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === protectedPreparedKey && failProtectedClear) {
      failProtectedClear = false;
      throw new Error('simulated_protected_clear_failure');
    }
    delete storage[key];
  });

  await expect(commitDailyJourneyProtectedDay(protectedInput, token))
    .rejects.toThrow('simulated_protected_clear_failure');
  await expect(updateStreakOnActivity(token)).resolves.toBe(10);

  expect(storage.streak_count).toBe('10');
  expect(storage.last_active_date).toBe('2026-08-31');
  expect(storage[protectedPreparedKey]).toBeUndefined();
  expect(consumeFriendChainShield).not.toHaveBeenCalled();
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({ consumedCount: 1 });
});

it('processes the current day and friend shield after recovering an older protected result', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
  const token = beginAccountGeneration('owner-a');
  await seedFreeze(token);
  const olderProtectedInput = Object.freeze({
    useOperationId: 'daily-journey-missed-day:2026-08-27:2026-08-29',
    lastActiveDate: '2026-08-27',
    protectedDayDate: '2026-08-29',
    streakCount: 9,
  });
  let failProtectedClear = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === protectedPreparedKey && failProtectedClear) {
      failProtectedClear = false;
      throw new Error('simulated_protected_clear_failure');
    }
    delete storage[key];
  });

  await expect(commitDailyJourneyProtectedDay(olderProtectedInput, token))
    .rejects.toThrow('simulated_protected_clear_failure');
  storage.chain_shield = JSON.stringify({ daysLeft: 1, grantedAt: '2026-08-28T00:00:00.000Z' });
  (consumeFriendChainShield as jest.Mock).mockResolvedValue({
    consumed: true,
    daysLeft: 0,
    chainShield: null,
  });

  await expect(updateStreakOnActivity(token)).resolves.toBe(9);

  expect(consumeFriendChainShield).toHaveBeenCalledWith('2026-08-29_2026-08-31', token);
  expect(storage.streak_count).toBe('9');
  expect(storage.last_active_date).toBe('2026-08-31');
  expect(storage.chain_shield).toBeUndefined();
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({ consumedCount: 1 });
});
