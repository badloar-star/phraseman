import {
  checksumPlanAudioAsset,
} from './personal_plan_audio_approval_gate';
import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
  type PlanAudioAssetIssueCode,
} from './personal_plan_audio_asset_readiness';

export type PersonalPlanRuntimeAudioApprovalReviewPacketStatus =
  | 'blocked_missing_generated_audio'
  | 'blocked_invalid_generated_audio'
  | 'ready_for_human_audio_review';

export type PersonalPlanRuntimeAudioApprovalReviewRow = {
  assetId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  uri: string;
  durationMs: number;
  voiceId: string;
  provider: PlanAudioAsset['provider'];
  audioChecksum: string;
  reviewStatus: 'pending_human_review';
  approvalRecordReady: false;
};

export type PersonalPlanRuntimeAudioApprovalReviewInvalidAsset = {
  assetId: string;
  issueCodes: PlanAudioAssetIssueCode[];
};

export type PersonalPlanRuntimeAudioApprovalReviewPacket = {
  kind: 'personal_plan_runtime_audio_approval_review_packet';
  generatedAt: string;
  reviewOwnerId: string;
  status: PersonalPlanRuntimeAudioApprovalReviewPacketStatus;
  generatedAssetCount: number;
  reviewRowCount: number;
  invalidGeneratedAssetCount: number;
  approvalRecordCount: 0;
  approvalMayBeInferred: false;
  approvalRecordsCreated: false;
  readyForLive: false;
  productionReady: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  rows: PersonalPlanRuntimeAudioApprovalReviewRow[];
  invalidGeneratedAssets: PersonalPlanRuntimeAudioApprovalReviewInvalidAsset[];
  nextRequiredStep:
    | 'generate_runtime_audio_assets'
    | 'fix_invalid_generated_runtime_audio'
    | 'human_listen_and_create_explicit_approval_records';
};

export type BuildPersonalPlanRuntimeAudioApprovalReviewPacketInput = {
  generatedAt: string;
  reviewOwnerId: string;
  generatedAssets: PlanAudioAsset[];
};

function assetId(asset: PlanAudioAsset): string {
  return asset.assetId ?? asset.id;
}

function isValidGeneratedAudio(asset: PlanAudioAsset): boolean {
  const readiness = validatePlanAudioAsset(asset);
  return asset.status === 'generated' && readiness.validForAuthoring && readiness.issues.length === 0;
}

function rowForAsset(asset: PlanAudioAsset): PersonalPlanRuntimeAudioApprovalReviewRow {
  return {
    assetId: assetId(asset),
    blockId: asset.blockId,
    contentUnitIds: [...asset.contentUnitIds],
    targetText: asset.targetText,
    uri: asset.uri ?? '',
    durationMs: asset.durationMs ?? 0,
    voiceId: asset.voiceId ?? '',
    provider: asset.provider,
    audioChecksum: checksumPlanAudioAsset(asset),
    reviewStatus: 'pending_human_review',
    approvalRecordReady: false,
  };
}

function invalidAsset(asset: PlanAudioAsset): PersonalPlanRuntimeAudioApprovalReviewInvalidAsset {
  const readiness = validatePlanAudioAsset(asset);
  return {
    assetId: assetId(asset),
    issueCodes: readiness.issues.map((issue) => issue.code),
  };
}

function statusForCounts(
  generatedAssetCount: number,
  invalidGeneratedAssetCount: number,
): PersonalPlanRuntimeAudioApprovalReviewPacketStatus {
  if (generatedAssetCount === 0) return 'blocked_missing_generated_audio';
  if (invalidGeneratedAssetCount > 0) return 'blocked_invalid_generated_audio';
  return 'ready_for_human_audio_review';
}

function nextStepForStatus(
  status: PersonalPlanRuntimeAudioApprovalReviewPacketStatus,
): PersonalPlanRuntimeAudioApprovalReviewPacket['nextRequiredStep'] {
  if (status === 'blocked_missing_generated_audio') return 'generate_runtime_audio_assets';
  if (status === 'blocked_invalid_generated_audio') return 'fix_invalid_generated_runtime_audio';
  return 'human_listen_and_create_explicit_approval_records';
}

export function buildPersonalPlanRuntimeAudioApprovalReviewPacket(
  input: BuildPersonalPlanRuntimeAudioApprovalReviewPacketInput,
): PersonalPlanRuntimeAudioApprovalReviewPacket {
  const rows = input.generatedAssets.filter(isValidGeneratedAudio).map(rowForAsset);
  const invalidGeneratedAssets = input.generatedAssets
    .filter((asset) => !isValidGeneratedAudio(asset))
    .map(invalidAsset);
  const status = statusForCounts(input.generatedAssets.length, invalidGeneratedAssets.length);

  return {
    kind: 'personal_plan_runtime_audio_approval_review_packet',
    generatedAt: input.generatedAt,
    reviewOwnerId: input.reviewOwnerId,
    status,
    generatedAssetCount: input.generatedAssets.length,
    reviewRowCount: rows.length,
    invalidGeneratedAssetCount: invalidGeneratedAssets.length,
    approvalRecordCount: 0,
    approvalMayBeInferred: false,
    approvalRecordsCreated: false,
    readyForLive: false,
    productionReady: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    rows,
    invalidGeneratedAssets,
    nextRequiredStep: nextStepForStatus(status),
  };
}
