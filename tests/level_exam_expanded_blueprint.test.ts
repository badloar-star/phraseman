/**
 * Экзамен уровня, версия 5: двенадцать новых механик из фраз уроков (владелец 11.11.2026).
 *
 * зачем: владелец просил в экзаменах механики Пика, свою сложность на каждом уровне и только фразы из уроков.
 * Сторож держит на НАСТОЯЩИХ данных курса: 30 баллов на каждом уровне; задания новых видов собраны из фраз
 * уроков своего уровня; на каждое есть ровно тот ответ, который засчитывается; набор уровня отличается от соседних;
 * начатая до обновления попытка (версия 4) собирается прежним набором.
 * Сработал — чинить сборщик (app/level_exam_expanded_builder.ts) или состав (LEVEL_EXAM_V5_MIX), а не ослаблять сторожа.
 */
import { COURSE_LEVEL_RANGES, type CourseLevel } from '../app/course_levels';
import type { PersistedLevelExamAnswer } from '../app/level_exam_attempt_state';
import { AUTHORED_FORMATS } from '../app/level_exam_authored_bank';
import { buildLevelExamBlueprint, LEVEL_EXAM_V5_MIX } from '../app/level_exam_blueprint';
import { scoreLevelExam } from '../app/level_exam_scoring';
import type { LevelExamBlueprint, LevelExamExpandedTask, LevelExamTask } from '../app/level_exam_types';
import { getLessonData } from '../app/lesson_data_all';
import { emptyExpandedResponse, gradeExpanded, isExpandedResponseComplete } from '../modules/expanded-formats/grade';
import type { ExpandedExercise, ExpandedResponse } from '../modules/expanded-formats/types';
import { isExpandedFormat } from '../modules/expanded-formats/types';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const LEVELS: CourseLevel[] = ['A1', 'A2', 'B1', 'B2'];
const SEEDS = ['s-1', 's-2', 's-3', 's-4', 's-5', 's-6'];

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

const build = (level: CourseLevel, seed: string, blueprintVersion?: 3 | 4 | 5): LevelExamBlueprint => buildLevelExamBlueprint({
  level, studyTarget: 'en', sourceLocale: 'ru', seed, ...(blueprintVersion ? { blueprintVersion } : {}),
});

function lessonPhrases(level: CourseLevel): Set<string> {
  const [from, to] = COURSE_LEVEL_RANGES[level];
  const phrases = new Set<string>();
  for (let lessonId = from; lessonId <= to; lessonId += 1) {
    // зачем: с версии 5 экзамен читает те же фразы, что показывает урок (классический курс языка)
    for (const phrase of getLessonData(lessonId, 'en')) phrases.add(phrase.english.trim());
  }
  return phrases;
}

