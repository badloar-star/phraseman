import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1AudioEvidenceChainBootstrap,
  GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH,
  writeGavanWeek1AudioEvidenceChainBootstrap,
  type GavanWeek1AudioEvidenceChainBootstrapReport,
  type GavanWeek1AudioEvidenceChainBootstrapRow,
} from './personal_plan_gavan_week1_audio_evidence_chain_bootstrap';

export const GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-final-audio-registration-preflight.json',
);

export type GavanWeek1FinalAudioRegistrationPreflightStatus =
  | 'blocked_missing_generated_audio'
  | 'blocked_invalid_generated_audio'
  | 'blocked_missing_approval_records'
  | 'blocked_final_audio_not_promoted'
  | 'ready_for_separate_live_registration_review';

export type GavanWeek1FinalAudioRegistrationStatus =
  | 'blocked_missing_generated_file'
  | 'blocked_invalid_generated_file'
  | 'blocked_missing_explicit_approval'
  | 'blocked_invalid_explicit_approval'
  | 'blocked_final_audio_not_promoted'
  | 'ready_for_separate_live_registration_review';

export type GavanWeek1FinalAudioRegistrationPreflightIssueCode =
  | 'audio_evidence_chain_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1FinalAudioRegistrationPreflightIssue = {
  code: GavanWeek1FinalAudioRegistrationPreflightIssueCode;
  detail: string;
};

export type GavanWeek1FinalAudioRegistrationPreflightRow = {
  jobId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  outputPath: string;
  expectedAssetId: string;
  generatedFileStatus: GavanWeek1AudioEvidenceChainBootstrapRow['generatedFileStatus'];
  approvalStatus: string;
  registrationStatus: GavanWeek1FinalAudioRegistrationStatus;
  registryWriteAllowed: false;
  productionReady: false;
  finalAssetReady: false;
  blocker: string;
};

export type GavanWeek1FinalAudioRegistrationPreflightReport = {
  kind: 'gavan_week1_final_audio_registration_preflight';
  generatedAt: string;
  registrationOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceEvidenceStatus: GavanWeek1AudioEvidenceChainBootstrapReport['status'];
  status: GavanWeek1FinalAudioRegistrationPreflightStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioAssetRegistrationAllowed: false;
  liveEditsAllowed: false;
  registryWritesUsed: false;
  sourceWritesUsed: false;
  audioFilesWritten: false;
  approvalMayBeInferred: false;
  pronunciationReadinessMayBeInferred: false;
  phaseWriteTargets: [];
  summary: {
    expectedMp3Count: number;
    discoveredMp3FileCount: number;
    missingGeneratedFileCount: number;
    validGeneratedFileCount: number;
    approvalRecordCount: number;
    approvedFinalAudioCount: number;
    registryReadyAssetCount: number;
    blockedAssetCount: number;
  };
  artifactPaths: {
    audioEvidenceChainBootstrap: string;
    finalAudioRegistrationPreflight: string;
  };
  rows: GavanWeek1FinalAudioRegistrationPreflightRow[];
  requiredNextActions: [
    'Provide and validate every generated MP3 at the exact outputPath before approval records can count.',
    'Create explicit approval records for every valid generated audio asset.',
    'Run final audio promotion in a separate guarded pass before touching the runtime registry.',
    'Keep pronunciation readiness separate from listening audio registration.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    registryFilesEdited: false;
    audioFilesWritten: false;
  };
};

type BuildOptions = {
  generatedAt: string;
  ownerId: string;
  intakeOwnerId: string;
  approvalOwnerId: string;
  registrationOwnerId: string;
  outputRoot: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1FinalAudioRegistrationPreflightIssue[];
  report: GavanWeek1FinalAudioRegistrationPreflightReport;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Final audio registration preflight can only write under .codex-tmp or docs/reports.';

const ALLOWED_TARGET_ROOTS = [
  path.resolve(process.cwd(), '.codex-tmp'),
  path.resolve(process.cwd(), 'docs', 'reports'),
];

function isAllowedTargetPath(targetPath: string): boolean {
  const resolvedTargetPath = path.resolve(targetPath);

  return ALLOWED_TARGET_ROOTS.some((allowedRoot) => {
    const relativePath = path.relative(allowedRoot, resolvedTargetPath);

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  });
}

function relativeArtifactPath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}

