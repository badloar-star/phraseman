import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildGeneratedPlanAudioAssets,
  type GeneratedPlanAudioAssetsResult,
  type GeneratedPlanAudioFile,
} from '../app/personal_plan_audio_generated_assets';
import type {
  PlanAudioGenerationJob,
} from '../app/personal_plan_audio_generation_jobs';
import type {
  GavanWeek1AudioGenerationHandoffPacket,
  GavanWeek1AudioGenerationRequest,
} from './personal_plan_gavan_week1_audio_generation_handoff_packet';

export const GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-generated-audio-intake-report.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GeneratedAudioIntakeClaimStatus =
  | 'generated'
  | 'approved'
  | 'failed';

export type GavanWeek1GeneratedAudioIntakeFile = GeneratedPlanAudioFile & {
  status?: GeneratedAudioIntakeClaimStatus;
  finalAssetReady?: boolean;
};

export type GavanWeek1GeneratedAudioFilesByOutputPath = Record<
  string,
  GavanWeek1GeneratedAudioIntakeFile | undefined
>;

export type GavanWeek1GeneratedAudioIntakeReportStatus =
  | 'blocked_missing_generated_audio'
  | 'blocked_incomplete_generated_audio'
  | 'ready_for_explicit_audio_approval';

export type GavanWeek1GeneratedAudioIntakeRowStatus =
  | 'missing_generated_file'
  | 'invalid_generated_file'
  | 'valid_generated_file';

export type GavanWeek1GeneratedAudioIntakeIssueCode =
  | 'wrong_handoff_packet'
  | 'handoff_not_ready_for_intake'
  | 'fake_final_audio_claim'
  | 'target_path_not_allowed';

export type GavanWeek1GeneratedAudioIntakeIssue = {
  code: GavanWeek1GeneratedAudioIntakeIssueCode;
  detail: string;
};

export type GavanWeek1GeneratedAudioIntakeReportOptions = {
  generatedAt: string;
  intakeOwnerId: string;
};

export type GavanWeek1GeneratedAudioIntakeReportWriteOptions =
  GavanWeek1GeneratedAudioIntakeReportOptions & {
    targetPath: string;
  };

export type GavanWeek1GeneratedAudioIntakeRow = {
  jobId: string;
  blockId: string;
  contentUnitId?: string;
  contentUnitIds: string[];
  targetText: string;
  outputPath: string;
  expectedAssetId: string;
  status: GavanWeek1GeneratedAudioIntakeRowStatus;
  blocker?: 'missing_generated_file' | 'invalid_generated_file';
  provided: boolean;
  uri?: string;
  durationMs?: number;
  bytes?: number;
  provider: string;
  voiceId: string;
  approvalStatus: 'not_approved';
  finalAssetReady: false;
};

export type GavanWeek1GeneratedAudioIntakeReport = {
  kind: 'gavan_week1_generated_audio_intake_report';
  generatedAt: string;
  intakeOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceAudioWeekId: 'week1';
  status: GavanWeek1GeneratedAudioIntakeReportStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioApprovalReady: false;
  approvalMayBeInferred: false;
  liveEditsAllowed: false;
  audioAssetRegistrationAllowed: false;
  pronunciationReadinessMayBeInferred: false;
  summary: {
    expectedMp3Count: number;
    providedFileCount: number;
    validGeneratedFileCount: number;
    invalidGeneratedFileCount: number;
    missingGeneratedFileCount: number;
    approvalRecordCount: number;
    productionReadyAudioCount: number;
  };
  rows: GavanWeek1GeneratedAudioIntakeRow[];
  generatedAssetsEvidence: GeneratedPlanAudioAssetsResult;
  requiredNextActions: [
    'Provide every missing MP3 at the exact outputPath values before approval review.',
    'Fix invalid generated files until URI, duration, bytes, provider, and voice metadata are valid.',
    'Create explicit approval records for every valid generated file before any final audio registration.',
    'Keep pronunciation scoring and live audio registration in separate guarded passes.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    audioFilesWritten: false;
  };
};

