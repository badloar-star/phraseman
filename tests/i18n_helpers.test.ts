jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  SPANISH_UI_LOCALE_ENABLED: true,
}));

import {
  bundleLang,
  coerceInterfaceLang,
  INTERFACE_LANGUAGE_OPTIONS,
  isInterfaceLangEnabled,
  legacyRuUk,
  triLang,
} from '../constants/i18n';

describe('i18n helpers', () => {
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

  describe('Heisenberg interface languages — не готовы к UI, не выбираемы', () => {
    it('опции по-прежнему перечисляют все 8 кодов (фильтрация — на экране)', () => {
      expect(INTERFACE_LANGUAGE_OPTIONS.map((option) => option.code)).toEqual([
        'ru',
        'uk',
        'es',
        'pt-BR',
        'vi',
        'id',
        'tr',
        'pl',
      ]);
    });

    it('pt-BR/vi/id/tr/pl выключены и не выбираемы (planned)', () => {
      for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        expect(isInterfaceLangEnabled(lang)).toBe(false);
        expect(coerceInterfaceLang(lang)).toBeNull();
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
