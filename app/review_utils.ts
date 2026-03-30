import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY_LAST_PROMPTED = 'review_prompted_at';
const KEY_SESSIONS      = 'app_session_count';
const COOLDOWN_DAYS     = 60;
const MIN_SESSIONS      = 3;

/** Увеличивает счётчик сессий. Вызывать при старте приложения. */
export const incrementSessionCount = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSIONS);
    const n = parseInt(raw || '0') + 1;
    await AsyncStorage.setItem(KEY_SESSIONS, String(n));
  } catch {}
};

/**
 * Проверяет, можно ли сейчас показывать запрос оценки.
 * Условия: >= MIN_SESSIONS сессий, прошло >= COOLDOWN_DAYS с последнего запроса.
 */
export const canShowReview = async (): Promise<boolean> => {
  try {
    const [sessRaw, lastRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_SESSIONS),
      AsyncStorage.getItem(KEY_LAST_PROMPTED),
    ]);
    const sessions = parseInt(sessRaw || '0');
    if (sessions < MIN_SESSIONS) return false;
    if (lastRaw) {
      const daysSince = (Date.now() - parseInt(lastRaw)) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) return false;
    }
    return true;
  } catch { return false; }
};

/** Отмечает что запрос был показан — сбрасывает кулдаун. */
export const markReviewPrompted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY_LAST_PROMPTED, String(Date.now()));
  } catch {}
};

/** Нативный запрос оценки (после того как пользователь согласился). */
export const requestNativeReview = async (): Promise<void> => {
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    }
  } catch {}
};
