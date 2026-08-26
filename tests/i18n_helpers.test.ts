jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  SPANISH_UI_LOCALE_ENABLED: true,
  ENGLISH_UI_LOCALE_ENABLED: false,
}));

import {
  bundleLang,
  coerceInterfaceLang,
  INTERFACE_LANGUAGE_OPTIONS,
  isInterfaceLangEnabled,
  legacyRuUk,
  triLang,
} from '../constants/i18n';
import fs from 'node:fs';
import path from 'node:path';

describe('i18n helpers', () => {
  it('keeps prepared English streak copy staged outside the active Lang contract', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'constants', 'streak_stats_i18n.ts'), 'utf8');
    expect(source).toContain("type StagedStreakCopy<T> = Record<Lang, T> & { en: T };");
    expect(source).not.toContain('const STREAK_WEEKLY_TIME_MINUTES_HINT_BY_LANG: Record<Lang, string>');
  });
  describe('legacyRuUk', () => {
    it('maps ru, uk, es to themselves', () => {
      expect(legacyRuUk('ru')).toBe('ru');
      expect(legacyRuUk('uk')).toBe('uk');
      expect(legacyRuUk('es')).toBe('es');
    });
  });

  describe('bundleLang', () => {
    it('matches legacyRuUk for supported langs', () => {
      expect(bundleLang('ru')).toBe(legacyRuUk('ru'));
      expect(bundleLang('uk')).toBe(legacyRuUk('uk'));
      expect(bundleLang('es')).toBe(legacyRuUk('es'));
    });
  });

  describe('Spanish UI contract (когда флаг включён)', () => {
    // Этот файл форсит SPANISH_UI_LOCALE_ENABLED: true, поэтому проверяет
    // логику хелперов при включённом es. В проде флаг = false (см.
    // interface_language_options_prod.test.ts).
    it('treats es as enabled when the flag is on', () => {
      expect(isInterfaceLangEnabled('es')).toBe(true);
      expect(coerceInterfaceLang('es')).toBe('es');
      expect(coerceInterfaceLang('fr')).toBeNull();
    });
  });

describe('Heisenberg interface languages — готовы к UI и выбираемы', () => {
    it('dev-опции перечисляют 9 кодов, включая English UI', () => {
      expect(INTERFACE_LANGUAGE_OPTIONS.map((option) => option.code)).toEqual([
        'ru',
        'uk',
        'en',
        'es',
        'pt-BR',
        'vi',
        'id',
        'tr',
        'pl',
      ]);
    });

  it('pt-BR/vi/id/tr/pl включены и выбираемы', () => {
    for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(isInterfaceLangEnabled(lang)).toBe(true);
      expect(coerceInterfaceLang(lang)).toBe(lang);
      }
    });

    it('returns Heisenberg locale copy from triLang (хелпер не фильтрует)', () => {
      const copy = {
        ru: 'RU',
        uk: 'UK',
        es: 'ES',
        'pt-BR': 'PT',
        vi: 'VI',
        id: 'ID',
        tr: 'TR',
        pl: 'PL',
      };

      expect(triLang('ru', copy)).toBe('RU');
      expect(triLang('uk', copy)).toBe('UK');
      expect(triLang('es', copy)).toBe('ES');
      expect(triLang('pt-BR', copy)).toBe('PT');
      expect(triLang('vi', copy)).toBe('VI');
      expect(triLang('id', copy)).toBe('ID');
      expect(triLang('tr', copy)).toBe('TR');
      expect(triLang('pl', copy)).toBe('PL');
    });

  });
});
