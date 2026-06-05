import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import {
  buildAcceptedCandidateGuardedRuntimeSourceReport,
  validateAcceptedCandidateGuardedRuntimeSourceReport,
} from '../app/personal_plan_accepted_candidate_guarded_runtime_source';

describe('accepted candidate guarded runtime source report', () => {
  it('summarizes the guarded runtime/source implementation without fake readiness', () => {
    const report = buildAcceptedCandidateGuardedRuntimeSourceReport(PERSONAL_PLAN_CATALOG);

    expect(report.kind).toBe('personal_plan_accepted_candidate_guarded_runtime_source');
    expect(report.status).toBe('guarded_runtime_source_bound');
    expect(report.boundCandidateDays).toBe(140);
    expect(report.totalAcceptedCandidateDays).toBe(140);
    expect(report.planCoverage).toEqual([
      { planId: 'voyazh', boundDays: 28, totalAcceptedDays: 28 },
      { planId: 'mitap', boundDays: 28, totalAcceptedDays: 28 },
      { planId: 'gavan', boundDays: 28, totalAcceptedDays: 28 },
      { planId: 'impuls', boundDays: 28, totalAcceptedDays: 28 },
      { planId: 'echo', boundDays: 28, totalAcceptedDays: 28 },
    ]);
    expect(report.sourceRuntimeWriteApplied).toBe(true);
    expect(report.liveRegistrationAllowed).toBe(false);
    expect(report.generatedContentCreationAllowed).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.nextRequiredStep).toBe('day_surface_route_storage_regression_gate');
  });

  it('validates missing coverage and fake readiness as blockers', () => {
    const report = buildAcceptedCandidateGuardedRuntimeSourceReport(PERSONAL_PLAN_CATALOG);
    expect(validateAcceptedCandidateGuardedRuntimeSourceReport(report)).toEqual({
      status: 'valid_guarded_runtime_source_binding',
      issueCodes: [],
      boundCandidateDays: 140,
      productionReady: false,
      nextRequiredStep: 'day_surface_route_storage_regression_gate',
    });

    expect(validateAcceptedCandidateGuardedRuntimeSourceReport({
      ...report,
      boundCandidateDays: 139,
    }).issueCodes).toContain('missing_candidate_day_binding');

    expect(validateAcceptedCandidateGuardedRuntimeSourceReport({
      ...report,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });
});
