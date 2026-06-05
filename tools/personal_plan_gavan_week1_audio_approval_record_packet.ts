import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1FinalAudioRegistrationPreflight,
  GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH,
  writeGavanWeek1FinalAudioRegistrationPreflight,
  type GavanWeek1FinalAudioRegistrationPreflightReport,
  type GavanWeek1FinalAudioRegistrationPreflightRow,
  type GavanWeek1FinalAudioRegistrationPreflightStatus,
} from './personal_plan_gavan_week1_final_audio_registration_preflight';

export const GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-approval-record-packet.json',
);

export type GavanWeek1AudioApprovalRecordPacketStatus =
  GavanWeek1FinalAudioRegistrationPreflightStatus;

export type GavanWeek1AudioApprovalRecordTemplateStatus =
  | 'blocked_until_generated_file_valid'
  | 'ready_for_reviewer_signature'
  | 'blocked_invalid_existing_record'
  | 'explicit_record_already_valid';

export type GavanWeek1AudioApprovalRecordChecksumStatus =
  | 'blocked_missing_generated_file'
  | 'blocked_invalid_generated_file'
  | 'checksum_ready_after_generated_file_validation'
  | 'checksum_already_matched';

export type GavanWeek1AudioApprovalRecordPacketIssueCode =
  | 'registration_preflight_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1AudioApprovalRecordPacketIssue = {
  code: GavanWeek1AudioApprovalRecordPacketIssueCode;
  detail: string;
};

export type GavanWeek1AudioApprovalRecordPacketRow = {
  jobId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  outputPath: string;
  expectedAssetId: string;
  generatedFileStatus: GavanWeek1FinalAudioRegistrationPreflightRow['generatedFileStatus'];
  approvalStatus: string;
  registrationStatus: GavanWeek1FinalAudioRegistrationPreflightRow['registrationStatus'];
  approvalRecordTemplateStatus: GavanWeek1AudioApprovalRecordTemplateStatus;
  checksumStatus: GavanWeek1AudioApprovalRecordChecksumStatus;
  requiredApprovalFields: ['kind', 'assetId', 'reviewerId', 'approvedAt', 'audioChecksum'];
  approvalRecordCreated: false;
  registryWriteAllowed: false;
  productionReady: false;
  blocker: string;
};

export type GavanWeek1AudioApprovalRecordPacket = {
  kind: 'gavan_week1_audio_approval_record_packet';
  generatedAt: string;
  recordPacketOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceRegistrationPreflightStatus: GavanWeek1FinalAudioRegistrationPreflightStatus;
  status: GavanWeek1AudioApprovalRecordPacketStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioAssetRegistrationAllowed: false;
  approvalRecordsCreated: false;
  approvalMayBeInferred: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  registryWritesUsed: false;
  audioFilesWritten: false;
  phaseWriteTargets: [];
  summary: {
    expectedMp3Count: number;
    eligibleForApprovalRecordCount: number;
    blockedBeforeApprovalRecordCount: number;
    checksumReadyCount: number;
    approvalRecordCount: number;
    productionReadyAudioCount: number;
  };
  artifactPaths: {
    finalAudioRegistrationPreflight: string;
    audioApprovalRecordPacket: string;
  };
  rows: GavanWeek1AudioApprovalRecordPacketRow[];
  requiredNextActions: [
    'Provide every missing MP3 at the exact outputPath and rerun generated-file validation.',
    'Only after generated-file validation passes, fill one approval record per generated audio asset.',
    'Each approval record must include reviewerId, approvedAt, and audioChecksum from the validated generated metadata.',
    'Run the explicit approval intake and final registration preflight again before any live registry work.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    approvalRecordsWritten: false;
    registryFilesEdited: false;
    audioFilesWritten: false;
    liveFilesEdited: false;
  };
};

