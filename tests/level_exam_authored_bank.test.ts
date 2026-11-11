/**
 * Сторож авторского банка экзамена: «а нас такому не учили» быть не должно (владелец 11.11.2026).
 *
 * зачем: диалоги и короткие тексты для пяти механик написаны отдельно от уроков. Владелец разрешил это с условием —
 * только слова и грамматика, которые ученик уже разбирал. Сторож сверяет КАЖДОЕ слово каждого авторского задания
 * со словарём уроков 1..последний урок уровня (те же фразы, что показывает урок) и проверяет, что задание собирается
 * и на него есть ровно засчитываемый ответ.
 * Сработал — переписать задание словами пройденных уроков, а не расширять словарь и не ослаблять сторожа.
 */
import { COURSE_LEVEL_RANGES, type CourseLevel } from '../app/course_levels';
import {
  AUTHORED_FORMATS,
  authoredExamItems,
  authoredItemTexts,
  buildAuthoredExamDraft,
} from '../app/level_exam_authored_bank';
import { LEVEL_EXAM_V5_MIX } from '../app/level_exam_blueprint';
import { getLessonData } from '../app/lesson_data_all';
import { gradeExpanded } from '../modules/expanded-formats/grade';
import type { ExpandedExercise, ExpandedResponse } from '../modules/expanded-formats/types';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const TARGETS = ['en'] as const;
const LEVELS: CourseLevel[] = ['A1', 'A2', 'B1', 'B2'];

function tokens(text: string): string[] {
  return text.toLocaleLowerCase().replace(/[’`]/g, "'").split(/[\s/]+/u)
    .map((token) => token.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ''))
    .filter(Boolean);
}

function vocabulary(target: (typeof TARGETS)[number], level: CourseLevel): Set<string> {
  const [, toLesson] = COURSE_LEVEL_RANGES[level];
  const known = new Set<string>();
  for (let lessonId = 1; lessonId <= toLesson; lessonId += 1) {
    for (const phrase of getLessonData(lessonId, target)) {
      tokens(phrase.english).forEach((token) => known.add(token));
      for (const alternative of phrase.alternatives || []) tokens(alternative).forEach((token) => known.add(token));
      for (const word of phrase.words || []) tokens(word.text).forEach((token) => known.add(token));
    }
  }
  return known;
}

function keyResponse(exercise: ExpandedExercise): ExpandedResponse | null {
  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice': return { format: exercise.format, picked: exercise.key };
    case 'dialogue_order': return { format: 'dialogue_order', order: [...exercise.key] };
    case 'reply_pairs': return { format: 'reply_pairs', pairs: [...exercise.key] };
    case 'classify_function': return { format: 'classify_function', assignments: [...exercise.key] };
    default: return null;
  }
}

describe.each(TARGETS)('авторский банк экзамена, язык %s', (target) => {
  it('у английского A1 банк есть и покрывает состав экзамена с запасом', () => {
    const items = authoredExamItems(target, 'A1');
    for (const [format, count] of LEVEL_EXAM_V5_MIX.A1.authored) {
      // зачем: запас ×3 — чтобы две попытки подряд не показывали одно и то же задание
      expect(items.filter((item) => item.format === format).length).toBeGreaterThanOrEqual(count * 3);
    }
  });

  describe.each(LEVELS)('уровень %s', (level) => {
    const items = authoredExamItems(target, level);

    it('идентификаторы не повторяются, урок задания лежит в пределах пройденного', () => {
      const [, toLesson] = COURSE_LEVEL_RANGES[level];
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
      for (const item of items) {
        expect(AUTHORED_FORMATS).toContain(item.format);
        expect(item.lessonId).toBeGreaterThanOrEqual(1);
        expect(item.lessonId).toBeLessThanOrEqual(toLesson);
      }
    });

    it('каждое слово каждого задания встречалось в пройденных уроках', () => {
      const known = vocabulary(target, level);
      const unknown: string[] = [];
      for (const item of items) {
        for (const text of authoredItemTexts(item)) {
          for (const token of tokens(text)) {
            if (!known.has(token)) unknown.push(`${item.id}: «${token}» в «${text}»`);
          }
        }
      }
      expect(unknown).toEqual([]);
    });

    it('каждое задание собирается при любом сиде, и засчитывается ровно задуманный ответ', () => {
      for (const item of items) {
        for (const seed of ['a', 'b', 'c']) {
          const draft = buildAuthoredExamDraft(item, seed, 'ru');
          expect([item.id, draft !== null]).toEqual([item.id, true]);
          if (!draft) continue;
          const response = keyResponse(draft.exercise);
          expect(response).not.toBeNull();
          expect(gradeExpanded(draft.exercise, response as ExpandedResponse, target)).toBe(true);
          expect(draft.instruction.length).toBeGreaterThan(0);
          expect(draft.prompt.length).toBeGreaterThan(0);
        }
      }
    });

    it('в диалоге каждая реплика помечена говорящим и собеседники чередуются', () => {
      for (const item of items) {
        if (item.format !== 'dialogue_order') continue;
        expect(item.lines.map((line) => line.slice(0, 2))).toEqual(['A:', 'B:', 'A:', 'B:']);
      }
    });

    it('в парах и в выборе ответа тексты не повторяются', () => {
      for (const item of items) {
        if (item.format === 'reply_pairs') {
          expect(new Set(item.pairs.map(([question]) => question)).size).toBe(item.pairs.length);
          expect(new Set(item.pairs.map(([, reply]) => reply)).size).toBe(item.pairs.length);
        }
        if (item.format === 'context_choice') expect(new Set([item.right, ...item.wrong]).size).toBe(4);
        if (item.format === 'classify_function') expect(new Set(item.items.map(([, group]) => group)).size).toBe(2);
      }
    });
  });
});
