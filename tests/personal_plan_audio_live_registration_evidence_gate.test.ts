import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import type { PersonalPlanAudioPronunciationHumanReviewReadiness } from '../app/personal_plan_audio_pronunciation_human_review_readiness';
import {
  buildPersonalPlanAudioLiveRegistrationEvidenceGate,
  validatePersonalPlanAudioLiveRegistrationEvidenceGate,
} from '../app/personal_plan_audio_live_registration_evidence_gate';

const readiness: PersonalPlanAudioPronunciationHumanReviewReadiness = {
  kind: 'personal_plan_audio_pronunciation_human_review_readiness',
  status: 'blocked_by_audio_pronunciation_pending_final_review',
  routeStorageGateStatus: 'passed_guarded_regression_gate',
  boundCandidateDays: 140,
  routeDestinationsChecked: 1139,
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

function approvedAsset(index: number): PlanAudioAsset {
  return {
    id: `approved-audio-${index}`,
    blockId: `block-${index}`,
    contentUnitIds: [`content-${index}`],
    targetText: `Approved target ${index}`,
    locale: 'en',
    status: 'approved',
    assetId: `asset-${index}`,
    uri: `assets/audio/personal-plans/approved-${index}.mp3`,
    durationMs: 1200 + index,
    voiceId: 'approved-voice',
    provider: 'openai',
    finalAssetReady: true,
  };
}

function generatedAsset(index: number): PlanAudioAsset {
  return {
    ...approvedAsset(index),
    id: `generated-audio-${index}`,
    status: 'generated',
    finalAssetReady: false,
  };
}

describe('personal plan audio live registration evidence gate', () => {
  it('keeps promoted audio blocked when no approved final assets are live registered', () => {
    const gate = buildPersonalPlanAudioLiveRegistrationEvidenceGate({
      readiness,
      runtimeAssets: [],
    });

    expect(gate.kind).toBe('personal_plan_audio_live_registration_evidence_gate');
    expect(gate.status).toBe('blocked_missing_live_registered_audio');
    expect(gate.promotedAudioAssets).toBe(10);
    expect(gate.liveRegisteredAudioAssets).toBe(0);
    expect(gate.approvedFinalAudioAssets).toBe(0);
    expect(gate.generatedRuntimeAudioAssets).toBe(0);
    expect(gate.generatedAudioCountsAsLiveRegistered).toBe(false);
    expect(gate.liveRegistrationAllowed).toBe(false);
    expect(gate.productionReady).toBe(false);
    expect(gate.nextRequiredStep).toBe('register_approved_final_audio_assets_or_keep_listening_blocked');

    expect(validatePersonalPlanAudioLiveRegistrationEvidenceGate(gate)).toEqual({
      status: 'valid_blocked_live_audio_registration_evidence',
      issueCodes: [],
      productionReady: false,
      nextRequiredStep: 'register_approved_final_audio_assets_or_keep_listening_blocked',
    });
  });

  it('recognizes exactly ten approved final runtime assets without claiming production readiness', () => {
    const gate = buildPersonalPlanAudioLiveRegistrationEvidenceGate({
      readiness,
      runtimeAssets: Array.from({ length: 10 }, (_, index) => approvedAsset(index + 1)),
    });

    expect(gate.status).toBe('ready_live_registered_audio_evidence');
    expect(gate.liveRegisteredAudioAssets).toBe(10);
    expect(gate.approvedFinalAudioAssets).toBe(10);
    expect(gate.generatedRuntimeAudioAssets).toBe(0);
    expect(gate.generatedAudioCountsAsLiveRegistered).toBe(false);
    expect(gate.productionReady).toBe(false);
    expect(gate.nextRequiredStep).toBe('update_audio_readiness_then_pronunciation_evidence_gate');

    expect(validatePersonalPlanAudioLiveRegistrationEvidenceGate(gate)).toEqual({
      status: 'valid_ready_live_audio_registration_evidence',
      issueCodes: [],
      productionReady: false,
      nextRequiredStep: 'update_audio_readiness_then_pronunciation_evidence_gate',
    });
  });

  it('rejects generated or fake final runtime audio as live registered evidence', () => {
    const gate = buildPersonalPlanAudioLiveRegistrationEvidenceGate({
      readiness,
      runtimeAssets: Array.from({ length: 10 }, (_, index) => generatedAsset(index + 1)),
    });

    expect(gate.status).toBe('blocked_missing_live_registered_audio');
    expect(gate.liveRegisteredAudioAssets).toBe(0);
    expect(gate.approvedFinalAudioAssets).toBe(0);
    expect(gate.generatedRuntimeAudioAssets).toBe(10);
    expect(gate.generatedAudioCountsAsLiveRegistered).toBe(false);
    expect(validatePersonalPlanAudioLiveRegistrationEvidenceGate({
      ...gate,
      generatedAudioCountsAsLiveRegistered: true as any,
    }).issueCodes).toContain('generated_audio_counted_as_live_registered');
    expect(validatePersonalPlanAudioLiveRegistrationEvidenceGate({
      ...gate,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });
});