describe.each(LEVELS)('экзамен уровня %s, версия 5', (level) => {
  const blueprints = SEEDS.map((seed) => build(level, seed));

  it('30 баллов, версия 5, безошибочные ответы дают 30 из 30', () => {
    for (const blueprint of blueprints) {
      expect(blueprint.version).toBe(5);
      expect(blueprint.scoredUnitIds).toHaveLength(30);
      expect(new Set(blueprint.scoredUnitIds).size).toBe(30);
      expect(scoreLevelExam(blueprint, perfectAnswers(blueprint), 'submitted').score).toBe(30);
    }
  });

  it('пустые ответы на новые механики не засчитываются', () => {
    const blueprint = blueprints[0];
    const answers = perfectAnswers(blueprint);
    const expanded = blueprint.tasks.filter(isExpanded);
    for (const task of expanded) {
      const empty = emptyExpandedResponse(task.exercise);
      expect(isExpandedResponseComplete(task.exercise, empty)).toBe(false);
      answers[task.scoreUnitId] = { kind: 'expanded', response: empty };
    }
    expect(scoreLevelExam(blueprint, answers, 'submitted').score).toBe(30 - expanded.length);
  });

  it('новых заданий столько, сколько задано составом уровня, и классических — тоже', () => {
    const mix = LEVEL_EXAM_V5_MIX[level];
    const expandedTotal = [...mix.expanded, ...mix.authored].reduce((sum, [, count]) => sum + count, 0);
    for (const blueprint of blueprints) {
      expect(blueprint.tasks.filter(isExpanded)).toHaveLength(expandedTotal);
      for (const format of ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'] as const) {
        expect(blueprint.tasks.filter((task) => task.format === format)).toHaveLength(mix.classic[format]);
      }
    }
  });

  it('каждое новое задание — из урока своего уровня и держит его фразу', () => {
    const [from, to] = COURSE_LEVEL_RANGES[level];
    const phrases = lessonPhrases(level);
    for (const blueprint of blueprints) {
      for (const task of blueprint.tasks.filter(isExpanded)) {
        expect(task.lessonId).toBeGreaterThanOrEqual(from);
        expect(task.lessonId).toBeLessThanOrEqual(to);
        // у задания из авторского банка фразы урока нет — его слова сверяет tests/level_exam_authored_bank.test.ts
        if ((AUTHORED_FORMATS as readonly string[]).includes(task.format)) continue;
        const english = task.explanation.split(' — ')[0];
        expect([task.id, phrases.has(english)]).toEqual([task.id, true]);
        expect(task.instruction.length).toBeGreaterThan(0);
        expect(task.prompt.length).toBeGreaterThan(0);
        expect(gradeExpanded(task.exercise, keyResponse(task.exercise), 'en')).toBe(true);
      }
    }
  });

  it('порог сдачи растёт с уровнем: A1 и A2 — 21, B1 — 22, B2 — 23', () => {
    expect(blueprints[0].passScore).toBe({ A1: 21, A2: 21, B1: 22, B2: 23 }[level]);
  });

  it('у каждого задания есть подпись, фраза и разбор', () => {
    for (const blueprint of blueprints) {
      for (const task of blueprint.tasks) {
        if (task.format === 'speed_match') continue;
        expect([task.id, task.prompt.trim() !== '', task.explanation.trim() !== '']).toEqual([task.id, true, true]);
      }
    }
  });

  it('один сид даёт один и тот же экзамен', () => {
    expect(build(level, 'same')).toEqual(build(level, 'same'));
  });

  it('начатая до обновления попытка (версия 4) собирается прежним набором — без новых механик', () => {
    const legacy = build(level, 's-1', 4);
    expect(legacy.version).toBe(4);
    expect(legacy.tasks.some(isExpanded)).toBe(false);
    expect(scoreLevelExam(legacy, perfectAnswers(legacy), 'submitted').score).toBe(30);
  });
});

describe.each(LEVELS)('экзамен уровня %s, версия 5 — диалоги и тексты из авторского банка', (level) => {
  it('в каждой попытке есть все пять авторских механик, без подмены механиками из фраз', () => {
    for (const seed of SEEDS) {
      const formats = build(level, seed).tasks.map((task) => task.format);
      for (const [format, count] of LEVEL_EXAM_V5_MIX[level].authored) {
        expect([seed, format, formats.filter((value) => value === format).length]).toEqual([seed, format, count]);
      }
    }
  });
});

describe('экзамен уровня, версия 5 — сложность растёт', () => {
  it('ввод с клавиатуры есть только на B1 и B2, перевод целой фразы — только на B2', () => {
    const formatsOf = (level: CourseLevel): Set<string> => new Set(SEEDS.flatMap((seed) => build(level, seed).tasks.map((task) => task.format)));
    const typed = (formats: Set<string>): boolean => formats.has('typed_word') || formats.has('sentence_transform');
    expect(typed(formatsOf('A1'))).toBe(false);
    expect(typed(formatsOf('A2'))).toBe(false);
    expect(formatsOf('B1').has('typed_word')).toBe(true);
    expect(formatsOf('B2').has('typed_word')).toBe(true);
    expect(LEVEL_EXAM_V5_MIX.A1.expanded.some(([format]) => format === 'sentence_transform')).toBe(false);
    expect(LEVEL_EXAM_V5_MIX.B2.expanded.some(([format]) => format === 'sentence_transform')).toBe(true);
  });

  it('доля новых механик растёт от A1 к B2', () => {
    const share = (level: CourseLevel): number => [...LEVEL_EXAM_V5_MIX[level].expanded, ...LEVEL_EXAM_V5_MIX[level].authored].reduce((sum, [, count]) => sum + count, 0);
    expect(share('A1')).toBeLessThan(share('A2'));
    expect(share('A2')).toBeLessThan(share('B1'));
    expect(share('B1')).toBeLessThan(share('B2'));
  });
});
