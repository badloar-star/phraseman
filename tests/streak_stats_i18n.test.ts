/**
 * Подписи экрана статистики / цепочки дней.
 */
import type { Lang } from '../constants/i18n';
import {
  STREAK_CAL_WDAYS_ES,
  STREAK_CAL_WDAYS_ID,
  STREAK_CAL_WDAYS_PL,
  STREAK_CAL_WDAYS_PT_BR,
  STREAK_CAL_WDAYS_RU,
  STREAK_CAL_WDAYS_TR,
  STREAK_CAL_WDAYS_UK,
  STREAK_CAL_WDAYS_VI,
  STREAK_WAGER_TIER_DAYS_ES,
  STREAK_WAGER_TIER_DAYS_PT_BR,
  STREAK_WEEK_ROW_ES,
  STREAK_WEEK_ROW_ID,
  STREAK_WEEK_ROW_PL,
  STREAK_WEEK_ROW_PT_BR,
  STREAK_WEEK_ROW_RU,
  STREAK_WEEK_ROW_TR,
  STREAK_WEEK_ROW_VI,
  streakCalendarShortWeekdays,
  streakWagerTierDaysLabel,
  streakWeekRowShort,
} from '../constants/streak_stats_i18n';
import * as fs from 'fs';
import * as path from 'path';

describe('streakCalendarShortWeekdays', () => {
  it('keeps explicit locale abbreviations when report mode is enabled', () => {
    expect(streakCalendarShortWeekdays('pt-BR', true)).toStrictEqual(STREAK_CAL_WDAYS_PT_BR);
    expect(streakCalendarShortWeekdays('vi', true)).toStrictEqual(STREAK_CAL_WDAYS_VI);
  });

  it.each<[Lang, readonly string[]]>([
    ['ru', STREAK_CAL_WDAYS_RU],
    ['uk', STREAK_CAL_WDAYS_UK],
    ['es', STREAK_CAL_WDAYS_ES],
    ['pt-BR', STREAK_CAL_WDAYS_PT_BR],
    ['vi', STREAK_CAL_WDAYS_VI],
    ['id', STREAK_CAL_WDAYS_ID],
    ['tr', STREAK_CAL_WDAYS_TR],
    ['pl', STREAK_CAL_WDAYS_PL],
  ])('lang=%s maps to expected weekday abbreviations array', (lang, expected) => {
    expect(streakCalendarShortWeekdays(lang, false)).toStrictEqual(expected);
  });
});

describe('streakWeekRowShort', () => {
  it.each<[Lang, readonly string[]]>([
    ['ru', STREAK_WEEK_ROW_RU],
    ['uk', ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']],
    ['es', STREAK_WEEK_ROW_ES],
    ['pt-BR', STREAK_WEEK_ROW_PT_BR],
    ['vi', STREAK_WEEK_ROW_VI],
    ['id', STREAK_WEEK_ROW_ID],
    ['tr', STREAK_WEEK_ROW_TR],
    ['pl', STREAK_WEEK_ROW_PL],
  ])('lang=%s → Monday-first short row', (lang, expected) => {
    expect(streakWeekRowShort(lang)).toStrictEqual(expected);
  });
});

describe('streakWagerTierDaysLabel', () => {
  it.each<[Lang, number, string]>([
    ['ru', 0, '7 дней'],
    ['uk', 2, '21 день'],
    ['es', 5, '100 días'],
    ['pt-BR', 0, '7 dias'],
    ['vi', 1, '14 ngày'],
    ['id', 2, '21 hari'],
    ['tr', 3, '30 gün'],
    ['pl', 4, '50 dni'],
  ])('lang=%s tier %i → expected label', (lang, idx, expected) => {
    expect(streakWagerTierDaysLabel(lang, idx)).toBe(expected);
  });

  it('clamps tier index into 0..5', () => {
    expect(streakWagerTierDaysLabel('es', -99)).toBe(STREAK_WAGER_TIER_DAYS_ES[0]);
    expect(streakWagerTierDaysLabel('es', 999)).toBe(STREAK_WAGER_TIER_DAYS_ES[5]);
    expect(streakWagerTierDaysLabel('pt-BR', -99)).toBe(STREAK_WAGER_TIER_DAYS_PT_BR[0]);
  });

  it('does not route planned locale stats copy through legacy runtime markers', () => {
    const source = fs.readFileSync(path.join(__dirname, '../constants/streak_stats_i18n.ts'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
  });
});
