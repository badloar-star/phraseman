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
  PLANNED_INTERFACE_LANGS,
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

  describe('production Spanish UI contract', () => {
    it('treats es as an enabled interface/source language', () => {
      expect(isInterfaceLangEnabled('es')).toBe(true);
      expect(coerceInterfaceLang('es')).toBe('es');
      expect(coerceInterfaceLang('fr')).toBeNull();
    });
  });

  describe('planned interface languages', () => {
    it('keeps future Heisenberg interface languages visible but not selectable yet', () => {
      expect(PLANNED_INTERFACE_LANGS).toEqual(['pt-BR', 'vi', 'id', 'tr', 'pl']);
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

      for (const lang of PLANNED_INTERFACE_LANGS) {
        expect(isInterfaceLangEnabled(lang)).toBe(false);
        expect(coerceInterfaceLang(lang)).toBeNull();
      }
    });

    it('lets triLang store planned locale copy without enabling those locales', () => {
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
      expect(coerceInterfaceLang('pt-BR')).toBeNull();
    });
  });
});
