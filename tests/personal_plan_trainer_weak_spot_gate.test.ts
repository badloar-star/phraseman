import { openPersonalPlanTask, planTaskDestinationLabel } from '../app/personal_plan_navigation';
import { buildTodayPlanRuntime, type PersonalPlanState } from '../app/personal_plan_state';
import {
  PERSONAL_PLAN_TRAINER_WEAK_SPOT_MIN_ITEMS,
  resolvePersonalPlanTrainerWeakSpotReadiness,
} from '../app/personal_plan_trainer_weak_spot_gate';
import type { PersonalPlanDefinition, PlanDailyTask } from '../app/personal_plan_catalog';

const trainerTask: PlanDailyTask = {
  id: 'gavan_d003_trainer_weak_spot',
  kind: 'trainer_weak_spot',
  title: 'Разобрать слабое место',
  subtitle: 'Короткая тренировка только по ошибкам из маршрута.',
  minutes: 5,
  requiredFor: [5, 10, 15, 20],
  destination: {
    type: 'trainer',
    mode: 'weak',
    requiredItems: 1,
    planScoped: true,
  },
};

const plan: PersonalPlanDefinition = {
  id: 'gavan',
  name: 'Гавань',
  goal: 'Спокойно решать бытовые задачи.',
  horizonWeeks: 18,
  recommendedLevel: 'A2',
  minutesDefault: 15,
  accent: '#B9FF00',
  shortFocus: 'Бытовые ситуации',
  days: [{
    id: 'gavan-day-3',
    dayIndex: 3,
    weekIndex: 1,
    title: 'Повтор слабых мест',
    focus: 'Точечно закрепить ошибки',
    phraseGoal: 'Не повторять одну и ту же ошибку два раза подряд.',
    theory: 'Сначала смотрим только на реальные ошибки.',
    tasks: [trainerTask],
  }],
};

const state: PersonalPlanState = {
  id: 'gavan_state',
  planInstanceId: 'gavan_instance_1',
  planId: 'gavan',
  status: 'active',
  minutesPerDay: 15,
  currentDayIndex: 1,
  currentDayStartedAt: '2026-06-03T10:00:00.000Z',
  createdAt: '2026-06-03T10:00:00.000Z',
  activatedAt: '2026-06-03T10:00:00.000Z',
  updatedAt: '2026-06-03T10:00:00.000Z',
};

describe('trainer_weak_spot gate and route', () => {
  it('requires plan-scoped trainer material before showing the task', () => {
    expect(PERSONAL_PLAN_TRAINER_WEAK_SPOT_MIN_ITEMS).toBe(1);

    expect(resolvePersonalPlanTrainerWeakSpotReadiness({
      planWeakSpotDueCount: 0,
      generalTrainerDueCount: 12,
    })).toEqual(expect.objectContaining({
      status: 'blocked',
      reason: 'no_plan_weak_spots_due',
    }));

    expect(resolvePersonalPlanTrainerWeakSpotReadiness({
      planWeakSpotDueCount: 1,
      generalTrainerDueCount: 0,
    })).toEqual(expect.objectContaining({
      status: 'ready',
      reason: 'plan_weak_spots_due',
    }));
  });

  it('hides plan trainer tasks when only unrelated trainer material is due', () => {
    const hidden = buildTodayPlanRuntime({
      plan,
      state,
      completedTasks: {},
      duePracticeCount: 0,
      duePracticeWordCount: 0,
      dueTrainerCount: 8,
      duePlanTrainerWeakSpotCount: 0,
    });

    expect(hidden.tasks).toEqual([]);

    const visible = buildTodayPlanRuntime({
      plan,
      state,
      completedTasks: {},
      duePracticeCount: 0,
      duePracticeWordCount: 0,
      dueTrainerCount: 0,
      duePlanTrainerWeakSpotCount: 1,
    });

    expect(visible.tasks.map((task) => task.id)).toEqual(['gavan_d003_trainer_weak_spot']);
  });

  it('opens the plan trainer router with plan completion context', () => {
    const router = { push: jest.fn() };

    expect(planTaskDestinationLabel(trainerTask.destination)).toBe('Тренер · слабое место');

    openPersonalPlanTask(router as any, plan, plan.days[0], trainerTask, 'gavan_instance_1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/trainer_plan_session',
      params: {
        mode: 'weak',
        planTrainerTask: '1',
        requiredItems: '1',
        planTaskId: 'gavan_d003_trainer_weak_spot',
        planInstanceId: 'gavan_instance_1',
        planId: 'gavan',
        planDayIndex: '3',
      },
    });
  });
});
