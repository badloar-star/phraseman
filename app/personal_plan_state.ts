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
import { resolvePersonalPlanFlashcardsReviewReadiness } from './personal_plan_flashcards_review_gate';
import { emitAppEvent } from './events';
import { captureAccountGeneration, type AccountGenerationToken } from './account_generation';
import { assertPersonalPlanActivationAllowed } from './personal_plan_sunset';
import { readPersonalPlanSunsetEffectiveNow } from './personal_plan_sunset_clock';
import {
  commitPhoneStatePracticeRegister,
  readOrImportPhoneStatePracticeRegister,
} from './phone_state_practice_bridge';

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
  void duePracticeCount;
  void duePracticeWordCount;
  void dueTrainerCount;
  void duePlanTrainerWeakSpotCount;
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
  planInstanceId?: string;
}): PersonalPlanState {
  const plan = getPlanById(input.planId);
  const timestamp = nowIso();
  const planInstanceId = input.planInstanceId?.trim() || `${input.planId}_${timestamp}`;
  return {
    id: planInstanceId,
    planInstanceId,
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

/**
 * Чистая функция: пройден ли маршрут до конца. Условие — мы на ПОСЛЕДНЕМ дне
 * плана, этот день выполнен и нет переноса незавершённых задач прошлых дней.
 * На этом сигнале показывается финальный экран «маршрут пройден». Экспортируется
 * для тестов.
 */
export function isPersonalPlanFinished(input: BuildTodayPlanRuntimeInput): boolean {
  const lastDayIndex = input.plan.days.length;
  const currentDayIndex = clampDayIndex(input.plan, input.state.currentDayIndex);
  if (currentDayIndex < lastDayIndex) return false;
  const runtime = buildTodayPlanRuntime(input);
  return !runtime.isCarryover && runtime.todayDone;
}

export type PersonalPlanCompletionSummary = {
  planId: PersonalPlanId;
  planName: string;
  totalDays: number;
  completedTasks: number;
  activeDays: number;
};

/**
 * Чистая функция: итоги пройденного маршрута для финального экрана. Считает
 * выполненные задания именно этого экземпляра плана (по planInstanceId) и число
 * уникальных дней, в которые была активность. Экспортируется для тестов.
 */
export function buildPersonalPlanCompletionSummary(
  plan: PersonalPlanDefinition,
  state: PersonalPlanState,
  completedTasks: Record<string, PersonalPlanCompletedTask | unknown>,
): PersonalPlanCompletionSummary {
  const prefix = `${state.planInstanceId}::`;
  const ownTasks = Object.entries(completedTasks).filter(([key]) => key.startsWith(prefix));
  const activeDays = new Set<number>();
  for (const [, value] of ownTasks) {
    const dayIndex = (value as PersonalPlanCompletedTask | undefined)?.dayIndex;
    if (typeof dayIndex === 'number' && Number.isFinite(dayIndex)) activeDays.add(dayIndex);
  }
  return {
    planId: plan.id,
    planName: plan.name,
    totalDays: plan.days.length,
    completedTasks: ownTasks.length,
    activeDays: activeDays.size,
  };
}

type ScopedPlanStateCache = {
  account: AccountGenerationToken;
  value: PersonalPlanState | null;
};

let _planStateCache: ScopedPlanStateCache | undefined = undefined;
let personalPlanStateStorageQueue: Promise<void> = Promise.resolve();

export async function withPersonalPlanStateStorageLock<T>(work: () => Promise<T>): Promise<T> {
  let result!: T;
  const operation = personalPlanStateStorageQueue.then(async () => { result = await work(); });
  personalPlanStateStorageQueue = operation.catch(() => undefined);
  await operation;
  return result;
}

function sameAccountGeneration(left: AccountGenerationToken, right: AccountGenerationToken): boolean {
  return left.generation === right.generation &&
    left.stableId === right.stableId &&
    left.phase === right.phase;
}

function readCurrentPlanStateCache(): PersonalPlanState | null | undefined {
  if (!_planStateCache) return undefined;
  if (!sameAccountGeneration(_planStateCache.account, captureAccountGeneration())) {
    _planStateCache = undefined;
    return undefined;
  }
  return _planStateCache.value;
}

function writeCurrentPlanStateCache(value: PersonalPlanState | null): void {
  _planStateCache = { account: captureAccountGeneration(), value };
}

export function getCachedPersonalPlanState(): PersonalPlanState | null | undefined {
  return readCurrentPlanStateCache();
}

/** Memory-only invalidation after account wipe or an authoritative merged restore. */
export function invalidatePersonalPlanStateCache(): void {
  _planStateCache = undefined;
}

const VALID_PLAN_STATUSES = new Set<PersonalPlanStatus>(['active', 'paused', 'completed']);

/**
 * Парсит сохранённое состояние плана ЛЮБОГО статуса (active/paused/completed).
 * Возвращает null только если запись отсутствует или структурно сломана.
 * Чистая нормализация без записи в кеш — кеш держит ТОЛЬКО активный план,
 * чтобы не ломать самовосстановление на главной (оно полагается на
 * readPersonalPlanState() === null как «нет активного плана»).
 */
function parseAnyPersonalPlanState(raw: string | null): PersonalPlanState | null {
  if (!raw) return null;
  let parsed: Partial<PersonalPlanState> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<PersonalPlanState>;
  } catch {
    return null;
  }
  if (!parsed || !parsed.planId || !parsed.minutesPerDay) return null;
  if (!VALID_PLAN_STATUSES.has(parsed.status as PersonalPlanStatus)) return null;
  const status = parsed.status as PersonalPlanStatus;
  const plan = getPlanById(parsed.planId);
  return {
    id: String(parsed.id || `${parsed.planId}_active`),
    planInstanceId: String(parsed.planInstanceId || parsed.id || `${parsed.planId}_active`),
    planId: parsed.planId,
    status,
    minutesPerDay: parsed.minutesPerDay,
    currentDayIndex: clampDayIndex(plan, Number(parsed.currentDayIndex ?? 1)),
    currentDayStartedAt: String(parsed.currentDayStartedAt || parsed.activatedAt || parsed.createdAt || nowIso()),
    // Do not invent a creation timestamp: sunset grandfathering is fail-closed and
    // must distinguish a durable historical lineage from a malformed legacy row.
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    activatedAt: String(parsed.activatedAt || parsed.createdAt || nowIso()),
    updatedAt: String(parsed.updatedAt || parsed.activatedAt || parsed.createdAt || nowIso()),
  };
}

/**
 * Активный план (status === 'active'). Контракт НЕ меняется: paused/completed
 * план НЕ возвращается (на главной это «нет активного плана»). Для чтения плана
 * любого статуса — readAnyPersonalPlanState (финальный экран, будущая пауза).
 */
export async function readPersonalPlanState(): Promise<PersonalPlanState | null> {
  const cached = readCurrentPlanStateCache();
  const operationAccount = captureAccountGeneration();
  try {
    const raw = cached !== undefined
      ? JSON.stringify(cached)
      : await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
    const legacy = parseAnyPersonalPlanState(raw);
    const projected = await readOrImportPhoneStatePracticeRegister('personal_plan_state', legacy);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
    const parsed = parseAnyPersonalPlanState(projected === null ? null : JSON.stringify(projected));
    if (!parsed || parsed.status !== 'active') {
      if (!raw) writeCurrentPlanStateCache(null);
      return null;
    }
    writeCurrentPlanStateCache(parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * План ЛЮБОГО статуса (active/paused/completed) — чтобы поставленный на паузу
 * или пройденный до конца план не «исчезал» из чтения. НЕ пишет общий кеш
 * активного плана (иначе home увидел бы не-active план как активный).
 */
export async function readAnyPersonalPlanState(): Promise<PersonalPlanState | null> {
  const cached = readCurrentPlanStateCache();
  const operationAccount = captureAccountGeneration();
  try {
    const raw = cached !== undefined
      ? JSON.stringify(cached)
      : await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
    const legacy = parseAnyPersonalPlanState(raw);
    const projected = await readOrImportPhoneStatePracticeRegister('personal_plan_state', legacy);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
    return parseAnyPersonalPlanState(projected === null ? null : JSON.stringify(projected));
  } catch {
    return null;
  }
}

export async function savePersonalPlanState(state: PersonalPlanState): Promise<void> {
  const operationAccount = captureAccountGeneration();
  const persistedState = {
    ...state,
    updatedAt: nowIso(),
  };
  await withPersonalPlanStateStorageLock(async () => {
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return;
    await commitPhoneStatePracticeRegister('personal_plan_state', persistedState);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return;
    try {
      await AsyncStorage.setItem(PERSONAL_PLAN_STATE_KEY, JSON.stringify(persistedState));
    } catch (error) {
      invalidatePersonalPlanStateCache();
      throw error;
    }
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      await AsyncStorage.removeItem(PERSONAL_PLAN_STATE_KEY).catch(() => {});
      invalidatePersonalPlanStateCache();
      return;
    }
    writeCurrentPlanStateCache(persistedState);
  });
}

export async function activatePersonalPlan(input: {
  planId: PersonalPlanId;
  minutesPerDay: PlanMinutesChoice;
  startDayIndex?: number;
  planInstanceId?: string;
}): Promise<PersonalPlanState> {
  const operationAccount = captureAccountGeneration();
  const state = await withPersonalPlanStateStorageLock(async (): Promise<PersonalPlanState> => {
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      throw new Error('personal_plan_activation_account_changed');
    }
    const raw = await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      throw new Error('personal_plan_activation_account_changed');
    }
    const existing = parseAnyPersonalPlanState(raw);
    const effectiveNowMs = await readPersonalPlanSunsetEffectiveNow();
    assertPersonalPlanActivationAllowed(existing, effectiveNowMs);
    const next = {
      ...createDefaultPersonalPlanState(input),
      createdAt: existing.createdAt,
    };
    // This check is intentionally inside the storage queue and immediately before
    // the durable write. A tap made before sunset cannot wait behind another write
    // and then create/replace a plan after the global deadline.
    const writeTimeNowMs = await readPersonalPlanSunsetEffectiveNow();
    assertPersonalPlanActivationAllowed(next, writeTimeNowMs);
    await commitPhoneStatePracticeRegister('personal_plan_state', next);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      throw new Error('personal_plan_activation_account_changed');
    }
    try {
      await AsyncStorage.setItem(PERSONAL_PLAN_STATE_KEY, JSON.stringify(next));
    } catch (error) {
      invalidatePersonalPlanStateCache();
      throw error;
    }
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      await AsyncStorage.removeItem(PERSONAL_PLAN_STATE_KEY).catch(() => {});
      invalidatePersonalPlanStateCache();
      throw new Error('personal_plan_activation_account_changed');
    }
    writeCurrentPlanStateCache(next);
    return next;
  });
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

