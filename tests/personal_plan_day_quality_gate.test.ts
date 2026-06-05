import fs from 'fs';
import path from 'path';

import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import {
  buildPersonalPlanDayPassport,
  validatePersonalPlanDay,
} from '../app/personal_plan_quality';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan day quality gate', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1 = gavan.days[0];

  it('keeps certified Gavan day 1 behind the full runtime passport gate', () => {
    const passport = buildPersonalPlanDayPassport(gavan, day1);

    expect(passport.planId).toBe('gavan');
    expect(passport.dayIndex).toBe(1);
    expect(passport.ready).toBe(true);
    expect(passport.issues).toEqual([]);
    expect(passport.taskKinds).toEqual([
      'plan_phrase_lesson',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ]);
  });

  it('reports missing phrase lessons, missing quizzes, bad copy, and invalid order', () => {
    const brokenDay = {
      ...day1,
      focus: 'Сначала применяем конструкцию в маршруте.',
      tasks: [
        day1.tasks[1],
        day1.tasks[0],
        ...day1.tasks.slice(2).map((task, index) => {
          if (index === 1) {
            return {
              ...task,
              destination: { type: 'quiz', quizId: 'missing_quiz', questionCount: 10, level: 'easy' },
            } as any;
          }
          return task;
        }),
      ],
    };

    const issues = validatePersonalPlanDay(gavan, brokenDay as any);
    const codes = issues.map((issue) => issue.code);

    expect(codes).toEqual(expect.arrayContaining([
      'bad_copy',
      'invalid_task_order',
      'missing_quiz',
    ]));
  });

  it('reports missing phrase lesson content', () => {
    const brokenDay = {
      ...day1,
      tasks: day1.tasks.map((task, index) => index === 0
        ? {
          ...task,
          destination: { type: 'plan_phrase_lesson', lessonId: 'missing_phrase_lesson', requiredPhrases: 5, afterLessonId: 1 },
        } as any
        : task),
    };

    const issues = validatePersonalPlanDay(gavan, brokenDay as any);
    expect(issues.map((issue) => issue.code)).toContain('missing_phrase_lesson');
  });

  it('reports unsafe or empty missing-word plan exercises', () => {
    const brokenDay = {
      ...day1,
      tasks: day1.tasks.map((task) => task.kind === 'plan_missing_word'
        ? {
          ...task,
          destination: {
            type: 'plan_exercise',
            exerciseType: 'plan_missing_word',
            lessonId: 'gavan_day1_short_replies',
            contentUnitIds: ['missing_phrase_id'],
            requiredCorrect: 1,
          },
        } as any
        : task),
    };

    const issues = validatePersonalPlanDay(gavan, brokenDay as any);
    expect(issues.map((issue) => issue.code)).toContain('missing_word_option_count');
  });

  it('wires the passport into the DEV calendar surface', () => {
    const devSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_dev.tsx'), 'utf8');

    expect(devSource).toContain('buildPersonalPlanDayPassport');
    expect(devSource).toContain('selectedDayPassport');
    expect(devSource).toContain('dayPassport.ready');
    expect(devSource).toContain('issueCount');
    expect(devSource).toContain('getPersonalPlanTaskVisual');
    expect(devSource).toContain('styles.taskTimelineRow');
    expect(devSource).toContain('dev-task-art-${visual.artStyle}');
  });
});