export type GavanWeek1GeneratedAudioIntakeReportBuildResult = {
  valid: boolean;
  issues: GavanWeek1GeneratedAudioIntakeIssue[];
  report?: GavanWeek1GeneratedAudioIntakeReport;
};

export type GavanWeek1GeneratedAudioIntakeReportWriteResult =
  GavanWeek1GeneratedAudioIntakeReportBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1GeneratedAudioIntakeIssueCode,
  detail: string,
): GavanWeek1GeneratedAudioIntakeIssue {
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

export function isGavanWeek1GeneratedAudioIntakeReportTargetAllowed(
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
  handoff: GavanWeek1AudioGenerationHandoffPacket,
  filesByOutputPath: GavanWeek1GeneratedAudioFilesByOutputPath,
): GavanWeek1GeneratedAudioIntakeIssue[] {
  const issues: GavanWeek1GeneratedAudioIntakeIssue[] = [];

  if (
    handoff.kind !== 'gavan_week1_audio_generation_handoff_packet' ||
    handoff.planId !== 'gavan' ||
    handoff.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_handoff_packet',
      'Generated audio intake can only use the Gavan week 1 audio generation handoff packet.',
    ));
  }

  if (
    handoff.status !== 'ready_for_audio_generation_inputs' ||
    handoff.readyForLive !== false ||
    handoff.audioAssetRegistrationAllowed !== false
  ) {
    issues.push(issue(
      'handoff_not_ready_for_intake',
      'Generated audio intake requires a non-live handoff that is ready for generation inputs.',
    ));
  }

  if (
    Object.values(filesByOutputPath).some((file) =>
      file?.status === 'approved' || file?.finalAssetReady === true,
    )
  ) {
    issues.push(issue(
      'fake_final_audio_claim',
      'Generated audio intake cannot include approved/final-ready file claims; approval must be a separate record.',
    ));
  }

  return issues;
}

function jobFromRequest(request: GavanWeek1AudioGenerationRequest): PlanAudioGenerationJob {
  return {
    id: request.jobId,
    planId: 'gavan',
    weekId: 'week1',
    blockId: request.blockId,
    exerciseType: request.exerciseType as PlanAudioGenerationJob['exerciseType'],
    ...(request.contentUnitId ? { contentUnitId: request.contentUnitId } : {}),
    contentUnitIds: request.contentUnitIds,
    targetText: request.targetText,
    sourceBlockTargetText: request.sourceBlockTargetText,
    provider: request.provider as PlanAudioGenerationJob['provider'],
    voiceId: request.voiceId,
    outputPath: request.outputPath,
    expectedAssetId: request.expectedAssetId,
    splitPolicy: request.splitPolicy,
    status: 'ready_to_generate',
  };
}

function hasValidGeneratedFile(file: GavanWeek1GeneratedAudioIntakeFile | undefined): boolean {
  return Boolean(
    file &&
    typeof file.uri === 'string' &&
    file.uri.trim().length > 0 &&
    Number.isFinite(file.durationMs) &&
    file.durationMs > 0 &&
    (file.bytes == null || file.bytes > 0)
  );
}

function rowForRequest(
  request: GavanWeek1AudioGenerationRequest,
  file: GavanWeek1GeneratedAudioIntakeFile | undefined,
): GavanWeek1GeneratedAudioIntakeRow {
  const provided = Boolean(file);
  const valid = hasValidGeneratedFile(file);
  const status: GavanWeek1GeneratedAudioIntakeRowStatus = !provided
    ? 'missing_generated_file'
    : valid
      ? 'valid_generated_file'
      : 'invalid_generated_file';

  return {
    jobId: request.jobId,
    blockId: request.blockId,
    ...(request.contentUnitId ? { contentUnitId: request.contentUnitId } : {}),
    contentUnitIds: request.contentUnitIds,
    targetText: request.targetText,
    outputPath: request.outputPath,
    expectedAssetId: request.expectedAssetId,
    status,
    ...(status !== 'valid_generated_file' ? { blocker: status } : {}),
    provided,
    ...(file?.uri ? { uri: file.uri } : {}),
    ...(file?.durationMs != null ? { durationMs: file.durationMs } : {}),
    ...(file?.bytes != null ? { bytes: file.bytes } : {}),
    provider: request.provider,
    voiceId: request.voiceId,
    approvalStatus: 'not_approved',
    finalAssetReady: false,
  };
}

