/**
 * Экзамен уровня для испанского, немецкого, французского и итальянского курсов на новом движке (владелец 11.11.2026).
 *
 * зачем: раньше эти четыре курса сдавали зачёт на старом экране с одним видом заданий, а новый движок считал язык английским.
 * Сторож держит на НАСТОЯЩИХ данных курсов: экзамен собирается на каждом уровне каждого языка; в нём 30 баллов и новые
 * механики; задания собраны из фраз СВОЕГО курса и своего уровня (ни одной английской); на каждое задание есть ровно
 * засчитываемый ответ; при интерфейсе на языке курса перевод не совпадает с самой фразой.
 * Сработал — чинить сборщик (app/level_exam_blueprint.ts → tileGapsOf), а не ослаблять сторожа.
 */
import { COURSE_LEVEL_RANGES, type CourseLevel } from '../app/course_levels';
import type { PersistedLevelExamAnswer } from '../app/level_exam_attempt_state';
import { AUTHORED_FORMATS } from '../app/level_exam_authored_bank';
import { buildLevelExamBlueprint, LEVEL_EXAM_V5_MIX } from '../app/level_exam_blueprint';
import { scoreLevelExam } from '../app/level_exam_scoring';
import type { LevelExamBlueprint, LevelExamExpandedTask, LevelExamStudyTarget, LevelExamTask } from '../app/level_exam_types';
import { getLessonData } from '../app/lesson_data_all';
import type { SourceLocale } from '../app/source_locales';
import type { ExpandedExercise, ExpandedResponse } from '../modules/expanded-formats/types';
import { isExpandedFormat } from '../modules/expanded-formats/types';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const TARGETS: Exclude<LevelExamStudyTarget, 'en'>[] = ['es', 'de', 'fr', 'it'];
const LEVELS: CourseLevel[] = ['A1', 'A2', 'B1', 'B2'];
const SEEDS = ['l-1', 'l-2', 'l-3'];

function keyResponse(exercise: ExpandedExercise): ExpandedResponse {
  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice': return { format: exercise.format, picked: exercise.key };
    case 'dialogue_order':
    case 'sentence_build_noise': return { format: exercise.format, order: [...exercise.key] };
    case 'word_repair': return { format: 'word_repair', wordIndex: exercise.key.word, replacementIndex: exercise.key.replacement };
    case 'multi_select': return { format: 'multi_select', picked: [...exercise.key] };
    case 'linked_gaps': return { format: 'linked_gaps', picked: [...exercise.key] };
    case 'typed_word':
    case 'sentence_transform': return { format: exercise.format, text: exercise.acceptedAnswers[0] };
    case 'classify_function': return { format: 'classify_function', assignments: [...exercise.key] };
    case 'reply_pairs': return { format: 'reply_pairs', pairs: [...exercise.key] };
    case 'remove_intruder': return { format: 'remove_intruder', removed: exercise.key };
  }
}

function isExpanded(task: LevelExamTask): task is LevelExamExpandedTask {
  return isExpandedFormat(task.format);
}

function perfectAnswers(blueprint: LevelExamBlueprint): Record<string, PersistedLevelExamAnswer> {
  const answers: Record<string, PersistedLevelExamAnswer> = {};
  for (const task of blueprint.tasks) {
    if (task.format === 'speed_match') {
      for (const pair of task.pairs) answers[pair.scoreUnitId] = { kind: 'speed_match', targetScoreUnitId: pair.scoreUnitId };
    } else if (isExpanded(task)) {
      answers[task.scoreUnitId] = { kind: 'expanded', response: keyResponse(task.exercise) };
    } else if (task.format === 'translate_build') {
      answers[task.scoreUnitId] = { kind: 'translate_build', tokenIds: [...task.correctTokenIds] };
    } else {
      answers[task.scoreUnitId] = { kind: 'choice', optionId: task.correctOptionId };
    }
  }
  return answers;
}

const build = (studyTarget: LevelExamStudyTarget, level: CourseLevel, seed: string, sourceLocale: SourceLocale = 'ru'): LevelExamBlueprint => (
  buildLevelExamBlueprint({ level, studyTarget, sourceLocale, seed })
);

