import { legacyRuUk, bundleLang } from '../constants/i18n';

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
});
