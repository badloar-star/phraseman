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
  STREAK_WEEK_ROW_ES,
  STREAK_WEEK_ROW_ID,
  STREAK_WEEK_ROW_PL,
  STREAK_WEEK_ROW_PT_BR,
  STREAK_WEEK_ROW_RU,
  STREAK_WEEK_ROW_TR,
  STREAK_WEEK_ROW_VI,
  streakCalendarShortWeekdays,
  streakProtectionStatusLabel,
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

describe('streak stats locale contract', () => {
  it('does not route planned locale stats copy through legacy runtime markers', () => {
    const source = fs.readFileSync(path.join(__dirname, '../constants/streak_stats_i18n.ts'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
  });
});

describe('streakProtectionStatusLabel', () => {
  const ALL_LANGS: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

  it('never falls back to the old robotic "доступна при риске" phrasing', () => {
    for (const lang of ALL_LANGS) {
      expect(streakProtectionStatusLabel(lang, false, true)).not.toMatch(/доступн.*риск/i);
    }
  });

  it('returns a distinct label for each of the 3 reachable states, per language', () => {
    for (const lang of ALL_LANGS) {
      const active = streakProtectionStatusLabel(lang, true, true);
      const atRisk = streakProtectionStatusLabel(lang, false, true);
      const safe = streakProtectionStatusLabel(lang, false, false);
      // freezeActive wins regardless of streakAtRisk.
      expect(streakProtectionStatusLabel(lang, true, false)).toBe(active);
      expect(new Set([active, atRisk, safe]).size).toBe(3);
      expect(active.length).toBeGreaterThan(0);
      expect(atRisk.length).toBeGreaterThan(0);
      expect(safe.length).toBeGreaterThan(0);
    }
  });

  it('ru: matches the exact natural-language copy for each state', () => {
    expect(streakProtectionStatusLabel('ru', true, true)).toBe('Серия под защитой сегодня');
    expect(streakProtectionStatusLabel('ru', false, true)).toBe('Серия под угрозой — можно защитить');
    expect(streakProtectionStatusLabel('ru', false, false)).toBe('Серия в безопасности');
  });
});
