import {
  approvePlanAudioAssets,
  type PlanAudioApprovalInput,
  type PlanAudioApprovalIssue,
} from './personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';

export type PersonalPlanRuntimeAudioApprovalIntakeStatus =
  | 'blocked_missing_generated_runtime_audio'
  | 'blocked_missing_approval_records'
  | 'blocked_invalid_approval_records'
  | 'ready_for_guarded_runtime_audio_registry';

export type PersonalPlanRuntimeAudioApprovalIntake = {
  kind: 'personal_plan_runtime_audio_approval_intake';
  generatedAt: string;
  approvalOwnerId: string;
  status: PersonalPlanRuntimeAudioApprovalIntakeStatus;
  generatedAssetCount: number;
  approvalRecordCount: number;
  approvedFinalAssetCount: number;
  missingApprovalRecordCount: number;
  invalidApprovalRecordCount: number;
  approvalMayBeInferred: false;
  readyForLive: false;
  productionReady: false;
  liveRegistrationAllowed: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  approvalIssues: PlanAudioApprovalIssue[];
  approvedAssets: PlanAudioAsset[];
  nextRequiredStep:
    | 'generate_runtime_audio_assets'
    | 'collect_explicit_runtime_audio_approval_records'
    | 'fix_runtime_audio_approval_records'
    | 'guarded_runtime_audio_registry_source_registration';
};

export type BuildPersonalPlanRuntimeAudioApprovalIntakeInput = {
  generatedAt: string;
  approvalOwnerId: string;
  generatedAssets: PlanAudioAsset[];
  approvalInput: PlanAudioApprovalInput;
};

function statusForInput(
  generatedAssetCount: number,
  approvalRecordCount: number,
  invalidApprovalRecordCount: number,
): PersonalPlanRuntimeAudioApprovalIntakeStatus {
  if (generatedAssetCount === 0) return 'blocked_missing_generated_runtime_audio';
  if (approvalRecordCount === 0) return 'blocked_missing_approval_records';
  if (invalidApprovalRecordCount > 0) return 'blocked_invalid_approval_records';
  return 'ready_for_guarded_runtime_audio_registry';
}

function nextStepForStatus(
  status: PersonalPlanRuntimeAudioApprovalIntakeStatus,
): PersonalPlanRuntimeAudioApprovalIntake['nextRequiredStep'] {
  if (status === 'blocked_missing_generated_runtime_audio') return 'generate_runtime_audio_assets';
  if (status === 'blocked_missing_approval_records') return 'collect_explicit_runtime_audio_approval_records';
  if (status === 'blocked_invalid_approval_records') return 'fix_runtime_audio_approval_records';
  return 'guarded_runtime_audio_registry_source_registration';
}

export function buildPersonalPlanRuntimeAudioApprovalIntake(
  input: BuildPersonalPlanRuntimeAudioApprovalIntakeInput,
): PersonalPlanRuntimeAudioApprovalIntake {
  const approvalResult = approvePlanAudioAssets(input.generatedAssets, input.approvalInput);
  const missingApprovalRecordCount = approvalResult.issues.filter((issue) =>
    issue.code === 'missing_approval_record'
  ).length;
  const invalidApprovalRecordCount = approvalResult.issues.filter((issue) =>
    issue.code !== 'missing_approval_record'
  ).length;
  const status = statusForInput(
    input.generatedAssets.length,
    input.approvalInput.approvals.length,
    invalidApprovalRecordCount,
  );
  const approvedAssets = status === 'ready_for_guarded_runtime_audio_registry'
    ? approvalResult.approvedAssets ?? []
    : [];

  return {
    kind: 'personal_plan_runtime_audio_approval_intake',
    generatedAt: input.generatedAt,
    approvalOwnerId: input.approvalOwnerId,
    status,
    generatedAssetCount: input.generatedAssets.length,
    approvalRecordCount: input.approvalInput.approvals.length,
    approvedFinalAssetCount: approvedAssets.length,
    missingApprovalRecordCount,
    invalidApprovalRecordCount,
    approvalMayBeInferred: false,
    readyForLive: false,
    productionReady: false,
    liveRegistrationAllowed: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    approvalIssues: approvalResult.issues,
    approvedAssets,
    nextRequiredStep: nextStepForStatus(status),
  };
}
