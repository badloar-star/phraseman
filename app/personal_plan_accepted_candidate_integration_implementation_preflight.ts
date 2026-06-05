import type {
  AcceptedCandidateExplicitIntegrationPlan,
  AcceptedCandidateIntegrationVerification,
} from './personal_plan_accepted_candidate_explicit_integration_plan';
import { validateAcceptedCandidateExplicitIntegrationPlan } from './personal_plan_accepted_candidate_explicit_integration_plan';
import type { RuntimeSourceGuardFamily } from './personal_plan_generation_runtime_source_write_guard';

export type AcceptedCandidateImplementationRequest = {
  family: RuntimeSourceGuardFamily;
  applyStatus: 'not_applied';
  planStage: string;
  requiredVerification: AcceptedCandidateIntegrationVerification[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
};

export type AcceptedCandidateIntegrationImplementationPreflight = {
  kind: 'personal_plan_accepted_candidate_integration_implementation_preflight';
  status: 'ready_for_guarded_implementation_pass' | 'blocked';
  explicitIntegrationPlanStatus: 'valid_non_live_explicit_integration_plan' | 'invalid';
  totalCandidateDays: number;
  importDayCount: number;
  implementationRequests: AcceptedCandidateImplementationRequest[];
  requiredVerification: AcceptedCandidateIntegrationVerification[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'guarded_source_runtime_implementation' | 'resolve_explicit_integration_plan_blockers';
};

export type AcceptedCandidateIntegrationImplementationPreflightIssueCode =
  | 'explicit_integration_plan_not_valid'
  | 'missing_implementation_request'
  | 'implementation_request_already_applied'
  | 'missing_required_verification'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type AcceptedCandidateIntegrationImplementationPreflightValidation = {
  status: 'valid_non_live_integration_implementation_preflight' | 'invalid';
  issueCodes: AcceptedCandidateIntegrationImplementationPreflightIssueCode[];
  totalCandidateDays: number;
  importDayCount: number;
  implementationRequestCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: AcceptedCandidateIntegrationImplementationPreflight['nextRequiredStep'];
};

const REQUIRED_FAMILIES: RuntimeSourceGuardFamily[] = [
  'catalog_source',
  'route_source',
  'ui_surface',
  'storage_contract',
  'asset_registry',
  'test_fixture_source',
];

const REQUIRED_VERIFICATION: AcceptedCandidateIntegrationVerification[] = [
  'accepted_candidate_import_format_jest',
  'accepted_candidate_runtime_source_write_guard_jest',
  'personal_plan_route_opening_regression_jest',
  'personal_plan_storage_contract_jest',
  'personal_plan_day_surface_jest',
  'typescript_no_emit',
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildAcceptedCandidateIntegrationImplementationPreflight(
  plan: AcceptedCandidateExplicitIntegrationPlan,
): AcceptedCandidateIntegrationImplementationPreflight {
  const planValidation = validateAcceptedCandidateExplicitIntegrationPlan(plan);
  const planValid = planValidation.status === 'valid_non_live_explicit_integration_plan'
    && plan.status === 'ready_for_future_integration_implementation'
    && plan.nextRequiredStep === 'integration_implementation_pass';

  const implementationRequests = plan.integrationStages.map((stage): AcceptedCandidateImplementationRequest => ({
    family: stage.guardedFamily,
    applyStatus: 'not_applied',
    planStage: stage.stage,
    requiredVerification: stage.requiredVerification,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
  }));

  return {
    kind: 'personal_plan_accepted_candidate_integration_implementation_preflight',
    status: planValid ? 'ready_for_guarded_implementation_pass' : 'blocked',
    explicitIntegrationPlanStatus: planValid ? planValidation.status : 'invalid',
    totalCandidateDays: plan.totalCandidateDays,
    importDayCount: plan.importDayCount,
    implementationRequests,
    requiredVerification: plan.requiredVerification,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: planValid ? 'guarded_source_runtime_implementation' : 'resolve_explicit_integration_plan_blockers',
  };
}

export function validateAcceptedCandidateIntegrationImplementationPreflight(
  preflight: AcceptedCandidateIntegrationImplementationPreflight,
): AcceptedCandidateIntegrationImplementationPreflightValidation {
  const issueCodes: AcceptedCandidateIntegrationImplementationPreflightIssueCode[] = [];

  if (preflight.explicitIntegrationPlanStatus !== 'valid_non_live_explicit_integration_plan') {
    issueCodes.push('explicit_integration_plan_not_valid');
  }
  if ((preflight as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((preflight as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((preflight as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((preflight as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const requestFamilies = new Set(preflight.implementationRequests.map((request) => request.family));
  for (const family of REQUIRED_FAMILIES) {
    if (!requestFamilies.has(family)) {
      issueCodes.push('missing_implementation_request');
    }
  }

  for (const request of preflight.implementationRequests) {
    if (request.applyStatus !== 'not_applied') {
      issueCodes.push('implementation_request_already_applied');
    }
    if ((request as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if ((request as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
    if ((request as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
      issueCodes.push('generated_content_creation_not_allowed');
    }
    if ((request as { productionReady?: boolean }).productionReady) {
      issueCodes.push('production_ready_not_allowed');
    }
  }

  const verificationSet = new Set(preflight.requiredVerification);
  for (const verification of REQUIRED_VERIFICATION) {
    if (!verificationSet.has(verification)) {
      issueCodes.push('missing_required_verification');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_integration_implementation_preflight' : 'invalid',
    issueCodes: uniqueCodes,
    totalCandidateDays: preflight.totalCandidateDays,
    importDayCount: preflight.importDayCount,
    implementationRequestCount: preflight.implementationRequests.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: preflight.nextRequiredStep,
  };
}
