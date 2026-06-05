import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  approvePlanAudioAssets,
  buildPlanAudioApprovalInput,
  validatePlanApprovedAudioAssets,
  type PlanAudioApprovalInput,
  type PlanAudioApprovalIssue,
  type PlanAudioApprovalResult,
} from '../app/personal_plan_audio_approval_gate';
import type { PlanAudioAsset } from '../app/personal_plan_audio_asset_readiness';
import type {
  GavanWeek1GeneratedAudioIntakeReport,
} from './personal_plan_gavan_week1_generated_audio_intake_report';

export const GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_RECORDS_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-explicit-approval-records.json',
);

export const GAVAN_WEEK1_FINAL_AUDIO_PROMOTION_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-final-audio-promotion-report.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionStatus =
  | 'blocked_before_generated_audio_intake_ready'
  | 'blocked_invalid_approval_records'
  | 'blocked_invalid_final_audio_promotion'
  | 'ready_for_guarded_live_audio_registry_preflight';

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssueCode =
  | 'wrong_generated_audio_intake_report'
  | 'generated_audio_intake_not_ready'
  | 'generated_audio_intake_has_live_claim'
  | 'target_path_not_allowed';

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssue = {
  code: GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssueCode;
  detail: string;
};

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionOptions = {
  generatedAt: string;
  approvalOwnerId: string;
  reviewerId: string;
  approvedAt: string;
  approvalSource: string;
};

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionWriteOptions =
  GavanWeek1AudioExplicitApprovalRecordsAndPromotionOptions & {
    targetPath: string;
    approvalRecordsPath: string;
  };

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport = {
  kind: 'gavan_week1_audio_explicit_approval_records_and_promotion';
  generatedAt: string;
  approvalOwnerId: string;
  reviewerId: string;
  approvedAt: string;
  approvalSource: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceIntakeStatus: GavanWeek1GeneratedAudioIntakeReport['status'];
  status: GavanWeek1AudioExplicitApprovalRecordsAndPromotionStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioApprovalReady: boolean;
  finalAudioPromotionReady: boolean;
  approvalMayBeInferred: false;
  audioAssetRegistrationAllowed: false;
  liveEditsAllowed: false;
  pronunciationReadinessMayBeInferred: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  summary: {
    expectedMp3Count: number;
    validGeneratedFileCount: number;
    approvalRecordCount: number;
    approvalRecordValidCount: number;
    approvalRecordInvalidCount: number;
    promotedFinalAudioCount: number;
    registryReadyAssetCount: 0;
    blockerCount: number;
  };
  approvalInput: PlanAudioApprovalInput;
  approvalGateEvidence: {
    valid: boolean;
    issues: PlanAudioApprovalIssue[];
    summary: {
      assets: number;
      approved: number;
      blocked: number;
    };
  };
  finalPromotionGateEvidence: {
    valid: boolean;
    issues: PlanAudioApprovalIssue[];
    summary: {
      assets: number;
      approved: number;
      blocked: number;
    };
  };
  approvedAssets: PlanAudioAsset[];
  blockers: Array<{
    code:
      | 'generated_audio_intake_not_ready'
      | 'invalid_approval_records'
      | 'invalid_final_audio_promotion'
      | 'live_audio_registry_not_written';
    detail: string;
  }>;
  requiredNextActions: [
    'Run the guarded live audio registry preflight before any runtime registration.',
    'Do not register live audio assets until registry preflight confirms approved final audio and source-write scope.',
    'Keep pronunciation readiness separate from listening audio approval.',
  ];
  writePolicy: {
    dryRunOnly: false;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    audioFilesWritten: false;
    approvalFilesWritten: boolean;
    registryFilesWritten: false;
  };
};

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionBuildResult = {
  valid: boolean;
  issues: GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssue[];
  report?: GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport;
};

export type GavanWeek1AudioExplicitApprovalRecordsAndPromotionWriteResult =
  GavanWeek1AudioExplicitApprovalRecordsAndPromotionBuildResult & {
    targetPath?: string;
    approvalRecordsPath?: string;
    bytesWritten?: number;
    approvalRecordsBytesWritten?: number;
  };

