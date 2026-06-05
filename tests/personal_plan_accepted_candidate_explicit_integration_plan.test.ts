import type { AcceptedCandidateRuntimeSourceWriteGuard } from '../app/personal_plan_generation_runtime_source_write_guard';
import {
  buildAcceptedCandidateExplicitIntegrationPlan,
  validateAcceptedCandidateExplicitIntegrationPlan,
} from '../app/personal_plan_accepted_candidate_explicit_integration_plan';

function guard(): AcceptedCandidateRuntimeSourceWriteGuard {
  return {
    kind: 'personal_plan_accepted_candidate_runtime_source_write_guard',
    status: 'hold_before_integration_pass',
    importFormatStatus: 'valid_non_live_content_packet_import_format',
    totalCandidateDays: 140,
    importDayCount: 140,
    guardedFamilies: [
      'catalog_source',
      'route_source',
      'ui_surface',
      'storage_contract',
      'asset_registry',
      'test_fixture_source',
    ].map((family) => ({
      family: family as any,
      status: 'blocked_until_explicit_integration_plan' as const,
      reason: `Blocked ${family} until explicit integration plan.`,
    })),
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    integrationPassRequired: true,
    nextRequiredStep: 'explicit_integration_plan',
  };
}

describe('accepted candidate explicit integration plan', () => {
  it('builds a non-live integration plan for the 140-row corpus without applying writes', () => {
    const plan = buildAcceptedCandidateExplicitIntegrationPlan(guard());

    expect(plan.kind).toBe('personal_plan_accepted_candidate_explicit_integration_plan');
    expect(plan.status).toBe('ready_for_future_integration_implementation');
    expect(plan.totalCandidateDays).toBe(140);
    expect(plan.importDayCount).toBe(140);
    expect(plan.integrationStages.map((stage) => stage.stage)).toEqual([
      'catalog_mapping_design',
      'route_mapping_design',
      'ui_surface_binding_design',
      'storage_contract_compatibility_design',
      'asset_registry_hold_design',
      'test_fixture_plan_design',
    ]);
    expect(plan.integrationStages.every((stage) => stage.writeStatus === 'planned_only')).toBe(true);
    expect(plan.integrationStages.every((stage) => stage.sourceRuntimeWriteAllowed === false)).toBe(true);
    expect(plan.integrationStages.every((stage) => stage.liveRegistrationAllowed === false)).toBe(true);
    expect(plan.requiredVerification).toEqual(expect.arrayContaining([
      'accepted_candidate_import_format_jest',
      'accepted_candidate_runtime_source_write_guard_jest',
      'personal_plan_route_opening_regression_jest',
      'personal_plan_storage_contract_jest',
      'personal_plan_day_surface_jest',
      'typescript_no_emit',
    ]));
    expect(plan.sourceRuntimeWriteAllowed).toBe(false);
    expect(plan.liveRegistrationAllowed).toBe(false);
    expect(plan.generatedContentCreationAllowed).toBe(false);
    expect(plan.productionReady).toBe(false);
    expect(plan.nextRequiredStep).toBe('integration_implementation_pass');
  });

  it('validates the plan and blocks fake write/live/production claims', () => {
    const plan = buildAcceptedCandidateExplicitIntegrationPlan(guard());

    expect(validateAcceptedCandidateExplicitIntegrationPlan(plan)).toEqual({
      status: 'valid_non_live_explicit_integration_plan',
      issueCodes: [],
      totalCandidateDays: 140,
      importDayCount: 140,
      stageCount: 6,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'integration_implementation_pass',
    });

    expect(validateAcceptedCandidateExplicitIntegrationPlan({
      ...plan,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validateAcceptedCandidateExplicitIntegrationPlan({
      ...plan,
      liveRegistrationAllowed: true as any,
    }).issueCodes).toContain('live_registration_not_allowed');

    expect(validateAcceptedCandidateExplicitIntegrationPlan({
      ...plan,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });

  it('blocks invalid guards, missing stages, unplanned write stages, and missing verification', () => {
    const plan = buildAcceptedCandidateExplicitIntegrationPlan({
      ...guard(),
      importFormatStatus: 'invalid',
    });

    expect(plan.status).toBe('blocked');
    expect(validateAcceptedCandidateExplicitIntegrationPlan(plan).issueCodes).toContain('runtime_source_write_guard_not_valid');

    const valid = buildAcceptedCandidateExplicitIntegrationPlan(guard());
    expect(validateAcceptedCandidateExplicitIntegrationPlan({
      ...valid,
      integrationStages: valid.integrationStages.slice(0, 5),
    }).issueCodes).toContain('missing_integration_stage');

    expect(validateAcceptedCandidateExplicitIntegrationPlan({
      ...valid,
      integrationStages: [{ ...valid.integrationStages[0], writeStatus: 'applied' as any }],
    }).issueCodes).toContain('integration_stage_not_planned_only');

    expect(validateAcceptedCandidateExplicitIntegrationPlan({
      ...valid,
      requiredVerification: valid.requiredVerification.filter((item) => item !== 'typescript_no_emit'),
    }).issueCodes).toContain('missing_required_verification');
  });
});
