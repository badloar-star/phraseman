import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';

export const COMPLETED_PLAN_TASKS_KEY = 'personal_plan_completed_tasks_v1';

export type PersonalPlanCompletedTask = {
  completedAt: string;
  planId?: string;
  planInstanceId?: string;
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
  const current = await readCompletedPlanTasks();
  current[planTaskCompletionKey(input.planInstanceId, input.taskId)] = {
    ...input,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(COMPLETED_PLAN_TASKS_KEY, JSON.stringify(current));
  emitAppEvent('personal_plan_updated', { planId: input.planId, taskId: input.taskId });
}
