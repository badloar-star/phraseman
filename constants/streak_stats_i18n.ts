/**
 * Локализованные подписи для экрана статистики / цепочки дней.
 */

import type { Lang } from './i18n';

/** Сокращения дня недели по d.getDay() (0 = вс). */
export const STREAK_CAL_WDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
export const STREAK_CAL_WDAYS_UK = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;
export const STREAK_CAL_WDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
export const STREAK_CAL_WDAYS_PT_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const STREAK_CAL_WDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
export const STREAK_CAL_WDAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;
export const STREAK_CAL_WDAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;
export const STREAK_CAL_WDAYS_PL = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'] as const;

/** Ряд «Пн…Вс» для карточки недели на экране. */
export const STREAK_WEEK_ROW_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
export const STREAK_WEEK_ROW_UK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const;
export const STREAK_WEEK_ROW_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
export const STREAK_WEEK_ROW_PT_BR = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
export const STREAK_WEEK_ROW_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
export const STREAK_WEEK_ROW_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
export const STREAK_WEEK_ROW_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;
export const STREAK_WEEK_ROW_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'] as const;

export const STREAK_WAGER_TIER_DAYS_RU = ['7 дней', '14 дней', '21 день', '30 дней', '50 дней', '100 дней'] as const;
export const STREAK_WAGER_TIER_DAYS_UK = ['7 днів', '14 днів', '21 день', '30 днів', '50 днів', '100 днів'] as const;
export const STREAK_WAGER_TIER_DAYS_ES = ['7 días', '14 días', '21 días', '30 días', '50 días', '100 días'] as const;
export const STREAK_WAGER_TIER_DAYS_PT_BR = ['7 dias', '14 dias', '21 dias', '30 dias', '50 dias', '100 dias'] as const;
export const STREAK_WAGER_TIER_DAYS_VI = ['7 ngày', '14 ngày', '21 ngày', '30 ngày', '50 ngày', '100 ngày'] as const;
export const STREAK_WAGER_TIER_DAYS_ID = ['7 hari', '14 hari', '21 hari', '30 hari', '50 hari', '100 hari'] as const;
export const STREAK_WAGER_TIER_DAYS_TR = ['7 gün', '14 gün', '21 gün', '30 gün', '50 gün', '100 gün'] as const;
export const STREAK_WAGER_TIER_DAYS_PL = ['7 dni', '14 dni', '21 dni', '30 dni', '50 dni', '100 dni'] as const;

export type StreakWagerTierIndex = 0 | 1 | 2 | 3 | 4 | 5;

const STREAK_CAL_WDAYS_BY_LANG: Record<Lang, readonly string[]> = {
  ru: STREAK_CAL_WDAYS_RU,
  uk: STREAK_CAL_WDAYS_UK,
  es: STREAK_CAL_WDAYS_ES,
  'pt-BR': STREAK_CAL_WDAYS_PT_BR,
  vi: STREAK_CAL_WDAYS_VI,
  id: STREAK_CAL_WDAYS_ID,
  tr: STREAK_CAL_WDAYS_TR,
  pl: STREAK_CAL_WDAYS_PL,
};

const STREAK_WEEK_ROW_BY_LANG: Record<Lang, readonly string[]> = {
  ru: STREAK_WEEK_ROW_RU,
  uk: STREAK_WEEK_ROW_UK,
  es: STREAK_WEEK_ROW_ES,
  'pt-BR': STREAK_WEEK_ROW_PT_BR,
  vi: STREAK_WEEK_ROW_VI,
  id: STREAK_WEEK_ROW_ID,
  tr: STREAK_WEEK_ROW_TR,
  pl: STREAK_WEEK_ROW_PL,
};

const STREAK_WAGER_TIER_DAYS_BY_LANG: Record<Lang, readonly string[]> = {
  ru: STREAK_WAGER_TIER_DAYS_RU,
  uk: STREAK_WAGER_TIER_DAYS_UK,
  es: STREAK_WAGER_TIER_DAYS_ES,
  'pt-BR': STREAK_WAGER_TIER_DAYS_PT_BR,
  vi: STREAK_WAGER_TIER_DAYS_VI,
  id: STREAK_WAGER_TIER_DAYS_ID,
  tr: STREAK_WAGER_TIER_DAYS_TR,
  pl: STREAK_WAGER_TIER_DAYS_PL,
};

export function streakCalendarShortWeekdays(
  lang: Lang,
  reportScreensRussianOnly: boolean,
): readonly string[] {
  void reportScreensRussianOnly;
  return STREAK_CAL_WDAYS_BY_LANG[lang];
}

export function streakWeekRowShort(lang: Lang): readonly string[] {
  return STREAK_WEEK_ROW_BY_LANG[lang];
}

/** Подпись срока тира ставки на цепочку (индекс 0..5 по WAGER_TIERS). */
export function streakWagerTierDaysLabel(lang: Lang, tierIdx: number): string {
  const i = Math.max(0, Math.min(5, Math.floor(tierIdx))) as StreakWagerTierIndex;
  return STREAK_WAGER_TIER_DAYS_BY_LANG[lang][i];
}
