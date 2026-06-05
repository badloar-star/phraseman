import type { PersonalPlanDefinition, PersonalPlanId } from './personal_plan_catalog';

export type AcceptedCandidateGuardedRuntimeSourcePlanCoverage = {
  planId: PersonalPlanId;
  boundDays: number;
  totalAcceptedDays: 28;
};

export type AcceptedCandidateGuardedRuntimeSourceReport = {
  kind: 'personal_plan_accepted_candidate_guarded_runtime_source';
  status: 'guarded_runtime_source_bound' | 'blocked';
  boundCandidateDays: number;
  totalAcceptedCandidateDays: 140;
  planCoverage: AcceptedCandidateGuardedRuntimeSourcePlanCoverage[];
  sourceRuntimeWriteApplied: boolean;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'day_surface_route_storage_regression_gate' | 'resolve_runtime_source_binding_blockers';
};

export type AcceptedCandidateGuardedRuntimeSourceIssueCode =
  | 'missing_candidate_day_binding'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type AcceptedCandidateGuardedRuntimeSourceValidation = {
  status: 'valid_guarded_runtime_source_binding' | 'invalid';
  issueCodes: AcceptedCandidateGuardedRuntimeSourceIssueCode[];
  boundCandidateDays: number;
  productionReady: false;
  nextRequiredStep: AcceptedCandidateGuardedRuntimeSourceReport['nextRequiredStep'];
};

const ACCEPTED_DAYS_PER_PLAN = 28;
const TOTAL_ACCEPTED_CANDIDATE_DAYS = 140;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildAcceptedCandidateGuardedRuntimeSourceReport(
  plans: PersonalPlanDefinition[],
): AcceptedCandidateGuardedRuntimeSourceReport {
  const planCoverage = plans.map((plan): AcceptedCandidateGuardedRuntimeSourcePlanCoverage => ({
    planId: plan.id,
    boundDays: plan.days.filter((day) =>
      day.dayIndex <= ACCEPTED_DAYS_PER_PLAN
      && day.source?.status === 'accepted_candidate_runtime_bound'
      && day.source.productionReady === false
      && day.source.liveRegistrationAllowed === false
      && day.source.generatedContentCreationAllowed === false
    ).length,
    totalAcceptedDays: ACCEPTED_DAYS_PER_PLAN,
  }));
  const boundCandidateDays = planCoverage.reduce((sum, row) => sum + row.boundDays, 0);
  const complete = boundCandidateDays === TOTAL_ACCEPTED_CANDIDATE_DAYS
    && planCoverage.every((row) => row.boundDays === row.totalAcceptedDays);

  return {
    kind: 'personal_plan_accepted_candidate_guarded_runtime_source',
    status: complete ? 'guarded_runtime_source_bound' : 'blocked',
    boundCandidateDays,
    totalAcceptedCandidateDays: TOTAL_ACCEPTED_CANDIDATE_DAYS,
    planCoverage,
    sourceRuntimeWriteApplied: complete,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: complete ? 'day_surface_route_storage_regression_gate' : 'resolve_runtime_source_binding_blockers',
  };
}

export function validateAcceptedCandidateGuardedRuntimeSourceReport(
  report: AcceptedCandidateGuardedRuntimeSourceReport,
): AcceptedCandidateGuardedRuntimeSourceValidation {
  const issueCodes: AcceptedCandidateGuardedRuntimeSourceIssueCode[] = [];

  if (report.boundCandidateDays !== report.totalAcceptedCandidateDays) {
    issueCodes.push('missing_candidate_day_binding');
  }
  if (report.planCoverage.some((row) => row.boundDays !== row.totalAcceptedDays)) {
    issueCodes.push('missing_candidate_day_binding');
  }
  if ((report as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((report as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((report as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_guarded_runtime_source_binding' : 'invalid',
    issueCodes: uniqueCodes,
    boundCandidateDays: report.boundCandidateDays,
    productionReady: false,
    nextRequiredStep: report.nextRequiredStep,
  };
}
