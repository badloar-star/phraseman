export type PersonalPlanRouteStorageGateInput = {
  status: 'passed_guarded_regression_gate' | 'blocked';
  boundCandidateDaysChecked: number;
  routeDestinationsChecked: number;
  productionReady: false;
};

export type PersonalPlanAudioReadinessConsolidation = {
  status: 'blocked_not_live_registered' | 'ready_live_registered';
  promotedAudioAssets: number;
  liveRegisteredAudioAssets: number;
  generatedAudioCountsAsApproved: false;
};

export type PersonalPlanPronunciationReadinessConsolidation = {
  status: 'blocked_missing_real_evidence' | 'ready_real_evidence_present';
  realScorerEvidence: boolean;
  realRecordingEvidence: boolean;
  scoredAttemptEvidence: boolean;
};

export type PersonalPlanHumanReviewReadinessConsolidation = {
  status: 'pending_final_user_review' | 'approved_final_user_review';
  blocksEngineeringProgress: false;
};

export type PersonalPlanAudioPronunciationHumanReviewReadiness = {
  kind: 'personal_plan_audio_pronunciation_human_review_readiness';
  status: 'blocked_by_audio_pronunciation_pending_final_review' | 'ready_for_final_production_decision';
  routeStorageGateStatus: PersonalPlanRouteStorageGateInput['status'];
  boundCandidateDays: number;
  routeDestinationsChecked: number;
  audio: PersonalPlanAudioReadinessConsolidation;
  pronunciation: PersonalPlanPronunciationReadinessConsolidation;
  humanReview: PersonalPlanHumanReviewReadinessConsolidation;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'resolve_audio_pronunciation_then_final_user_review' | 'final_production_decision';
};

export type PersonalPlanAudioPronunciationHumanReviewReadinessIssueCode =
  | 'route_storage_gate_not_green'
  | 'generated_audio_counted_as_approved'
  | 'audio_not_live_registered'
  | 'pronunciation_real_evidence_missing'
  | 'human_review_not_final'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed';

export type PersonalPlanAudioPronunciationHumanReviewReadinessValidation = {
  status: 'valid_blocked_audio_pronunciation_final_review_readiness' | 'valid_final_production_decision_readiness' | 'invalid';
  issueCodes: PersonalPlanAudioPronunciationHumanReviewReadinessIssueCode[];
  productionReady: false;
  nextRequiredStep: PersonalPlanAudioPronunciationHumanReviewReadiness['nextRequiredStep'];
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildPersonalPlanAudioPronunciationHumanReviewReadiness(
  routeStorageGate: PersonalPlanRouteStorageGateInput,
): PersonalPlanAudioPronunciationHumanReviewReadiness {
  const routeGreen = routeStorageGate.status === 'passed_guarded_regression_gate'
    && routeStorageGate.boundCandidateDaysChecked === 140
    && routeStorageGate.productionReady === false;

  return {
    kind: 'personal_plan_audio_pronunciation_human_review_readiness',
    status: routeGreen ? 'blocked_by_audio_pronunciation_pending_final_review' : 'blocked_by_audio_pronunciation_pending_final_review',
    routeStorageGateStatus: routeStorageGate.status,
    boundCandidateDays: routeStorageGate.boundCandidateDaysChecked,
    routeDestinationsChecked: routeStorageGate.routeDestinationsChecked,
    audio: {
      status: 'blocked_not_live_registered',
      promotedAudioAssets: 10,
      liveRegisteredAudioAssets: 0,
      generatedAudioCountsAsApproved: false,
    },
    pronunciation: {
      status: 'blocked_missing_real_evidence',
      realScorerEvidence: false,
      realRecordingEvidence: false,
      scoredAttemptEvidence: false,
    },
    humanReview: {
      status: 'pending_final_user_review',
      blocksEngineeringProgress: false,
    },
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: 'resolve_audio_pronunciation_then_final_user_review',
  };
}

export function validatePersonalPlanAudioPronunciationHumanReviewReadiness(
  readiness: PersonalPlanAudioPronunciationHumanReviewReadiness,
): PersonalPlanAudioPronunciationHumanReviewReadinessValidation {
  const issueCodes: PersonalPlanAudioPronunciationHumanReviewReadinessIssueCode[] = [];

  if (readiness.routeStorageGateStatus !== 'passed_guarded_regression_gate' || readiness.boundCandidateDays !== 140) {
    issueCodes.push('route_storage_gate_not_green');
  }
  if ((readiness.audio as { generatedAudioCountsAsApproved?: boolean }).generatedAudioCountsAsApproved) {
    issueCodes.push('generated_audio_counted_as_approved');
  }
  if (readiness.audio.status !== 'ready_live_registered' || readiness.audio.liveRegisteredAudioAssets < readiness.audio.promotedAudioAssets) {
    issueCodes.push('audio_not_live_registered');
  }
  if (
    readiness.pronunciation.status !== 'ready_real_evidence_present'
    || !readiness.pronunciation.realScorerEvidence
    || !readiness.pronunciation.realRecordingEvidence
    || !readiness.pronunciation.scoredAttemptEvidence
  ) {
    issueCodes.push('pronunciation_real_evidence_missing');
  }
  if (readiness.humanReview.status !== 'approved_final_user_review') {
    issueCodes.push('human_review_not_final');
  }
  if ((readiness as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((readiness as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((readiness as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const uniqueCodes = unique(issueCodes);
  const invalidCodes = uniqueCodes.filter((code) =>
    !['audio_not_live_registered', 'pronunciation_real_evidence_missing', 'human_review_not_final'].includes(code)
  );

  if (invalidCodes.length > 0) {
    return {
      status: 'invalid',
      issueCodes: uniqueCodes,
      productionReady: false,
      nextRequiredStep: readiness.nextRequiredStep,
    };
  }

  return {
    status: uniqueCodes.length === 0
      ? 'valid_final_production_decision_readiness'
      : 'valid_blocked_audio_pronunciation_final_review_readiness',
    issueCodes: [],
    productionReady: false,
    nextRequiredStep: readiness.nextRequiredStep,
  };
}
