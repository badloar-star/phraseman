import progressData from '../docs/reports/personal-plans-fill-progress-data.json';
import { buildPersonalPlanBulkGenerationReviewQueue } from '../app/personal_plan_bulk_generation_review_queue';
import {
  buildPersonalPlanInternalQualityGate,
  validatePersonalPlanInternalQualityGate,
} from '../app/personal_plan_internal_quality_gate';

describe('personal plan internal quality gate rework resolution', () => {
  it('has no remaining rework rows after the six lower-quality candidate days are rewritten', () => {
    const gate = buildPersonalPlanInternalQualityGate(buildPersonalPlanBulkGenerationReviewQueue(progressData));

    expect(gate.status).toBe('ready_for_source_intake_preflight');
    expect(gate.totalCandidateDays).toBe(140);
    expect(gate.acceptedCandidateDays).toBe(140);
    expect(gate.reworkRequiredDays).toBe(0);
    expect(gate.blockedDays).toBe(0);
    expect(gate.nextRequiredStep).toBe('source_intake_preflight');
    expect(gate.productionReady).toBe(false);
    expect(gate.sourceRuntimeWriteAllowed).toBe(false);
    expect(gate.liveRegistrationAllowed).toBe(false);
    expect(gate.generatedContentCreationAllowed).toBe(false);

    expect(gate.rows.filter((row) => row.qualityDecision === 'rework_required')).toEqual([]);
    expect(validatePersonalPlanInternalQualityGate(gate)).toEqual(expect.objectContaining({
      status: 'valid_non_live_internal_quality_gate',
      acceptedCandidateDays: 140,
      reworkRequiredDays: 0,
      blockedDays: 0,
      nextRequiredStep: 'source_intake_preflight',
    }));
  });
});
