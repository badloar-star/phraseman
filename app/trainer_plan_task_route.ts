import { markPersonalPlanTaskCompleted } from './personal_plan_progress';
import type { TrainerPremiumMode } from './trainer_store';

export type TrainerPlanTaskRouteParams = {
  mode?: string | string[];
  planTrainerTask?: string | string[];
  requiredItems?: string | string[];
  planTaskId?: string | string[];
  planInstanceId?: string | string[];
  planId?: string | string[];
  planDayIndex?: string | string[];
};

export type TrainerPlanTaskContext = {
  mode: TrainerPremiumMode;
  taskId: string;
  planInstanceId: string;
  planId: string;
  dayIndex: number;
  requiredItems: number;
};

export function routeParamString(value: unknown): string {
  if (Array.isArray(value)) return routeParamString(value[0]);
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function trainerModeFromRoute(value: unknown): TrainerPremiumMode {
  const mode = routeParamString(value);
  return mode === 'weak' || mode === 'hard' || mode === 'smart_mix' ? mode : 'weak';
}

export function readTrainerPlanTaskContext(params: TrainerPlanTaskRouteParams): TrainerPlanTaskContext {
  const taskId = routeParamString(params.planTrainerTask) === '1'
    ? routeParamString(params.planTaskId)
    : '';
  const requiredItems = Math.max(1, Math.min(12, parseInt(routeParamString(params.requiredItems) || '3', 10) || 3));
  const dayIndex = Math.max(1, parseInt(routeParamString(params.planDayIndex) || '1', 10) || 1);
  return {
    mode: trainerModeFromRoute(params.mode),
    taskId,
    planInstanceId: routeParamString(params.planInstanceId),
    planId: routeParamString(params.planId),
    dayIndex,
    requiredItems,
  };
}

export async function markTrainerPlanTaskCompleted(context: TrainerPlanTaskContext): Promise<void> {
  if (!context.taskId) return;
  await markPersonalPlanTaskCompleted({
    taskId: context.taskId,
    planId: context.planId,
    planInstanceId: context.planInstanceId,
    dayIndex: context.dayIndex,
  });
}