/**
 * Помечает текущий план как пройденный (status='completed'). После этого он
 * перестаёт быть «активным» на главной (readPersonalPlanState → null), но
 * остаётся читаемым через readAnyPersonalPlanState — финальный экран «маршрут
 * пройден» показывает итоги и рекомендует следующий план. Идемпотентно: если
 * активного плана нет или он уже не active — ничего не делает.
 */
export async function completePersonalPlan(): Promise<PersonalPlanState | null> {
  const operationAccount = captureAccountGeneration();
  const result = await withPersonalPlanStateStorageLock(async (): Promise<{
    state: PersonalPlanState | null;
    changed: boolean;
  }> => {
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return { state: null, changed: false };
    const raw = await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return { state: null, changed: false };
    const state = parseAnyPersonalPlanState(raw);
    if (!state || state.status !== 'active') return { state, changed: false };
    const next: PersonalPlanState = { ...state, status: 'completed', updatedAt: nowIso() };
    await commitPhoneStatePracticeRegister('personal_plan_state', next);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return { state: null, changed: false };
    try {
      await AsyncStorage.setItem(PERSONAL_PLAN_STATE_KEY, JSON.stringify(next));
    } catch (error) {
      invalidatePersonalPlanStateCache();
      throw error;
    }
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      await AsyncStorage.removeItem(PERSONAL_PLAN_STATE_KEY).catch(() => {});
      invalidatePersonalPlanStateCache();
      return { state: null, changed: false };
    }
    writeCurrentPlanStateCache(null);
    return { state: next, changed: true };
  });
  if (result.changed) emitAppEvent('personal_plan_updated', undefined);
  return result.state;
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
  const operationAccount = captureAccountGeneration();
  const cleared = await withPersonalPlanStateStorageLock(async () => {
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
    await commitPhoneStatePracticeRegister('personal_plan_state', null);
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
    try {
      await AsyncStorage.removeItem(PERSONAL_PLAN_STATE_KEY);
    } catch (error) {
      invalidatePersonalPlanStateCache();
      throw error;
    }
    if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
      invalidatePersonalPlanStateCache();
      return false;
    }
    writeCurrentPlanStateCache(null);
    return true;
  });
  if (cleared) emitAppEvent('personal_plan_updated', undefined);
}
