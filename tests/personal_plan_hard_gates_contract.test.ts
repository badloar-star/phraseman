import type { PersonalPlanDefinition, PlanDay } from '../app/personal_plan_catalog';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
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

  it('keeps selected daily time as the initial slice while the full plan task list stays available', () => {
    const expectedTaskIds = allTasksForDay(day1).map((task) => task.id);

    expect(expectedTaskIds).toHaveLength(7);
    expect(tasksForMinutes(day1, 5).map((task) => task.id)).toEqual(expectedTaskIds.slice(0, 3));
    expect(tasksForMinutes(day1, 10).map((task) => task.id)).toEqual(expectedTaskIds.slice(0, 4));
    expect(tasksForMinutes(day1, 15).map((task) => task.id)).toEqual(expectedTaskIds.slice(0, 5));
    expect(tasksForMinutes(day1, 20).map((task) => task.id)).toEqual(expectedTaskIds.slice(0, 6));
  });

  it('does not open normal lesson routes from personal plan tasks', () => {
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

    expect(router.push).not.toHaveBeenCalled();
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

  it('does not require certified days to provide quiz content', () => {
    expect(day1.tasks.some((task) => task.destination.type === 'quiz')).toBe(false);

    const issues = validatePersonalPlanDay(gavan as PersonalPlanDefinition, {
      ...day1,
      status: 'certified',
    });

    expect(issues.map((issue) => issue.code)).not.toContain('missing_quiz');
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
