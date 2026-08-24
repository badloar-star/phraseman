import {
  buildPersonalPlanCompletionSummary,
  createDefaultPersonalPlanState,
  isPersonalPlanFinished,
} from '../app/personal_plan_state';
import {
  PERSONAL_PLAN_CATALOG,
  tasksForMinutes,
} from '../app/personal_plan_catalog';
import { planTaskCompletionKey } from '../app/personal_plan_progress';
import { recommendNextPlanAfter } from '../app/personal_plan_recommendation';

const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;

function completedMapForDay(state: { planInstanceId: string; minutesPerDay: 5 | 10 | 15 | 20 }, dayIndex: number) {
  const day = gavan.days[dayIndex - 1];
  return Object.fromEntries(
    tasksForMinutes(day, state.minutesPerDay).map((task) => [
      planTaskCompletionKey(state.planInstanceId, task.id),
      { taskId: task.id, planId: 'gavan', planInstanceId: state.planInstanceId, dayIndex, completedAt: '2026-05-30T10:30:00.000Z' },
    ]),
  );
}

/** Все задания всех дней с 1 по untilDay — реалистичный «дошёл до конца» прогресс. */
function completedMapThroughDay(state: { planInstanceId: string; minutesPerDay: 5 | 10 | 15 | 20 }, untilDay: number) {
  let map: Record<string, unknown> = {};
  for (let day = 1; day <= untilDay; day += 1) {
    map = { ...map, ...completedMapForDay(state, day) };
  }
  return map;
}

const emptyDue = {
  duePracticeCount: 99,
  duePracticeWordCount: 99,
  dueTrainerCount: 99,
  duePlanTrainerWeakSpotCount: 99,
  dueFlashcardsCount: 99,
};

describe('isPersonalPlanFinished', () => {
  it('is false on the first day even when that day is done', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 });
    const completedTasks = completedMapForDay(state, 1);
    expect(isPersonalPlanFinished({ plan: gavan, state, completedTasks, ...emptyDue })).toBe(false);
  });

  it('is false on the last day when that day is NOT done', () => {
    const lastDay = gavan.days.length;
    const state = { ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: lastDay }), currentDayIndex: lastDay };
    expect(isPersonalPlanFinished({ plan: gavan, state, completedTasks: {}, ...emptyDue })).toBe(false);
  });

  it('is true on the last day when every day including the last is done', () => {
    const lastDay = gavan.days.length;
    const state = { ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: lastDay }), currentDayIndex: lastDay };
    const completedTasks = completedMapThroughDay(state, lastDay);
    expect(isPersonalPlanFinished({ plan: gavan, state, completedTasks, ...emptyDue })).toBe(true);
  });

  it('is false on the last day when an EARLIER day still has carryover', () => {
    const lastDay = gavan.days.length;
    const state = { ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: lastDay }), currentDayIndex: lastDay };
    // только последний день закрыт, прошлые — нет → перенос (carryover), не финиш
    const completedTasks = completedMapForDay(state, lastDay);
    expect(isPersonalPlanFinished({ plan: gavan, state, completedTasks, ...emptyDue })).toBe(false);
  });
});

describe('buildPersonalPlanCompletionSummary', () => {
  it('reports plan name, total days and counts only this instance tasks', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 });
    const completedTasks = {
      ...completedMapForDay(state, 1),
      // foreign-instance task must be ignored
      'other_instance::x': { taskId: 'x', planInstanceId: 'other_instance', dayIndex: 1, completedAt: '2026-05-01T00:00:00.000Z' },
    };
    const summary = buildPersonalPlanCompletionSummary(gavan, state, completedTasks);
    expect(summary.planId).toBe('gavan');
    expect(summary.planName).toBe(gavan.name);
    expect(summary.totalDays).toBe(gavan.days.length);
    expect(summary.completedTasks).toBe(Object.keys(completedMapForDay(state, 1)).length);
    expect(summary.activeDays).toBe(1);
  });
});

describe('recommendNextPlanAfter', () => {
  it('returns a different plan than the one completed', () => {
    for (const plan of PERSONAL_PLAN_CATALOG) {
      const next = recommendNextPlanAfter(plan.id);
      expect(next).not.toBe(plan.id);
      expect(PERSONAL_PLAN_CATALOG.map((p) => p.id)).toContain(next);
    }
  });

  it('cycles through all five plans without repeating until the loop closes', () => {
    const seen = new Set<string>();
    let current = 'voyazh' as ReturnType<typeof recommendNextPlanAfter>;
    for (let i = 0; i < PERSONAL_PLAN_CATALOG.length; i += 1) {
      seen.add(current);
      current = recommendNextPlanAfter(current);
    }
    expect(seen.size).toBe(PERSONAL_PLAN_CATALOG.length);
  });
});