function registrationStatusForRow(
  row: GavanWeek1AudioEvidenceChainBootstrapRow,
): GavanWeek1FinalAudioRegistrationStatus {
  if (row.generatedFileStatus === 'missing_generated_file') {
    return 'blocked_missing_generated_file';
  }

  if (row.generatedFileStatus === 'invalid_generated_file') {
    return 'blocked_invalid_generated_file';
  }

  if (row.approvalStatus === 'missing_approval_record') {
    return 'blocked_missing_explicit_approval';
  }

  if (row.approvalStatus === 'invalid_approval_record') {
    return 'blocked_invalid_explicit_approval';
  }

  if (row.approvalStatus === 'explicit_record_valid' && row.productionReady === false) {
    return 'blocked_final_audio_not_promoted';
  }

  return 'ready_for_separate_live_registration_review';
}

function statusFromEvidence(
  evidence: GavanWeek1AudioEvidenceChainBootstrapReport,
  registryReadyAssetCount: number,
): GavanWeek1FinalAudioRegistrationPreflightStatus {
  if (evidence.summary.missingGeneratedFileCount > 0) {
    return 'blocked_missing_generated_audio';
  }

  if (evidence.summary.invalidGeneratedFileCount > 0) {
    return 'blocked_invalid_generated_audio';
  }

  if (evidence.summary.approvalRecordCount < evidence.summary.expectedMp3Count) {
    return 'blocked_missing_approval_records';
  }

  if (evidence.summary.productionReadyAudioCount < evidence.summary.expectedMp3Count) {
    return 'blocked_final_audio_not_promoted';
  }

  if (registryReadyAssetCount === evidence.summary.expectedMp3Count) {
    return 'ready_for_separate_live_registration_review';
  }

  return 'blocked_final_audio_not_promoted';
}

function failureReport(
  options: BuildOptions,
  issues: GavanWeek1FinalAudioRegistrationPreflightIssue[],
): GavanWeek1FinalAudioRegistrationPreflightReport {
  return {
    kind: 'gavan_week1_final_audio_registration_preflight',
    generatedAt: options.generatedAt,
    registrationOwnerId: options.registrationOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceEvidenceStatus: 'blocked_missing_generated_audio',
    status: 'blocked_missing_generated_audio',
    readyForLive: false,
    audioProductionReady: false,
    audioAssetRegistrationAllowed: false,
    liveEditsAllowed: false,
    registryWritesUsed: false,
    sourceWritesUsed: false,
    audioFilesWritten: false,
    approvalMayBeInferred: false,
    pronunciationReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: 0,
      discoveredMp3FileCount: 0,
      missingGeneratedFileCount: 0,
      validGeneratedFileCount: 0,
      approvalRecordCount: 0,
      approvedFinalAudioCount: 0,
      registryReadyAssetCount: 0,
      blockedAssetCount: 0,
    },
    artifactPaths: {
      audioEvidenceChainBootstrap: relativeArtifactPath(GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH),
      finalAudioRegistrationPreflight: relativeArtifactPath(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH),
    },
    rows: [],
    requiredNextActions: [
      'Provide and validate every generated MP3 at the exact outputPath before approval records can count.',
      'Create explicit approval records for every valid generated audio asset.',
      'Run final audio promotion in a separate guarded pass before touching the runtime registry.',
      'Keep pronunciation readiness separate from listening audio registration.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      registryFilesEdited: false,
      audioFilesWritten: false,
    },
  };
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

