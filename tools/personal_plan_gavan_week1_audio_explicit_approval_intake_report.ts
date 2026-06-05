import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  validatePlanAudioApprovalGate,
  type PlanAudioApprovalInput,
  type PlanAudioApprovalIssue,
} from '../app/personal_plan_audio_approval_gate';
import type {
  GavanWeek1GeneratedAudioIntakeReport,
  GavanWeek1GeneratedAudioIntakeRow,
} from './personal_plan_gavan_week1_generated_audio_intake_report';

export const GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-explicit-approval-intake-report.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1AudioExplicitApprovalIntakeReportStatus =
  | 'blocked_missing_generated_audio'
  | 'blocked_missing_approval_records'
  | 'blocked_invalid_approval_records'
  | 'ready_for_final_audio_approval_gate_review';

export type GavanWeek1AudioExplicitApprovalIntakeRowStatus =
  | 'blocked_missing_generated_file'
  | 'blocked_invalid_generated_file'
  | 'blocked_missing_approval_record'
  | 'blocked_invalid_approval_record'
  | 'approval_record_valid';

export type GavanWeek1AudioExplicitApprovalIntakeApprovalStatus =
  | 'not_applicable_until_generated'
  | 'missing_approval_record'
  | 'invalid_approval_record'
  | 'explicit_record_valid';

export type GavanWeek1AudioExplicitApprovalIntakeIssueCode =
  | 'wrong_generated_audio_intake_report'
  | 'generated_audio_intake_has_live_claim'
  | 'target_path_not_allowed';

export type GavanWeek1AudioExplicitApprovalIntakeIssue = {
  code: GavanWeek1AudioExplicitApprovalIntakeIssueCode;
  detail: string;
};

export type GavanWeek1AudioExplicitApprovalIntakeReportOptions = {
  generatedAt: string;
  approvalOwnerId: string;
  approvalInput?: PlanAudioApprovalInput;
};

export type GavanWeek1AudioExplicitApprovalIntakeReportWriteOptions =
  GavanWeek1AudioExplicitApprovalIntakeReportOptions & {
    targetPath: string;
  };

export type GavanWeek1AudioExplicitApprovalIntakeRow = {
  jobId: string;
  blockId: string;
  contentUnitId?: string;
  contentUnitIds: string[];
  targetText: string;
  outputPath: string;
  expectedAssetId: string;
  generatedFileStatus: GavanWeek1GeneratedAudioIntakeRow['status'];
  status: GavanWeek1AudioExplicitApprovalIntakeRowStatus;
  approvalStatus: GavanWeek1AudioExplicitApprovalIntakeApprovalStatus;
  approvalIssueCodes: string[];
  productionReady: false;
  finalAssetReady: false;
};

export type GavanWeek1AudioExplicitApprovalIntakeReport = {
  kind: 'gavan_week1_audio_explicit_approval_intake_report';
  generatedAt: string;
  approvalOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceIntakeStatus: GavanWeek1GeneratedAudioIntakeReport['status'];
  status: GavanWeek1AudioExplicitApprovalIntakeReportStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioApprovalReady: boolean;
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
    missingApprovalRecordCount: number;
    missingGeneratedFileCount: number;
    productionReadyAudioCount: 0;
  };
  rows: GavanWeek1AudioExplicitApprovalIntakeRow[];
  approvalGateEvidence: {
    valid: boolean;
    issues: PlanAudioApprovalIssue[];
    summary: {
      assets: number;
      approved: number;
      blocked: number;
    };
  };
  approvalInput?: PlanAudioApprovalInput;
  requiredNextActions: [
    'Provide every missing MP3 before approval records can count.',
    'Create one explicit approval record per valid generated asset with reviewer id, ISO timestamp, and checksum.',
    'Run the final audio approval gate in a separate guarded pass before any live asset registration.',
    'Keep pronunciation readiness separate from listening audio approval.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    audioFilesWritten: false;
    approvalFilesWritten: false;
  };
};

export type GavanWeek1AudioExplicitApprovalIntakeReportBuildResult = {
  valid: boolean;
  issues: GavanWeek1AudioExplicitApprovalIntakeIssue[];
  report?: GavanWeek1AudioExplicitApprovalIntakeReport;
};

