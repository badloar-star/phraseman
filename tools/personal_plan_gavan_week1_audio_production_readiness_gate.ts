import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1AudioApprovalRecordPacket,
  GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH,
  writeGavanWeek1AudioApprovalRecordPacket,
  type GavanWeek1AudioApprovalRecordPacket,
} from './personal_plan_gavan_week1_audio_approval_record_packet';

export const GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-production-readiness-gate.json',
);

export type GavanWeek1AudioProductionReadinessGateStatus =
  | 'hold_missing_generated_audio'
  | 'hold_missing_checksum_evidence'
  | 'hold_missing_explicit_approval_records'
  | 'hold_missing_final_audio_promotion'
  | 'hold_live_registry_blocked'
  | 'ready_for_live_audio_release_review';

export type GavanWeek1AudioProductionReadinessReleaseDecision = 'hold' | 'ready_for_review';

export type GavanWeek1AudioProductionReadinessIssueCode =
  | 'approval_record_packet_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1AudioProductionReadinessIssue = {
  code: GavanWeek1AudioProductionReadinessIssueCode;
  detail: string;
};

export type GavanWeek1AudioProductionReadinessBlockerCode =
  | 'missing_generated_mp3_files'
  | 'missing_generated_file_checksums'
  | 'missing_explicit_approval_records'
  | 'missing_final_audio_promotion'
  | 'live_audio_registry_blocked';

