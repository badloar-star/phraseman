import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AI_DIALOG_DAILY_QUOTA_PREFIX,
  aiDialogDailyQuotaStorageKey,
  parseAiDialogQuotaObservation,
  quotaObservationFromDialogError,
  readAiDialogDailyQuota,
  recordAiDialogDailyQuotaFromServer,
} from '../app/ai_dialog_daily_quota';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';

const RESET = Date.UTC(2026, 8, 14, 0, 0, 0, 0);
const BEFORE_RESET = RESET - 1;
const AFTER_RESET = RESET;

describe('ai_dialog_daily_quota — account-global authoritative mirror', () => {
  beforeEach(async () => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith('ai_dialog_daily_quota:')));
  });

  test('without an authoritative server observation the account quota is unknown', async () => {
    expect(await readAiDialogDailyQuota('en', 'uid-a', BEFORE_RESET)).toEqual({
      status: 'unknown',
      limit: REVENUE_DAILY_LIMITS.ai_dialog_replies,
    });
    expect(await readAiDialogDailyQuota('en', null, BEFORE_RESET)).toMatchObject({ status: 'unknown' });
  });

  test('EN, ES, FR and DE share one account-global v2 key and allowance', async () => {
    const keys = ['en', 'es', 'fr', 'de'].map((target) => aiDialogDailyQuotaStorageKey(target, 'uid-a'));
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe(`${AI_DIALOG_DAILY_QUOTA_PREFIX}${encodeURIComponent('uid-a')}`);

    await recordAiDialogDailyQuotaFromServer('es', 'uid-a', {
      remainingQuota: 2,
      resetAtMs: RESET,
      quotaVersion: 4,
    }, BEFORE_RESET);

    for (const target of ['en', 'es', 'fr', 'de']) {
      await expect(readAiDialogDailyQuota(target, 'uid-a', BEFORE_RESET)).resolves.toMatchObject({
        status: 'allowed', remaining: 2, resetAtMs: RESET, quotaVersion: 4,
      });
    }
  });

  test('invalid target has no read or write side effects', async () => {
    const before = await AsyncStorage.getAllKeys();
    expect(aiDialogDailyQuotaStorageKey('it', 'uid-a')).toBeNull();
    await recordAiDialogDailyQuotaFromServer('it', 'uid-a', {
      remainingQuota: 0,
      resetAtMs: RESET,
      quotaVersion: 1,
    }, BEFORE_RESET);
    expect(await readAiDialogDailyQuota('it', 'uid-a', BEFORE_RESET)).toMatchObject({ status: 'unavailable' });
    expect(await AsyncStorage.getAllKeys()).toEqual(before);
  });

  test('uses the server UTC reset instant regardless of the local timezone/date', async () => {
    await recordAiDialogDailyQuotaFromServer('en', 'uid-a', {
      remainingQuota: 0,
      resetAtMs: RESET,
      quotaVersion: 7,
    }, BEFORE_RESET);

    expect(await readAiDialogDailyQuota('de', 'uid-a', BEFORE_RESET)).toMatchObject({
      status: 'exhausted', remaining: 0,
    });
    expect(await readAiDialogDailyQuota('de', 'uid-a', AFTER_RESET)).toEqual({
      status: 'unknown', limit: REVENUE_DAILY_LIMITS.ai_dialog_replies,
    });
  });

  test('rejects stale or malformed observations and preserves the newest fact', async () => {
    await recordAiDialogDailyQuotaFromServer('en', 'uid-a', {
      remainingQuota: 8,
      resetAtMs: RESET,
      quotaVersion: 9,
    }, BEFORE_RESET);
    await recordAiDialogDailyQuotaFromServer('fr', 'uid-a', {
      remainingQuota: 0,
      resetAtMs: RESET,
      quotaVersion: 8,
    }, BEFORE_RESET);
    await recordAiDialogDailyQuotaFromServer('fr', 'uid-a', {
      remainingQuota: 0,
      resetAtMs: Number.NaN,
      quotaVersion: 10,
    }, BEFORE_RESET);

    expect(await readAiDialogDailyQuota('es', 'uid-a', BEFORE_RESET)).toMatchObject({
      status: 'allowed', remaining: 8, quotaVersion: 9,
    });
  });

  test.each([
    { remainingQuota: null, resetAtMs: RESET, quotaVersion: 1 },
    { remainingQuota: [], resetAtMs: RESET, quotaVersion: 1 },
    { remainingQuota: ['0'], resetAtMs: RESET, quotaVersion: 1 },
    { remainingQuota: '0', resetAtMs: RESET, quotaVersion: 1 },
    { remainingQuota: 0, resetAtMs: String(RESET), quotaVersion: 1 },
    { remainingQuota: 0, resetAtMs: RESET, quotaVersion: '1' },
  ])('does not coerce malformed server fields into quota authority: %p', (observation) => {
    expect(parseAiDialogQuotaObservation(observation)).toBeNull();
  });

  test('legacy target-scoped v1 records cannot become account-global authority', async () => {
    const legacyBase = `ai_dialog_daily_quota:v1:${encodeURIComponent('uid-a')}`;
    await AsyncStorage.setItem(
      legacyBase,
      JSON.stringify({ period: '2026-09-13', remaining: 0, limit: 10, updatedAtMs: BEFORE_RESET }),
    );
    await AsyncStorage.setItem(
      `dialogue_v1::de::${legacyBase}`,
      JSON.stringify({ period: '2026-09-13', remaining: 0, limit: 10, updatedAtMs: BEFORE_RESET }),
    );
    expect(await readAiDialogDailyQuota('en', 'uid-a', BEFORE_RESET)).toEqual({
      status: 'unknown', limit: REVENUE_DAILY_LIMITS.ai_dialog_replies,
    });
    expect(await readAiDialogDailyQuota('de', 'uid-a', BEFORE_RESET)).toEqual({
      status: 'unknown', limit: REVENUE_DAILY_LIMITS.ai_dialog_replies,
    });
  });

  test('extracts only a strict versioned quota observation from callable or stream errors', () => {
    const expected = { remainingQuota: 0, resetAtMs: RESET, quotaVersion: 11 };
    expect(quotaObservationFromDialogError({ details: expected })).toEqual(expected);
    expect(quotaObservationFromDialogError({ quota: expected })).toEqual(expected);
    expect(quotaObservationFromDialogError({ details: { ...expected, quotaVersion: '11' } })).toBeNull();
  });
});
