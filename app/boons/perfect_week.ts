// Weekly Boons — «Идеальная неделя» (always-on модификатор perfect_week).
//
// Переиспользует существующий week_days_done (7 bool, ключ week_days_week_key,
// обновляется в hall_of_fame_utils при активности). Если все 7 дней закрыты и
// приз за эту неделю ещё не выдан — даём крупную награду через модал (раз/неделю).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodaysBoons } from './boon_engine';
import type { BoonReward } from './boon_rewards';
import { DebugLogger } from '../debug-logger';

/**
 * Приз за полную неделю (все 7 дней закрыты).
 *
 * зачем (владелец, 2026-08-26): было 5 жемчужин — заменены на спины, как
 * в «Сундуке недели» и «Дне возвращения»: жемчужина убрана из всех сундуков.
 * Два спина, а не один: полная неделя достаётся тяжелее случайного
 * сундука и не должна давать меньше него (тот же принцип, что и раньше).
 */
export const PERFECT_WEEK_REWARD: BoonReward = { shards: 0, spins: 2 };

/** Ключ «приз за неделю X уже выдан» (значение = week_days_week_key). */
export const PERFECT_WEEK_CLAIMED_KEY = 'boon_perfect_week_claimed_v1';

/**
 * Календарный день (локальный), в который пользователь ЗАВЕРШИЛ онбординг. Значение —
 * 'YYYY-MM-DD'. Ставится один раз, при первом наблюдении onboarding_done==='1' без
 * штампа. Нужен, чтобы НЕ показывать недельный бонус в день онбординга: новый юзер в
 * первый день видит только компас → подарок 3 дня, а недельный бонус — со 2-го дня.
 */
export const PERFECT_WEEK_ONBOARDING_DAY_KEY = 'perfect_week_onboarding_day_v1';

/** Локальный календарный день 'YYYY-MM-DD' для сравнения «тот же день / другой день». */
export function localDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

/** Завершён ли базовый онбординг ('1' = да; пишется в onboarding.tsx/auth_provider.ts). */
function isOnboardingDone(raw: string | null): boolean {
  return raw === '1';
}

/**
 * Чистое решение «можно ли показать недельный бонус». Вынесено для unit-тестов.
 *
 * Гейты по порядку:
 *   1) онбординг не завершён → нет (модал не лезет поверх ввода имени);
 *   2) сегодня — ДЕНЬ ОНБОРДИНГА (todayKey === onboardingDayKey) → нет: в первый день
 *      новый юзер видит только компас → подарок 3 дня; недельный бонус — со 2-го дня;
 *   3) нет weekKey ИЛИ приз за эту неделю уже выдан → нет;
 *   4) неделя полная (7×true) → да.
 */
export function decidePerfectWeekEligible(input: {
  onboardingDoneRaw: string | null;
  onboardingDayKey: string | null;
  todayKey: string;
  weekKey: string | null;
  claimedWeek: string | null;
  weekDoneRaw: string | null;
}): boolean {
  if (!isOnboardingDone(input.onboardingDoneRaw)) return false;
  // День онбординга: бонус не показываем (со 2-го календарного дня — можно).
  if (input.onboardingDayKey != null && input.onboardingDayKey === input.todayKey) return false;
  if (!input.weekKey || input.claimedWeek === input.weekKey) return false;
  return isWeekComplete(parseWeekDone(input.weekDoneRaw));
}

/**
 * Право на приз идеальной недели: модификатор perfect_week включён, онбординг завершён,
 * сегодня НЕ день онбординга, неделя полная, приз за ЭТУ неделю ещё не выдан.
 * Побочно: при первом наблюдении завершённого онбординга штампует день онбординга
 * (один раз), чтобы знать, какой календарный день считать «первым».
 */
export async function checkPerfectWeekEligible(nowMs: number = Date.now()): Promise<boolean> {
  if (!getTodaysBoons().modifiers.includes('perfect_week')) return false;
  try {
    const [doneRaw, weekKey, claimedWeek, onboardingDone, storedOnboardingDay] = await Promise.all([
      AsyncStorage.getItem('week_days_done'),
      AsyncStorage.getItem('week_days_week_key'),
      AsyncStorage.getItem(PERFECT_WEEK_CLAIMED_KEY),
      AsyncStorage.getItem('onboarding_done'),
      AsyncStorage.getItem(PERFECT_WEEK_ONBOARDING_DAY_KEY),
    ]);

    const todayKey = localDayKey(nowMs);
    // Штампуем день онбординга при первом наблюдении завершённого онбординга без штампа.
    // onboarding_done может выставляться разными путями (auth_provider / _layout), поэтому
    // ленивый штамп здесь надёжнее, чем привязка к одному месту записи.
    let onboardingDayKey = storedOnboardingDay;
    if (isOnboardingDone(onboardingDone) && onboardingDayKey == null) {
      onboardingDayKey = todayKey;
      await AsyncStorage.setItem(PERFECT_WEEK_ONBOARDING_DAY_KEY, onboardingDayKey).catch(() => {});
    }

    const eligible = decidePerfectWeekEligible({
      onboardingDoneRaw: onboardingDone,
      onboardingDayKey,
      todayKey,
      weekKey,
      claimedWeek,
      weekDoneRaw: doneRaw,
    });
    // AsyncStorage reads above can overlap a live admin disable. Re-check the
    // modifier immediately before returning a positive eligibility decision.
    return eligible && getTodaysBoons().modifiers.includes('perfect_week');
  } catch {
    return false;
  }
}

/** Пометить приз идеальной недели выданным за текущую неделю. */
export async function markPerfectWeekClaimed(): Promise<void> {
  try {
    const weekKey = await AsyncStorage.getItem('week_days_week_key');
    if (weekKey) await AsyncStorage.setItem(PERFECT_WEEK_CLAIMED_KEY, weekKey);
  } catch (e) {
      // best-effort
      DebugLogger.error('perfect_week:weekKey', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