function issue(
  code: GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssueCode,
  detail: string,
): GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssue {
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

export function isGavanWeek1AudioExplicitApprovalRecordsAndPromotionTargetAllowed(
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

function validateGeneratedIntake(
  intake: GavanWeek1GeneratedAudioIntakeReport,
): GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssue[] {
  const issues: GavanWeek1AudioExplicitApprovalRecordsAndPromotionIssue[] = [];

  if (
    intake.kind !== 'gavan_week1_generated_audio_intake_report' ||
    intake.planId !== 'gavan' ||
    intake.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_generated_audio_intake_report',
      'Audio explicit approval records can only use the Gavan week 1 generated audio intake report.',
    ));
  }

  if (
    intake.readyForLive ||
    intake.audioProductionReady ||
    intake.audioApprovalReady ||
    intake.approvalMayBeInferred ||
    intake.audioAssetRegistrationAllowed ||
    intake.liveEditsAllowed ||
    intake.pronunciationReadinessMayBeInferred
  ) {
    issues.push(issue(
      'generated_audio_intake_has_live_claim',
      'Audio approval records cannot consume generated intake with live, approval, or inferred readiness claims.',
    ));
  }

  return issues;
}

function emptyApprovalGate(assets: PlanAudioAsset[]): PlanAudioApprovalResult {
  return {
    valid: false,
    issues: [] as PlanAudioApprovalIssue[],
    summary: {
      assets: assets.length,
      approved: 0,
      blocked: assets.length,
    },
  };
}

