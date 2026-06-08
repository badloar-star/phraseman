import { HEISENBERG_BATCH_SOURCE_LOCALES } from '../app/source_locales';
import {
  getQuizPoolAuditEntries,
  getQuizPhrases,
  validateQuizSourceLocaleCoverage,
  type QuizSourceLocale,
} from '../app/quiz_data';
import {
  getStructuredQuizSourceLocalePayload,
  QUIZ_SOURCE_LOCALE_PAYLOADS,
} from '../app/quiz_source_locale_payloads';

const NEW_BATCH_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly QuizSourceLocale[];
const MEDIUM_111_231 = Array.from({ length: 121 }, (_, index) => index + 111);
const HARD_1_100 = Array.from({ length: 100 }, (_, index) => index + 1);
const MOJIBAKE_OR_CYRILLIC_SOURCE_RE = /[А-Яа-яЁёІіЇїЄєҐґ]|Ð|Ñ|�/u;

describe('multi-source quiz locale payloads', () => {
  it('keeps the Heisenberg batch locales registered separately', () => {
    expect(HEISENBERG_BATCH_SOURCE_LOCALES).toEqual(['es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
  });

  it('has complete structured payloads for MEDIUM 111-231 in new source locales', () => {
    for (const ordinal of MEDIUM_111_231) {
      const payloadByLocale = QUIZ_SOURCE_LOCALE_PAYLOADS.medium?.[ordinal];
      expect(payloadByLocale).toBeDefined();

      const prompts = new Set<string>();
      for (const locale of NEW_BATCH_LOCALES) {
        const payload = getStructuredQuizSourceLocalePayload('medium', ordinal, locale);

        expect(payload?.prompt.trim()).toBeTruthy();
        expect(payload?.explanations).toHaveLength(4);
        expect(payload?.prompt).not.toMatch(MOJIBAKE_OR_CYRILLIC_SOURCE_RE);
        expect(payload?.explanations.some((line) => MOJIBAKE_OR_CYRILLIC_SOURCE_RE.test(line))).toBe(false);
        expect(prompts.has(payload!.prompt)).toBe(false);
        prompts.add(payload!.prompt);
      }
    }
  });

  it('has complete structured payloads for HARD 1-100 in new source locales', () => {
    for (const ordinal of HARD_1_100) {
      const payloadByLocale = QUIZ_SOURCE_LOCALE_PAYLOADS.hard?.[ordinal];
      expect(payloadByLocale).toBeDefined();

      const prompts = new Set<string>();
      for (const locale of NEW_BATCH_LOCALES) {
        const payload = getStructuredQuizSourceLocalePayload('hard', ordinal, locale);

        expect(payload?.prompt.trim()).toBeTruthy();
        expect(payload?.explanations).toHaveLength(4);
        expect(payload?.prompt).not.toMatch(MOJIBAKE_OR_CYRILLIC_SOURCE_RE);
        expect(payload?.explanations.some((line) => MOJIBAKE_OR_CYRILLIC_SOURCE_RE.test(line))).toBe(false);
        expect(prompts.has(payload!.prompt)).toBe(false);
        prompts.add(payload!.prompt);
      }
    }
  });

  it('validates MEDIUM 111-231 coverage per new source locale', () => {
    for (const locale of NEW_BATCH_LOCALES) {
      const result = validateQuizSourceLocaleCoverage('medium', locale, 111, 121);

      expect(result.issues).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it('validates HARD 1-100 coverage per new source locale', () => {
    for (const locale of NEW_BATCH_LOCALES) {
      const result = validateQuizSourceLocaleCoverage('hard', locale, 1, 100);

      expect(result.issues).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it('serves each source prompt while keeping English choices as the study target', () => {
    for (const locale of NEW_BATCH_LOCALES) {
      const phrases = getQuizPhrases('medium', 5000, locale);

      for (const ordinal of MEDIUM_111_231) {
        const payload = getStructuredQuizSourceLocalePayload('medium', ordinal, locale)!;
        const phrase = phrases.find((item) => item.sourceText === payload.prompt);

        expect(phrase).toBeDefined();
        expect(phrase!.sourceLocale).toBe(locale);
        expect(phrase!.sourceExplanations).toHaveLength(4);
        expect(phrase!.sourceText).not.toBe(phrase!.ru);
        expect(phrase!.sourceText).not.toBe(phrase!.uk);
        expect(phrase!.sourceText).not.toBe(phrase!.es);
        expect(phrase!.choices.every((choice) => /^[\x00-\x7F]+$/.test(choice))).toBe(true);
      }

      const hardPhrases = getQuizPhrases('hard', 5000, locale);
      for (const ordinal of HARD_1_100) {
        const payload = getStructuredQuizSourceLocalePayload('hard', ordinal, locale)!;
        const phrase = hardPhrases.find((item) => item.sourceText === payload.prompt);

        expect(phrase).toBeDefined();
        expect(phrase!.sourceLocale).toBe(locale);
        expect(phrase!.sourceExplanations).toHaveLength(4);
        expect(phrase!.sourceText).not.toBe(phrase!.ru);
        expect(phrase!.sourceText).not.toBe(phrase!.uk);
        expect(phrase!.sourceText).not.toBe(phrase!.es);
        expect(phrase!.choices.every((choice) => /^[\x00-\x7F]+$/.test(choice))).toBe(true);
      }
    }
  });

  it('keeps planned quiz source runtime free of legacy fallback markers', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, '../app/quiz_data.ts'), 'utf8');

    expect(source).not.toContain('fallbackSourceText');
    expect(source).not.toContain('source fallback');
    expect(source).not.toContain('Spanish fallback');
    expect(source).not.toContain("_lang === 'uk'");
    expect(source).not.toContain("_lang === 'es'");

    for (const locale of NEW_BATCH_LOCALES) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const phrases = getQuizPhrases(difficulty, 5000, locale);
        expect(phrases.length).toBeGreaterThan(0);

        for (const phrase of phrases) {
          expect(phrase.sourceLocale).toBe(locale);
          expect(phrase.sourceText).toBeTruthy();
          expect(phrase.sourceText).not.toBe(phrase.ru);
          expect(phrase.sourceText).not.toBe(phrase.uk);
          expect(phrase.sourceText).not.toBe(phrase.es);
          expect(phrase.sourceExplanations).toHaveLength(4);
        }
      }
    }
  });

  it('keeps corrected hard quiz answer indexes aligned with their English target choices', () => {
    const hardEntries = getQuizPoolAuditEntries('hard');
    const expected = [
      {
        ru: `Хватит ходить вокруг да около`,
        correct: 2,
        choice: `Stop beating around the bush.`,
      },
      {
        ru: `Я редко видел такую изысканную красоту`,
        correct: 1,
        choice: `Seldom have I seen such exquisite beauty.`,
      },
      {
        ru: `Я настаиваю на том, чтобы он присутствовал на встрече`,
        correct: 2,
        choice: `I insist that he be present at the meeting.`,
      },
    ];

    for (const item of expected) {
      const entry = hardEntries.find((candidate) => candidate.ru === item.ru);

      expect(entry).toBeDefined();
      expect(entry!.correct).toBe(item.correct);
      expect(entry!.choices[item.correct]).toBe(item.choice);
      expect(entry!.explanations[item.correct]).toMatch(/Невероятно|блестяще|Блестяще/i);
    }
  });
});
