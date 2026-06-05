import type {
  AcceptedCandidateRuntimeSourceWriteGuard,
  RuntimeSourceGuardFamily,
} from './personal_plan_generation_runtime_source_write_guard';
import { validateAcceptedCandidateRuntimeSourceWriteGuard } from './personal_plan_generation_runtime_source_write_guard';

export type AcceptedCandidateIntegrationStage =
  | 'catalog_mapping_design'
  | 'route_mapping_design'
  | 'ui_surface_binding_design'
  | 'storage_contract_compatibility_design'
  | 'asset_registry_hold_design'
  | 'test_fixture_plan_design';

export type AcceptedCandidateIntegrationVerification =
  | 'accepted_candidate_import_format_jest'
  | 'accepted_candidate_runtime_source_write_guard_jest'
  | 'personal_plan_route_opening_regression_jest'
  | 'personal_plan_storage_contract_jest'
  | 'personal_plan_day_surface_jest'
  | 'typescript_no_emit';

export type AcceptedCandidateIntegrationStageRow = {
  stage: AcceptedCandidateIntegrationStage;
  guardedFamily: RuntimeSourceGuardFamily;
  writeStatus: 'planned_only';
  purpose: string;
  requiredVerification: AcceptedCandidateIntegrationVerification[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
};

export type AcceptedCandidateExplicitIntegrationPlan = {
  kind: 'personal_plan_accepted_candidate_explicit_integration_plan';
  status: 'ready_for_future_integration_implementation' | 'blocked';
  runtimeSourceGuardStatus: 'valid_non_live_runtime_source_write_guard' | 'invalid';
  totalCandidateDays: number;
  importDayCount: number;
  integrationStages: AcceptedCandidateIntegrationStageRow[];
  requiredVerification: AcceptedCandidateIntegrationVerification[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'integration_implementation_pass' | 'resolve_runtime_source_guard_blockers';
};

export type AcceptedCandidateExplicitIntegrationPlanIssueCode =
  | 'runtime_source_write_guard_not_valid'
  | 'missing_integration_stage'
  | 'integration_stage_not_planned_only'
  | 'missing_required_verification'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type AcceptedCandidateExplicitIntegrationPlanValidation = {
  status: 'valid_non_live_explicit_integration_plan' | 'invalid';
  issueCodes: AcceptedCandidateExplicitIntegrationPlanIssueCode[];
  totalCandidateDays: number;
  importDayCount: number;
  stageCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: AcceptedCandidateExplicitIntegrationPlan['nextRequiredStep'];
};

const REQUIRED_STAGES: AcceptedCandidateIntegrationStage[] = [
  'catalog_mapping_design',
  'route_mapping_design',
  'ui_surface_binding_design',
  'storage_contract_compatibility_design',
  'asset_registry_hold_design',
  'test_fixture_plan_design',
];

const REQUIRED_VERIFICATION: AcceptedCandidateIntegrationVerification[] = [
  'accepted_candidate_import_format_jest',
  'accepted_candidate_runtime_source_write_guard_jest',
  'personal_plan_route_opening_regression_jest',
  'personal_plan_storage_contract_jest',
  'personal_plan_day_surface_jest',
  'typescript_no_emit',
];

const STAGE_TO_FAMILY: Record<AcceptedCandidateIntegrationStage, RuntimeSourceGuardFamily> = {
  catalog_mapping_design: 'catalog_source',
  route_mapping_design: 'route_source',
  ui_surface_binding_design: 'ui_surface',
  storage_contract_compatibility_design: 'storage_contract',
  asset_registry_hold_design: 'asset_registry',
  test_fixture_plan_design: 'test_fixture_source',
};

const STAGE_PURPOSE: Record<AcceptedCandidateIntegrationStage, string> = {
  catalog_mapping_design: 'Map accepted plan/day candidates to future catalog entries without writing catalog source.',
  route_mapping_design: 'Design future route mappings without registering navigation or route source.',
  ui_surface_binding_design: 'Design how Personal Plan day surfaces will read imported packets without changing UI yet.',
  storage_contract_compatibility_design: 'Check state and persistence compatibility before storage contract changes.',
  asset_registry_hold_design: 'Keep generated/audio/image asset registration blocked until separate approval passes.',
  test_fixture_plan_design: 'Plan fixture and regression coverage without rewriting test fixtures as an import side effect.',
};

const STAGE_VERIFICATION: Record<AcceptedCandidateIntegrationStage, AcceptedCandidateIntegrationVerification[]> = {
  catalog_mapping_design: ['accepted_candidate_import_format_jest', 'personal_plan_day_surface_jest'],
  route_mapping_design: ['personal_plan_route_opening_regression_jest'],
  ui_surface_binding_design: ['personal_plan_day_surface_jest'],
  storage_contract_compatibility_design: ['personal_plan_storage_contract_jest'],
  asset_registry_hold_design: ['accepted_candidate_runtime_source_write_guard_jest'],
  test_fixture_plan_design: ['accepted_candidate_import_format_jest', 'typescript_no_emit'],
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function stageRows(): AcceptedCandidateIntegrationStageRow[] {
  return REQUIRED_STAGES.map((stage) => ({
    stage,
    guardedFamily: STAGE_TO_FAMILY[stage],
    writeStatus: 'planned_only',
    purpose: STAGE_PURPOSE[stage],
    requiredVerification: STAGE_VERIFICATION[stage],
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
  }));
}

export function buildAcceptedCandidateExplicitIntegrationPlan(
  guard: AcceptedCandidateRuntimeSourceWriteGuard,
): AcceptedCandidateExplicitIntegrationPlan {
  const guardValidation = validateAcceptedCandidateRuntimeSourceWriteGuard(guard);
  const guardValid = guardValidation.status === 'valid_non_live_runtime_source_write_guard';

  return {
    kind: 'personal_plan_accepted_candidate_explicit_integration_plan',
    status: guardValid ? 'ready_for_future_integration_implementation' : 'blocked',
    runtimeSourceGuardStatus: guardValidation.status,
    totalCandidateDays: guard.totalCandidateDays,
    importDayCount: guard.importDayCount,
    integrationStages: stageRows(),
    requiredVerification: REQUIRED_VERIFICATION,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: guardValid ? 'integration_implementation_pass' : 'resolve_runtime_source_guard_blockers',
  };
}

export function validateAcceptedCandidateExplicitIntegrationPlan(
  plan: AcceptedCandidateExplicitIntegrationPlan,
): AcceptedCandidateExplicitIntegrationPlanValidation {
  const issueCodes: AcceptedCandidateExplicitIntegrationPlanIssueCode[] = [];

  if (plan.runtimeSourceGuardStatus !== 'valid_non_live_runtime_source_write_guard') {
    issueCodes.push('runtime_source_write_guard_not_valid');
  }
  if ((plan as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((plan as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((plan as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((plan as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const stageSet = new Set(plan.integrationStages.map((stage) => stage.stage));
  for (const stage of REQUIRED_STAGES) {
    if (!stageSet.has(stage)) {
      issueCodes.push('missing_integration_stage');
    }
  }

  for (const stage of plan.integrationStages) {
    if (stage.writeStatus !== 'planned_only') {
      issueCodes.push('integration_stage_not_planned_only');
    }
    if ((stage as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
      issueCodes.push('source_runtime_write_not_allowed');
    }
    if ((stage as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
      issueCodes.push('live_registration_not_allowed');
    }
    if ((stage as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
      issueCodes.push('generated_content_creation_not_allowed');
    }
    if ((stage as { productionReady?: boolean }).productionReady) {
      issueCodes.push('production_ready_not_allowed');
    }
  }

  const verificationSet = new Set(plan.requiredVerification);
  for (const verification of REQUIRED_VERIFICATION) {
    if (!verificationSet.has(verification)) {
      issueCodes.push('missing_required_verification');
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_explicit_integration_plan' : 'invalid',
    issueCodes: uniqueCodes,
    totalCandidateDays: plan.totalCandidateDays,
    importDayCount: plan.importDayCount,
    stageCount: plan.integrationStages.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: plan.nextRequiredStep,
  };
}