function statusFromCounts(
  expectedMp3Count: number,
  validGeneratedFileCount: number,
  missingGeneratedFileCount: number,
  invalidGeneratedFileCount: number,
): GavanWeek1GeneratedAudioIntakeReportStatus {
  if (missingGeneratedFileCount === expectedMp3Count) {
    return 'blocked_missing_generated_audio';
  }

  if (validGeneratedFileCount === expectedMp3Count && invalidGeneratedFileCount === 0) {
    return 'ready_for_explicit_audio_approval';
  }

  return 'blocked_incomplete_generated_audio';
}

export function buildGavanWeek1GeneratedAudioIntakeReport(
  handoff: GavanWeek1AudioGenerationHandoffPacket,
  filesByOutputPath: GavanWeek1GeneratedAudioFilesByOutputPath,
  options: GavanWeek1GeneratedAudioIntakeReportOptions,
): GavanWeek1GeneratedAudioIntakeReportBuildResult {
  const issues = validateInputs(handoff, filesByOutputPath);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const jobs = handoff.generationRequests.map(jobFromRequest);
  const generatedAssetsEvidence = buildGeneratedPlanAudioAssets({
    jobs,
    generatedFilesByOutputPath: filesByOutputPath,
  });
  const rows = handoff.generationRequests.map((request) =>
    rowForRequest(request, filesByOutputPath[request.outputPath]),
  );
  const expectedMp3Count = rows.length;
  const providedFileCount = rows.filter((row) => row.provided).length;
  const validGeneratedFileCount = rows.filter((row) => row.status === 'valid_generated_file').length;
  const invalidGeneratedFileCount = rows.filter((row) => row.status === 'invalid_generated_file').length;
  const missingGeneratedFileCount = rows.filter((row) => row.status === 'missing_generated_file').length;

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_generated_audio_intake_report',
      generatedAt: options.generatedAt,
      intakeOwnerId: options.intakeOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceAudioWeekId: 'week1',
      status: statusFromCounts(
        expectedMp3Count,
        validGeneratedFileCount,
        missingGeneratedFileCount,
        invalidGeneratedFileCount,
      ),
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
      audioAssetRegistrationAllowed: false,
      pronunciationReadinessMayBeInferred: false,
      summary: {
        expectedMp3Count,
        providedFileCount,
        validGeneratedFileCount,
        invalidGeneratedFileCount,
        missingGeneratedFileCount,
        approvalRecordCount: 0,
        productionReadyAudioCount: 0,
      },
      rows,
      generatedAssetsEvidence,
      requiredNextActions: [
        'Provide every missing MP3 at the exact outputPath values before approval review.',
        'Fix invalid generated files until URI, duration, bytes, provider, and voice metadata are valid.',
        'Create explicit approval records for every valid generated file before any final audio registration.',
        'Keep pronunciation scoring and live audio registration in separate guarded passes.',
      ],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        audioFilesWritten: false,
      },
    },
  };
}

export function writeGavanWeek1GeneratedAudioIntakeReport(
  handoff: GavanWeek1AudioGenerationHandoffPacket,
  filesByOutputPath: GavanWeek1GeneratedAudioFilesByOutputPath,
  options: GavanWeek1GeneratedAudioIntakeReportWriteOptions,
): GavanWeek1GeneratedAudioIntakeReportWriteResult {
  if (!isGavanWeek1GeneratedAudioIntakeReportTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Generated audio intake report can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  const result = buildGavanWeek1GeneratedAudioIntakeReport(
    handoff,
    filesByOutputPath,
    options,
  );
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
