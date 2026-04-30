/**
 * Локализованые подписи для экрана статистики / стрика (RU / UK / ES).
 */

import type { Lang } from './i18n';

/** Сокращения дня недели по d.getDay() (0 = вс). */
export const STREAK_CAL_WDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
export const STREAK_CAL_WDAYS_UK = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
export const STREAK_CAL_WDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

/** Ряд «Пн…Вс» для карточки недели на экране. */
export const STREAK_WEEK_ROW_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
export const STREAK_WEEK_ROW_UK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const;
export const STREAK_WEEK_ROW_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export const STREAK_WAGER_TIER_DAYS_RU = ['7 дней', '14 дней', '21 день', '30 дней', '50 дней', '100 дней'] as const;
export const STREAK_WAGER_TIER_DAYS_UK = ['7 днів', '14 днів', '21 день', '30 днів', '50 днів', '100 днів'] as const;
export const STREAK_WAGER_TIER_DAYS_ES = ['7 días', '14 días', '21 días', '30 días', '50 días', '100 días'] as const;

export type StreakWagerTierIndex = 0 | 1 | 2 | 3 | 4 | 5;

export function streakCalendarShortWeekdays(
  lang: Lang,
  reportScreensRussianOnly: boolean,
): readonly string[] {
  if (reportScreensRussianOnly) return STREAK_CAL_WDAYS_RU;
  if (lang === 'uk') return STREAK_CAL_WDAYS_UK;
  if (lang === 'es') return STREAK_CAL_WDAYS_ES;
  return STREAK_CAL_WDAYS_RU;
}

export function streakWeekRowShort(lang: Lang): readonly string[] {
  if (lang === 'uk') return STREAK_WEEK_ROW_UK;
  if (lang === 'es') return STREAK_WEEK_ROW_ES;
  return STREAK_WEEK_ROW_RU;
}

/** Подпись срока тира ставки на стрик (индекс 0..5 по WAGER_TIERS). */
export function streakWagerTierDaysLabel(lang: Lang, tierIdx: number): string {
  const i = Math.max(0, Math.min(5, Math.floor(tierIdx))) as StreakWagerTierIndex;
  if (lang === 'uk') return STREAK_WAGER_TIER_DAYS_UK[i];
  if (lang === 'es') return STREAK_WAGER_TIER_DAYS_ES[i];
  return STREAK_WAGER_TIER_DAYS_RU[i];
}
