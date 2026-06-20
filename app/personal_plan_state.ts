import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPlanById,
  tasksForMinutes,
  type PersonalPlanDefinition,
  type PersonalPlanId,
  type PlanDailyTask,
  type PlanDay,
  type PlanMinutesChoice,
} from './personal_plan_catalog';
import {
  planTaskCompletionKey,
  readCompletedPlanTasks,
  type PersonalPlanCompletedTask,
} from './personal_plan_progress';
import { resolvePersonalPracticeSeededReadiness } from './personal_plan_practice_seeded_gate';
import { resolvePersonalPlanTrainerWeakSpotReadiness } from './personal_plan_trainer_weak_spot_gate';
import { resolvePersonalPlanFlashcardsReviewReadiness } from './personal_plan_flashcards_review_gate';
import { emitAppEvent } from './events';

export const PERSONAL_PLAN_STATE_KEY = 'personal_plan_state_v1';

export type PersonalPlanStatus = 'active' | 'paused' | 'completed';

export type PersonalPlanState = {
  id: string;
  planInstanceId: string;
  planId: PersonalPlanId;
  status: PersonalPlanStatus;
  minutesPerDay: PlanMinutesChoice;
  currentDayIndex: number;
  currentDayStartedAt: string;
  createdAt: string;
  activatedAt: string;
  updatedAt: string;
};

export type BuildTodayPlanRuntimeInput = {
  plan: PersonalPlanDefinition;
  state: PersonalPlanState;
  completedTasks: Record<string, PersonalPlanCompletedTask | unknown>;
  duePracticeCount: number;
  duePracticeWordCount?: number;
  dueTrainerCount: number;
  duePlanTrainerWeakSpotCount?: number;
  dueFlashcardsCount?: number;
};

export type PlanDayRuntime = {
  visibleDay: PlanDay;
  tasks: PlanDailyTask[];
  completedTodayCount: number;
  requiredTodayCount: number;
  isCarryover: boolean;
  todayDone: boolean;
};

