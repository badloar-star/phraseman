import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const COMPLETED_PLAN_TASKS_KEY = 'personal_plan_completed_tasks_v1';

export type PersonalPlanCompletedTask = {
  completedAt: string;
  planId?: string;
  planInstanceId?: string;
  studyTarget?: RuntimeStudyTarget;
  dayIndex?: number;
  taskId: string;
};

export function planTaskCompletionKey(planInstanceId: string | null | undefined, taskId: string): string {
  return planInstanceId ? `${planInstanceId}::${taskId}` : taskId;
}

function parseCompletedPlanTasks(raw: string | null): Record<string, PersonalPlanCompletedTask> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_personal_plan_completed_tasks');
  }
  return parsed as Record<string, PersonalPlanCompletedTask>;
}

/**
 * Строгое чтение для критических переходов плана. Ошибка storage/JSON не должна
 * выглядеть как пустая история — иначе уже выполненное задание может открыться
 * снова или день ошибочно покажется завершённым.
 */
export async function readCompletedPlanTasksStrict(): Promise<Record<string, PersonalPlanCompletedTask>> {
  return parseCompletedPlanTasks(await AsyncStorage.getItem(COMPLETED_PLAN_TASKS_KEY));
}

/**
 * Совместимый tolerant-reader для экранов, где пустое состояние безопаснее
 * падения. Критические маршрутизаторы должны использовать Strict-вариант.
 */
export async function readCompletedPlanTasks(): Promise<Record<string, PersonalPlanCompletedTask>> {
  try {
    return await readCompletedPlanTasksStrict();
  } catch {
    return {};
  }
}

export async function markPersonalPlanTaskCompleted(input: Omit<PersonalPlanCompletedTask, 'completedAt'>): Promise<void> {
  const key = planTaskCompletionKey(input.planInstanceId, input.taskId);
  const created = await withStorageLock(async () => {
    const current = await readCompletedPlanTasksStrict();
    if (current[key]) return false;

    const completedTask: PersonalPlanCompletedTask = {
      ...input,
      completedAt: new Date().toISOString(),
    };
    const next = { ...current, [key]: completedTask };
    await AsyncStorage.setItem(COMPLETED_PLAN_TASKS_KEY, JSON.stringify(next));

    // Read-after-write: переход к следующему заданию разрешён только после того,
    // как завершение действительно читается из того же persistent storage.
    const verified = await readCompletedPlanTasksStrict();
    if (verified[key]?.taskId !== input.taskId) {
      throw new Error('personal_plan_completion_not_persisted');
    }
    return true;
  });

  if (!created) return;
  void import('./stats_daily_breakdown')
    .then(({ bumpStatsDaily }) => bumpStatsDaily('plan_tasks_completed', 1, input.studyTarget))
    .catch(() => {});
  emitAppEvent('personal_plan_updated', { planId: input.planId, taskId: input.taskId });
}
