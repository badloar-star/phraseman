// Governance-ID: TG-927D1984D73B
import { COURSE_LEVEL_RANGES, COURSE_LEVELS } from '../app/course_levels';
import { buildLevelExamBlueprint } from '../app/level_exam_blueprint';
import { getLessonData } from '../app/lesson_data_all';
import type { SourceLocale } from '../app/source_locales';

// зачем (слово владельца af62e0821 через координатора, 05.11): в экзамене уровня — только слова и фразы из пройденных уроков.
// Сторож Ревизора меряет сырые соблазны в данных плиток; ЭТОТ тест меряет то, что экзамен реально ВЫДАЁТ.
const tokens = (value: string): string[] => value.toLocaleLowerCase().replace(/[’`]/g, "'").split(/[\s/]+/u)
  .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);

function vocabUpTo(toLesson: number): Set<string> {
  const set = new Set<string>();
  for (let lessonId = 1; lessonId <= toLesson; lessonId += 1) {
    for (const phrase of getLessonData(lessonId)) {
      tokens(phrase.english).forEach((token) => set.add(token));
      for (const alt of phrase.alternatives || []) tokens(alt).forEach((token) => set.add(token));
      for (const word of (phrase.wordsEn?.length ? phrase.wordsEn : phrase.words)) tokens(word.text).forEach((token) => set.add(token));
    }
  }
  return set;
}

const LOCALES: SourceLocale[] = ['ru', 'uk', 'es'];
const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

describe('экзамен уровня выдаёт только слова из пройденных уроков', () => {
  for (const level of COURSE_LEVELS) {
    const [fromLesson, toLesson] = COURSE_LEVEL_RANGES[level];
    const vocab = vocabUpTo(toLesson);
    test(`${level}: варианты fill_gap, плитки translate_build и фразы — внутри словаря уроков 1..${toLesson}`, () => {
      const outside: string[] = [];
      for (const sourceLocale of LOCALES) {
        for (const seed of SEEDS) {
          const blueprint = buildLevelExamBlueprint({ level, studyTarget: 'en', sourceLocale, seed });
          for (const task of blueprint.tasks) {
            if (task.format === 'speed_match') {
              for (const pair of task.pairs) {
                expect(pair.lessonId).toBeGreaterThanOrEqual(fromLesson);
                expect(pair.lessonId).toBeLessThanOrEqual(toLesson);
                tokens(pair.target).forEach((token) => { if (!vocab.has(token)) outside.push(`speed:${token}`); });
              }
              continue;
            }
            expect(task.lessonId).toBeGreaterThanOrEqual(fromLesson);
            expect(task.lessonId).toBeLessThanOrEqual(toLesson);
            if (task.format === 'translate_build') {
              for (const token of task.tokens) tokens(token.text).forEach((word) => { if (!vocab.has(word)) outside.push(`build:${word}`); });
            } else {
              for (const option of task.options) {
                // find_oddity: вариант = целая фраза с подменой слова; fill_gap: одно слово — проверяем все слова
                tokens(option.text).forEach((word) => { if (!vocab.has(word)) outside.push(`${task.format}:${word}`); });
              }
            }
          }
        }
      }
      expect([...new Set(outside)]).toEqual([]);
    });
  }
});
