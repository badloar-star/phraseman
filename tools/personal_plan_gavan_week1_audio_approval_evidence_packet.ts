import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildPlanAudioApprovalReport,
  type PlanAudioApprovalReport,
} from '../app/personal_plan_audio_approval_report';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import type {
  GeneratedPlanAudioAssetsResult,
} from '../app/personal_plan_audio_generated_assets';
import type {
  GavanWeek1AudioGenerationPlan,
} from '../app/personal_plan_gavan_week1_audio_generation_plan';

export const GAVAN_WEEK1_AUDIO_APPROVAL_EVIDENCE_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-approval-evidence-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1AudioApprovalEvidencePacketStatus =
  | 'audio_approval_blocked_missing_generated_assets'
  | 'audio_approval_waiting_for_human_review';

export type GavanWeek1AudioApprovalEvidenceIssueCode =
  | 'wrong_plan_or_week'
  | 'generation_plan_not_ready'
  | 'generated_assets_job_count_mismatch'
  | 'generated_asset_count_mismatch'
  | 'fake_final_audio_claim'
  | 'target_path_not_allowed';

export type GavanWeek1AudioApprovalEvidenceIssue = {
  code: GavanWeek1AudioApprovalEvidenceIssueCode;
  detail: string;
};

export type GavanWeek1AudioApprovalEvidencePacketOptions = {
  generatedAt: string;
  reviewerId: string;
  approvedAt: string;
};

export type GavanWeek1AudioApprovalEvidencePacketWriteOptions =
  GavanWeek1AudioApprovalEvidencePacketOptions & {
    targetPath: string;
  };

export type GavanWeek1AudioApprovalEvidencePacket = {
  kind: 'gavan_week1_audio_approval_evidence_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceAudioWeekId: 'week1';
  status: GavanWeek1AudioApprovalEvidencePacketStatus;
  blockerStillOpen: 'missing_approved_audio_assets';
  readyForLive: false;
  audioProductionReady: false;
  audioApprovalReady: false;
  approvalStillMissing: true;
  approvalMayBeInferred: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  audioGenerationAllowedInThisPass: false;
  audioAssetRegistrationAllowed: false;
  pronunciationReadinessMayBeInferred: false;
  generationPlanEvidence: {
    totalManifestItems: number;
    generationJobCount: number;
    generationBlockerCount: number;
    readyToGenerateJobCount: number;
    outputRoot: string;
  };
  generatedAssetsEvidence: {
    generatedAssetCount: number;
    generatedBlockerCount: number;
    missingGeneratedFileCount: number;
    invalidGeneratedFileCount: number;
    expectedOutputPaths: string[];
  };
  approvalReportEvidence: {
    releaseReady: false;
    reviewReady: boolean;
    approvalInputCreated: boolean;
    rowCount: number;
    readyForReviewRows: number;
    blockedRows: number;
    approvalIssues: number;
  };
  summary: {
    expectedGenerationJobCount: number;
    generatedAssetCount: number;
    generatedBlockerCount: number;
    approvalReportRows: number;
    approvalReadyRows: number;
    approvedAudioCount: number;
    productionReadyAudioCount: number;
    missingGeneratedFileCount: number;
  };
  requiredNextActions: [
    'Generate or provide the 10 expected MP3 assets for the Gavan week 1 listening jobs.',
    'Run generated audio asset validation and reviewer approval with explicit approval records.',
    'Register only approved final audio assets after release approval; do not infer pronunciation readiness from placeholders.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    audioFilesWritten: false;
  };
};

export type GavanWeek1AudioApprovalEvidencePacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1AudioApprovalEvidenceIssue[];
  packet?: GavanWeek1AudioApprovalEvidencePacket;
};

