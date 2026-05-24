jest.mock('../app/spanish_content_gate', () => ({
  spanishLessonUiStringsActive: (lang: string, studyTarget: string) =>
    lang === 'es',
}));

import fs from 'fs';
import path from 'path';
import { grammarHintLine, lessonEnergyMessages } from '../app/lesson_locale_utils';

describe('lesson_locale_utils', () => {
  const hint = {
    textRu: 'RU_ART',
    textUk: 'UK_ART',
    textEs: 'ES_ART',
    textPtBr: 'PT_ART',
    textVi: 'VI_ART',
    textId: 'ID_ART',
    textTr: 'TR_ART',
    textPl: 'PL_ART',
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
    it('returns planned locale text without borrowing RU / UK / ES', () => {
      expect(grammarHintLine('pt-BR', hint)).toBe('PT_ART');
      expect(grammarHintLine('vi', hint)).toBe('VI_ART');
      expect(grammarHintLine('id', hint)).toBe('ID_ART');
      expect(grammarHintLine('tr', hint)).toBe('TR_ART');
      expect(grammarHintLine('pl', hint)).toBe('PL_ART');
    });
  });

  describe('lessonEnergyMessages', () => {
    it('returns non-empty pools for each locale', () => {
      for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        expect(lessonEnergyMessages(lang, 'en').length).toBeGreaterThan(0);
      }
    });
    it('pools have equal length', () => {
      const n = lessonEnergyMessages('ru').length;
      expect(lessonEnergyMessages('uk').length).toBe(n);
      expect(lessonEnergyMessages('es', 'en').length).toBe(n);
      expect(lessonEnergyMessages('es', 'es').length).toBe(n);
    });
    it('planned pools do not reuse RU / UK / ES energy copy', () => {
      const legacy = new Set([
        ...lessonEnergyMessages('ru'),
        ...lessonEnergyMessages('uk'),
        ...lessonEnergyMessages('es', 'en'),
      ]);
      for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        const pool = lessonEnergyMessages(lang, 'en');
        expect(pool.length).toBeGreaterThan(0);
        expect(pool.every((message) => !legacy.has(message))).toBe(true);
        expect(pool.some((message) => message.includes('{time}'))).toBe(true);
      }
    });
    it('includes time placeholder for interpolation', () => {
      const pool = lessonEnergyMessages('es', 'es');
      expect(pool.some((m) => m.includes('{time}'))).toBe(true);
    });
  });

  describe('source guards', () => {
    it('keeps lesson locale helpers from routing planned languages through legacy runtime branches', () => {
      const source = fs.readFileSync(path.join(__dirname, '../app/lesson_locale_utils.ts'), 'utf8');
      expect(source).not.toMatch(/lang\s*={2,3}\s*['"](?:ru|uk|es)['"]/);
      expect(source).not.toMatch(/return\s+ENERGY_MESSAGES_(?:RU|UK|ES)/);
    });

    it('keeps lesson 1 prompt from reading RU / UK / ES as planned-language copy', () => {
      const source = fs.readFileSync(path.join(__dirname, '../app/lesson1.tsx'), 'utf8');
      expect(source).toContain('phrasePromptForInterface(phrase, lang)');
      expect(source).not.toMatch(/if\s*\(\s*lang\s*={2,3}\s*['"](?:uk|es)['"]\s*\)\s*return\s*\(phrase\.(?:ukrainian|spanish|russian)/);
    });
  });
});
