/**
 * winback_offer.ts — возврат «спящих» пользователей (план #7).
 *
 * Education: 22% конверсий отложены на Day 1–31+ (RevenueCat SOSA 2026), поэтому
 * ретаргет вернувшихся особенно важен. Показываем winback-оффер (скидка через
 * отдельный RevenueCat offering) только тем, кто:
 *   - не premium;
 *   - отсутствовал WINBACK_INACTIVITY_MS+;
 *   - ещё не видел winback в этом окне неактивности.
 *
 * Скидка обесценивает цену, если давать всем → строго точечно по неактивности.
 * Гейт чистый: статус premium передаётся аргументом.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

const LAST_ACTIVE_KEY = 'winback_last_active_at_v1';
const WINBACK_SHOWN_AT_KEY = 'winback_shown_at_v1';

/** 7 дней неактивности до показа winback. */
export const WINBACK_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

export interface ShouldShowWinbackParams {
  isPremium: boolean;
  nowMs: number;
}

/** Фиксирует время последней активности (звать на app foreground). */
export async function recordLastActive(nowMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(nowMs));
  } catch (e) {
      // no-op
      DebugLogger.error('winback_offer:recordLastActive', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function shouldShowWinback({ isPremium, nowMs }: ShouldShowWinbackParams): Promise<boolean> {
  if (isPremium) return false;
  try {
    const [[, lastRaw], [, shownRaw]] = await AsyncStorage.multiGet([
      LAST_ACTIVE_KEY,
      WINBACK_SHOWN_AT_KEY,
    ]);
    const last = parseInt(lastRaw ?? '0', 10) || 0;
    if (!last) return false; // нет данных об активности — не навязываемся
    if (nowMs - last < WINBACK_INACTIVITY_MS) return false;

    // не показывать дважды в одном окне: если winback показывали ПОСЛЕ последней активности — стоп
    const shown = parseInt(shownRaw ?? '0', 10) || 0;
    if (shown > last) return false;

    return true;
  } catch {
    return false;
  }
}

export async function markWinbackShown(nowMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(WINBACK_SHOWN_AT_KEY, String(nowMs));
  } catch (e) {
      // no-op
      DebugLogger.error('winback_offer:markWinbackShown', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
