import { openPersonalPlanTask, planTaskDestinationLabel } from '../app/personal_plan_navigation';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';
import {
  PERSONAL_PLAN_FLASHCARDS_REVIEW_MIN_CARDS,
  resolvePersonalPlanFlashcardsReviewReadiness,
} from '../app/personal_plan_flashcards_review_gate';
import {
  buildTodayPlanRuntime,
  createDefaultPersonalPlanState,
} from '../app/personal_plan_state';

describe('flashcards_plan_review gate and route', () => {
  it('requires real saved cards before showing card review inside a plan', () => {
    expect(PERSONAL_PLAN_FLASHCARDS_REVIEW_MIN_CARDS).toBe(3);

    expect(resolvePersonalPlanFlashcardsReviewReadiness({
      availableCardCount: 2,
    })).toEqual(expect.objectContaining({
      status: 'blocked',
      reason: 'not_enough_saved_cards',
      requiredCardCount: 3,
    }));

    expect(resolvePersonalPlanFlashcardsReviewReadiness({
      availableCardCount: 3,
    })).toEqual(expect.objectContaining({
      status: 'ready',
      reason: 'enough_saved_cards',
      requiredCardCount: 3,
    }));

    expect(resolvePersonalPlanFlashcardsReviewReadiness({
      availableCardCount: 4,
      requiredCardCount: 5,
    })).toEqual(expect.objectContaining({
      status: 'blocked',
      requiredCardCount: 5,
    }));
  });

  it('filters flashcard plan tasks from runtime when the user has no card material', () => {
    const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 20, startDayIndex: 1 });
    const day = {
      ...plan.days[0],
      tasks: [
        ...plan.days[0].tasks.slice(0, 3),
        {
          id: 'gavan_d001_flashcards',
          kind: 'flashcards_plan_review',
          title: 'Карточки на повтор',
          subtitle: 'Коротко возвращаем сохранённые фразы.',
          minutes: 4,
          requiredFor: [20],
          destination: {
            type: 'flashcards',
            deckId: 'saved:all',
            requiredCards: 3,
          },
        } satisfies PlanDailyTask,
      ],
    };
    const runtimePlan = {
      ...plan,
      days: [day, ...plan.days.slice(1)],
    };

    const hidden = buildTodayPlanRuntime({
      plan: runtimePlan,
      state,
      completedTasks: {},
      duePracticeCount: 0,
      dueTrainerCount: 0,
      dueFlashcardsCount: 2,
    });
    const visible = buildTodayPlanRuntime({
      plan: runtimePlan,
      state,
      completedTasks: {},
      duePracticeCount: 0,
      dueTrainerCount: 0,
      dueFlashcardsCount: 3,
    });

    expect(hidden.tasks.some((task) => task.kind === 'flashcards_plan_review')).toBe(false);
    expect(visible.tasks.some((task) => task.kind === 'flashcards_plan_review')).toBe(true);
  });

  it('opens the real swipe review with plan completion context and a strict card limit', () => {
    const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
    const day = plan.days[0];
    const task: PlanDailyTask = {
      id: 'gavan_d001_flashcards',
      kind: 'flashcards_plan_review',
      title: 'Карточки на повтор',
      subtitle: 'Коротко возвращаем сохранённые фразы.',
      minutes: 4,
      requiredFor: [20],
      destination: {
        type: 'flashcards',
        deckId: 'saved:all',
        requiredCards: 5,
      },
    };
    const router = { push: jest.fn() };

    expect(planTaskDestinationLabel(task.destination)).toBe('Карточки · 5');

    openPersonalPlanTask(router as any, plan, day, task, 'gavan-instance-1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/flashcards_swipe',
      params: {
        planFlashcardsTask: '1',
        source: 'saved:all',
        requiredCards: '5',
        planTaskId: 'gavan_d001_flashcards',
        planInstanceId: 'gavan-instance-1',
        planId: 'gavan',
        planDayIndex: '1',
      },
    });
  });
});