export type GavanWeek1AudioExplicitApprovalIntakeReportWriteResult =
  GavanWeek1AudioExplicitApprovalIntakeReportBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1AudioExplicitApprovalIntakeIssueCode,
  detail: string,
): GavanWeek1AudioExplicitApprovalIntakeIssue {
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

export function isGavanWeek1AudioExplicitApprovalIntakeReportTargetAllowed(
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
): GavanWeek1AudioExplicitApprovalIntakeIssue[] {
  const issues: GavanWeek1AudioExplicitApprovalIntakeIssue[] = [];

  if (
    intake.kind !== 'gavan_week1_generated_audio_intake_report' ||
    intake.planId !== 'gavan' ||
    intake.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_generated_audio_intake_report',
      'Audio explicit approval intake requires the Gavan week 1 generated audio intake report.',
    ));
  }

  if (
    intake.readyForLive ||
    intake.audioProductionReady ||
    intake.approvalMayBeInferred ||
    intake.audioAssetRegistrationAllowed ||
    intake.liveEditsAllowed ||
    intake.pronunciationReadinessMayBeInferred
  ) {
    issues.push(issue(
      'generated_audio_intake_has_live_claim',
      'Audio explicit approval intake cannot consume generated audio intake with live or inferred readiness claims.',
    ));
  }

  return issues;
}

function issueCodesForAsset(
  issues: PlanAudioApprovalIssue[],
  assetId: string,
): string[] {
  return issues
    .filter((item) => item.assetId === assetId)
    .map((item) => item.code);
}

function statusForGeneratedRow(
  row: GavanWeek1GeneratedAudioIntakeRow,
  issueCodes: string[],
): Pick<GavanWeek1AudioExplicitApprovalIntakeRow, 'status' | 'approvalStatus'> {
  if (row.status === 'missing_generated_file') {
    return {
      status: 'blocked_missing_generated_file',
      approvalStatus: 'not_applicable_until_generated',
    };
  }

  if (row.status === 'invalid_generated_file') {
    return {
      status: 'blocked_invalid_generated_file',
      approvalStatus: 'not_applicable_until_generated',
    };
  }

  if (issueCodes.includes('missing_approval_record')) {
    return {
      status: 'blocked_missing_approval_record',
      approvalStatus: 'missing_approval_record',
    };
  }

  if (issueCodes.length > 0) {
    return {
      status: 'blocked_invalid_approval_record',
      approvalStatus: 'invalid_approval_record',
    };
  }

  return {
    status: 'approval_record_valid',
    approvalStatus: 'explicit_record_valid',
  };
}

function statusFromSummary(
  missingGeneratedFileCount: number,
  missingApprovalRecordCount: number,
  approvalRecordInvalidCount: number,
  approvalRecordValidCount: number,
  expectedMp3Count: number,
): GavanWeek1AudioExplicitApprovalIntakeReportStatus {
  if (missingGeneratedFileCount > 0) return 'blocked_missing_generated_audio';
  if (approvalRecordInvalidCount > 0) return 'blocked_invalid_approval_records';
  if (missingApprovalRecordCount > 0) return 'blocked_missing_approval_records';
  if (approvalRecordValidCount === expectedMp3Count && expectedMp3Count > 0) {
    return 'ready_for_final_audio_approval_gate_review';
  }
  return 'blocked_missing_approval_records';
}