export type GavanWeek1AudioApprovalEvidencePacketWriteResult =
  GavanWeek1AudioApprovalEvidencePacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1AudioApprovalEvidenceIssueCode,
  detail: string,
): GavanWeek1AudioApprovalEvidenceIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1AudioApprovalEvidencePacketTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateInputs(
  generationPlan: GavanWeek1AudioGenerationPlan,
  generatedAssets: GeneratedPlanAudioAssetsResult,
): GavanWeek1AudioApprovalEvidenceIssue[] {
  const issues: GavanWeek1AudioApprovalEvidenceIssue[] = [];

  if (generationPlan.planId !== 'gavan' || generationPlan.weekId !== 'week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Audio approval evidence packet can only target the Gavan week 1 generation plan.',
    ));
  }

  if (
    generationPlan.generation.summary.jobs <= 0 ||
    generationPlan.generation.summary.blockers !== 0 ||
    generationPlan.generation.jobs.some((job) => job.status !== 'ready_to_generate')
  ) {
    issues.push(issue(
      'generation_plan_not_ready',
      'Audio approval evidence requires a blocker-free ready-to-generate audio generation plan.',
    ));
  }

  if (generatedAssets.summary.jobs !== generationPlan.generation.jobs.length) {
    issues.push(issue(
      'generated_assets_job_count_mismatch',
      'Audio approval evidence requires generated-assets summary to match the generation plan jobs.',
    ));
  }

  if (generatedAssets.summary.assets !== generatedAssets.assets.length) {
    issues.push(issue(
      'generated_asset_count_mismatch',
      'Audio approval evidence requires generated-assets summary to match the provided assets.',
    ));
  }

  if (
    generatedAssets.assets.some((asset) =>
      asset.status === 'approved' || asset.finalAssetReady === true,
    )
  ) {
    issues.push(issue(
      'fake_final_audio_claim',
      'Audio approval evidence cannot contain approved or final-ready assets; approval must come from explicit approval records.',
    ));
  }

  return issues;
}

function countApprovedAudio(assets: PlanAudioAsset[]): number {
  return assets.filter((asset) => asset.status === 'approved').length;
}

function countProductionReadyAudio(assets: PlanAudioAsset[]): number {
  return assets.filter((asset) =>
    asset.status === 'approved' && asset.finalAssetReady === true,
  ).length;
}

function outputRoot(generationPlan: GavanWeek1AudioGenerationPlan): string {
  const firstOutputPath = generationPlan.generation.jobs[0]?.outputPath ?? '';
  const marker = 'gavan/week1';
  const markerIndex = firstOutputPath.indexOf(marker);

  return markerIndex > 0
    ? firstOutputPath.slice(0, markerIndex).replace(/[\\/]+$/, '')
    : '';
}

function statusForReport(
  generatedAssets: GeneratedPlanAudioAssetsResult,
  approvalReport: PlanAudioApprovalReport,
): GavanWeek1AudioApprovalEvidencePacketStatus {
  return generatedAssets.summary.assets === 0 || !approvalReport.reviewReady
    ? 'audio_approval_blocked_missing_generated_assets'
    : 'audio_approval_waiting_for_human_review';
}

