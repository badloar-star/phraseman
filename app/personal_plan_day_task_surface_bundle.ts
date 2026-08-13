import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import {
  validatePlanDayTaskSurfaceModel,
  PlanDayTaskSurfaceGateResult,
} from './personal_plan_day_task_surface_gate';
import {
  buildPlanDayTaskSurfaceModel,
  PlanDayTaskSurfaceModel,
} from './personal_plan_day_task_surface_model';

export type PlanDayTaskSurfaceValidator = (
  model: PlanDayTaskSurfaceModel,
) => PlanDayTaskSurfaceGateResult;

export type BuildPlanDayTaskSurfaceBundleOptions = {
  validateSurfaceModel?: PlanDayTaskSurfaceValidator;
};

export type PlanDayTaskSurfaceBundle = {
  model: PlanDayTaskSurfaceModel;
  readiness: PlanDayTaskSurfaceGateResult;
  canRender: boolean;
};

export function buildPlanDayTaskSurfaceBundle(
  blocks: PlanExerciseBlock[],
  planInstanceId: string,
  attemptEvents: PlanAttemptEvent[],
  options: BuildPlanDayTaskSurfaceBundleOptions = {},
): PlanDayTaskSurfaceBundle {
  const model = buildPlanDayTaskSurfaceModel(
    blocks,
    planInstanceId,
    attemptEvents,
  );
  const validateSurfaceModel = options.validateSurfaceModel
    ?? validatePlanDayTaskSurfaceModel;
  const readiness = validateSurfaceModel(model);

  return {
    model,
    readiness,
    canRender: readiness.valid,
  };
}
