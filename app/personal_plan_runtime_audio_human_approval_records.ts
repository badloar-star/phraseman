import {
  buildPlanAudioApprovalInput,
  type PlanAudioApprovalInput,
} from './personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';

export type PersonalPlanRuntimeAudioHumanApprovalRecords = {
  kind: 'personal_plan_runtime_audio_human_approval_records';
  approvedAt: string;
  reviewerId: string;
  reviewerDecision: 'approve_all_runtime_audio_assets';
  sourceEvidence: 'user_confirmed_audio_clear_in_chat';
  generatedAssetCount: number;
  approvalRecordCount: number;
  approvalInput: PlanAudioApprovalInput;
  productionReady: false;
  nextRequiredStep: 'runtime_audio_approval_intake';
};

export type BuildPersonalPlanRuntimeAudioHumanApprovalRecordsInput = {
  approvedAt: string;
  reviewerId: string;
  generatedAssets: PlanAudioAsset[];
};

export function buildPersonalPlanRuntimeAudioHumanApprovalRecords(
  input: BuildPersonalPlanRuntimeAudioHumanApprovalRecordsInput,
): PersonalPlanRuntimeAudioHumanApprovalRecords {
  const approvalInput = buildPlanAudioApprovalInput(input.generatedAssets, {
    reviewerId: input.reviewerId,
    approvedAt: input.approvedAt,
  });

  return {
    kind: 'personal_plan_runtime_audio_human_approval_records',
    approvedAt: input.approvedAt,
    reviewerId: input.reviewerId,
    reviewerDecision: 'approve_all_runtime_audio_assets',
    sourceEvidence: 'user_confirmed_audio_clear_in_chat',
    generatedAssetCount: input.generatedAssets.length,
    approvalRecordCount: approvalInput.approvals.length,
    approvalInput,
    productionReady: false,
    nextRequiredStep: 'runtime_audio_approval_intake',
  };
}