type BuildOptions = {
  generatedAt: string;
  ownerId: string;
  intakeOwnerId: string;
  approvalOwnerId: string;
  registrationOwnerId: string;
  recordPacketOwnerId: string;
  outputRoot: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1AudioApprovalRecordPacketIssue[];
  packet: GavanWeek1AudioApprovalRecordPacket;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Audio approval record packet can only write under .codex-tmp or docs/reports.';

const REQUIRED_APPROVAL_FIELDS: ['kind', 'assetId', 'reviewerId', 'approvedAt', 'audioChecksum'] = [
  'kind',
  'assetId',
  'reviewerId',
  'approvedAt',
  'audioChecksum',
];

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

function templateStatusForRow(
  row: GavanWeek1FinalAudioRegistrationPreflightRow,
): GavanWeek1AudioApprovalRecordTemplateStatus {
  if (
    row.registrationStatus === 'blocked_missing_generated_file' ||
    row.registrationStatus === 'blocked_invalid_generated_file'
  ) {
    return 'blocked_until_generated_file_valid';
  }

  if (row.registrationStatus === 'blocked_invalid_explicit_approval') {
    return 'blocked_invalid_existing_record';
  }

  if (
    row.registrationStatus === 'blocked_final_audio_not_promoted' ||
    row.registrationStatus === 'ready_for_separate_live_registration_review'
  ) {
    return 'explicit_record_already_valid';
  }

  return 'ready_for_reviewer_signature';
}

function checksumStatusForRow(
  row: GavanWeek1FinalAudioRegistrationPreflightRow,
): GavanWeek1AudioApprovalRecordChecksumStatus {
  if (row.registrationStatus === 'blocked_missing_generated_file') {
    return 'blocked_missing_generated_file';
  }

  if (row.registrationStatus === 'blocked_invalid_generated_file') {
    return 'blocked_invalid_generated_file';
  }

  if (
    row.registrationStatus === 'blocked_final_audio_not_promoted' ||
    row.registrationStatus === 'ready_for_separate_live_registration_review'
  ) {
    return 'checksum_already_matched';
  }

  return 'checksum_ready_after_generated_file_validation';
}

function packetRows(
  preflight: GavanWeek1FinalAudioRegistrationPreflightReport,
): GavanWeek1AudioApprovalRecordPacketRow[] {
  return preflight.rows.map((row) => {
    const approvalRecordTemplateStatus = templateStatusForRow(row);
    const checksumStatus = checksumStatusForRow(row);

    return {
      jobId: row.jobId,
      blockId: row.blockId,
      contentUnitIds: row.contentUnitIds,
      targetText: row.targetText,
      outputPath: row.outputPath,
      expectedAssetId: row.expectedAssetId,
      generatedFileStatus: row.generatedFileStatus,
      approvalStatus: row.approvalStatus,
      registrationStatus: row.registrationStatus,
      approvalRecordTemplateStatus,
      checksumStatus,
      requiredApprovalFields: [...REQUIRED_APPROVAL_FIELDS],
      approvalRecordCreated: false,
      registryWriteAllowed: false,
      productionReady: false,
      blocker: approvalRecordTemplateStatus,
    };
  });
}

function failurePacket(
  options: BuildOptions,
  issues: GavanWeek1AudioApprovalRecordPacketIssue[],
): GavanWeek1AudioApprovalRecordPacket {
  return {
    kind: 'gavan_week1_audio_approval_record_packet',
    generatedAt: options.generatedAt,
    recordPacketOwnerId: options.recordPacketOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceRegistrationPreflightStatus: 'blocked_missing_generated_audio',
    status: 'blocked_missing_generated_audio',
    readyForLive: false,
    audioProductionReady: false,
    audioAssetRegistrationAllowed: false,
    approvalRecordsCreated: false,
    approvalMayBeInferred: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    registryWritesUsed: false,
    audioFilesWritten: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: 0,
      eligibleForApprovalRecordCount: 0,
      blockedBeforeApprovalRecordCount: 0,
      checksumReadyCount: 0,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    },
    artifactPaths: {
      finalAudioRegistrationPreflight: relativeArtifactPath(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH),
      audioApprovalRecordPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH),
    },
    rows: [],
    requiredNextActions: [
      'Provide every missing MP3 at the exact outputPath and rerun generated-file validation.',
      'Only after generated-file validation passes, fill one approval record per generated audio asset.',
      'Each approval record must include reviewerId, approvedAt, and audioChecksum from the validated generated metadata.',
      'Run the explicit approval intake and final registration preflight again before any live registry work.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      approvalRecordsWritten: false,
      registryFilesEdited: false,
      audioFilesWritten: false,
      liveFilesEdited: false,
    },
  };
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

