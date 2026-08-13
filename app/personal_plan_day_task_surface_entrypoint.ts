import {
  buildPlanDayTaskSurfaceBundle,
  PlanDayTaskSurfaceBundle,
} from './personal_plan_day_task_surface_bundle';
import {
  PlanDayTaskSurfaceInput,
  resolvePlanDayTaskSurfaceInput,
  PlanDayTaskSurfaceInputResolverResult,
} from './personal_plan_day_task_surface_input_resolver';

export type PlanDayTaskSurfaceEntrypointResult = {
  inputReadiness: PlanDayTaskSurfaceInputResolverResult;
  bundle?: PlanDayTaskSurfaceBundle;
  canRender: boolean;
};

export function buildPlanDayTaskSurfaceFromInput(
  input: PlanDayTaskSurfaceInput,
): PlanDayTaskSurfaceEntrypointResult {
  const inputReadiness = resolvePlanDayTaskSurfaceInput(input);

  if (!inputReadiness.ready || !inputReadiness.input) {
    return {
      inputReadiness,
      canRender: false,
    };
  }

  const bundle = buildPlanDayTaskSurfaceBundle(
    inputReadiness.input.blocks,
    inputReadiness.input.planInstanceId,
    inputReadiness.input.attemptEvents,
  );

  return {
    inputReadiness,
    bundle,
    canRender: bundle.canRender,
  };
}
