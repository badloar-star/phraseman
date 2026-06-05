import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';
import type { PersonalPlanRuntimeAudioApprovalIntake } from './personal_plan_runtime_audio_approval_intake';

export type PersonalPlanRuntimeAudioRegistrySourceRegistrationStatus =
  | 'blocked_before_runtime_audio_approval'
  | 'ready_for_guarded_runtime_registry_source_write';

export type PersonalPlanRuntimeAudioRegistrySourceRegistrationRow = {
  assetId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  uri: string;
  provider: PlanAudioAsset['provider'];
  voiceId: string;
  registryCandidateReady: boolean;
  sourceWriteAllowed: false;
  runtimeRegistryWriteAllowed: false;
};

export type PersonalPlanRuntimeAudioRegistrySourceRegistration = {
  kind: 'personal_plan_runtime_audio_registry_source_registration';
  generatedAt: string;
  registrationOwnerId: string;
  sourceApprovalIntakeStatus: PersonalPlanRuntimeAudioApprovalIntake['status'];
  status: PersonalPlanRuntimeAudioRegistrySourceRegistrationStatus;
  approvedFinalAssetCount: number;
  registryCandidateCount: number;
  sourceWriteAllowed: false;
  runtimeRegistryWriteAllowed: false;
  readyForLive: false;
  productionReady: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  plannedSourceTargets: ['app/personal_plan_audio_asset_registry.ts'];
  rows: PersonalPlanRuntimeAudioRegistrySourceRegistrationRow[];
  nextRequiredStep:
    | 'complete_runtime_audio_approval_intake'
    | 'apply_guarded_runtime_audio_registry_source_write';
};

export type BuildPersonalPlanRuntimeAudioRegistrySourceRegistrationInput = {
  generatedAt: string;
  registrationOwnerId: string;
  approvalIntake: PersonalPlanRuntimeAudioApprovalIntake;
};

function rowForAsset(asset: PlanAudioAsset): PersonalPlanRuntimeAudioRegistrySourceRegistrationRow {
  return {
    assetId: asset.assetId ?? asset.id,
    blockId: asset.blockId,
    contentUnitIds: [...asset.contentUnitIds],
    targetText: asset.targetText,
    uri: asset.uri ?? '',
    provider: asset.provider,
    voiceId: asset.voiceId ?? '',
    registryCandidateReady: true,
    sourceWriteAllowed: false,
    runtimeRegistryWriteAllowed: false,
  };
}

export function buildPersonalPlanRuntimeAudioRegistrySourceRegistration(
  input: BuildPersonalPlanRuntimeAudioRegistrySourceRegistrationInput,
): PersonalPlanRuntimeAudioRegistrySourceRegistration {
  const ready = input.approvalIntake.status === 'ready_for_guarded_runtime_audio_registry';
  const rows = ready
    ? input.approvalIntake.approvedAssets.map(rowForAsset)
    : [];

  return {
    kind: 'personal_plan_runtime_audio_registry_source_registration',
    generatedAt: input.generatedAt,
    registrationOwnerId: input.registrationOwnerId,
    sourceApprovalIntakeStatus: input.approvalIntake.status,
    status: ready
      ? 'ready_for_guarded_runtime_registry_source_write'
      : 'blocked_before_runtime_audio_approval',
    approvedFinalAssetCount: input.approvalIntake.approvedFinalAssetCount,
    registryCandidateCount: rows.length,
    sourceWriteAllowed: false,
    runtimeRegistryWriteAllowed: false,
    readyForLive: false,
    productionReady: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    plannedSourceTargets: ['app/personal_plan_audio_asset_registry.ts'],
    rows,
    nextRequiredStep: ready
      ? 'apply_guarded_runtime_audio_registry_source_write'
      : 'complete_runtime_audio_approval_intake',
  };
}
