/**
 * after_win_upsell_gate.ts — анти-over-prompting гард для апсейла в момент успеха (план #3).
 *
 * Research предупреждает: показ апсейла после КАЖДОГО успеха → subscription fatigue,
 * падение retention, 1-star отзывы (Duolingo 7 промптов/сессия — антипример).
 * Поэтому показываем редко:
 *   - не premium;
 *   - не чаще раза в COOLDOWN;
 *   - не если сегодня уже показывали обычный пейвол (streak_paywall_shown).
 *
 * Гейт чистый и тестируемый: статус premium передаётся аргументом, не дёргается изнутри.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SHOWN_KEY = 'after_win_upsell_last_shown_v1';
/** 1.5 суток между показами after-win апсейла. */
export const AFTER_WIN_UPSELL_COOLDOWN_MS = 36 * 60 * 60 * 1000;

function todayKeyFor(nowMs: number): string {
  return new Date(nowMs).toISOString().split('T')[0]!;
}

export interface CanShowAfterWinParams {
  isPremium: boolean;
  nowMs: number;
}

export async function canShowAfterWinUpsell({ isPremium, nowMs }: CanShowAfterWinParams): Promise<boolean> {
  if (isPremium) return false;
  try {
    const [[, lastRaw], [, streakShown]] = await AsyncStorage.multiGet([
      LAST_SHOWN_KEY,
      'streak_paywall_shown',
    ]);
    const last = parseInt(lastRaw ?? '0', 10) || 0;
    if (nowMs - last < AFTER_WIN_UPSELL_COOLDOWN_MS) return false;
    if (streakShown && streakShown === todayKeyFor(nowMs)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function markAfterWinUpsellShown(nowMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SHOWN_KEY, String(nowMs));
  } catch {
    /* no-op */
  }
}
