import {
  buildPlanAudioApprovalInput,
  validatePlanAudioApprovalGate,
  type PlanAudioApprovalInput,
  type PlanAudioApprovalIssueCode,
} from './personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';
import {
  type GeneratedPlanAudioAssetBlockerReason,
  type GeneratedPlanAudioAssetsResult,
} from './personal_plan_audio_generated_assets';

export type PlanAudioApprovalReportRowStatus =
  | 'ready_for_review'
  | 'blocked';

export type PlanAudioApprovalReportRow = {
  kind: 'generated_audio_asset' | 'generated_audio_blocker';
  reviewStatus: PlanAudioApprovalReportRowStatus;
  assetId?: string;
  jobId?: string;
  outputPath: string;
  targetText?: string;
  blockId?: string;
  contentUnitIds?: string[];
  durationMs?: number;
  voiceId?: string;
  provider?: string;
  issueCodes: Array<PlanAudioApprovalIssueCode | GeneratedPlanAudioAssetBlockerReason>;
};

export type PlanAudioApprovalReportSummary = {
  jobs: number;
  generatedAssets: number;
  generatedBlockers: number;
  readyForReview: number;
  blocked: number;
  approvalIssues: number;
};

export type BuildPlanAudioApprovalReportInput = {
  planId: string;
  weekId: string;
  generatedAssets: GeneratedPlanAudioAssetsResult;
  reviewerId: string;
  approvedAt: string;
};

export type PlanAudioApprovalReport = {
  kind: 'plan_audio_approval_report';
  planId: string;
  weekId: string;
  releaseReady: false;
  reviewReady: boolean;
  rows: PlanAudioApprovalReportRow[];
  approvalInput?: PlanAudioApprovalInput;
  summary: PlanAudioApprovalReportSummary;
};

function assetId(asset: PlanAudioAsset): string {
  return asset.assetId ?? asset.id;
}

function rowForAsset(
  asset: PlanAudioAsset,
  issueCodes: PlanAudioApprovalIssueCode[],
): PlanAudioApprovalReportRow {
  const blocked = issueCodes.length > 0;
  return {
    kind: 'generated_audio_asset',
    reviewStatus: blocked ? 'blocked' : 'ready_for_review',
    assetId: assetId(asset),
    outputPath: asset.uri ?? '',
    targetText: asset.targetText,
    blockId: asset.blockId,
    contentUnitIds: asset.contentUnitIds,
    durationMs: asset.durationMs,
    voiceId: asset.voiceId,
    provider: asset.provider,
    issueCodes,
  };
}

function summarize(rows: PlanAudioApprovalReportRow[], generatedAssets: GeneratedPlanAudioAssetsResult): PlanAudioApprovalReportSummary {
  const readyForReview = rows.filter((row) => row.reviewStatus === 'ready_for_review').length;
  const blocked = rows.length - readyForReview;
  const approvalIssues = rows.reduce((count, row) =>
    count + row.issueCodes.filter((code) => code !== 'missing_generated_file' && code !== 'invalid_generated_file').length,
  0);

  return {
    jobs: generatedAssets.summary.jobs,
    generatedAssets: generatedAssets.summary.assets,
    generatedBlockers: generatedAssets.summary.blockers,
    readyForReview,
    blocked,
    approvalIssues,
  };
}

export function buildPlanAudioApprovalReport(
  input: BuildPlanAudioApprovalReportInput,
): PlanAudioApprovalReport {
  const provisionalApprovalInput = buildPlanAudioApprovalInput(input.generatedAssets.assets, {
    reviewerId: input.reviewerId,
    approvedAt: input.approvedAt,
  });
  const gate = validatePlanAudioApprovalGate(
    input.generatedAssets.assets,
    provisionalApprovalInput,
  );
  const issueCodesByAssetId = new Map<string, PlanAudioApprovalIssueCode[]>();

  for (const issue of gate.issues) {
    if (!issue.assetId) continue;
    const codes = issueCodesByAssetId.get(issue.assetId) ?? [];
    codes.push(issue.code);
    issueCodesByAssetId.set(issue.assetId, codes);
  }

  const assetRows = input.generatedAssets.assets.map((asset) =>
    rowForAsset(asset, issueCodesByAssetId.get(assetId(asset)) ?? []),
  );
  const blockerRows: PlanAudioApprovalReportRow[] = input.generatedAssets.blockers.map((blocker) => ({
    kind: 'generated_audio_blocker',
    reviewStatus: 'blocked',
    jobId: blocker.jobId,
    outputPath: blocker.outputPath,
    issueCodes: [blocker.reason],
  }));
  const rows = [...assetRows, ...blockerRows];
  const summary = summarize(rows, input.generatedAssets);
  const reviewReady =
    input.generatedAssets.assets.length > 0
    && input.generatedAssets.blockers.length === 0
    && gate.valid;

  return {
    kind: 'plan_audio_approval_report',
    planId: input.planId,
    weekId: input.weekId,
    releaseReady: false,
    reviewReady,
    rows,
    ...(reviewReady ? { approvalInput: provisionalApprovalInput } : {}),
    summary,
  };
}
