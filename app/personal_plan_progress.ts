import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const COMPLETED_PLAN_TASKS_KEY = 'personal_plan_completed_tasks_v1';

// Completion is monotonic, but AsyncStorage only exposes separate read/write
// operations. Keep those operations in one process-local queue so overlapping
// task finishes cannot both read the same snapshot and let the last writer
// erase the other completion.
let completedPlanTasksWriteQueue: Promise<void> = Promise.resolve();

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

export async function readCompletedPlanTasks(): Promise<Record<string, PersonalPlanCompletedTask>> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_PLAN_TASKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function markPersonalPlanTaskCompleted(input: Omit<PersonalPlanCompletedTask, 'completedAt'>): Promise<void> {
  let inserted = false;
  const write = completedPlanTasksWriteQueue.then(async () => {
    const current = await readCompletedPlanTasks();
    const key = planTaskCompletionKey(input.planInstanceId, input.taskId);
    if (current[key]) return;
    current[key] = {
      ...input,
      completedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(COMPLETED_PLAN_TASKS_KEY, JSON.stringify(current));
    inserted = true;
  });
  completedPlanTasksWriteQueue = write.catch(() => undefined);
  await write;
  if (!inserted) return;
  void import('./stats_daily_breakdown')
    .then(({ bumpStatsDaily }) => bumpStatsDaily('plan_tasks_completed', 1, input.studyTarget))
    .catch(() => {});
  emitAppEvent('personal_plan_updated', { planId: input.planId, taskId: input.taskId });
}
