/**
 * Подписи экрана статистики стрика — RU / UK / ES.
 */
import type { Lang } from '../constants/i18n';
import {
  STREAK_CAL_WDAYS_ES,
  STREAK_CAL_WDAYS_RU,
  STREAK_CAL_WDAYS_UK,
  STREAK_WAGER_TIER_DAYS_ES,
  STREAK_WEEK_ROW_ES,
  STREAK_WEEK_ROW_RU,
  streakCalendarShortWeekdays,
  streakWagerTierDaysLabel,
  streakWeekRowShort,
} from '../constants/streak_stats_i18n';

describe('streakCalendarShortWeekdays', () => {
  it('forces RU abbreviations when reportScreensRussianOnly regardless of Lang', () => {
    expect(streakCalendarShortWeekdays('es', true)).toStrictEqual(STREAK_CAL_WDAYS_RU);
  });

  it.each<[Lang, readonly string[]]>([
    ['ru', STREAK_CAL_WDAYS_RU],
    ['uk', STREAK_CAL_WDAYS_UK],
    ['es', STREAK_CAL_WDAYS_ES],
  ])('lang=%s maps to expected weekday abbreviations array', (lang, expected) => {
    expect(streakCalendarShortWeekdays(lang, false)).toStrictEqual(expected);
  });
});

describe('streakWeekRowShort', () => {
  it.each<[Lang, readonly string[]]>([
    ['ru', STREAK_WEEK_ROW_RU],
    ['uk', ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']],
    ['es', STREAK_WEEK_ROW_ES],
  ])('lang=%s → Monday-first short row', (lang, expected) => {
    expect(streakWeekRowShort(lang)).toStrictEqual(expected);
  });
});

describe('streakWagerTierDaysLabel', () => {
  it.each<[Lang, number, string]>([
    ['ru', 0, '7 дней'],
    ['uk', 2, '21 день'],
    ['es', 5, '100 días'],
  ])('lang=%s tier %i → expected label', (lang, idx, expected) => {
    expect(streakWagerTierDaysLabel(lang, idx)).toBe(expected);
  });

  it('clamps tier index into 0..5', () => {
    expect(streakWagerTierDaysLabel('es', -99)).toBe(STREAK_WAGER_TIER_DAYS_ES[0]);
    expect(streakWagerTierDaysLabel('es', 999)).toBe(STREAK_WAGER_TIER_DAYS_ES[5]);
  });
});