function coursePhrases(studyTarget: LevelExamStudyTarget, level: CourseLevel): Set<string> {
  const [from, to] = COURSE_LEVEL_RANGES[level];
  const phrases = new Set<string>();
  for (let lessonId = from; lessonId <= to; lessonId += 1) {
    for (const phrase of getLessonData(lessonId, studyTarget)) phrases.add(phrase.english.trim());
  }
  return phrases;
}

describe.each(TARGETS)('экзамен уровня, курс %s', (studyTarget) => {
  describe.each(LEVELS)('уровень %s', (level) => {
    const blueprints = SEEDS.map((seed) => build(studyTarget, level, seed));

    it('собирается: версия 5, язык курса, 30 баллов, порог своего уровня', () => {
      for (const blueprint of blueprints) {
        expect(blueprint.version).toBe(5);
        expect(blueprint.studyTarget).toBe(studyTarget);
        expect(blueprint.scoredUnitIds).toHaveLength(30);
        expect(new Set(blueprint.scoredUnitIds).size).toBe(30);
        expect(blueprint.passScore).toBe({ A1: 21, A2: 21, B1: 22, B2: 23 }[level]);
      }
    });

    it('безошибочные ответы дают 30 из 30', () => {
      for (const blueprint of blueprints) {
        expect(scoreLevelExam(blueprint, perfectAnswers(blueprint), 'submitted').score).toBe(30);
      }
    });

    it('новых механик столько, сколько задано составом уровня', () => {
      const mix = LEVEL_EXAM_V5_MIX[level];
      const expected = [...mix.expanded, ...mix.authored].reduce((sum, [, count]) => sum + count, 0);
      for (const blueprint of blueprints) expect(blueprint.tasks.filter(isExpanded)).toHaveLength(expected);
    });

    it('диалоги и тексты берутся из банка своего курса — все пять механик на месте, без подмены', () => {
      for (const blueprint of blueprints) {
        const formats = blueprint.tasks.map((task) => task.format);
        for (const [format, count] of LEVEL_EXAM_V5_MIX[level].authored) {
          expect([blueprint.seed, format, formats.filter((value) => value === format).length]).toEqual([blueprint.seed, format, count]);
        }
      }
    });

    it('каждое задание — из фразы своего курса и своего уровня', () => {
      const [from, to] = COURSE_LEVEL_RANGES[level];
      const phrases = coursePhrases(studyTarget, level);
      for (const blueprint of blueprints) {
        for (const task of blueprint.tasks) {
          if (task.format === 'speed_match') {
            for (const pair of task.pairs) expect([pair.scoreUnitId, phrases.has(pair.target)]).toEqual([pair.scoreUnitId, true]);
            continue;
          }
          expect(task.lessonId).toBeGreaterThanOrEqual(from);
          expect(task.lessonId).toBeLessThanOrEqual(to);
          // у задания из авторского банка фразы урока нет — его слова сверяет tests/level_exam_authored_bank.test.ts
          if ((AUTHORED_FORMATS as readonly string[]).includes(task.format)) continue;
          const phrase = task.explanation.split(' — ')[0];
          expect([task.id, phrases.has(phrase)]).toEqual([task.id, true]);
          expect(task.prompt.trim()).not.toBe('');
        }
      }
    });
  });

  it('набор прежней версии для этого курса не собирается — у него не было попыток старого движка', () => {
    expect(() => buildLevelExamBlueprint({ level: 'A1', studyTarget, sourceLocale: 'ru', seed: 'legacy', blueprintVersion: 4 }))
      .toThrow(`level_exam_version_unsupported:${studyTarget}:4`);
  });
});

describe('экзамен уровня, испанский курс при испанском интерфейсе', () => {
  it('перевод фразы не совпадает с самой фразой', () => {
    const blueprint = build('es', 'A1', 'same-language', 'es');
    const guesses = blueprint.tasks.filter((task) => task.format === 'guess_phrase');
    expect(guesses.length).toBeGreaterThan(0);
    for (const task of guesses) {
      if (task.format !== 'guess_phrase') continue;
      const correct = task.options.find((option) => option.id === task.correctOptionId);
      expect(correct).toBeDefined();
      expect(task.prompt.trim().toLocaleLowerCase()).not.toBe(correct?.text.trim().toLocaleLowerCase());
    }
  });
});
