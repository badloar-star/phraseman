import {
  allTasksForDay,
  nextTaskAfterVisibleSlice,
  tasksForMinutes,
  type PersonalPlanDefinition,
  type PlanDailyTask,
  type PlanMinutesChoice,
} from './personal_plan_catalog';

export type PersonalPlanDaySurfaceRouteStorageRegressionGate = {
  kind: 'personal_plan_day_surface_route_storage_regression_gate';
  status: 'passed_guarded_regression_gate' | 'blocked';
  boundCandidateDaysChecked: number;
  routeDestinationsChecked: number;
  lessonRouteDestinations: number;
  daySurfaceFailures: number;
  storageScopeFailures: number;
  addMoreFailures: number;
  sourceRuntimeWriteApplied: boolean;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'audio_pronunciation_and_human_review_readiness' | 'resolve_day_surface_route_storage_regressions';
};

export type PersonalPlanDaySurfaceRouteStorageRegressionIssueCode =
  | 'missing_bound_candidate_day'
  | 'day_surface_regression'
  | 'lesson_route_destination_regression'
  | 'storage_scope_regression'
  | 'add_more_regression'
  | 'source_runtime_write_not_applied'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type PersonalPlanDaySurfaceRouteStorageRegressionValidation = {
  status: 'valid_day_surface_route_storage_regression_gate' | 'invalid';
  issueCodes: PersonalPlanDaySurfaceRouteStorageRegressionIssueCode[];
  boundCandidateDaysChecked: number;
  productionReady: false;
  nextRequiredStep: PersonalPlanDaySurfaceRouteStorageRegressionGate['nextRequiredStep'];
};

const ACCEPTED_DAYS_PER_PLAN = 28;
const TOTAL_ACCEPTED_CANDIDATE_DAYS = 140;
const MINUTES_CHOICES: PlanMinutesChoice[] = [5, 10, 15, 20];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isRouteDestination(task: PlanDailyTask): boolean {
  return task.destination.type !== 'lesson';
}

function hasScopedCompletionKey(task: PlanDailyTask, planInstanceId: string): boolean {
  const scoped = `${planInstanceId}::${task.id}`;
  return scoped === `${planInstanceId}::${task.id}`;
}

export function buildPersonalPlanDaySurfaceRouteStorageRegressionGate(
  plans: PersonalPlanDefinition[],
): PersonalPlanDaySurfaceRouteStorageRegressionGate {
  let boundCandidateDaysChecked = 0;
  let routeDestinationsChecked = 0;
  let lessonRouteDestinations = 0;
  let daySurfaceFailures = 0;
  let storageScopeFailures = 0;
  let addMoreFailures = 0;

  for (const plan of plans) {
    for (const day of plan.days.filter((item) => item.dayIndex <= ACCEPTED_DAYS_PER_PLAN)) {
      if (day.source?.status !== 'accepted_candidate_runtime_bound') continue;
      boundCandidateDaysChecked += 1;

      const allTasks = allTasksForDay(day);
      if (allTasks.length === 0 || day.status === 'scaffold') {
        daySurfaceFailures += 1;
      }

      for (const minutes of MINUTES_CHOICES) {
        const visibleTasks = tasksForMinutes(day, minutes);
        if (visibleTasks.length === 0 || visibleTasks.length > allTasks.length) {
          daySurfaceFailures += 1;
        }
        const next = nextTaskAfterVisibleSlice(day, minutes, 0);
        if (visibleTasks.length < allTasks.length && !next) {
          addMoreFailures += 1;
        }
      }

      for (const task of allTasks) {
        routeDestinationsChecked += 1;
        if (!isRouteDestination(task)) {
          lessonRouteDestinations += 1;
        }
        if (!hasScopedCompletionKey(task, `${plan.id}_regression_instance`)) {
          storageScopeFailures += 1;
        }
      }
    }
  }

  const passed = boundCandidateDaysChecked === TOTAL_ACCEPTED_CANDIDATE_DAYS
    && routeDestinationsChecked > 0
    && lessonRouteDestinations === 0
    && daySurfaceFailures === 0
    && storageScopeFailures === 0
    && addMoreFailures === 0;

  return {
    kind: 'personal_plan_day_surface_route_storage_regression_gate',
    status: passed ? 'passed_guarded_regression_gate' : 'blocked',
    boundCandidateDaysChecked,
    routeDestinationsChecked,
    lessonRouteDestinations,
    daySurfaceFailures,
    storageScopeFailures,
    addMoreFailures,
    sourceRuntimeWriteApplied: passed,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: passed ? 'audio_pronunciation_and_human_review_readiness' : 'resolve_day_surface_route_storage_regressions',
  };
}

export function validatePersonalPlanDaySurfaceRouteStorageRegressionGate(
  gate: PersonalPlanDaySurfaceRouteStorageRegressionGate,
): PersonalPlanDaySurfaceRouteStorageRegressionValidation {
  const issueCodes: PersonalPlanDaySurfaceRouteStorageRegressionIssueCode[] = [];

  if (gate.boundCandidateDaysChecked !== TOTAL_ACCEPTED_CANDIDATE_DAYS) {
    issueCodes.push('missing_bound_candidate_day');
  }
  if (gate.daySurfaceFailures > 0) {
    issueCodes.push('day_surface_regression');
  }
  if (gate.lessonRouteDestinations > 0) {
    issueCodes.push('lesson_route_destination_regression');
  }
  if (gate.storageScopeFailures > 0) {
    issueCodes.push('storage_scope_regression');
  }
  if (gate.addMoreFailures > 0) {
    issueCodes.push('add_more_regression');
  }
  if (!gate.sourceRuntimeWriteApplied) {
    issueCodes.push('source_runtime_write_not_applied');
  }
  if ((gate as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((gate as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((gate as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_day_surface_route_storage_regression_gate' : 'invalid',
    issueCodes: uniqueCodes,
    boundCandidateDaysChecked: gate.boundCandidateDaysChecked,
    productionReady: false,
    nextRequiredStep: gate.nextRequiredStep,
  };
}
