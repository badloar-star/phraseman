jest.mock('../app/spanish_content_gate', () => ({
  spanishLessonUiStringsActive: (lang: string, studyTarget: string) =>
    lang === 'es',
}));

import { grammarHintLine, lessonEnergyMessages } from '../app/lesson_locale_utils';

describe('lesson_locale_utils', () => {
  const hint = {
    textRu: 'RU_ART',
    textUk: 'UK_ART',
    textEs: 'ES_ART',
  };

  describe('grammarHintLine', () => {
    it('returns Ukrainian for uk', () => {
      expect(grammarHintLine('uk', hint)).toBe('UK_ART');
    });
    it('returns Spanish for es UI while study target remains en', () => {
      expect(grammarHintLine('es', hint, 'en')).toBe('ES_ART');
      expect(grammarHintLine('es', hint, 'es')).toBe('ES_ART');
    });
    it('returns Russian for ru', () => {
      expect(grammarHintLine('ru', hint)).toBe('RU_ART');
    });
  });

  describe('lessonEnergyMessages', () => {
    it('returns non-empty pools for each locale', () => {
      expect(lessonEnergyMessages('ru').length).toBeGreaterThan(0);
      expect(lessonEnergyMessages('uk').length).toBeGreaterThan(0);
      expect(lessonEnergyMessages('es', 'en').length).toBeGreaterThan(0);
      expect(lessonEnergyMessages('es', 'es').length).toBeGreaterThan(0);
    });
    it('pools have equal length', () => {
      const n = lessonEnergyMessages('ru').length;
      expect(lessonEnergyMessages('uk').length).toBe(n);
      expect(lessonEnergyMessages('es', 'en').length).toBe(n);
      expect(lessonEnergyMessages('es', 'es').length).toBe(n);
    });
    it('includes time placeholder for interpolation', () => {
      const pool = lessonEnergyMessages('es', 'es');
      expect(pool.some((m) => m.includes('{time}'))).toBe(true);
    });
  });
});
