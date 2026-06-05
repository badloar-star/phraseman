import {
  buildPersonalPlanFullRebuildReadinessAudit,
  PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES,
} from '../app/personal_plan_full_rebuild_readiness_audit';

describe('personal plan full rebuild readiness audit', () => {
  it('audits every plan/day and exposes the real rebuild scope', () => {
    const audit = buildPersonalPlanFullRebuildReadinessAudit();

    expect(audit.kind).toBe('personal_plan_full_rebuild_readiness_audit');
    expect(audit.productionReady).toBe(false);
    expect(audit.totals).toEqual({
      plans: 5,
      days: 546,
      tasks: 4368,
      acceptedRuntimeBoundDays: 140,
      scaffoldDaysToRebuild: 406,
      certifiedDays: 1,
      authoredNeedsReviewDays: 139,
    });

    expect(audit.requiredModes).toEqual(PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES);
    expect(audit.modeCoverage).toEqual(Object.fromEntries(
      PERSONAL_PLAN_FULL_REBUILD_REQUIRED_MODES.map((mode) => [mode, 546]),
    ));
    expect(audit.plans.map((plan) => ({
      planId: plan.planId,
      days: plan.days,
      scaffoldDaysToRebuild: plan.scaffoldDaysToRebuild,
    }))).toEqual([
      { planId: 'voyazh', days: 84, scaffoldDaysToRebuild: 56 },
      { planId: 'mitap', days: 112, scaffoldDaysToRebuild: 84 },
      { planId: 'gavan', days: 126, scaffoldDaysToRebuild: 98 },
      { planId: 'impuls', days: 140, scaffoldDaysToRebuild: 112 },
      { planId: 'echo', days: 84, scaffoldDaysToRebuild: 56 },
    ]);
  });

  it('keeps the rebuild plan honest about what is ready and what still blocks launch', () => {
    const audit = buildPersonalPlanFullRebuildReadinessAudit();

    expect(audit.currentReadiness).toEqual([
      'All 546 days already have the full 8-mode task pool.',
      'All 4,368 generated tasks have launchable task material coverage.',
      'Selected daily time controls only the initial visible slice; add-more can reveal the remaining pool.',
      'Runtime audio is approved and registered for the generated listening assets.',
      '406 scaffold-generated days still need authored rebuild, review, and source/runtime approval before production readiness.',
    ]);
    expect(audit.blockers).toEqual([
      'Rebuild 406 scaffold-generated days into authored plan-native day packets.',
      'Run human/content review on every rebuilt day packet.',
      'Generate or map approved audio for listening tasks beyond the currently approved runtime set.',
      'Provide real pronunciation recordings/scored attempts before claiming pronunciation readiness.',
      'Capture final human acceptance after the rebuilt corpus and evidence gates pass.',
    ]);
    expect(audit.implementationPlan.map((phase) => phase.id)).toEqual([
      'audit-lock',
      'regenerate-day-packets',
      'materialize-modes',
      'review-and-evidence',
      'source-write-and-release-gate',
    ]);
  });
});
