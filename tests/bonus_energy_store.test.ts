import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import {
  BONUS_ENERGY_KEY,
  consumeBonusEnergy,
  readBonusEnergy,
  restoreBonusEnergy,
  readBonusEnergyForMutation,
} from '../app/bonus_energy_store';
import { giftAccountStorageKey } from '../app/gift_account_storage';

describe('account-scoped bonus energy store', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    __resetAccountGenerationForTests();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('spends and refunds the same expiring bonus without touching the legacy global key', async () => {
    const token = beginAccountGeneration('energy-owner-a');
    const expiresAt = Date.now() + 60_000;
    await restoreBonusEnergy(3, expiresAt, token);

    await expect(consumeBonusEnergy(1, token)).resolves.toEqual({
      spent: 1,
      remaining: 2,
      expiresAt,
    });
    await expect(restoreBonusEnergy(1, expiresAt, token)).resolves.toMatchObject({
      amount: 3,
      capacity: 3,
      expiresAt,
    });

    const scopedKey = giftAccountStorageKey(BONUS_ENERGY_KEY, token)!;
    await expect(AsyncStorage.getItem(scopedKey)).resolves.toBe(JSON.stringify({ amount: 3, capacity: 3, expiresAt }));
    await expect(AsyncStorage.getItem(BONUS_ENERGY_KEY)).resolves.toBeNull();
  });

  test('never leaks or restores expired energy across accounts', async () => {
    const tokenA = beginAccountGeneration('energy-owner-a');
    const expiresAt = Date.now() + 60_000;
    await restoreBonusEnergy(2, expiresAt, tokenA);

    beginAccountGeneration('energy-owner-b');
    await expect(readBonusEnergy()).resolves.toBeNull();

    beginAccountGeneration('energy-owner-a');
    jest.setSystemTime(expiresAt + 1);
    await expect(restoreBonusEnergy(1, expiresAt, captureAccountGeneration())).resolves.toBeNull();
    await expect(readBonusEnergy()).resolves.toBeNull();
  });

  test('public read never deletes an expired value that a concurrent grant may replace', async () => {
    const token = beginAccountGeneration('energy-owner-a');
    const scopedKey = giftAccountStorageKey(BONUS_ENERGY_KEY, token)!;
    const expired = JSON.stringify({ amount: 2, expiresAt: Date.now() - 1 });
    await AsyncStorage.setItem(scopedKey, expired);

    await expect(readBonusEnergy(token)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(scopedKey)).resolves.toBe(expired);
  });

  test('mutation read also leaves an expired snapshot in place for the enclosing composite', async () => {
    const token = beginAccountGeneration('energy-owner-a');
    const scopedKey = giftAccountStorageKey(BONUS_ENERGY_KEY, token)!;
    const expired = JSON.stringify({ amount: 2, expiresAt: Date.now() - 1 });
    await AsyncStorage.setItem(scopedKey, expired);

    await expect(readBonusEnergyForMutation(token)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(scopedKey)).resolves.toBe(expired);
  });

  test('reuses an inherited account-transition lease for a composite spend', async () => {
    const token = beginAccountGeneration('energy-owner-a');
    const expiresAt = Date.now() + 60_000;
    await restoreBonusEnergy(2, expiresAt, token);

    await withAccountTransitionLock(async (lease) => {
      await expect(consumeBonusEnergy(1, token, lease)).resolves.toMatchObject({ spent: 1, remaining: 1 });
      await expect(restoreBonusEnergy(1, expiresAt, token, lease)).resolves.toMatchObject({ amount: 2 });
    });
  });

  test('keeps temporary capacity after all bonus units are spent', async () => {
    const token = beginAccountGeneration('energy-owner-a');
    const expiresAt = Date.now() + 60_000;
    await restoreBonusEnergy(3, expiresAt, token);

    await expect(consumeBonusEnergy(3, token)).resolves.toMatchObject({ spent: 3, remaining: 0 });
    await expect(readBonusEnergy(token)).resolves.toEqual({ amount: 0, capacity: 3, expiresAt });
  });

  test.each(['{bad', '{"amount":0,"expiresAt":9999999999999}', '{"amount":"3","expiresAt":9999999999999}'])
  ('mutations fail closed and preserve malformed bonus authority: %s', async (raw) => {
    const token = beginAccountGeneration('energy-owner-a');
    const scopedKey = giftAccountStorageKey(BONUS_ENERGY_KEY, token)!;
    await AsyncStorage.setItem(scopedKey, raw);

    await expect(readBonusEnergy(token)).resolves.toBeNull();
    await expect(consumeBonusEnergy(1, token)).rejects.toThrow('bonus_energy_storage_corrupt');
    await expect(restoreBonusEnergy(1, Date.now() + 60_000, token))
      .rejects.toThrow('bonus_energy_storage_corrupt');
    await expect(AsyncStorage.getItem(scopedKey)).resolves.toBe(raw);
  });
});
