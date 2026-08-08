import { COURSE_LEVEL_RANGES, COURSE_LEVELS } from '../app/course_levels';
import { buildLevelExamBlueprint } from '../app/level_exam_blueprint';
import { getLessonData } from '../app/lesson_data_all';
import type { LessonPhrase } from '../app/lesson_data_types';
import type { SourceLocale } from '../app/source_locales';

type FormatCounts = Record<
  'guess_phrase' | 'fill_gap' | 'find_oddity' | 'translate_build' | 'speed_match',
  number
>;

function countScoredFormats(
  blueprint: ReturnType<typeof buildLevelExamBlueprint>,
): FormatCounts {
  return blueprint.tasks.reduce<FormatCounts>((counts, task) => {
    if (task.format === 'speed_match') {
      counts.speed_match += task.pairs.length;
    } else {
      counts[task.format] += 1;
    }
    return counts;
  }, {
    guess_phrase: 0,
    fill_gap: 0,
    find_oddity: 0,
    translate_build: 0,
    speed_match: 0,
  });
}

function scoredReferences(
  blueprint: ReturnType<typeof buildLevelExamBlueprint>,
): { lessonId: number; phraseId: string }[] {
  return blueprint.tasks.flatMap((task) => (
    task.format === 'speed_match'
      ? task.pairs.map((pair) => ({ lessonId: pair.lessonId, phraseId: pair.phraseId }))
      : [{ lessonId: task.lessonId, phraseId: task.phraseId }]
  ));
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function canonicalSourceText(phrase: LessonPhrase, locale: SourceLocale): string {
  if (locale === 'ru') return phrase.russian;
  if (locale === 'uk') return phrase.ukrainian || phrase.russian;
  if (locale === 'es') return phrase.spanish || phrase.sourceLocales?.es || phrase.russian;
  return phrase.sourceLocales?.[locale] || '';
}

describe('level exam blueprint', () => {
  test.each(COURSE_LEVELS)('%s contains exactly 30 scored units in the approved format mix', (level) => {
    const blueprint = buildLevelExamBlueprint({
      level,
      studyTarget: 'en',
      sourceLocale: 'ru',
      seed: `contract-${level}`,
    });

    expect(blueprint.scoredUnitIds).toHaveLength(30);
    expect(new Set(blueprint.scoredUnitIds).size).toBe(30);
    expect(countScoredFormats(blueprint)).toEqual({
      guess_phrase: 6,
      fill_gap: 6,
      find_oddity: 6,
      translate_build: 6,
      speed_match: 6,
    });
  });

  test.each(COURSE_LEVELS)('%s covers every lesson at least twice using canonical phrase ids', (level) => {
    const blueprint = buildLevelExamBlueprint({
      level,
      studyTarget: 'en',
      sourceLocale: 'ru',
      seed: `coverage-${level}`,
    });
    const [from, to] = COURSE_LEVEL_RANGES[level];
    const references = scoredReferences(blueprint);

    for (let lessonId = from; lessonId <= to; lessonId += 1) {
      const lessonReferences = references.filter((reference) => reference.lessonId === lessonId);
      expect(lessonReferences.length).toBeGreaterThanOrEqual(2);
      const canonicalPhraseIds = new Set(getLessonData(lessonId).map((phrase) => String(phrase.id)));
      for (const reference of lessonReferences) {
        expect(canonicalPhraseIds).toContain(reference.phraseId);
      }
    }

    expect(references.every(({ lessonId }) => lessonId >= from && lessonId <= to)).toBe(true);
  });

  test.each([
    ['A1', 12 * 60_000],
    ['A2', 13 * 60_000],
    ['B1', 14 * 60_000],
    ['B2', 15 * 60_000],
  ] as const)('%s uses the approved whole-exam time budget', (level, durationMs) => {
    const blueprint = buildLevelExamBlueprint({
      level,
      studyTarget: 'en',
      sourceLocale: 'ru',
      seed: `duration-${level}`,
    });

    expect(blueprint.durationMs).toBe(durationMs);
    expect(blueprint.passScore).toBe(21);
  });

  test.each(COURSE_LEVELS)('%s is reproducible by seed and varies task order across seeds', (level) => {
    const common = { level, studyTarget: 'en' as const, sourceLocale: 'ru' as const };
    const first = buildLevelExamBlueprint({ ...common, seed: `seed-one-${level}` });
    const repeated = buildLevelExamBlueprint({ ...common, seed: `seed-one-${level}` });
    const second = buildLevelExamBlueprint({ ...common, seed: `seed-two-${level}` });

    expect(repeated).toEqual(first);
    const changedPositions = first.scoredUnitIds.filter(
      (scoreUnitId, index) => scoreUnitId !== second.scoredUnitIds[index],
    ).length;
    expect(changedPositions).toBeGreaterThanOrEqual(8);
  });

  test.each(['ru', 'uk', 'es'] as const)('%s uses complete canonical text and valid interactions', (sourceLocale) => {
    for (const level of COURSE_LEVELS) {
      const [from, to] = COURSE_LEVEL_RANGES[level];
      const canonicalPhrases = Array.from({ length: to - from + 1 }, (_, index) => from + index)
        .flatMap((lessonId) => getLessonData(lessonId));
      const canonicalEnglish = new Set(canonicalPhrases.map((phrase) => normalized(phrase.english)));
      const canonicalSource = new Set(canonicalPhrases
        .map((phrase) => normalized(canonicalSourceText(phrase, sourceLocale)))
        .filter(Boolean));
      const blueprint = buildLevelExamBlueprint({
        level,
        studyTarget: 'en',
        sourceLocale,
        seed: `content-${sourceLocale}-${level}`,
      });
      let shuffledBuilders = 0;

      for (const task of blueprint.tasks) {
        if (task.format === 'speed_match') {
          expect(new Set(task.pairs.map((pair) => normalized(pair.source))).size).toBe(6);
          expect(new Set(task.pairs.map((pair) => normalized(pair.target))).size).toBe(6);
          for (const pair of task.pairs) {
            expect(canonicalSource).toContain(normalized(pair.source));
            expect(canonicalEnglish).toContain(normalized(pair.target));
          }
          continue;
        }

        expect(task.prompt.trim()).not.toBe('');
        expect(task.explanation.trim()).not.toBe('');

        if (task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity') {
          expect(task.options).toHaveLength(4);
          expect(new Set(task.options.map((option) => normalized(option.text))).size).toBe(4);
          expect(task.options.filter((option) => option.id === task.correctOptionId)).toHaveLength(1);
          expect(task.options.some((option) => option.text.includes(':wrong-'))).toBe(false);
          if (task.format === 'guess_phrase') for (const option of task.options) expect(canonicalEnglish).toContain(normalized(option.text));
        } else if (task.format === 'translate_build') {
          expect(task.tokens.length).toBeGreaterThanOrEqual(2);
          expect(new Set(task.tokens.map((token) => token.id))).toEqual(new Set(task.correctTokenIds));
          if (task.tokens.map((token) => token.id).join('|') !== task.correctTokenIds.join('|')) {
            shuffledBuilders += 1;
          }
        }
      }

      expect(shuffledBuilders).toBeGreaterThanOrEqual(6);
    }
  });

  test.each(['pt-BR', 'vi', 'id', 'tr', 'pl'] as const)('%s fails closed instead of falling back to Russian', (sourceLocale) => {
    expect(() => buildLevelExamBlueprint({
      level: 'A1', studyTarget: 'en', sourceLocale, seed: `missing-${sourceLocale}`,
    })).toThrow(`level_exam_locale_content_missing:A1:${sourceLocale}`);
  });

  test.each(COURSE_LEVELS)('%s has unique tasks built only from canonical lesson content', (level) => {
    const blueprint = buildLevelExamBlueprint({
      level,
      studyTarget: 'en',
      sourceLocale: 'ru',
      seed: `integrity-${level}`,
    });
    expect(new Set(blueprint.tasks.map((task) => task.id)).size).toBe(blueprint.tasks.length);
    const promptAnswerPairs = new Set<string>();

    for (const task of blueprint.tasks) {
      if (task.format === 'speed_match') {
        for (const pair of task.pairs) {
          const key = `${normalized(pair.source)}|${normalized(pair.target)}`;
          expect(promptAnswerPairs.has(key)).toBe(false);
          promptAnswerPairs.add(key);
        }
        continue;
      }

      const canonical = getLessonData(task.lessonId)
        .find((phrase) => String(phrase.id) === task.phraseId);
      expect(canonical).toBeDefined();

      let answer = '';
      if (task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity') {
        answer = task.options.find((option) => option.id === task.correctOptionId)?.text || '';
      } else if (task.format === 'translate_build') {
        const tokenById = new Map(task.tokens.map((token) => [token.id, token.text]));
        answer = task.correctTokenIds.map((id) => tokenById.get(id)).join(' ');
        const canonicalWords = (canonical?.wordsEn?.length ? canonical.wordsEn : canonical?.words || [])
          .map((word) => word.text);
        expect(task.correctTokenIds.map((id) => tokenById.get(id))).toEqual(canonicalWords);
      }

      const key = `${normalized(task.prompt)}|${normalized(answer)}`;
      expect(promptAnswerPairs.has(key)).toBe(false);
      promptAnswerPairs.add(key);
    }
  });

  test.each(COURSE_LEVELS)('%s distributes correct choice positions across seeds', (level) => {
    const positions: number[] = [];
    for (let seedIndex = 0; seedIndex < 24; seedIndex += 1) {
      const blueprint = buildLevelExamBlueprint({
        level,
        studyTarget: 'en',
        sourceLocale: 'ru',
        seed: `position-${level}-${seedIndex}`,
      });
      for (const task of blueprint.tasks) {
        if (task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity') {
          positions.push(task.options.findIndex((option) => option.id === task.correctOptionId));
        }
      }
    }
    const counts = [0, 1, 2, 3].map((position) => positions.filter((value) => value === position).length);
    expect(counts.every((count) => count > 0)).toBe(true);
    expect(Math.max(...counts) / positions.length).toBeLessThanOrEqual(0.45);
  });
});