export type GavanWeek1AudioProductionReadinessBlocker = {
  code: GavanWeek1AudioProductionReadinessBlockerCode;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1AudioProductionReadinessGate = {
  kind: 'gavan_week1_audio_production_readiness_gate';
  generatedAt: string;
  readinessOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceApprovalRecordPacketStatus: GavanWeek1AudioApprovalRecordPacket['status'];
  status: GavanWeek1AudioProductionReadinessGateStatus;
  releaseDecision: GavanWeek1AudioProductionReadinessReleaseDecision;
  productionReady: false;
  readyForLive: false;
  audioProductionReady: false;
  audioApprovalReady: false;
  audioAssetRegistrationAllowed: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  registryWritesUsed: false;
  audioFilesWritten: false;
  approvalRecordsCreated: false;
  pronunciationReadinessMayBeInferred: false;
  phaseWriteTargets: [];
  summary: {
    expectedMp3Count: number;
    discoveredMp3FileCount: number;
    missingGeneratedFileCount: number;
    validGeneratedFileCount: number;
    eligibleApprovalRecordCount: number;
    approvalRecordCount: number;
    checksumReadyCount: number;
    approvedFinalAudioCount: number;
    registryReadyAssetCount: number;
    productionReadyAudioCount: number;
    blockerCount: number;
  };
  blockers: GavanWeek1AudioProductionReadinessBlocker[];
  artifactPaths: {
    audioApprovalRecordPacket: string;
    audioProductionReadinessGate: string;
  };
  requiredNextActions: [
    'Provide the 10 real MP3 files at the exact P3.105 outputPath values.',
    'Run generated-file validation and checksum evidence before approval records can count.',
    'Create explicit approval records only after generated assets validate.',
    'Run final audio promotion and a guarded registry pass before live listening can be production-ready.',
    'Keep pronunciation readiness separate from listening audio readiness.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    registryFilesEdited: false;
    approvalRecordsWritten: false;
    audioFilesWritten: false;
  };
};

type BuildOptions = {
  generatedAt: string;
  ownerId: string;
  intakeOwnerId: string;
  approvalOwnerId: string;
  registrationOwnerId: string;
  recordPacketOwnerId: string;
  readinessOwnerId: string;
  outputRoot: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1AudioProductionReadinessIssue[];
  gate: GavanWeek1AudioProductionReadinessGate;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Audio production readiness gate can only write under .codex-tmp or docs/reports.';

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

function blockersForPacket(
  packet: GavanWeek1AudioApprovalRecordPacket,
): GavanWeek1AudioProductionReadinessBlocker[] {
  const blockers: GavanWeek1AudioProductionReadinessBlocker[] = [];

  if (packet.summary.expectedMp3Count > packet.summary.checksumReadyCount) {
    blockers.push({
      code: 'missing_generated_mp3_files',
      blocksProduction: true,
      detail: 'Real generated MP3 files are missing at the expected outputPath values.',
    });
  }

  if (packet.summary.checksumReadyCount < packet.summary.expectedMp3Count) {
    blockers.push({
      code: 'missing_generated_file_checksums',
      blocksProduction: true,
      detail: 'Generated-file checksum evidence is unavailable until real MP3 files validate.',
    });
  }

  if (packet.summary.approvalRecordCount < packet.summary.expectedMp3Count) {
    blockers.push({
      code: 'missing_explicit_approval_records',
      blocksProduction: true,
      detail: 'Every generated audio asset needs an explicit reviewer approval record.',
    });
  }

  if (packet.summary.productionReadyAudioCount < packet.summary.expectedMp3Count) {
    blockers.push({
      code: 'missing_final_audio_promotion',
      blocksProduction: true,
      detail: 'Approved generated audio has not been promoted to final production-ready assets.',
    });
  }

  blockers.push({
    code: 'live_audio_registry_blocked',
    blocksProduction: true,
    detail: 'Live audio registry writes remain blocked until the guarded registry pass is explicitly allowed.',
  });

  return blockers;
}

function statusForBlockers(
  blockers: GavanWeek1AudioProductionReadinessBlocker[],
): GavanWeek1AudioProductionReadinessGateStatus {
  if (blockers.some((blocker) => blocker.code === 'missing_generated_mp3_files')) {
    return 'hold_missing_generated_audio';
  }

  if (blockers.some((blocker) => blocker.code === 'missing_generated_file_checksums')) {
    return 'hold_missing_checksum_evidence';
  }

  if (blockers.some((blocker) => blocker.code === 'missing_explicit_approval_records')) {
    return 'hold_missing_explicit_approval_records';
  }

  if (blockers.some((blocker) => blocker.code === 'missing_final_audio_promotion')) {
    return 'hold_missing_final_audio_promotion';
  }

  if (blockers.some((blocker) => blocker.code === 'live_audio_registry_blocked')) {
    return 'hold_live_registry_blocked';
  }

  return 'ready_for_live_audio_release_review';
}

function failureGate(
  options: BuildOptions,
  issues: GavanWeek1AudioProductionReadinessIssue[],
): GavanWeek1AudioProductionReadinessGate {
  return {
    kind: 'gavan_week1_audio_production_readiness_gate',
    generatedAt: options.generatedAt,
    readinessOwnerId: options.readinessOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceApprovalRecordPacketStatus: 'blocked_missing_generated_audio',
    status: 'hold_missing_generated_audio',
    releaseDecision: 'hold',
    productionReady: false,
    readyForLive: false,
    audioProductionReady: false,
    audioApprovalReady: false,
    audioAssetRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    registryWritesUsed: false,
    audioFilesWritten: false,
    approvalRecordsCreated: false,
    pronunciationReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: 0,
      discoveredMp3FileCount: 0,
      missingGeneratedFileCount: 0,
      validGeneratedFileCount: 0,
      eligibleApprovalRecordCount: 0,
      approvalRecordCount: 0,
      checksumReadyCount: 0,
      approvedFinalAudioCount: 0,
      registryReadyAssetCount: 0,
      productionReadyAudioCount: 0,
      blockerCount: issues.length,
    },
    blockers: issues.map((issue) => ({
      code: 'missing_generated_mp3_files',
      blocksProduction: true,
      detail: issue.detail,
    })),
    artifactPaths: {
      audioApprovalRecordPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH),
      audioProductionReadinessGate: relativeArtifactPath(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH),
    },
    requiredNextActions: [
      'Provide the 10 real MP3 files at the exact P3.105 outputPath values.',
      'Run generated-file validation and checksum evidence before approval records can count.',
      'Create explicit approval records only after generated assets validate.',
      'Run final audio promotion and a guarded registry pass before live listening can be production-ready.',
      'Keep pronunciation readiness separate from listening audio readiness.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      registryFilesEdited: false,
      approvalRecordsWritten: false,
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

export function buildGavanWeek1AudioProductionReadinessGate(
  options: BuildOptions,
): BuildResult {
  const packetResult = buildGavanWeek1AudioApprovalRecordPacket(options);

  if (!packetResult.valid) {
    const issues: GavanWeek1AudioProductionReadinessIssue[] = packetResult.issues.map((issue) => ({
      code: 'approval_record_packet_invalid',
      detail: `${issue.code}: ${issue.detail}`,
    }));

    return {
      valid: false,
      issues,
      gate: failureGate(options, issues),
    };
  }

  const packet = packetResult.packet;
  const blockers = blockersForPacket(packet);
  const gate: GavanWeek1AudioProductionReadinessGate = {
    kind: 'gavan_week1_audio_production_readiness_gate',
    generatedAt: options.generatedAt,
    readinessOwnerId: options.readinessOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceApprovalRecordPacketStatus: packet.status,
    status: statusForBlockers(blockers),
    releaseDecision: blockers.length === 0 ? 'ready_for_review' : 'hold',
    productionReady: false,
    readyForLive: false,
    audioProductionReady: false,
    audioApprovalReady: false,
    audioAssetRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    registryWritesUsed: false,
    audioFilesWritten: false,
    approvalRecordsCreated: false,
    pronunciationReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: packet.summary.expectedMp3Count,
      discoveredMp3FileCount: packet.summary.checksumReadyCount,
      missingGeneratedFileCount: packet.summary.expectedMp3Count - packet.summary.checksumReadyCount,
      validGeneratedFileCount: packet.summary.checksumReadyCount,
      eligibleApprovalRecordCount: packet.summary.eligibleForApprovalRecordCount,
      approvalRecordCount: packet.summary.approvalRecordCount,
      checksumReadyCount: packet.summary.checksumReadyCount,
      approvedFinalAudioCount: packet.summary.productionReadyAudioCount,
      registryReadyAssetCount: 0,
      productionReadyAudioCount: packet.summary.productionReadyAudioCount,
      blockerCount: blockers.length,
    },
    blockers,
    artifactPaths: {
      audioApprovalRecordPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH),
      audioProductionReadinessGate: relativeArtifactPath(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH),
    },
    requiredNextActions: [
      'Provide the 10 real MP3 files at the exact P3.105 outputPath values.',
      'Run generated-file validation and checksum evidence before approval records can count.',
      'Create explicit approval records only after generated assets validate.',
      'Run final audio promotion and a guarded registry pass before live listening can be production-ready.',
      'Keep pronunciation readiness separate from listening audio readiness.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      registryFilesEdited: false,
      approvalRecordsWritten: false,
      audioFilesWritten: false,
    },
  };

  return {
    valid: true,
    issues: [],
    gate,
  };
}

export function writeGavanWeek1AudioProductionReadinessGate(
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1AudioProductionReadinessIssue[] = [
      {
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      },
    ];

    return {
      valid: false,
      issues,
      gate: failureGate(options, issues),
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeGavanWeek1AudioApprovalRecordPacket({
    generatedAt: options.generatedAt,
    ownerId: options.ownerId,
    intakeOwnerId: options.intakeOwnerId,
    approvalOwnerId: options.approvalOwnerId,
    registrationOwnerId: options.registrationOwnerId,
    recordPacketOwnerId: options.recordPacketOwnerId,
    outputRoot: options.outputRoot,
    targetPath: GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH,
  });
  const result = buildGavanWeek1AudioProductionReadinessGate(options);
  const bytesWritten = writeJson(options.targetPath, result.gate);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
