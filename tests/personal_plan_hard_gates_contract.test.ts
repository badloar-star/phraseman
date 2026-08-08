import type { PersonalPlanDefinition, PlanDay } from '../app/personal_plan_catalog';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import {
  buildPersonalPlanDayPassport,
  validatePersonalPlanDay,
} from '../app/personal_plan_quality';
import fs from 'fs';
import path from 'path';

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

    expect(expectedTaskIds).toHaveLength(8);
    ([5, 10, 15, 20] as const).forEach((minutes) => {
      const visible = tasksForMinutes(day1, minutes);
      expect(visible.every((task) => task.requiredFor.includes(minutes))).toBe(true);
      expect(visible.some((task) => task.kind === 'plan_quiz')).toBe(false);
    });
    expect(tasksForMinutes(day1, 5)).toEqual([]);
  });

  it('opens linked lesson slices with exact plan scope instead of a generic lesson', () => {
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

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/lesson_menu',
      params: expect.objectContaining({
        id: '1',
        lessonShellMode: 'linked_lesson_slice',
        planPracticeMode: 'linked_lesson',
        planTask: '1',
        planTaskId: task.id,
        planInstanceId: 'plan-instance-1',
        requiredPhrases: '2',
        requiredPhraseIds: 'lesson1_phrase_1,lesson1_phrase_7',
      }),
    });
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
      pathname: '/personal_plan_quiz',
      params: expect.objectContaining({
        planQuizId: 'gavan_day1_short_replies_quiz',
        planTaskId: 'gavan-d1-quiz',
        planInstanceId: 'plan-instance-1',
        planId: 'gavan',
        planDayIndex: '1',
      }),
    }));
  });

  it('keeps the historical quiz plan-only and leaves the retired standalone route absent', () => {
    expect(day1.tasks.some((task) => task.destination.type === 'quiz')).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'app', 'quizzes_screen.tsx'))).toBe(false);

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
