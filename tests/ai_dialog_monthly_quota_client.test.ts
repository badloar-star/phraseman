import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AI_DIALOG_LEGACY_DAILY_QUOTA_PREFIX,
  AI_DIALOG_MONTHLY_QUOTA_PREFIX,
  aiDialogMonthlyQuotaStorageKey,
  parseAiDialogQuotaObservation,
  readAiDialogMonthlyQuota,
  recordAiDialogMonthlyQuotaFromServer,
} from '../app/ai_dialog_daily_quota';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';

const RESET = Date.UTC(2026, 9, 1, 0, 0, 0, 0);
const BEFORE_RESET = RESET - 1;

describe('AI dialogue client calendar-month quota mirror', () => {
  beforeEach(async () => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => (
      key.startsWith('ai_dialog_daily_quota:') || key.startsWith('ai_dialog_monthly_quota:')
    )));
  });

  test('defaults to 30 replies per calendar month and stores an account-global v3 row', async () => {
    expect(REVENUE_MONTHLY_LIMITS.ai_dialog_replies).toBe(30);
    expect(await readAiDialogMonthlyQuota('en', 'uid-a', BEFORE_RESET)).toEqual({
      status: 'unknown', limit: 30,
    });
    const keys = ['en', 'es', 'fr', 'de'].map((target) => aiDialogMonthlyQuotaStorageKey(target, 'uid-a'));
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe(`${AI_DIALOG_MONTHLY_QUOTA_PREFIX}${encodeURIComponent('uid-a')}`);

    await recordAiDialogMonthlyQuotaFromServer('es', 'uid-a', {
      remainingQuota: 22,
      resetAtMs: RESET,
      quotaVersion: 4,
    }, BEFORE_RESET);

    expect(await readAiDialogMonthlyQuota('de', 'uid-a', BEFORE_RESET)).toMatchObject({
      status: 'allowed', remaining: 22, limit: 30, resetAtMs: RESET, quotaVersion: 4,
    });
    const stored = JSON.parse(String(await AsyncStorage.getItem(String(keys[0]))));
    expect(stored).toMatchObject({ schemaVersion: 3, quotaPeriod: 'calendar_month', limit: 30 });
  });

  test('accepts only a UTC calendar-month reset boundary from the server', () => {
    expect(parseAiDialogQuotaObservation({
      remainingQuota: 5, resetAtMs: RESET, quotaVersion: 1,
    })).not.toBeNull();
    expect(parseAiDialogQuotaObservation({
      remainingQuota: 5, resetAtMs: Date.UTC(2026, 8, 14), quotaVersion: 1,
    })).toBeNull();
  });

  test('migrates only a legacy v2 row already carrying a monthly server boundary', async () => {
    const legacyKey = `${AI_DIALOG_LEGACY_DAILY_QUOTA_PREFIX}${encodeURIComponent('uid-a')}`;
    await AsyncStorage.setItem(legacyKey, JSON.stringify({
      schemaVersion: 2,
      remaining: 7,
      limit: 10,
      resetAtMs: RESET,
      quotaVersion: 12,
      updatedAtMs: BEFORE_RESET,
    }));

    expect(await readAiDialogMonthlyQuota('fr', 'uid-a', BEFORE_RESET)).toMatchObject({
      status: 'allowed', remaining: 7, limit: 30, resetAtMs: RESET, quotaVersion: 12,
    });
    const migrated = JSON.parse(String(await AsyncStorage.getItem(
      `${AI_DIALOG_MONTHLY_QUOTA_PREFIX}${encodeURIComponent('uid-a')}`,
    )));
    expect(migrated).toMatchObject({ schemaVersion: 3, quotaPeriod: 'calendar_month', limit: 30 });
  });

  test('does not promote a legacy daily reset into monthly authority', async () => {
    const legacyKey = `${AI_DIALOG_LEGACY_DAILY_QUOTA_PREFIX}${encodeURIComponent('uid-a')}`;
    await AsyncStorage.setItem(legacyKey, JSON.stringify({
      schemaVersion: 2,
      remaining: 0,
      limit: 10,
      resetAtMs: Date.UTC(2026, 8, 14),
      quotaVersion: 12,
      updatedAtMs: Date.UTC(2026, 8, 13),
    }));

    expect(await readAiDialogMonthlyQuota('en', 'uid-a', Date.UTC(2026, 8, 13, 12))).toEqual({
      status: 'unknown', limit: 30,
    });
    expect(await AsyncStorage.getItem(
      `${AI_DIALOG_MONTHLY_QUOTA_PREFIX}${encodeURIComponent('uid-a')}`,
    )).toBeNull();
  });

  test('keeps paid extra replies visible instead of clamping them to the free base', async () => {
    await recordAiDialogMonthlyQuotaFromServer('en', 'uid-a', {
      remainingQuota: 40,
      resetAtMs: RESET,
      quotaVersion: 15,
    }, BEFORE_RESET);

    expect(await readAiDialogMonthlyQuota('de', 'uid-a', BEFORE_RESET)).toMatchObject({
      status: 'allowed', remaining: 40, limit: 40,
    });
  });
});
