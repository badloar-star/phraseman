import {
  grammarHintLine,
  phraseCardFace,
  lessonEnergyMessages,
} from '../app/lesson_locale_utils';

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
    it('returns Spanish for es', () => {
      expect(grammarHintLine('es', hint)).toBe('ES_ART');
    });
    it('returns Russian for ru', () => {
      expect(grammarHintLine('ru', hint)).toBe('RU_ART');
    });
  });

  const cardBase = {
    correctRu: 'cr',
    correctUk: 'cu',
    wrongRu: 'wr',
    wrongUk: 'wu',
    secretRu: 'sr',
    secretUk: 'su',
  };

  describe('phraseCardFace', () => {
    it('ru correct path', () => {
      expect(phraseCardFace('ru', cardBase, false)).toEqual({ main: 'cr', secret: 'sr' });
    });
    it('ru wrong path', () => {
      expect(phraseCardFace('ru', cardBase, true)).toEqual({ main: 'wr', secret: 'sr' });
    });
    it('uk prefers uk strings', () => {
      expect(phraseCardFace('uk', cardBase, false)).toEqual({ main: 'cu', secret: 'su' });
      expect(phraseCardFace('uk', cardBase, true)).toEqual({ main: 'wu', secret: 'su' });
    });
    it('uk falls back to ru when uk empty', () => {
      const c = { ...cardBase, correctUk: '', wrongUk: '', secretUk: '' };
      expect(phraseCardFace('uk', c, false)).toEqual({ main: 'cr', secret: 'sr' });
      expect(phraseCardFace('uk', c, true)).toEqual({ main: 'wr', secret: 'sr' });
    });
    it('es falls back to ru without Es fields', () => {
      expect(phraseCardFace('es', cardBase, false)).toEqual({ main: 'cr', secret: 'sr' });
      expect(phraseCardFace('es', cardBase, true)).toEqual({ main: 'wr', secret: 'sr' });
    });
    it('es uses Es overrides when present', () => {
      const c = {
        ...cardBase,
        correctEs: 'ce',
        wrongEs: 'we',
        secretEs: 'se',
      };
      expect(phraseCardFace('es', c, false)).toEqual({ main: 'ce', secret: 'se' });
      expect(phraseCardFace('es', c, true)).toEqual({ main: 'we', secret: 'se' });
    });
  });

  describe('lessonEnergyMessages', () => {
    it('returns non-empty pools for each locale', () => {
      expect(lessonEnergyMessages('ru').length).toBeGreaterThan(0);
      expect(lessonEnergyMessages('uk').length).toBeGreaterThan(0);
      expect(lessonEnergyMessages('es').length).toBeGreaterThan(0);
    });
    it('pools have equal length', () => {
      const n = lessonEnergyMessages('ru').length;
      expect(lessonEnergyMessages('uk').length).toBe(n);
      expect(lessonEnergyMessages('es').length).toBe(n);
    });
    it('includes time placeholder for interpolation', () => {
      const pool = lessonEnergyMessages('es');
      expect(pool.some((m) => m.includes('{time}'))).toBe(true);
    });
  });
});