export function buildGavanWeek1FinalAudioRegistrationPreflight(
  options: BuildOptions,
): BuildResult {
  const evidenceResult = buildGavanWeek1AudioEvidenceChainBootstrap(options);

  if (!evidenceResult.valid) {
    const issues: GavanWeek1FinalAudioRegistrationPreflightIssue[] = evidenceResult.issues.map((issue) => ({
      code: 'audio_evidence_chain_invalid',
      detail: `${issue.code}: ${issue.detail}`,
    }));

    return {
      valid: false,
      issues,
      report: failureReport(options, issues),
    };
  }

  const rows: GavanWeek1FinalAudioRegistrationPreflightRow[] = evidenceResult.report.rows.map((row) => {
    const registrationStatus = registrationStatusForRow(row);

    return {
      jobId: row.jobId,
      blockId: row.blockId,
      contentUnitIds: row.contentUnitIds,
      targetText: row.targetText,
      outputPath: row.outputPath,
      expectedAssetId: row.expectedAssetId,
      generatedFileStatus: row.generatedFileStatus,
      approvalStatus: row.approvalStatus,
      registrationStatus,
      registryWriteAllowed: false,
      productionReady: false,
      finalAssetReady: false,
      blocker: registrationStatus,
    };
  });
  const registryReadyAssetCount = rows.filter((row) =>
    row.registrationStatus === 'ready_for_separate_live_registration_review',
  ).length;
  const blockedAssetCount = rows.length - registryReadyAssetCount;
  const report: GavanWeek1FinalAudioRegistrationPreflightReport = {
    kind: 'gavan_week1_final_audio_registration_preflight',
    generatedAt: options.generatedAt,
    registrationOwnerId: options.registrationOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceEvidenceStatus: evidenceResult.report.status,
    status: statusFromEvidence(evidenceResult.report, registryReadyAssetCount),
    readyForLive: false,
    audioProductionReady: false,
    audioAssetRegistrationAllowed: false,
    liveEditsAllowed: false,
    registryWritesUsed: false,
    sourceWritesUsed: false,
    audioFilesWritten: false,
    approvalMayBeInferred: false,
    pronunciationReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: evidenceResult.report.summary.expectedMp3Count,
      discoveredMp3FileCount: evidenceResult.report.summary.discoveredMp3FileCount,
      missingGeneratedFileCount: evidenceResult.report.summary.missingGeneratedFileCount,
      validGeneratedFileCount: evidenceResult.report.summary.validGeneratedFileCount,
      approvalRecordCount: evidenceResult.report.summary.approvalRecordCount,
      approvedFinalAudioCount: evidenceResult.report.summary.productionReadyAudioCount,
      registryReadyAssetCount,
      blockedAssetCount,
    },
    artifactPaths: {
      audioEvidenceChainBootstrap: relativeArtifactPath(GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH),
      finalAudioRegistrationPreflight: relativeArtifactPath(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH),
    },
    rows,
    requiredNextActions: [
      'Provide and validate every generated MP3 at the exact outputPath before approval records can count.',
      'Create explicit approval records for every valid generated audio asset.',
      'Run final audio promotion in a separate guarded pass before touching the runtime registry.',
      'Keep pronunciation readiness separate from listening audio registration.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      registryFilesEdited: false,
      audioFilesWritten: false,
    },
  };

  return {
    valid: true,
    issues: [],
    report,
  };
}

export function writeGavanWeek1FinalAudioRegistrationPreflight(
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1FinalAudioRegistrationPreflightIssue[] = [
      {
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      },
    ];

    return {
      valid: false,
      issues,
      report: failureReport(options, issues),
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeGavanWeek1AudioEvidenceChainBootstrap({
    generatedAt: options.generatedAt,
    ownerId: options.ownerId,
    intakeOwnerId: options.intakeOwnerId,
    approvalOwnerId: options.approvalOwnerId,
    outputRoot: options.outputRoot,
    targetPath: GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH,
  });
  const result = buildGavanWeek1FinalAudioRegistrationPreflight(options);
  const bytesWritten = writeJson(options.targetPath, result.report);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
