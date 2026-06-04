import type { PersonalPlanDefinition, PlanDay } from '../app/personal_plan_catalog';
import { PERSONAL_PLAN_CATALOG, tasksForMinutes } from '../app/personal_plan_catalog';
import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import {
  buildPersonalPlanDayPassport,
  validatePersonalPlanDay,
} from '../app/personal_plan_quality';

describe('personal plan hard gates contract', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
  const day1 = gavan.days[0];

  it('keeps certified Gavan day 1 behind a clean quality passport', () => {
    const passport = buildPersonalPlanDayPassport(gavan, day1);

    expect(day1.status).toBe('certified');
    expect(passport.ready).toBe(true);
    expect(passport.issues.map((issue) => issue.code)).not.toContain('scaffold_day');
  });

  it('keeps the four onboarding time choices as the only plan load slots', () => {
    expect(tasksForMinutes(day1, 5)).toHaveLength(1);
    expect(tasksForMinutes(day1, 10)).toHaveLength(2);
    expect(tasksForMinutes(day1, 15)).toHaveLength(3);
    expect(tasksForMinutes(day1, 20)).toHaveLength(4);
  });

  it('still passes exact required phrase ids into lesson routes when a day provides them', () => {
    const router = { push: jest.fn() } as any;
    const task = {
      ...day1.tasks[0],
      destination: {
        type: 'lesson' as const,
        lessonId: 1,
        requiredPhrases: 2,
        requiredPhraseIds: ['lesson1_phrase_1', 'lesson1_phrase_7'],
      },
    };

    openPersonalPlanTask(router, gavan, day1, task, 'plan-instance-1');

    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({
      pathname: '/lesson_menu',
      params: expect.objectContaining({
        planTask: '1',
        lessonShellMode: 'linked_lesson_slice',
        planPracticeMode: 'linked_lesson',
        planTaskId: task.id,
        planInstanceId: 'plan-instance-1',
        requiredPhraseIds: 'lesson1_phrase_1,lesson1_phrase_7',
      }),
    }));
  });

  it('opens plan quizzes through the dedicated quiz route with plan context', () => {
    const router = { push: jest.fn() } as any;
    const task = {
      ...day1.tasks[0],
      id: 'gavan-d1-quiz',
      kind: 'plan_quiz' as const,
      destination: {
        type: 'quiz' as const,
        quizId: 'gavan_day1_short_replies_quiz',
        questionCount: 10 as const,
        level: 'easy' as const,
      },
    };

    openPersonalPlanTask(router, gavan, day1, task, 'plan-instance-1');

    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({
      pathname: '/quizzes_screen',
      params: expect.objectContaining({
        planQuizId: 'gavan_day1_short_replies_quiz',
        planQuizLevel: 'easy',
        planTaskId: 'gavan-d1-quiz',
        planInstanceId: 'plan-instance-1',
        planId: 'gavan',
        planDayIndex: '1',
      }),
    }));
  });

  it('rejects certified days that do not provide real quiz content', () => {
    const certifiedWithoutQuiz: PlanDay = {
      ...day1,
      status: 'certified',
      tasks: day1.tasks.map((task) => task.destination.type === 'quiz'
        ? {
          ...task,
          destination: {
            type: 'quiz',
            quizId: 'missing_plan_quiz',
            questionCount: 10,
            level: 'easy',
          },
        }
        : task),
    };
    const issues = validatePersonalPlanDay(gavan as PersonalPlanDefinition, certifiedWithoutQuiz);

    expect(issues.map((issue) => issue.code)).toContain('missing_quiz');
  });

  it('rejects generated copy that still uses internal product words', () => {
    const badCopyDay: PlanDay = {
      ...day1,
      status: 'certified',
      title: 'DEV destination source',
    };

    const issues = validatePersonalPlanDay(gavan, badCopyDay);

    expect(issues.map((issue) => issue.code)).toContain('bad_copy');
  });
});
