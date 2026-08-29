import type { Router } from 'expo-router';

import {
  type PersonalPlanDefinition,
  type PlanDailyTask,
  type PlanDay,
} from '../app/personal_plan_catalog';
import { openPersonalPlanTask } from '../app/personal_plan_navigation';

describe('personal plan task navigation', () => {
  test('opens a phrase lesson as the planned phrase-build activity', () => {
    const push = jest.fn();
    const router = { push, replace: jest.fn() } as unknown as Router;
    const plan = { id: 'gavan' } as PersonalPlanDefinition;
    const day = { dayIndex: 1 } as PlanDay;
    const task = {
      id: 'gavan_d001_phrase_build',
      destination: {
        type: 'plan_phrase_lesson',
        lessonId: 'gavan_day1_short_replies',
        requiredPhrases: 5,
        afterLessonId: 1,
      },
    } as PlanDailyTask;

    openPersonalPlanTask(router, plan, day, task, 'plan-instance-1');

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/personal_plan_exercise',
        params: expect.objectContaining({
          rendererType: 'plan_phrase_build',
          lessonId: 'gavan_day1_short_replies',
          planTaskId: 'gavan_d001_phrase_build',
          planInstanceId: 'plan-instance-1',
        }),
      }),
    );
  });
});
