// Weekly Boons — «Идеальная неделя» (always-on модификатор perfect_week).
//
// Переиспользует существующий week_days_done (7 bool, ключ week_days_week_key,
// обновляется в hall_of_fame_utils при активности). Если все 7 дней закрыты и
// приз за эту неделю ещё не выдан — даём крупную награду через модал (раз/неделю).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodaysBoons } from './boon_engine';
import type { BoonReward } from './boon_rewards';

/** Крупный приз за полную неделю. */
export const PERFECT_WEEK_REWARD: BoonReward = { shards: 20 };

/** Ключ «приз за неделю X уже выдан» (значение = week_days_week_key). */
const PERFECT_WEEK_CLAIMED_KEY = 'boon_perfect_week_claimed_v1';

/** Чистая проверка: все 7 дней закрыты. */
export function isWeekComplete(weekDone: readonly boolean[] | null | undefined): boolean {
  return Array.isArray(weekDone) && weekDone.length === 7 && weekDone.every(Boolean);
}

/** Безопасный парс week_days_done из строки. */
export function parseWeekDone(raw: string | null | undefined): boolean[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length === 7) return arr.map((v) => v === true);
    return null;
  } catch {
    return null;
  }
}

/**
 * Право на приз идеальной недели: модификатор perfect_week включён, неделя полная,
 * и приз за ЭТУ неделю (weekKey) ещё не выдан. Читает только AsyncStorage.
 */
export async function checkPerfectWeekEligible(): Promise<boolean> {
  if (!getTodaysBoons().modifiers.includes('perfect_week')) return false;
  try {
    const [doneRaw, weekKey, claimedWeek] = await Promise.all([
      AsyncStorage.getItem('week_days_done'),
      AsyncStorage.getItem('week_days_week_key'),
      AsyncStorage.getItem(PERFECT_WEEK_CLAIMED_KEY),
    ]);
    if (!weekKey || claimedWeek === weekKey) return false;
    return isWeekComplete(parseWeekDone(doneRaw));
  } catch {
    return false;
  }
}

/** Пометить приз идеальной недели выданным за текущую неделю. */
export async function markPerfectWeekClaimed(): Promise<void> {
  try {
    const weekKey = await AsyncStorage.getItem('week_days_week_key');
    if (weekKey) await AsyncStorage.setItem(PERFECT_WEEK_CLAIMED_KEY, weekKey);
  } catch {
    // best-effort
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
