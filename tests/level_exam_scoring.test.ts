import { buildLevelExamBlueprint } from '../app/level_exam_blueprint';
import {
  scoreLevelExam,
  type LevelExamAnswers,
} from '../app/level_exam_scoring';

const BLUEPRINT = buildLevelExamBlueprint({
  level: 'A1',
  studyTarget: 'en',
  sourceLocale: 'ru',
  seed: 'scoring-contract',
});

function correctAnswers(): LevelExamAnswers {
  const answers: LevelExamAnswers = {};
  for (const task of BLUEPRINT.tasks) {
    if (task.format === 'speed_match') {
      for (const pair of task.pairs) {
        answers[pair.scoreUnitId] = {
          kind: 'speed_match',
          targetScoreUnitId: pair.scoreUnitId,
        };
      }
    } else if (task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity') {
      answers[task.scoreUnitId] = { kind: 'choice', optionId: task.correctOptionId };
    } else if (task.format === 'translate_build') {
      answers[task.scoreUnitId] = {
        kind: 'translate_build',
        tokenIds: [...task.correctTokenIds],
      };
    }
  }
  return answers;
}

function answersWithCorrectCount(count: number): LevelExamAnswers {
  const allCorrect = correctAnswers();
  return Object.fromEntries(BLUEPRINT.scoredUnitIds.map((scoreUnitId, index) => [
    scoreUnitId,
    index < count ? allCorrect[scoreUnitId] : { kind: 'skipped' },
  ]));
}

describe('level exam scoring', () => {
  test('scores the audited tournament-style formats as exactly 30 independent units', () => {
    const result = scoreLevelExam(BLUEPRINT, correctAnswers(), 'submitted');

    expect(result).toMatchObject({
      score: 30,
      total: 30,
      pct: 100,
      passed: true,
      neededForPass: 0,
      finishReason: 'submitted',
      medal: 'gold',
      baseXp: 100,
    });
    expect(result.byFormat).toEqual({
      guess_phrase: { correct: 6, total: 6 },
      fill_gap: { correct: 6, total: 6 },
      find_oddity: { correct: 6, total: 6 },
      translate_build: { correct: 6, total: 6 },
      speed_match: { correct: 6, total: 6 },
    });
    expect(result.byLesson.reduce((sum, lesson) => sum + lesson.total, 0)).toBe(30);
  });

  test('passes at 21 of 30 and fails at 20 of 30', () => {
    expect(scoreLevelExam(BLUEPRINT, answersWithCorrectCount(21), 'submitted'))
      .toMatchObject({ score: 21, pct: 70, passed: true, neededForPass: 0, medal: 'silver', baseXp: 85 });
    expect(scoreLevelExam(BLUEPRINT, answersWithCorrectCount(20), 'submitted'))
      .toMatchObject({ score: 20, pct: 67, passed: false, neededForPass: 1, medal: 'bronze', baseXp: 17 });
  });

  test('counts missing timeout answers as incorrect', () => {
    const result = scoreLevelExam(BLUEPRINT, {}, 'timeout');

    expect(result).toMatchObject({
      score: 0,
      total: 30,
      pct: 0,
      passed: false,
      neededForPass: 21,
      finishReason: 'timeout',
      medal: 'none',
      baseXp: 10,
    });
  });

  test('counts a recorded wrong speed-match pair as incorrect', () => {
    const answers = correctAnswers();
    const speedUnit = BLUEPRINT.tasks.find((task) => task.format === 'speed_match')!.pairs[0].scoreUnitId;
    const wrongTarget = BLUEPRINT.tasks.find((task) => task.format === 'speed_match')!.pairs[1].scoreUnitId;
    answers[speedUnit] = { kind: 'speed_match', targetScoreUnitId: wrongTarget };
    expect(scoreLevelExam(BLUEPRINT, answers, 'submitted')).toMatchObject({ score: 29, total: 30 });
  });

  test('accepts every authored fill-gap option when the source item is semantically open', () => {
    const task = BLUEPRINT.tasks.find((candidate) => candidate.format === 'fill_gap')!;
    if (task.format !== 'fill_gap' || !task.acceptedOptionIds || task.acceptedOptionIds.length < 2) return;
    const answers: LevelExamAnswers = {
      [task.scoreUnitId]: { kind: 'choice', optionId: task.acceptedOptionIds[1] },
    };
    expect(scoreLevelExam(BLUEPRINT, answers, 'submitted').score).toBe(1);
  });

  test('returns at most three weakest canonical lessons in deterministic order', () => {
    const result = scoreLevelExam(BLUEPRINT, answersWithCorrectCount(10), 'submitted');

    expect(result.weakLessons.length).toBeGreaterThan(0);
    expect(result.weakLessons.length).toBeLessThanOrEqual(3);
    for (const lesson of result.weakLessons) {
      expect(lesson.title.trim()).not.toBe('');
      expect(lesson.correct).toBeLessThan(lesson.total);
      expect(lesson.lessonId).toBeGreaterThanOrEqual(1);
      expect(lesson.lessonId).toBeLessThanOrEqual(8);
    }
    const sorted = [...result.weakLessons].sort((left, right) => {
      const accuracy = left.correct / left.total - right.correct / right.total;
      return accuracy || right.total - left.total || left.lessonId - right.lessonId;
    });
    expect(result.weakLessons).toEqual(sorted);
  });
});