function buildPacket(
  generationPlan: GavanWeek1AudioGenerationPlan,
  generatedAssets: GeneratedPlanAudioAssetsResult,
  approvalReport: PlanAudioApprovalReport,
  options: GavanWeek1AudioApprovalEvidencePacketOptions,
): GavanWeek1AudioApprovalEvidencePacket {
  const missingGeneratedFileCount = generatedAssets.blockers.filter(
    (blocker) => blocker.reason === 'missing_generated_file',
  ).length;
  const invalidGeneratedFileCount = generatedAssets.blockers.filter(
    (blocker) => blocker.reason === 'invalid_generated_file',
  ).length;

  return {
    kind: 'gavan_week1_audio_approval_evidence_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceAudioWeekId: 'week1',
    status: statusForReport(generatedAssets, approvalReport),
    blockerStillOpen: 'missing_approved_audio_assets',
    readyForLive: false,
    audioProductionReady: false,
    audioApprovalReady: false,
    approvalStillMissing: true,
    approvalMayBeInferred: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    liveEditsAllowed: false,
    audioGenerationAllowedInThisPass: false,
    audioAssetRegistrationAllowed: false,
    pronunciationReadinessMayBeInferred: false,
    generationPlanEvidence: {
      totalManifestItems: generationPlan.generation.summary.totalManifestItems,
      generationJobCount: generationPlan.generation.jobs.length,
      generationBlockerCount: generationPlan.generation.summary.blockers,
      readyToGenerateJobCount: generationPlan.generation.jobs.filter((job) => job.status === 'ready_to_generate').length,
      outputRoot: outputRoot(generationPlan),
    },
    generatedAssetsEvidence: {
      generatedAssetCount: generatedAssets.summary.assets,
      generatedBlockerCount: generatedAssets.summary.blockers,
      missingGeneratedFileCount,
      invalidGeneratedFileCount,
      expectedOutputPaths: generationPlan.generation.jobs.map((job) => job.outputPath),
    },
    approvalReportEvidence: {
      releaseReady: false,
      reviewReady: approvalReport.reviewReady,
      approvalInputCreated: Boolean(approvalReport.approvalInput),
      rowCount: approvalReport.rows.length,
      readyForReviewRows: approvalReport.summary.readyForReview,
      blockedRows: approvalReport.summary.blocked,
      approvalIssues: approvalReport.summary.approvalIssues,
    },
    summary: {
      expectedGenerationJobCount: generationPlan.generation.jobs.length,
      generatedAssetCount: generatedAssets.summary.assets,
      generatedBlockerCount: generatedAssets.summary.blockers,
      approvalReportRows: approvalReport.rows.length,
      approvalReadyRows: approvalReport.summary.readyForReview,
      approvedAudioCount: countApprovedAudio(generatedAssets.assets),
      productionReadyAudioCount: countProductionReadyAudio(generatedAssets.assets),
      missingGeneratedFileCount,
    },
    requiredNextActions: [
      'Generate or provide the 10 expected MP3 assets for the Gavan week 1 listening jobs.',
      'Run generated audio asset validation and reviewer approval with explicit approval records.',
      'Register only approved final audio assets after release approval; do not infer pronunciation readiness from placeholders.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      audioFilesWritten: false,
    },
  };
}

export function buildGavanWeek1AudioApprovalEvidencePacket(
  generationPlan: GavanWeek1AudioGenerationPlan,
  generatedAssets: GeneratedPlanAudioAssetsResult,
  options: GavanWeek1AudioApprovalEvidencePacketOptions,
): GavanWeek1AudioApprovalEvidencePacketBuildResult {
  const issues = validateInputs(generationPlan, generatedAssets);
  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  const approvalReport = buildPlanAudioApprovalReport({
    planId: 'gavan',
    weekId: 'gavan-week1',
    generatedAssets,
    reviewerId: options.reviewerId,
    approvedAt: options.approvedAt,
  });

  return {
    valid: true,
    issues: [],
    packet: buildPacket(generationPlan, generatedAssets, approvalReport, options),
  };
}

export function writeGavanWeek1AudioApprovalEvidencePacket(
  generationPlan: GavanWeek1AudioGenerationPlan,
  generatedAssets: GeneratedPlanAudioAssetsResult,
  options: GavanWeek1AudioApprovalEvidencePacketWriteOptions,
): GavanWeek1AudioApprovalEvidencePacketWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1AudioApprovalEvidencePacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Audio approval evidence packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const result = buildGavanWeek1AudioApprovalEvidencePacket(
    generationPlan,
    generatedAssets,
    options,
  );

  if (!result.valid || !result.packet) {
    return result;
  }

  const serialized = `${JSON.stringify(result.packet, null, 2)}\n`;
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...result,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
