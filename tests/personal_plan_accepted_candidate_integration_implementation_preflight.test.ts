import type { AcceptedCandidateExplicitIntegrationPlan } from '../app/personal_plan_accepted_candidate_explicit_integration_plan';
import {
  buildAcceptedCandidateIntegrationImplementationPreflight,
  validateAcceptedCandidateIntegrationImplementationPreflight,
} from '../app/personal_plan_accepted_candidate_integration_implementation_preflight';

function plan(): AcceptedCandidateExplicitIntegrationPlan {
  const stages = [
    'catalog_mapping_design',
    'route_mapping_design',
    'ui_surface_binding_design',
    'storage_contract_compatibility_design',
    'asset_registry_hold_design',
    'test_fixture_plan_design',
  ] as const;
  const families = [
    'catalog_source',
    'route_source',
    'ui_surface',
    'storage_contract',
    'asset_registry',
    'test_fixture_source',
  ] as const;

  return {
    kind: 'personal_plan_accepted_candidate_explicit_integration_plan',
    status: 'ready_for_future_integration_implementation',
    runtimeSourceGuardStatus: 'valid_non_live_runtime_source_write_guard',
    totalCandidateDays: 140,
    importDayCount: 140,
    integrationStages: stages.map((stage, index) => ({
      stage,
      guardedFamily: families[index],
      writeStatus: 'planned_only',
      purpose: `Plan ${stage} without source writes.`,
      requiredVerification: ['typescript_no_emit'],
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      generatedContentCreationAllowed: false,
      productionReady: false,
    })),
    requiredVerification: [
      'accepted_candidate_import_format_jest',
      'accepted_candidate_runtime_source_write_guard_jest',
      'personal_plan_route_opening_regression_jest',
      'personal_plan_storage_contract_jest',
      'personal_plan_day_surface_jest',
      'typescript_no_emit',
    ],
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: 'integration_implementation_pass',
  };
}

describe('accepted candidate integration implementation preflight', () => {
  it('builds a non-live implementation preflight from the explicit integration plan', () => {
    const preflight = buildAcceptedCandidateIntegrationImplementationPreflight(plan());

    expect(preflight.kind).toBe('personal_plan_accepted_candidate_integration_implementation_preflight');
    expect(preflight.status).toBe('ready_for_guarded_implementation_pass');
    expect(preflight.totalCandidateDays).toBe(140);
    expect(preflight.importDayCount).toBe(140);
    expect(preflight.implementationRequests).toHaveLength(6);
    expect(preflight.implementationRequests.map((request) => request.family)).toEqual([
      'catalog_source',
      'route_source',
      'ui_surface',
      'storage_contract',
      'asset_registry',
      'test_fixture_source',
    ]);
    expect(preflight.implementationRequests.every((request) => request.applyStatus === 'not_applied')).toBe(true);
    expect(preflight.implementationRequests.every((request) => request.sourceRuntimeWriteAllowed === false)).toBe(true);
    expect(preflight.sourceRuntimeWriteAllowed).toBe(false);
    expect(preflight.liveRegistrationAllowed).toBe(false);
    expect(preflight.generatedContentCreationAllowed).toBe(false);
    expect(preflight.productionReady).toBe(false);
    expect(preflight.nextRequiredStep).toBe('guarded_source_runtime_implementation');
  });

  it('validates preflight shape and blocks fake write/live/production claims', () => {
    const preflight = buildAcceptedCandidateIntegrationImplementationPreflight(plan());

    expect(validateAcceptedCandidateIntegrationImplementationPreflight(preflight)).toEqual({
      status: 'valid_non_live_integration_implementation_preflight',
      issueCodes: [],
      totalCandidateDays: 140,
      importDayCount: 140,
      implementationRequestCount: 6,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'guarded_source_runtime_implementation',
    });

    expect(validateAcceptedCandidateIntegrationImplementationPreflight({
      ...preflight,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validateAcceptedCandidateIntegrationImplementationPreflight({
      ...preflight,
      liveRegistrationAllowed: true as any,
    }).issueCodes).toContain('live_registration_not_allowed');

    expect(validateAcceptedCandidateIntegrationImplementationPreflight({
      ...preflight,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });

  it('blocks invalid integration plans, missing requests, applied requests, and missing verification', () => {
    const blocked = buildAcceptedCandidateIntegrationImplementationPreflight({
      ...plan(),
      status: 'blocked',
    });

    expect(blocked.status).toBe('blocked');
    expect(validateAcceptedCandidateIntegrationImplementationPreflight(blocked).issueCodes).toContain('explicit_integration_plan_not_valid');

    const valid = buildAcceptedCandidateIntegrationImplementationPreflight(plan());

    expect(validateAcceptedCandidateIntegrationImplementationPreflight({
      ...valid,
      implementationRequests: valid.implementationRequests.slice(0, 5),
    }).issueCodes).toContain('missing_implementation_request');

    expect(validateAcceptedCandidateIntegrationImplementationPreflight({
      ...valid,
      implementationRequests: [{ ...valid.implementationRequests[0], applyStatus: 'applied' as any }],
    }).issueCodes).toContain('implementation_request_already_applied');

    expect(validateAcceptedCandidateIntegrationImplementationPreflight({
      ...valid,
      requiredVerification: valid.requiredVerification.filter((item) => item !== 'typescript_no_emit'),
    }).issueCodes).toContain('missing_required_verification');
  });
});