export type PersonalPlanHomeSnapshot = {
  planId: PersonalPlanId;
  planName: string;
  dayIndex: number;
  weekIndex: number;
  todayTitle: string;
  minutesPerDay: PlanMinutesChoice;
  progressPct: number;
  dayProgressPct: number;
  completedTodayCount: number;
  requiredTodayCount: number;
  todayDone: boolean;
  isCarryover: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDayIndex(plan: PersonalPlanDefinition, dayIndex: number): number {
  if (!Number.isFinite(dayIndex)) return 1;
  return Math.max(1, Math.min(plan.days.length, Math.floor(dayIndex)));
}

function isCompleted(
  task: PlanDailyTask,
  completedTasks: Record<string, PersonalPlanCompletedTask | unknown>,
  planInstanceId?: string,
): boolean {
  if (planInstanceId) return Boolean(completedTasks[planTaskCompletionKey(planInstanceId, task.id)]);
  return Boolean(completedTasks[task.id]);
}

function percentFromCount(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function taskHasAvailableMaterial(
  task: PlanDailyTask,
  duePracticeCount: number,
  duePracticeWordCount: number,
  dueTrainerCount: number,
  duePlanTrainerWeakSpotCount: number,
  dueFlashcardsCount: number,
): boolean {
  if (task.destination.type === 'practice') {
    return resolvePersonalPracticeSeededReadiness({
      duePhraseCount: duePracticeCount,
      dueWordCount: duePracticeWordCount,
      requiredPhraseCount: task.destination.requiredPhrases,
      requiredWordCount: task.destination.requiredWords,
    }).status === 'ready';
  }
  if (task.destination.type === 'trainer') {
    if (task.kind === 'trainer_weak_spot' || task.destination.planScoped) {
      return resolvePersonalPlanTrainerWeakSpotReadiness({
        planWeakSpotDueCount: duePlanTrainerWeakSpotCount,
        generalTrainerDueCount: dueTrainerCount,
        requiredCount: task.destination.requiredItems,
      }).status === 'ready';
    }
    return dueTrainerCount > 0;
  }
  if (task.destination.type === 'flashcards') {
    return resolvePersonalPlanFlashcardsReviewReadiness({
      availableCardCount: dueFlashcardsCount,
      requiredCardCount: task.destination.requiredCards,
    }).status === 'ready';
  }
  return true;
}

function runtimeTasksForDay(
  day: PlanDay,
  minutes: PlanMinutesChoice,
  duePracticeCount: number,
  duePracticeWordCount: number,
  dueTrainerCount: number,
  duePlanTrainerWeakSpotCount: number,
  dueFlashcardsCount: number,
): PlanDailyTask[] {
  return tasksForMinutes(day, minutes).filter((task) =>
    taskHasAvailableMaterial(task, duePracticeCount, duePracticeWordCount, dueTrainerCount, duePlanTrainerWeakSpotCount, dueFlashcardsCount)
  );
}

function tasksForProgress(plan: PersonalPlanDefinition, minutes: PlanMinutesChoice): PlanDailyTask[] {
  return plan.days.flatMap((day) => tasksForMinutes(day, minutes));
}

export function createDefaultPersonalPlanState(input: {
  planId: PersonalPlanId;
  minutesPerDay: PlanMinutesChoice;
  startDayIndex?: number;
}): PersonalPlanState {
  const plan = getPlanById(input.planId);
  const timestamp = nowIso();
  return {
    id: `${input.planId}_${timestamp}`,
    planInstanceId: `${input.planId}_${timestamp}`,
    planId: input.planId,
    status: 'active',
    minutesPerDay: input.minutesPerDay,
    currentDayIndex: clampDayIndex(plan, input.startDayIndex ?? 1),
    currentDayStartedAt: timestamp,
    createdAt: timestamp,
    activatedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function advancePersonalPlanStateForToday(input: BuildTodayPlanRuntimeInput & {
  now?: Date;
}): PersonalPlanState {
  const currentDayIndex = clampDayIndex(input.plan, input.state.currentDayIndex);
  if (currentDayIndex >= input.plan.days.length) return input.state;

  const runtime = buildTodayPlanRuntime(input);
  if (runtime.isCarryover || !runtime.todayDone) return input.state;

  const now = input.now ?? new Date();
  const startedAt = new Date(input.state.currentDayStartedAt || input.state.activatedAt || input.state.createdAt);
  if (localDateKey(startedAt) === localDateKey(now)) return input.state;

  const timestamp = now.toISOString();
  return {
    ...input.state,
    currentDayIndex: clampDayIndex(input.plan, currentDayIndex + 1),
    currentDayStartedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildTodayPlanRuntime(input: BuildTodayPlanRuntimeInput): PlanDayRuntime {
  const currentDayIndex = clampDayIndex(input.plan, input.state.currentDayIndex);
  const duePracticeCount = Math.max(0, Math.floor(input.duePracticeCount || 0));
  const duePracticeWordCount = Math.max(0, Math.floor(input.duePracticeWordCount || 0));
  const dueTrainerCount = Math.max(0, Math.floor(input.dueTrainerCount || 0));
  const duePlanTrainerWeakSpotCount = Math.max(0, Math.floor(input.duePlanTrainerWeakSpotCount || 0));
  const dueFlashcardsCount = Math.max(0, Math.floor(input.dueFlashcardsCount || 0));

  for (let dayIndex = 1; dayIndex < currentDayIndex; dayIndex += 1) {
    const previousDay = input.plan.days[dayIndex - 1];
    if (!previousDay) continue;
    const previousTasks = runtimeTasksForDay(previousDay, input.state.minutesPerDay, duePracticeCount, duePracticeWordCount, dueTrainerCount, duePlanTrainerWeakSpotCount, dueFlashcardsCount);
    const remaining = previousTasks.filter((task) => !isCompleted(task, input.completedTasks, input.state.planInstanceId));
    if (remaining.length > 0) {
      return {
        visibleDay: previousDay,
        tasks: remaining,
        completedTodayCount: previousTasks.length - remaining.length,
        requiredTodayCount: previousTasks.length,
        isCarryover: true,
        todayDone: false,
      };
    }
  }

  const visibleDay = input.plan.days[currentDayIndex - 1] ?? input.plan.days[0];
  const tasks = runtimeTasksForDay(visibleDay, input.state.minutesPerDay, duePracticeCount, duePracticeWordCount, dueTrainerCount, duePlanTrainerWeakSpotCount, dueFlashcardsCount);
  const completedTodayCount = tasks.filter((task) => isCompleted(task, input.completedTasks, input.state.planInstanceId)).length;
  return {
    visibleDay,
    tasks,
    completedTodayCount,
    requiredTodayCount: tasks.length,
    isCarryover: false,
    todayDone: tasks.length > 0 && completedTodayCount >= tasks.length,
  };
}

export function buildPersonalPlanSnapshot(input: BuildTodayPlanRuntimeInput): PersonalPlanHomeSnapshot {
  const runtime = buildTodayPlanRuntime(input);
  const allTasks = tasksForProgress(input.plan, input.state.minutesPerDay);
  const completedPlanTasks = allTasks.filter((task) => isCompleted(task, input.completedTasks, input.state.planInstanceId)).length;
  const progressPct = percentFromCount(completedPlanTasks, allTasks.length);
  const dayProgressPct = percentFromCount(runtime.completedTodayCount, runtime.requiredTodayCount);

  return {
    planId: input.plan.id,
    planName: input.plan.name,
    dayIndex: runtime.visibleDay.dayIndex,
    weekIndex: runtime.visibleDay.weekIndex,
    todayTitle: runtime.visibleDay.title,
    minutesPerDay: input.state.minutesPerDay,
    progressPct,
    dayProgressPct,
    completedTodayCount: runtime.completedTodayCount,
    requiredTodayCount: runtime.requiredTodayCount,
    todayDone: runtime.todayDone,
    isCarryover: runtime.isCarryover,
  };
}

let _planStateCache: PersonalPlanState | null | undefined = undefined;

export function getCachedPersonalPlanState(): PersonalPlanState | null | undefined {
  return _planStateCache;
}

export async function readPersonalPlanState(): Promise<PersonalPlanState | null> {
  if (_planStateCache !== undefined) return _planStateCache;
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY);
    if (!raw) { _planStateCache = null; return null; }
    const parsed = JSON.parse(raw) as Partial<PersonalPlanState>;
    if (!parsed || parsed.status !== 'active') return null;
    if (!parsed.planId || !parsed.minutesPerDay) return null;
    const plan = getPlanById(parsed.planId);
    const result: PersonalPlanState = {
      id: String(parsed.id || `${parsed.planId}_active`),
      planInstanceId: String(parsed.planInstanceId || parsed.id || `${parsed.planId}_active`),
      planId: parsed.planId,
      status: parsed.status,
      minutesPerDay: parsed.minutesPerDay,
      currentDayIndex: clampDayIndex(plan, Number(parsed.currentDayIndex ?? 1)),
      currentDayStartedAt: String(parsed.currentDayStartedAt || parsed.activatedAt || parsed.createdAt || nowIso()),
      createdAt: String(parsed.createdAt || nowIso()),
      activatedAt: String(parsed.activatedAt || parsed.createdAt || nowIso()),
      updatedAt: String(parsed.updatedAt || parsed.activatedAt || parsed.createdAt || nowIso()),
    };
    _planStateCache = result;
    return result;
  } catch {
    return null;
  }
}

export async function savePersonalPlanState(state: PersonalPlanState): Promise<void> {
  _planStateCache = state;
  await AsyncStorage.setItem(PERSONAL_PLAN_STATE_KEY, JSON.stringify({
    ...state,
    updatedAt: nowIso(),
  }));
}

export async function activatePersonalPlan(input: {
  planId: PersonalPlanId;
  minutesPerDay: PlanMinutesChoice;
  startDayIndex?: number;
}): Promise<PersonalPlanState> {
  const state = createDefaultPersonalPlanState(input);
  await savePersonalPlanState(state);
  const snapshot = buildPersonalPlanSnapshot({
    plan: getPlanById(state.planId),
    state,
    completedTasks: {},
    duePracticeCount: 0,
    duePracticeWordCount: 0,
    dueTrainerCount: 0,
    duePlanTrainerWeakSpotCount: 0,
    dueFlashcardsCount: 0,
  });
  emitAppEvent('personal_plan_updated', { planId: state.planId, snapshot });
  return state;
}

export async function readPersonalPlanSnapshot(input?: {
  duePracticeCount?: number;
  duePracticeWordCount?: number;
  dueTrainerCount?: number;
  duePlanTrainerWeakSpotCount?: number;
  dueFlashcardsCount?: number;
}): Promise<PersonalPlanHomeSnapshot | null> {
  const state = await readPersonalPlanState();
  if (!state) return null;
  const plan = getPlanById(state.planId);
  const completedTasks = await readCompletedPlanTasks();
  const advancedState = advancePersonalPlanStateForToday({
    plan,
    state,
    completedTasks,
    duePracticeCount: input?.duePracticeCount ?? 0,
    duePracticeWordCount: input?.duePracticeWordCount ?? 0,
    dueTrainerCount: input?.dueTrainerCount ?? 0,
    duePlanTrainerWeakSpotCount: input?.duePlanTrainerWeakSpotCount ?? 0,
    dueFlashcardsCount: input?.dueFlashcardsCount ?? 0,
  });
  if (advancedState.currentDayIndex !== state.currentDayIndex) {
    await savePersonalPlanState(advancedState);
    emitAppEvent('personal_plan_updated', { planId: advancedState.planId });
  }
  return buildPersonalPlanSnapshot({
    plan,
    state: advancedState,
    completedTasks,
    duePracticeCount: input?.duePracticeCount ?? 0,
    duePracticeWordCount: input?.duePracticeWordCount ?? 0,
    dueTrainerCount: input?.dueTrainerCount ?? 0,
    duePlanTrainerWeakSpotCount: input?.duePlanTrainerWeakSpotCount ?? 0,
    dueFlashcardsCount: input?.dueFlashcardsCount ?? 0,
  });
}

export async function clearPersonalPlanState(): Promise<void> {
  await AsyncStorage.removeItem(PERSONAL_PLAN_STATE_KEY);
  emitAppEvent('personal_plan_updated', undefined);
}
