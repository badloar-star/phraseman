import {
  buildPersonalPlanSnapshot,
  buildTodayPlanRuntime,
  createDefaultPersonalPlanState,
  advancePersonalPlanStateForToday,
  PERSONAL_PLAN_STATE_KEY,
} from '../app/personal_plan_state';
import {
  allTasksForDay,
  nextTaskAfterVisibleSlice,
  PERSONAL_PLAN_CATALOG,
  tasksForMinutes,
} from '../app/personal_plan_catalog';
import { planTaskCompletionKey } from '../app/personal_plan_progress';

describe('personal plan runtime state', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;

  it('creates a conservative active state for the selected plan and minutes', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 });

    expect(PERSONAL_PLAN_STATE_KEY).toBe('personal_plan_state_v1');
    expect(state.planInstanceId).toBe(state.id);
    expect(state.status).toBe('active');
    expect(state.planId).toBe('gavan');
    expect(state.minutesPerDay).toBe(15);
    expect(state.currentDayIndex).toBe(1);
    expect(state.createdAt).toEqual(expect.any(String));
    expect(state.activatedAt).toEqual(expect.any(String));
  });

  it('uses selected minutes for initial visible count while keeping the full daily pool available', () => {
    const day = gavan.days[0];

    expect(tasksForMinutes(day, 5)).toHaveLength(3);
    expect(tasksForMinutes(day, 10)).toHaveLength(4);
    expect(tasksForMinutes(day, 15)).toHaveLength(5);
    expect(tasksForMinutes(day, 20)).toHaveLength(6);
    expect(allTasksForDay(day).length).toBeGreaterThan(tasksForMinutes(day, 20).length);
    expect(nextTaskAfterVisibleSlice(day, 5, 0)?.id).toBe(allTasksForDay(day)[3].id);
    expect(nextTaskAfterVisibleSlice(day, 20, 99)).toBeNull();
  });

  it('keeps unfinished tasks first and does not advance the visible day until required work is complete', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 2 });
    const day1Tasks = tasksForMinutes(gavan.days[0], state.minutesPerDay).map((task) => task.id);
    const completed = {
      [planTaskCompletionKey(state.planInstanceId, day1Tasks[0])]: { taskId: day1Tasks[0], planId: 'gavan', dayIndex: 1, completedAt: '2026-05-01T10:00:00.000Z' },
    };

    const runtime = buildTodayPlanRuntime({
      plan: gavan,
      state,
      completedTasks: completed,
      duePracticeCount: 0,
      dueTrainerCount: 0,
    });

    expect(runtime.visibleDay.dayIndex).toBe(1);
    expect(runtime.isCarryover).toBe(true);
    expect(runtime.tasks.map((task) => task.id)).toEqual(day1Tasks.slice(1));
    expect(runtime.completedTodayCount).toBe(1);
    expect(runtime.requiredTodayCount).toBe(5);
  });

  it('uses the current day when there is no carryover and gates optional practice on real due material', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 20, startDayIndex: 2 });
    const day1Done = Object.fromEntries(tasksForMinutes(gavan.days[0], state.minutesPerDay).map((task) => [
      planTaskCompletionKey(state.planInstanceId, task.id),
      { taskId: task.id, planId: 'gavan', dayIndex: 1, completedAt: '2026-05-01T10:00:00.000Z' },
    ]));

    const runtime = buildTodayPlanRuntime({
      plan: gavan,
      state,
      completedTasks: day1Done,
      duePracticeCount: 0,
      dueTrainerCount: 0,
    });

    expect(runtime.visibleDay.dayIndex).toBe(2);
    expect(runtime.isCarryover).toBe(false);
    expect(runtime.tasks.every((task) => task.destination.type !== 'practice')).toBe(true);
    expect(runtime.tasks.every((task) => task.destination.type !== 'trainer')).toBe(true);
  });

  it('builds a home snapshot from actual completion data instead of a hardcoded percent', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 });
    const firstTwoTasks = gavan.days[0].tasks.slice(0, 2);
    const completed = Object.fromEntries(firstTwoTasks.map((task) => [
      planTaskCompletionKey(state.planInstanceId, task.id),
      { taskId: task.id, planId: 'gavan', dayIndex: 1, completedAt: '2026-05-01T10:00:00.000Z' },
    ]));

    const snapshot = buildPersonalPlanSnapshot({
      plan: gavan,
      state,
      completedTasks: completed,
      duePracticeCount: 0,
      dueTrainerCount: 0,
    });

    expect(snapshot.planName).toBe('Гавань');
    expect(snapshot.dayIndex).toBe(1);
    expect(snapshot.todayTitle).toBe(gavan.days[0].title);
    expect(snapshot.requiredTodayCount).toBe(5);
    expect(snapshot.completedTodayCount).toBe(2);
    expect(snapshot.todayDone).toBe(false);
    expect(snapshot.dayProgressPct).toBe(40);
    expect(snapshot.progressPct).toBeGreaterThanOrEqual(0);
    expect(snapshot.progressPct).toBeLessThan(100);
  });

  it('separates visible day progress from the long route progress', () => {
    const state = createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 });
    const firstTask = gavan.days[0].tasks[0];
    const completed = {
      [planTaskCompletionKey(state.planInstanceId, firstTask.id)]: {
        taskId: firstTask.id,
        planId: 'gavan',
        planInstanceId: state.planInstanceId,
        dayIndex: 1,
        completedAt: '2026-05-01T10:00:00.000Z',
      },
    };

    const snapshot = buildPersonalPlanSnapshot({
      plan: gavan,
      state,
      completedTasks: completed,
      duePracticeCount: 0,
      dueTrainerCount: 0,
    });

    expect(snapshot.completedTodayCount).toBe(1);
    expect(snapshot.requiredTodayCount).toBe(5);
    expect(snapshot.dayProgressPct).toBe(20);
    expect(snapshot.progressPct).toBeLessThan(snapshot.dayProgressPct);
  });

  it('does not reuse completed tasks from another plan instance', () => {
    const firstState = {
      ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 }),
      planInstanceId: 'gavan_old_instance',
    };
    const secondState = {
      ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 }),
      planInstanceId: 'gavan_new_instance',
    };
    const task = gavan.days[0].tasks[0];
    const completed = {
      [planTaskCompletionKey(firstState.planInstanceId, task.id)]: {
        taskId: task.id,
        planId: 'gavan',
        planInstanceId: firstState.planInstanceId,
        dayIndex: 1,
        completedAt: '2026-05-01T10:00:00.000Z',
      },
    };

    const snapshot = buildPersonalPlanSnapshot({
      plan: gavan,
      state: secondState,
      completedTasks: completed,
      duePracticeCount: 0,
      dueTrainerCount: 0,
    });

    expect(snapshot.completedTodayCount).toBe(0);
    expect(snapshot.todayDone).toBe(false);
  });

  it('opens the next day after the current day is done and a new local date starts', () => {
    const state = {
      ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 }),
      currentDayStartedAt: '2026-05-30T10:00:00.000Z',
    };
    const completed = Object.fromEntries(tasksForMinutes(gavan.days[0], state.minutesPerDay).map((task) => [
      planTaskCompletionKey(state.planInstanceId, task.id),
      { taskId: task.id, planId: 'gavan', dayIndex: 1, completedAt: '2026-05-30T10:30:00.000Z' },
    ]));

    const next = advancePersonalPlanStateForToday({
      plan: gavan,
      state,
      completedTasks: completed,
      duePracticeCount: 0,
      dueTrainerCount: 0,
      now: new Date('2026-05-31T09:00:00.000Z'),
    });

    expect(next.currentDayIndex).toBe(2);
    expect(next.currentDayStartedAt).toBe('2026-05-31T09:00:00.000Z');
  });

  it('does not advance while the selected day is unfinished or still the same local date', () => {
    const state = {
      ...createDefaultPersonalPlanState({ planId: 'gavan', minutesPerDay: 15, startDayIndex: 1 }),
      currentDayStartedAt: '2026-05-30T10:00:00.000Z',
    };
    const firstTaskOnly = {
      [planTaskCompletionKey(state.planInstanceId, gavan.days[0].tasks[0].id)]: {
        taskId: gavan.days[0].tasks[0].id,
        planId: 'gavan',
        dayIndex: 1,
        completedAt: '2026-05-30T10:10:00.000Z',
      },
    };
    const allDone = Object.fromEntries(tasksForMinutes(gavan.days[0], state.minutesPerDay).map((task) => [
      planTaskCompletionKey(state.planInstanceId, task.id),
      { taskId: task.id, planId: 'gavan', dayIndex: 1, completedAt: '2026-05-30T10:30:00.000Z' },
    ]));

    expect(advancePersonalPlanStateForToday({
      plan: gavan,
      state,
      completedTasks: firstTaskOnly,
      duePracticeCount: 0,
      dueTrainerCount: 0,
      now: new Date('2026-05-31T09:00:00.000Z'),
    }).currentDayIndex).toBe(1);

    expect(advancePersonalPlanStateForToday({
      plan: gavan,
      state,
      completedTasks: allDone,
      duePracticeCount: 0,
      dueTrainerCount: 0,
      now: new Date('2026-05-30T19:00:00.000Z'),
    }).currentDayIndex).toBe(1);
  });
});
