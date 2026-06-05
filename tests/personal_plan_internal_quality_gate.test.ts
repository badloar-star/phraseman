import progressData from '../docs/reports/personal-plans-fill-progress-data.json';
import { buildPersonalPlanBulkGenerationReviewQueue } from '../app/personal_plan_bulk_generation_review_queue';
import {
  buildPersonalPlanInternalQualityGate,
  validatePersonalPlanInternalQualityGate,
} from '../app/personal_plan_internal_quality_gate';

describe('personal plan internal quality gate', () => {
  it('scores the 140 queued chat-draft candidate days without claiming production readiness', () => {
    const queue = buildPersonalPlanBulkGenerationReviewQueue(progressData);
    const gate = buildPersonalPlanInternalQualityGate(queue);

    expect(gate.kind).toBe('personal_plan_internal_quality_gate');
    expect(gate.status).toBe('ready_for_source_intake_preflight');
    expect(gate.totalCandidateDays).toBe(140);
    expect(gate.acceptedCandidateDays).toBe(140);
    expect(gate.reworkRequiredDays).toBe(0);
    expect(gate.blockedDays).toBe(0);
    expect(gate.productionReady).toBe(false);
    expect(gate.sourceRuntimeWriteAllowed).toBe(false);
    expect(gate.liveRegistrationAllowed).toBe(false);
    expect(gate.generatedContentCreationAllowed).toBe(false);
    expect(gate.nextRequiredStep).toBe('source_intake_preflight');
    expect(gate.rows.every((row) => row.productionReady === false)).toBe(true);
    expect(gate.rows.every((row) => row.sourceRuntimeWriteAllowed === false)).toBe(true);
    expect(gate.rows.every((row) => row.liveRegistrationAllowed === false)).toBe(true);
  });

  it('has no remaining lower-quality rows after rework resolution', () => {
    const gate = buildPersonalPlanInternalQualityGate(buildPersonalPlanBulkGenerationReviewQueue(progressData));
    const reworkLabels = gate.rows
      .filter((row) => row.qualityDecision === 'rework_required')
      .map((row) => row.label);

    expect(reworkLabels).toEqual([]);
    expect(gate.rows.find((row) => row.label === 'Gavan Day 1')).toEqual(expect.objectContaining({
      qualityDecision: 'accepted_for_source_intake_candidate',
      issueCodes: [],
      nextRequiredStep: 'source_intake_preflight_candidate',
    }));
  });

  it('validates the gate and blocks fake source/live readiness', () => {
    const gate = buildPersonalPlanInternalQualityGate(buildPersonalPlanBulkGenerationReviewQueue(progressData));

    expect(validatePersonalPlanInternalQualityGate(gate)).toEqual({
      status: 'valid_non_live_internal_quality_gate',
      issueCodes: [],
      totalCandidateDays: 140,
      acceptedCandidateDays: 140,
      reworkRequiredDays: 0,
      blockedDays: 0,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'source_intake_preflight',
    });

    expect(validatePersonalPlanInternalQualityGate({
      ...gate,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');

    expect(validatePersonalPlanInternalQualityGate({
      ...gate,
      rows: [{
        ...gate.rows[0],
        sourceRuntimeWriteAllowed: true as any,
      }],
    }).issueCodes).toContain('source_runtime_write_not_allowed');
  });
});