export function buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion(
  intake: GavanWeek1GeneratedAudioIntakeReport,
  options: GavanWeek1AudioExplicitApprovalRecordsAndPromotionOptions,
): GavanWeek1AudioExplicitApprovalRecordsAndPromotionBuildResult {
  const issues = validateGeneratedIntake(intake);
  if (issues.length > 0) return { valid: false, issues };

  const generatedAssets = intake.generatedAssetsEvidence.assets;
  const generatedIntakeReady = (
    intake.status === 'ready_for_explicit_audio_approval' &&
    intake.summary.validGeneratedFileCount === intake.summary.expectedMp3Count &&
    generatedAssets.length === intake.summary.expectedMp3Count
  );

  const approvalInput = generatedIntakeReady
    ? buildPlanAudioApprovalInput(generatedAssets, {
      reviewerId: options.reviewerId,
      approvedAt: options.approvedAt,
    })
    : {
      kind: 'plan_audio_approval_input' as const,
      approvals: [],
    };

  const approvalResult = generatedIntakeReady
    ? approvePlanAudioAssets(generatedAssets, approvalInput)
    : emptyApprovalGate(generatedAssets);
  const approvedAssets = approvalResult.approvedAssets ?? [];
  const finalPromotionGate = approvedAssets.length > 0
    ? validatePlanApprovedAudioAssets(approvedAssets)
    : emptyApprovalGate(approvedAssets);

  const blockers: GavanWeek1AudioExplicitApprovalRecordsAndPromotionReport['blockers'] = [];
  if (!generatedIntakeReady) {
    blockers.push({
      code: 'generated_audio_intake_not_ready',
      detail: 'Generated MP3 intake must validate every expected outputPath before approval records are created.',
    });
  }
  if (generatedIntakeReady && !approvalResult.valid) {
    blockers.push({
      code: 'invalid_approval_records',
      detail: 'Explicit approval records must include reviewer id, ISO approval timestamp, and matching audio checksums.',
    });
  }
  if (approvalResult.valid && !finalPromotionGate.valid) {
    blockers.push({
      code: 'invalid_final_audio_promotion',
      detail: 'Approved audio assets must remain production-valid after final promotion.',
    });
  }
  if (approvalResult.valid && finalPromotionGate.valid) {
    blockers.push({
      code: 'live_audio_registry_not_written',
      detail: 'Approved final audio still needs a separate guarded live registry preflight before runtime registration.',
    });
  }

  const approvalRecordInvalidCount = approvalResult.issues.length > 0
    ? approvalInput.approvals.length
    : 0;
  const promotedFinalAudioCount = approvalResult.valid && finalPromotionGate.valid
    ? approvedAssets.length
    : 0;
  const status: GavanWeek1AudioExplicitApprovalRecordsAndPromotionStatus = !generatedIntakeReady
    ? 'blocked_before_generated_audio_intake_ready'
    : !approvalResult.valid
      ? 'blocked_invalid_approval_records'
      : !finalPromotionGate.valid
        ? 'blocked_invalid_final_audio_promotion'
        : 'ready_for_guarded_live_audio_registry_preflight';

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_audio_explicit_approval_records_and_promotion',
      generatedAt: options.generatedAt,
      approvalOwnerId: options.approvalOwnerId,
      reviewerId: options.reviewerId,
      approvedAt: options.approvedAt,
      approvalSource: options.approvalSource,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceIntakeStatus: intake.status,
      status,
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: status === 'ready_for_guarded_live_audio_registry_preflight',
      finalAudioPromotionReady: status === 'ready_for_guarded_live_audio_registry_preflight',
      approvalMayBeInferred: false,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      pronunciationReadinessMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      summary: {
        expectedMp3Count: intake.summary.expectedMp3Count,
        validGeneratedFileCount: intake.summary.validGeneratedFileCount,
        approvalRecordCount: approvalInput.approvals.length,
        approvalRecordValidCount: approvalResult.valid ? approvalInput.approvals.length : 0,
        approvalRecordInvalidCount,
        promotedFinalAudioCount,
        registryReadyAssetCount: 0,
        blockerCount: blockers.length,
      },
      approvalInput,
      approvalGateEvidence: {
        valid: approvalResult.valid,
        issues: approvalResult.issues,
        summary: approvalResult.summary,
      },
      finalPromotionGateEvidence: {
        valid: finalPromotionGate.valid,
        issues: finalPromotionGate.issues,
        summary: finalPromotionGate.summary,
      },
      approvedAssets,
      blockers,
      requiredNextActions: [
        'Run the guarded live audio registry preflight before any runtime registration.',
        'Do not register live audio assets until registry preflight confirms approved final audio and source-write scope.',
        'Keep pronunciation readiness separate from listening audio approval.',
      ],
      writePolicy: {
        dryRunOnly: false,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        audioFilesWritten: false,
        approvalFilesWritten: approvalInput.approvals.length > 0,
        registryFilesWritten: false,
      },
    },
  };
}

export function writeGavanWeek1AudioExplicitApprovalRecordsAndPromotion(
  intake: GavanWeek1GeneratedAudioIntakeReport,
  options: GavanWeek1AudioExplicitApprovalRecordsAndPromotionWriteOptions,
): GavanWeek1AudioExplicitApprovalRecordsAndPromotionWriteResult {
  if (
    !isGavanWeek1AudioExplicitApprovalRecordsAndPromotionTargetAllowed(options.targetPath) ||
    !isGavanWeek1AudioExplicitApprovalRecordsAndPromotionTargetAllowed(options.approvalRecordsPath)
  ) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Audio explicit approval records and promotion can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  const result = buildGavanWeek1AudioExplicitApprovalRecordsAndPromotion(intake, options);
  if (!result.valid || !result.report) return result;

  const reportOutput = `${JSON.stringify(result.report, null, 2)}\n`;
  const approvalOutput = `${JSON.stringify(result.report.approvalInput, null, 2)}\n`;
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  mkdirSync(path.dirname(options.approvalRecordsPath), { recursive: true });
  writeFileSync(options.targetPath, reportOutput, 'utf8');
  writeFileSync(options.approvalRecordsPath, approvalOutput, 'utf8');

  return {
    ...result,
    targetPath: options.targetPath,
    approvalRecordsPath: options.approvalRecordsPath,
    bytesWritten: Buffer.byteLength(reportOutput, 'utf8'),
    approvalRecordsBytesWritten: Buffer.byteLength(approvalOutput, 'utf8'),
  };
}
