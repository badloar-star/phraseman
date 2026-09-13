import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  aiDialogDailyQuotaStorageKey,
  localDayPeriod,
  markAiDialogDailyQuotaExhausted,
  readAiDialogDailyQuota,
  recordAiDialogDailyQuotaFromServer,
} from '../app/ai_dialog_daily_quota';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';

const NOON = new Date(2026, 8, 13, 12, 0, 0).getTime();
const TOMORROW = new Date(2026, 8, 14, 9, 0, 0).getTime();

describe('ai_dialog_daily_quota — зеркало серверной дневной квоты реплик', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(aiDialogDailyQuotaStorageKey('uid-a'));
  });

  test('без ответа сервера сегодня — unknown (вход открыт, решает сервер)', async () => {
    const state = await readAiDialogDailyQuota('uid-a', NOON);
    expect(state).toEqual({ status: 'unknown', limit: REVENUE_DAILY_LIMITS.ai_dialog_replies });
    expect(await readAiDialogDailyQuota(null, NOON)).toMatchObject({ status: 'unknown' });
  });

  test('ответ сервера с остатком запоминается на локальный день', async () => {
    await recordAiDialogDailyQuotaFromServer('uid-a', 7, NOON);
    expect(await readAiDialogDailyQuota('uid-a', NOON)).toMatchObject({ status: 'allowed', remaining: 7, period: localDayPeriod(NOON) });
    await recordAiDialogDailyQuotaFromServer('uid-a', 0, NOON);
    expect(await readAiDialogDailyQuota('uid-a', NOON)).toMatchObject({ status: 'exhausted', remaining: 0 });
  });

  test('dialog_free_limit сервера = исчерпано сегодня; новый день снова unknown', async () => {
    await markAiDialogDailyQuotaExhausted('uid-a', NOON);
    expect((await readAiDialogDailyQuota('uid-a', NOON)).status).toBe('exhausted');
    expect((await readAiDialogDailyQuota('uid-a', TOMORROW)).status).toBe('unknown');
  });

  test('нечисловой remainingQuota и битое зеркало не ломают вход', async () => {
    await recordAiDialogDailyQuotaFromServer('uid-a', undefined, NOON);
    expect((await readAiDialogDailyQuota('uid-a', NOON)).status).toBe('unknown');
    await AsyncStorage.setItem(aiDialogDailyQuotaStorageKey('uid-a'), '{not json');
    expect((await readAiDialogDailyQuota('uid-a', NOON)).status).toBe('unknown');
  });
});