export function buildGavanWeek1AudioApprovalRecordPacket(
  options: BuildOptions,
): BuildResult {
  const preflightResult = buildGavanWeek1FinalAudioRegistrationPreflight(options);

  if (!preflightResult.valid) {
    const issues: GavanWeek1AudioApprovalRecordPacketIssue[] = preflightResult.issues.map((issue) => ({
      code: 'registration_preflight_invalid',
      detail: `${issue.code}: ${issue.detail}`,
    }));

    return {
      valid: false,
      issues,
      packet: failurePacket(options, issues),
    };
  }

  const rows = packetRows(preflightResult.report);
  const eligibleForApprovalRecordCount = rows.filter((row) =>
    row.approvalRecordTemplateStatus === 'ready_for_reviewer_signature',
  ).length;
  const checksumReadyCount = rows.filter((row) =>
    row.checksumStatus === 'checksum_ready_after_generated_file_validation' ||
    row.checksumStatus === 'checksum_already_matched',
  ).length;
  const packet: GavanWeek1AudioApprovalRecordPacket = {
    kind: 'gavan_week1_audio_approval_record_packet',
    generatedAt: options.generatedAt,
    recordPacketOwnerId: options.recordPacketOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceRegistrationPreflightStatus: preflightResult.report.status,
    status: preflightResult.report.status,
    readyForLive: false,
    audioProductionReady: false,
    audioAssetRegistrationAllowed: false,
    approvalRecordsCreated: false,
    approvalMayBeInferred: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    registryWritesUsed: false,
    audioFilesWritten: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: preflightResult.report.summary.expectedMp3Count,
      eligibleForApprovalRecordCount,
      blockedBeforeApprovalRecordCount: rows.length - eligibleForApprovalRecordCount,
      checksumReadyCount,
      approvalRecordCount: preflightResult.report.summary.approvalRecordCount,
      productionReadyAudioCount: preflightResult.report.summary.approvedFinalAudioCount,
    },
    artifactPaths: {
      finalAudioRegistrationPreflight: relativeArtifactPath(GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH),
      audioApprovalRecordPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH),
    },
    rows,
    requiredNextActions: [
      'Provide every missing MP3 at the exact outputPath and rerun generated-file validation.',
      'Only after generated-file validation passes, fill one approval record per generated audio asset.',
      'Each approval record must include reviewerId, approvedAt, and audioChecksum from the validated generated metadata.',
      'Run the explicit approval intake and final registration preflight again before any live registry work.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      approvalRecordsWritten: false,
      registryFilesEdited: false,
      audioFilesWritten: false,
      liveFilesEdited: false,
    },
  };

  return {
    valid: true,
    issues: [],
    packet,
  };
}

export function writeGavanWeek1AudioApprovalRecordPacket(
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1AudioApprovalRecordPacketIssue[] = [
      {
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      },
    ];

    return {
      valid: false,
      issues,
      packet: failurePacket(options, issues),
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeGavanWeek1FinalAudioRegistrationPreflight({
    generatedAt: options.generatedAt,
    ownerId: options.ownerId,
    intakeOwnerId: options.intakeOwnerId,
    approvalOwnerId: options.approvalOwnerId,
    registrationOwnerId: options.registrationOwnerId,
    outputRoot: options.outputRoot,
    targetPath: GAVAN_WEEK1_FINAL_AUDIO_REGISTRATION_PREFLIGHT_PATH,
  });
  const result = buildGavanWeek1AudioApprovalRecordPacket(options);
  const bytesWritten = writeJson(options.targetPath, result.packet);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
