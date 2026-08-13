import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import {
  buildPersonalPlanDaySurfaceRouteStorageRegressionGate,
  validatePersonalPlanDaySurfaceRouteStorageRegressionGate,
} from '../app/personal_plan_day_surface_route_storage_regression_gate';

describe('personal plan day surface route storage regression gate', () => {
  it('proves bound candidate days across day surface, routes, storage, and add-more behavior', () => {
    const gate = buildPersonalPlanDaySurfaceRouteStorageRegressionGate(PERSONAL_PLAN_CATALOG);

    expect(gate.kind).toBe('personal_plan_day_surface_route_storage_regression_gate');
    expect(gate.status).toBe('passed_guarded_regression_gate');
    expect(gate.boundCandidateDaysChecked).toBe(140);
    expect(gate.routeDestinationsChecked).toBeGreaterThanOrEqual(700);
    expect(gate.lessonRouteDestinations).toBe(0);
    expect(gate.daySurfaceFailures).toBe(0);
    expect(gate.storageScopeFailures).toBe(0);
    expect(gate.addMoreFailures).toBe(0);
    expect(gate.sourceRuntimeWriteApplied).toBe(true);
    expect(gate.liveRegistrationAllowed).toBe(false);
    expect(gate.generatedContentCreationAllowed).toBe(false);
    expect(gate.productionReady).toBe(false);
    expect(gate.nextRequiredStep).toBe('audio_pronunciation_and_human_review_readiness');
  });

  it('validates fake readiness and route/storage regressions as blockers', () => {
    const gate = buildPersonalPlanDaySurfaceRouteStorageRegressionGate(PERSONAL_PLAN_CATALOG);

    expect(validatePersonalPlanDaySurfaceRouteStorageRegressionGate(gate)).toEqual({
      status: 'valid_day_surface_route_storage_regression_gate',
      issueCodes: [],
      boundCandidateDaysChecked: 140,
      productionReady: false,
      nextRequiredStep: 'audio_pronunciation_and_human_review_readiness',
    });

    expect(validatePersonalPlanDaySurfaceRouteStorageRegressionGate({
      ...gate,
      lessonRouteDestinations: 1,
    }).issueCodes).toContain('lesson_route_destination_regression');

    expect(validatePersonalPlanDaySurfaceRouteStorageRegressionGate({
      ...gate,
      storageScopeFailures: 1,
    }).issueCodes).toContain('storage_scope_regression');

    expect(validatePersonalPlanDaySurfaceRouteStorageRegressionGate({
      ...gate,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });
});
