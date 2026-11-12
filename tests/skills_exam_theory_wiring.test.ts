/**
 * Очки навыков в экзаменах и теории урока (D207, владелец 11.11.2026; задача 12.11 «подключи exam_correct и theory_task»).
 *
 * зачем: таблица (modules/skills/skill_points_table.ts) обещает «Грамматику» +3 за верный ответ экзамена и +2 за задание
 * теории, но ни один экзамен и ни одна теория их не начисляли. Сторож держит:
 * — зачёт уровня: верные баллы считает та же проверка, что и итог экзамена (иначе очки и счёт разойдутся);
 * — экраны экзаменов объявляют занятие (useSkillSession), начисляют exam_correct и показывают «Навыки растут» на итоге;
 * — теория начисляет theory_task в момент, когда задание стало решённым.
 * Сработал — вернуть начисление, а не убирать проверку.
 */
import fs from 'fs';
import path from 'path';

import { buildLevelExamBlueprint } from '../app/level_exam_blueprint';
import { levelExamCorrectUnitIds, scoreLevelExam } from '../app/level_exam_scoring';
import type { LevelExamAnswers } from '../app/level_exam_scoring';
import type { LevelExamBlueprint } from '../app/level_exam_types';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// Ответы, верные на всех классических заданиях, и пустые на новых механиках и быстрых парах.
function classicOnlyAnswers(blueprint: LevelExamBlueprint): LevelExamAnswers {
  const answers: LevelExamAnswers = {};
  for (const task of blueprint.tasks) {
    if (task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity') {
      answers[task.scoreUnitId] = { kind: 'choice', optionId: task.correctOptionId };
    } else if (task.format === 'translate_build') {
      answers[task.scoreUnitId] = { kind: 'translate_build', tokenIds: [...task.correctTokenIds] };
    }
  }
  return answers;
}

describe('очки навыков: зачёт уровня', () => {
  it.each(['en', 'es'] as const)('верные баллы (%s) совпадают со счётом экзамена', (studyTarget) => {
    const blueprint = buildLevelExamBlueprint({ level: 'A1', studyTarget, sourceLocale: 'ru', seed: 'skills' });
    const answers = classicOnlyAnswers(blueprint);
    const ids = levelExamCorrectUnitIds(blueprint, answers);
    expect(ids.length).toBe(scoreLevelExam(blueprint, answers, 'submitted').score);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(blueprint.scoredUnitIds).toContain(id);
    expect(levelExamCorrectUnitIds(blueprint, {})).toEqual([]);
  });
});

describe('очки навыков: проводка экранов', () => {
  it('зачёт уровня объявляет занятие, начисляет exam_correct за верные баллы и показывает прирост на итоге', () => {
    const screen = read('components/level-exam/LevelExamV2.tsx');
    expect(screen).toContain('useSkillSession();');
    expect(screen).toMatch(/for \(const scoreUnitId of levelExamCorrectUnitIds\(sourceBlueprint, finishing\.answers\)\) \{\s*noteSkillAction\(\{ action: 'exam_correct'/);
    expect(read('components/level-exam/LevelExamResult.tsx')).toContain('<SkillsSessionGrowth');
  });

  it('итоговый экзамен объявляет занятие, начисляет exam_correct только за верный выбор и показывает прирост', () => {
    const screen = read('app/exam.tsx');
    expect(screen).toContain('useSkillSession();');
    expect(screen).toMatch(/if \(choices\[questionIndex\] === null \|\| choices\[questionIndex\] !== question\.correct\) return;[\s\S]{0,200}noteSkillAction\(\{ action: 'exam_correct'/);
    expect(screen).toContain('<SkillsSessionGrowth style={{ marginTop: 22 }} />');
  });

  it('теория начисляет theory_task при переходе задания в «решено», а не на каждый сигнал', () => {
    const view = read('components/theory/TheoryLessonView.tsx');
    expect(view).toMatch(/if \(isSolved\(state\) && !isSolved\(drillProgressRef\.current\[drillId\]\)\) \{\s*noteSkillAction\(\{ action: 'theory_task'/);
  });
});
