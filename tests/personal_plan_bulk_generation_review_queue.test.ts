import progressData from '../docs/reports/personal-plans-fill-progress-data.json';
import {
  buildPersonalPlanBulkGenerationReviewQueue,
  validatePersonalPlanBulkGenerationReviewQueue,
} from '../app/personal_plan_bulk_generation_review_queue';

describe('personal plan bulk generation review queue', () => {
  it('turns the completed 28-day chat draft cycle into a non-live internal quality queue', () => {
    const queue = buildPersonalPlanBulkGenerationReviewQueue(progressData);

    expect(queue.kind).toBe('personal_plan_bulk_generation_review_queue');
    expect(queue.status).toBe('ready_for_internal_quality_gate');
    expect(queue.productionReady).toBe(false);
    expect(queue.sourceRuntimeWriteAllowed).toBe(false);
    expect(queue.liveRegistrationAllowed).toBe(false);
    expect(queue.generatedContentCreationAllowed).toBe(false);
    expect(queue.totalCandidateDays).toBe(140);
    expect(queue.coverage).toEqual({
      voyazh: { candidateDays: 28, expectedCycleDays: 28 },
      mitap: { candidateDays: 28, expectedCycleDays: 28 },
      gavan: { candidateDays: 28, expectedCycleDays: 28 },
      impuls: { candidateDays: 28, expectedCycleDays: 28 },
      echo: { candidateDays: 28, expectedCycleDays: 28 },
    });
    expect(queue.rows[0]).toEqual(expect.objectContaining({
      status: 'queued_for_internal_quality_gate',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      productionReady: false,
      nextRequiredStep: 'internal_quality_gate',
    }));
  });

  it('validates the queue and blocks fake readiness or source writes', () => {
    const queue = buildPersonalPlanBulkGenerationReviewQueue(progressData);

    expect(validatePersonalPlanBulkGenerationReviewQueue(queue)).toEqual({
      status: 'valid_non_live_internal_quality_queue',
      issueCodes: [],
      totalCandidateDays: 140,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'internal_quality_gate',
    });

    expect(validatePersonalPlanBulkGenerationReviewQueue({
      ...queue,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');

    expect(validatePersonalPlanBulkGenerationReviewQueue({
      ...queue,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');
  });

  it('blocks incomplete or non-draft progress data', () => {
    const queue = buildPersonalPlanBulkGenerationReviewQueue({
      ...progressData,
      productionReady: true,
      dayQuality: progressData.dayQuality.slice(0, 10),
    });

    expect(queue.status).toBe('blocked');
    expect(queue.issueCodes).toEqual(expect.arrayContaining([
      'progress_data_production_ready_not_allowed',
      'missing_cycle_candidate_days',
    ]));
    expect(queue.sourceRuntimeWriteAllowed).toBe(false);
    expect(queue.liveRegistrationAllowed).toBe(false);
  });
});