export function buildGavanWeek1AudioExplicitApprovalIntakeReport(
  intake: GavanWeek1GeneratedAudioIntakeReport,
  options: GavanWeek1AudioExplicitApprovalIntakeReportOptions,
): GavanWeek1AudioExplicitApprovalIntakeReportBuildResult {
  const issues = validateGeneratedIntake(intake);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const generatedAssets = intake.generatedAssetsEvidence.assets;
  const approvalInput: PlanAudioApprovalInput = options.approvalInput ?? {
    kind: 'plan_audio_approval_input',
    approvals: [],
  };
  const gate = validatePlanAudioApprovalGate(generatedAssets, approvalInput);
  const generatedRowsByAssetId = new Map(
    intake.rows.map((row) => [row.expectedAssetId, row]),
  );
  const rows: GavanWeek1AudioExplicitApprovalIntakeRow[] = intake.rows.map((row) => {
    const issueCodes = row.status === 'valid_generated_file'
      ? issueCodesForAsset(gate.issues, row.expectedAssetId)
      : [];
    return {
      jobId: row.jobId,
      blockId: row.blockId,
      ...(row.contentUnitId ? { contentUnitId: row.contentUnitId } : {}),
      contentUnitIds: row.contentUnitIds,
      targetText: row.targetText,
      outputPath: row.outputPath,
      expectedAssetId: row.expectedAssetId,
      generatedFileStatus: row.status,
      ...statusForGeneratedRow(row, issueCodes),
      approvalIssueCodes: issueCodes,
      productionReady: false,
      finalAssetReady: false,
    };
  });

  for (const gateIssue of gate.issues) {
    if (!gateIssue.assetId || generatedRowsByAssetId.has(gateIssue.assetId)) continue;
    rows.push({
      jobId: 'unknown',
      blockId: 'unknown',
      contentUnitIds: [],
      targetText: '',
      outputPath: '',
      expectedAssetId: gateIssue.assetId,
      generatedFileStatus: 'valid_generated_file',
      status: 'blocked_invalid_approval_record',
      approvalStatus: 'invalid_approval_record',
      approvalIssueCodes: [gateIssue.code],
      productionReady: false,
      finalAssetReady: false,
    });
  }

  const expectedMp3Count = intake.summary.expectedMp3Count;
  const validGeneratedFileCount = intake.summary.validGeneratedFileCount;
  const missingGeneratedFileCount = intake.summary.missingGeneratedFileCount;
  const approvalRecordCount = approvalInput.approvals.length;
  const missingApprovalRecordCount = rows.filter((row) =>
    row.approvalStatus === 'missing_approval_record',
  ).length;
  const approvalRecordValidCount = rows.filter((row) =>
    row.approvalStatus === 'explicit_record_valid',
  ).length;
  const approvalRecordInvalidCount = rows.filter((row) =>
    row.approvalStatus === 'invalid_approval_record',
  ).length;
  const status = statusFromSummary(
    missingGeneratedFileCount,
    missingApprovalRecordCount,
    approvalRecordInvalidCount,
    approvalRecordValidCount,
    expectedMp3Count,
  );

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_audio_explicit_approval_intake_report',
      generatedAt: options.generatedAt,
      approvalOwnerId: options.approvalOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceIntakeStatus: intake.status,
      status,
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: status === 'ready_for_final_audio_approval_gate_review',
      approvalMayBeInferred: false,
      audioAssetRegistrationAllowed: false,
      liveEditsAllowed: false,
      pronunciationReadinessMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      summary: {
        expectedMp3Count,
        validGeneratedFileCount,
        approvalRecordCount,
        approvalRecordValidCount,
        approvalRecordInvalidCount,
        missingApprovalRecordCount,
        missingGeneratedFileCount,
        productionReadyAudioCount: 0,
      },
      rows,
      approvalGateEvidence: {
        valid: gate.valid,
        issues: gate.issues,
        summary: gate.summary,
      },
      ...(approvalInput.approvals.length > 0 ? { approvalInput } : {}),
      requiredNextActions: [
        'Provide every missing MP3 before approval records can count.',
        'Create one explicit approval record per valid generated asset with reviewer id, ISO timestamp, and checksum.',
        'Run the final audio approval gate in a separate guarded pass before any live asset registration.',
        'Keep pronunciation readiness separate from listening audio approval.',
      ],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        audioFilesWritten: false,
        approvalFilesWritten: false,
      },
    },
  };
}

export function writeGavanWeek1AudioExplicitApprovalIntakeReport(
  intake: GavanWeek1GeneratedAudioIntakeReport,
  options: GavanWeek1AudioExplicitApprovalIntakeReportWriteOptions,
): GavanWeek1AudioExplicitApprovalIntakeReportWriteResult {
  if (!isGavanWeek1AudioExplicitApprovalIntakeReportTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Audio explicit approval intake report can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  const result = buildGavanWeek1AudioExplicitApprovalIntakeReport(intake, options);
  if (!result.valid || !result.report) return result;

  const output = `${JSON.stringify(result.report, null, 2)}\n`;
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  writeFileSync(options.targetPath, output, 'utf8');

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(output, 'utf8'),
  };
}
