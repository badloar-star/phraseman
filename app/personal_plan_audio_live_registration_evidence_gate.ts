import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';
import type { PersonalPlanAudioPronunciationHumanReviewReadiness } from './personal_plan_audio_pronunciation_human_review_readiness';

export type PersonalPlanAudioLiveRegistrationEvidenceGateStatus =
  | 'blocked_missing_live_registered_audio'
  | 'ready_live_registered_audio_evidence';

export type PersonalPlanAudioLiveRegistrationEvidenceGate = {
  kind: 'personal_plan_audio_live_registration_evidence_gate';
  status: PersonalPlanAudioLiveRegistrationEvidenceGateStatus;
  priorReadinessStatus: PersonalPlanAudioPronunciationHumanReviewReadiness['status'];
  promotedAudioAssets: number;
  runtimeAudioAssetsChecked: number;
  liveRegisteredAudioAssets: number;
  approvedFinalAudioAssets: number;
  generatedRuntimeAudioAssets: number;
  invalidRuntimeAudioAssets: number;
  generatedAudioCountsAsLiveRegistered: false;
  liveRegistrationAllowed: false;
  productionReady: false;
  nextRequiredStep:
    | 'register_approved_final_audio_assets_or_keep_listening_blocked'
    | 'update_audio_readiness_then_pronunciation_evidence_gate';
};

export type PersonalPlanAudioLiveRegistrationEvidenceGateIssueCode =
  | 'prior_audio_readiness_not_blocked_or_ready'
  | 'generated_audio_counted_as_live_registered'
  | 'invalid_runtime_audio_asset'
  | 'live_registered_audio_count_mismatch'
  | 'live_registration_not_allowed'
  | 'production_ready_not_allowed';

export type PersonalPlanAudioLiveRegistrationEvidenceGateValidation = {
  status:
    | 'valid_blocked_live_audio_registration_evidence'
    | 'valid_ready_live_audio_registration_evidence'
    | 'invalid';
  issueCodes: PersonalPlanAudioLiveRegistrationEvidenceGateIssueCode[];
  productionReady: false;
  nextRequiredStep: PersonalPlanAudioLiveRegistrationEvidenceGate['nextRequiredStep'];
};

export type BuildPersonalPlanAudioLiveRegistrationEvidenceGateInput = {
  readiness: PersonalPlanAudioPronunciationHumanReviewReadiness;
  runtimeAssets?: PlanAudioAsset[];
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isApprovedFinalAudioAsset(asset: PlanAudioAsset): boolean {
  const readiness = validatePlanAudioAsset(asset);
  return readiness.productionReady && readiness.issues.length === 0;
}

export function buildPersonalPlanAudioLiveRegistrationEvidenceGate(
  input: BuildPersonalPlanAudioLiveRegistrationEvidenceGateInput,
): PersonalPlanAudioLiveRegistrationEvidenceGate {
  const runtimeAssets = input.runtimeAssets ?? [];
  const approvedFinalAudioAssets = runtimeAssets.filter(isApprovedFinalAudioAsset).length;
  const generatedRuntimeAudioAssets = runtimeAssets.filter((asset) => asset.status === 'generated').length;
  const invalidRuntimeAudioAssets = runtimeAssets.filter((asset) => {
    const readiness = validatePlanAudioAsset(asset);
    return !readiness.validForAuthoring || readiness.issues.some((issue) =>
      issue.code === 'fake_final_audio_claim' || issue.code === 'failed_audio_asset_without_reason'
    );
  }).length;
  const promotedAudioAssets = input.readiness.audio.promotedAudioAssets;
  const ready = approvedFinalAudioAssets >= promotedAudioAssets;

  return {
    kind: 'personal_plan_audio_live_registration_evidence_gate',
    status: ready ? 'ready_live_registered_audio_evidence' : 'blocked_missing_live_registered_audio',
    priorReadinessStatus: input.readiness.status,
    promotedAudioAssets,
    runtimeAudioAssetsChecked: runtimeAssets.length,
    liveRegisteredAudioAssets: approvedFinalAudioAssets,
    approvedFinalAudioAssets,
    generatedRuntimeAudioAssets,
    invalidRuntimeAudioAssets,
    generatedAudioCountsAsLiveRegistered: false,
    liveRegistrationAllowed: false,
    productionReady: false,
    nextRequiredStep: ready
      ? 'update_audio_readiness_then_pronunciation_evidence_gate'
      : 'register_approved_final_audio_assets_or_keep_listening_blocked',
  };
}

export function validatePersonalPlanAudioLiveRegistrationEvidenceGate(
  gate: PersonalPlanAudioLiveRegistrationEvidenceGate,
): PersonalPlanAudioLiveRegistrationEvidenceGateValidation {
  const issueCodes: PersonalPlanAudioLiveRegistrationEvidenceGateIssueCode[] = [];

  if (![
    'blocked_by_audio_pronunciation_pending_final_review',
    'ready_for_final_production_decision',
  ].includes(gate.priorReadinessStatus)) {
    issueCodes.push('prior_audio_readiness_not_blocked_or_ready');
  }

  if ((gate as { generatedAudioCountsAsLiveRegistered?: boolean }).generatedAudioCountsAsLiveRegistered) {
    issueCodes.push('generated_audio_counted_as_live_registered');
  }

  if (gate.invalidRuntimeAudioAssets > 0) {
    issueCodes.push('invalid_runtime_audio_asset');
  }

  if (gate.liveRegisteredAudioAssets !== gate.approvedFinalAudioAssets) {
    issueCodes.push('live_registered_audio_count_mismatch');
  }

  if ((gate as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }

  if ((gate as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }

  const uniqueCodes = unique(issueCodes);
  if (uniqueCodes.length > 0) {
    return {
      status: 'invalid',
      issueCodes: uniqueCodes,
      productionReady: false,
      nextRequiredStep: gate.nextRequiredStep,
    };
  }

  return {
    status: gate.status === 'ready_live_registered_audio_evidence'
      ? 'valid_ready_live_audio_registration_evidence'
      : 'valid_blocked_live_audio_registration_evidence',
    issueCodes: [],
    productionReady: false,
    nextRequiredStep: gate.nextRequiredStep,
  };
}
