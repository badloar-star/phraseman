import {
  buildPersonalPlanAudioPronunciationHumanReviewReadiness,
  validatePersonalPlanAudioPronunciationHumanReviewReadiness,
} from '../app/personal_plan_audio_pronunciation_human_review_readiness';

const routeStorageGate = {
  kind: 'personal_plan_day_surface_route_storage_regression_gate',
  status: 'passed_guarded_regression_gate',
  boundCandidateDaysChecked: 140,
  routeDestinationsChecked: 1139,
  lessonRouteDestinations: 0,
  daySurfaceFailures: 0,
  storageScopeFailures: 0,
  addMoreFailures: 0,
  sourceRuntimeWriteApplied: true,
  liveRegistrationAllowed: false,
  generatedContentCreationAllowed: false,
  productionReady: false,
  nextRequiredStep: 'audio_pronunciation_and_human_review_readiness',
} as const;

describe('personal plan audio pronunciation human review readiness consolidation', () => {
  it('keeps runtime route readiness green while consolidating remaining non-fake final blockers', () => {
    const readiness = buildPersonalPlanAudioPronunciationHumanReviewReadiness(routeStorageGate);

    expect(readiness.kind).toBe('personal_plan_audio_pronunciation_human_review_readiness');
    expect(readiness.status).toBe('blocked_by_audio_pronunciation_pending_final_review');
    expect(readiness.routeStorageGateStatus).toBe('passed_guarded_regression_gate');
    expect(readiness.boundCandidateDays).toBe(140);
    expect(readiness.routeDestinationsChecked).toBe(1139);
    expect(readiness.audio.status).toBe('blocked_not_live_registered');
    expect(readiness.audio.promotedAudioAssets).toBeGreaterThanOrEqual(10);
    expect(readiness.audio.liveRegisteredAudioAssets).toBe(0);
    expect(readiness.audio.generatedAudioCountsAsApproved).toBe(false);
    expect(readiness.pronunciation.status).toBe('blocked_missing_real_evidence');
    expect(readiness.pronunciation.realScorerEvidence).toBe(false);
    expect(readiness.pronunciation.realRecordingEvidence).toBe(false);
    expect(readiness.pronunciation.scoredAttemptEvidence).toBe(false);
    expect(readiness.humanReview.status).toBe('pending_final_user_review');
    expect(readiness.humanReview.blocksEngineeringProgress).toBe(false);
    expect(readiness.liveRegistrationAllowed).toBe(false);
    expect(readiness.productionReady).toBe(false);
    expect(readiness.nextRequiredStep).toBe('resolve_audio_pronunciation_then_final_user_review');
  });

  it('validates fake production readiness and missing prior route gate as blockers', () => {
    const readiness = buildPersonalPlanAudioPronunciationHumanReviewReadiness(routeStorageGate);

    expect(validatePersonalPlanAudioPronunciationHumanReviewReadiness(readiness)).toEqual({
      status: 'valid_blocked_audio_pronunciation_final_review_readiness',
      issueCodes: [],
      productionReady: false,
      nextRequiredStep: 'resolve_audio_pronunciation_then_final_user_review',
    });

    expect(validatePersonalPlanAudioPronunciationHumanReviewReadiness({
      ...readiness,
      routeStorageGateStatus: 'blocked' as any,
    }).issueCodes).toContain('route_storage_gate_not_green');

    expect(validatePersonalPlanAudioPronunciationHumanReviewReadiness({
      ...readiness,
      audio: {
        ...readiness.audio,
        generatedAudioCountsAsApproved: true as any,
      },
    }).issueCodes).toContain('generated_audio_counted_as_approved');

    expect(validatePersonalPlanAudioPronunciationHumanReviewReadiness({
      ...readiness,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });
});
