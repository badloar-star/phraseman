import fs from 'node:fs';
import path from 'node:path';

import { getQuizPhrasesLoaded } from '../app/quiz_phrases_loader';
import { getThematicQuizPhrases } from '../app/quiz_thematic_registry';
import { getQuizPhrases, validateQuizDataPools, type QuizDifficulty } from '../app/quiz_data';

const difficulties: QuizDifficulty[] = ['easy', 'medium', 'hard'];

describe('quiz pools availability without masking fallbacks', () => {
  it('keeps bundled standard quiz data structurally valid', () => {
    const validation = validateQuizDataPools();

    expect(validation).toMatchObject({ ok: true });
    expect(validation.counts.easy).toBeGreaterThanOrEqual(10);
    expect(validation.counts.medium).toBeGreaterThanOrEqual(10);
    expect(validation.counts.hard).toBeGreaterThanOrEqual(10);
  });

  it('loads real standard quiz pools for supported study targets', () => {
    for (const studyTarget of ['en', 'es', undefined] as const) {
      for (const difficulty of difficulties) {
        const rows = getQuizPhrasesLoaded(difficulty, 10, 'ru', studyTarget);

        expect(rows).toHaveLength(10);
        expect(rows.every(row => row.quizItemType !== 'emergency_builtin')).toBe(true);
        expect(rows.every(row => Array.isArray(row.choices) && row.choices.length === 4)).toBe(true);
        expect(rows.every(row => row.correct !== undefined)).toBe(true);
      }
    }
  });

  it('keeps the May 18 classic quiz path independent from non-French study targets', () => {
    for (const difficulty of difficulties) {
      expect(getQuizPhrases(difficulty, 10, 'ru')).toHaveLength(10);
      expect(getQuizPhrases(difficulty, 10, 'ru', 'en')).toHaveLength(10);
      expect(getQuizPhrases(difficulty, 10, 'ru', 'es')).toHaveLength(10);
    }
  });

  it('does not crash or emit undefined questions when random sampling hits an edge index', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValueOnce(1);

    try {
      const rows = getQuizPhrasesLoaded('easy', 10, 'ru', 'en');

      expect(rows).toHaveLength(10);
      expect(rows.every(row => row && row.correct !== undefined)).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('loads real thematic quiz pools for supported study targets', () => {
    for (const studyTarget of ['en', 'es'] as const) {
      const rows = getThematicQuizPhrases('kitchen-and-cooking', {
        count: 10,
        sourceLocale: 'ru',
        studyTarget,
      });

      expect(rows).toHaveLength(10);
      expect(rows.every(row => row.quizItemType !== 'emergency_builtin')).toBe(true);
    }
  });

  it('keeps the kitchen thematic section available and backed by its own pool', () => {
    const rows = getThematicQuizPhrases('kitchen-and-cooking', {
      count: 10,
      sourceLocale: 'ru',
      studyTarget: 'en',
    });

    expect(rows).toHaveLength(10);
    expect(rows.every(row => row.quizItemType === 'skyler_thematic:kitchen-and-cooking')).toBe(true);
    expect(rows.every(row => row.questionId?.startsWith('kitchen-and-cooking-'))).toBe(true);
    expect(rows.every(row => Array.isArray(row.choices) && row.choices.length === 4)).toBe(true);
    expect(rows.every(row => row.correct !== undefined)).toBe(true);
  });

  it('does not crash or empty the kitchen thematic pool when random sampling hits an edge index', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValueOnce(1);

    try {
      const rows = getThematicQuizPhrases('kitchen-and-cooking', {
        count: 10,
        sourceLocale: 'ru',
        studyTarget: 'en',
      });

      expect(rows).toHaveLength(10);
      expect(rows.every(row => row && row.correct !== undefined)).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('keeps unsupported French quiz pools gated instead of silently substituting English questions', () => {
    for (const difficulty of difficulties) {
      expect(getQuizPhrasesLoaded(difficulty, 10, 'ru', 'fr')).toEqual([]);
      expect(getQuizPhrases(difficulty, 10, 'ru', 'fr')).toEqual([]);
    }
    expect(getThematicQuizPhrases('kitchen-and-cooking', { count: 10, sourceLocale: 'ru', studyTarget: 'fr' })).toEqual([]);
  });

  it('does not ship built-in emergency quiz questions that can hide broken pools', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'quizzes.tsx'), 'utf8');

    expect(source).not.toContain('EMERGENCY_QUIZ_PHRASES');
    expect(source).not.toContain('emergencyQuizPhrases');
    expect(source).not.toContain('emergency_builtin');
  });
});
