import { HEISENBERG_BATCH_SOURCE_LOCALES } from '../app/source_locales';
import {
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
const BAD_SOURCE_RE = /[А-Яа-яЁёІіЇїЄєҐґ]|Ð|Ñ|�/u;

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
        expect(payload?.prompt).not.toMatch(BAD_SOURCE_RE);
        expect(payload?.explanations.some((line) => BAD_SOURCE_RE.test(line))).toBe(false);
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
        expect(payload?.prompt).not.toMatch(BAD_SOURCE_RE);
        expect(payload?.explanations.some((line) => BAD_SOURCE_RE.test(line))).toBe(false);
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
});
