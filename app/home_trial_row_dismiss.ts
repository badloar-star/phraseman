// home_trial_row_dismiss.ts — отклонение строки «Попробуй Plus бесплатно» (✕): когда нажали, хранится локально, ключ привязан к аккаунту.
// зачем (владелец 29.10: «можно отклонить — оно заменится опросом»): без Firebase, одна запись AsyncStorage; возврат через HOME_TRIAL_ROW_DISMISS_MS решает home_trial_row.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'home_trial_row_dismissed_at_v1:';

export const homeTrialRowDismissKey = (accountId: string): string => KEY_PREFIX + accountId;

export async function loadHomeTrialRowDismissedAt(accountId: string | null): Promise<number | null> {
  if (!accountId) return null;
  try {
    const raw = await AsyncStorage.getItem(homeTrialRowDismissKey(accountId));
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch (error) {
    console.warn('[TRIAL-ROW] dismiss read failed', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/** Пишет отметку; false — запись не удалась (экран уже скрыл строку локально, отметка пропадёт после перезапуска). */
export async function saveHomeTrialRowDismissedAt(accountId: string | null, atMs: number): Promise<boolean> {
  if (!accountId) return false;
  try {
    await AsyncStorage.setItem(homeTrialRowDismissKey(accountId), String(atMs));
    return true;
  } catch (error) {
    console.warn('[TRIAL-ROW] dismiss write failed', error instanceof Error ? error.message : String(error));
    return false;
  }
}
