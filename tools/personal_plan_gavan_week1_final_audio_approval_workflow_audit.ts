import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1AudioApprovalRecordPacket,
  GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH,
  type GavanWeek1AudioApprovalRecordPacket,
  type GavanWeek1AudioApprovalRecordPacketRow,
} from './personal_plan_gavan_week1_audio_approval_record_packet';
import {
  buildGavanWeek1AudioProductionReadinessGate,
  GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH,
  writeGavanWeek1AudioProductionReadinessGate,
  type GavanWeek1AudioProductionReadinessGate,
} from './personal_plan_gavan_week1_audio_production_readiness_gate';

export const GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-final-audio-approval-workflow-audit.json',
);

export type GavanWeek1FinalAudioApprovalWorkflowAuditStatus =
  | 'blocked_before_generated_file_validation'
  | 'blocked_before_checksum_evidence'
  | 'blocked_before_reviewer_signoff'
  | 'blocked_before_final_audio_promotion'
  | 'blocked_before_live_registry'
  | 'ready_for_separate_live_registry_review';

export type GavanWeek1FinalAudioApprovalWorkflowAuditIssueCode =
  | 'audio_readiness_gate_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1FinalAudioApprovalWorkflowAuditIssue = {
  code: GavanWeek1FinalAudioApprovalWorkflowAuditIssueCode;
  detail: string;
};

export type GavanWeek1FinalAudioApprovalWorkflowAuditBlockerCode =
  | 'missing_generated_mp3_files'
  | 'missing_generated_file_checksums'
  | 'reviewer_signoff_blocked'
  | 'final_audio_promotion_blocked'
  | 'live_audio_registry_blocked';

export type GavanWeek1FinalAudioApprovalWorkflowAuditBlocker = {
  code: GavanWeek1FinalAudioApprovalWorkflowAuditBlockerCode;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1FinalAudioApprovalWorkflowAuditRowStatus =
  | 'blocked_missing_generated_file'
  | 'blocked_missing_checksum_evidence'
  | 'blocked_waiting_for_reviewer_signoff'
  | 'blocked_waiting_for_final_promotion'
  | 'blocked_waiting_for_live_registry'
  | 'ready_for_live_registry_review';

export type GavanWeek1FinalAudioApprovalWorkflowAuditRow = {
  jobId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  outputPath: string;
  expectedAssetId: string;
  status: GavanWeek1FinalAudioApprovalWorkflowAuditRowStatus;
  generatedFileValidated: boolean;
  checksumEvidenceReady: boolean;
  reviewerSignoffAllowed: false;
  approvalRecordCreated: false;
  finalPromotionAllowed: false;
  registryWriteAllowed: false;
  productionReady: false;
  blockedStage: 'generated_file' | 'checksum' | 'reviewer_signoff' | 'final_promotion' | 'live_registry';
  requiredReviewerEvidence: ['reviewerId', 'approvedAt', 'audioChecksum', 'sourceOutputPath'];
};

export type GavanWeek1FinalAudioApprovalWorkflowAudit = {
  kind: 'gavan_week1_final_audio_approval_workflow_audit';
  generatedAt: string;
  workflowOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceReadinessGateStatus: GavanWeek1AudioProductionReadinessGate['status'];
  sourceReleaseDecision: GavanWeek1AudioProductionReadinessGate['releaseDecision'];
  status: GavanWeek1FinalAudioApprovalWorkflowAuditStatus;
  releaseDecision: 'hold' | 'ready_for_review';
  productionReady: false;
  readyForLive: false;
  finalApprovalWorkflowReady: false;
  reviewerSignoffAllowed: false;
  approvalRecordsCreated: false;
  finalPromotionAllowed: false;
  registryWriteAllowed: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  audioFilesWritten: false;
  registryWritesUsed: false;
  pronunciationReadinessMayBeInferred: false;
  phaseWriteTargets: [];
  summary: {
    expectedMp3Count: number;
    generatedFileValidatedCount: number;
    checksumEvidenceReadyCount: number;
    reviewerSignoffReadyCount: number;
    explicitApprovalRecordCount: number;
    finalPromotionReadyCount: number;
    registryReadyCount: number;
    blockedWorkflowRowCount: number;
    blockerCount: number;
  };
  blockers: GavanWeek1FinalAudioApprovalWorkflowAuditBlocker[];
  workflowRows: GavanWeek1FinalAudioApprovalWorkflowAuditRow[];
  artifactPaths: {
    audioApprovalRecordPacket: string;
    audioProductionReadinessGate: string;
    finalAudioApprovalWorkflowAudit: string;
  };
  requiredNextActions: [
    'Provide all real MP3 files at the exact outputPath values before reviewer signoff can begin.',
    'Run generated-file validation and checksum evidence before creating explicit approval records.',
    'Collect one explicit reviewer approval record per validated generated audio asset.',
    'Promote approved generated audio to final assets before any registry pass.',
    'Run a separate guarded registry pass only after final audio promotion.',
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
  readinessOwnerId: string;
  workflowOwnerId: string;
  outputRoot: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1FinalAudioApprovalWorkflowAuditIssue[];
  audit: GavanWeek1FinalAudioApprovalWorkflowAudit;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Final audio approval workflow audit can only write under .codex-tmp or docs/reports.';

const REQUIRED_REVIEWER_EVIDENCE: ['reviewerId', 'approvedAt', 'audioChecksum', 'sourceOutputPath'] = [
  'reviewerId',
  'approvedAt',
  'audioChecksum',
  'sourceOutputPath',
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

function rowStatusFor(row: GavanWeek1AudioApprovalRecordPacketRow): {
  status: GavanWeek1FinalAudioApprovalWorkflowAuditRowStatus;
  blockedStage: GavanWeek1FinalAudioApprovalWorkflowAuditRow['blockedStage'];
  generatedFileValidated: boolean;
  checksumEvidenceReady: boolean;
} {
  if (row.generatedFileStatus === 'missing_generated_file') {
    return {
      status: 'blocked_missing_generated_file',
      blockedStage: 'generated_file',
      generatedFileValidated: false,
      checksumEvidenceReady: false,
    };
  }

  if (
    row.checksumStatus === 'blocked_missing_generated_file' ||
    row.checksumStatus === 'blocked_invalid_generated_file'
  ) {
    return {
      status: 'blocked_missing_checksum_evidence',
      blockedStage: 'checksum',
      generatedFileValidated: row.generatedFileStatus === 'valid_generated_file',
      checksumEvidenceReady: false,
    };
  }

  if (row.approvalRecordTemplateStatus === 'ready_for_reviewer_signature') {
    return {
      status: 'blocked_waiting_for_reviewer_signoff',
      blockedStage: 'reviewer_signoff',
      generatedFileValidated: true,
      checksumEvidenceReady: true,
    };
  }

  if (row.approvalRecordTemplateStatus === 'explicit_record_already_valid') {
    return {
      status: 'blocked_waiting_for_final_promotion',
      blockedStage: 'final_promotion',
      generatedFileValidated: true,
      checksumEvidenceReady: true,
    };
  }

  return {
    status: 'blocked_waiting_for_reviewer_signoff',
    blockedStage: 'reviewer_signoff',
    generatedFileValidated: row.generatedFileStatus === 'valid_generated_file',
    checksumEvidenceReady: false,
  };
}

function workflowRows(
  packet: GavanWeek1AudioApprovalRecordPacket,
): GavanWeek1FinalAudioApprovalWorkflowAuditRow[] {
  return packet.rows.map((row) => {
    const status = rowStatusFor(row);

    return {
      jobId: row.jobId,
      blockId: row.blockId,
      contentUnitIds: row.contentUnitIds,
      targetText: row.targetText,
      outputPath: row.outputPath,
      expectedAssetId: row.expectedAssetId,
      status: status.status,
      generatedFileValidated: status.generatedFileValidated,
      checksumEvidenceReady: status.checksumEvidenceReady,
      reviewerSignoffAllowed: false,
      approvalRecordCreated: false,
      finalPromotionAllowed: false,
      registryWriteAllowed: false,
      productionReady: false,
      blockedStage: status.blockedStage,
      requiredReviewerEvidence: [...REQUIRED_REVIEWER_EVIDENCE],
    };
  });
}

function blockersForGate(
  gate: GavanWeek1AudioProductionReadinessGate,
): GavanWeek1FinalAudioApprovalWorkflowAuditBlocker[] {
  const sourceCodes = new Set(gate.blockers.map((blocker) => blocker.code));
  const blockers: GavanWeek1FinalAudioApprovalWorkflowAuditBlocker[] = [];

  if (sourceCodes.has('missing_generated_mp3_files')) {
    blockers.push({
      code: 'missing_generated_mp3_files',
      blocksProduction: true,
      detail: 'Real generated MP3 files are missing at the expected outputPath values.',
    });
  }

  if (sourceCodes.has('missing_generated_file_checksums')) {
    blockers.push({
      code: 'missing_generated_file_checksums',
      blocksProduction: true,
      detail: 'Checksum evidence is unavailable until generated MP3 files validate.',
    });
  }

  if (sourceCodes.has('missing_explicit_approval_records')) {
    blockers.push({
      code: 'reviewer_signoff_blocked',
      blocksProduction: true,
      detail: 'Reviewer signoff is blocked until generated files and checksums are ready.',
    });
  }

  if (sourceCodes.has('missing_final_audio_promotion')) {
    blockers.push({
      code: 'final_audio_promotion_blocked',
      blocksProduction: true,
      detail: 'Final audio promotion is blocked until explicit approval records are complete.',
    });
  }

  if (sourceCodes.has('live_audio_registry_blocked')) {
    blockers.push({
      code: 'live_audio_registry_blocked',
      blocksProduction: true,
      detail: 'Live audio registry writes remain blocked until a separate guarded registry pass.',
    });
  }

  return blockers;
}

function statusForRows(
  rows: GavanWeek1FinalAudioApprovalWorkflowAuditRow[],
): GavanWeek1FinalAudioApprovalWorkflowAuditStatus {
  if (rows.some((row) => row.status === 'blocked_missing_generated_file')) {
    return 'blocked_before_generated_file_validation';
  }

  if (rows.some((row) => row.status === 'blocked_missing_checksum_evidence')) {
    return 'blocked_before_checksum_evidence';
  }

  if (rows.some((row) => row.status === 'blocked_waiting_for_reviewer_signoff')) {
    return 'blocked_before_reviewer_signoff';
  }

  if (rows.some((row) => row.status === 'blocked_waiting_for_final_promotion')) {
    return 'blocked_before_final_audio_promotion';
  }

  if (rows.some((row) => row.status === 'blocked_waiting_for_live_registry')) {
    return 'blocked_before_live_registry';
  }

  return 'ready_for_separate_live_registry_review';
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

function auditFromSources(
  options: BuildOptions,
  packet: GavanWeek1AudioApprovalRecordPacket,
  gate: GavanWeek1AudioProductionReadinessGate,
): GavanWeek1FinalAudioApprovalWorkflowAudit {
  const rows = workflowRows(packet);
  const blockers = blockersForGate(gate);

  return {
    kind: 'gavan_week1_final_audio_approval_workflow_audit',
    generatedAt: options.generatedAt,
    workflowOwnerId: options.workflowOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceReadinessGateStatus: gate.status,
    sourceReleaseDecision: gate.releaseDecision,
    status: statusForRows(rows),
    releaseDecision: blockers.length === 0 ? 'ready_for_review' : 'hold',
    productionReady: false,
    readyForLive: false,
    finalApprovalWorkflowReady: false,
    reviewerSignoffAllowed: false,
    approvalRecordsCreated: false,
    finalPromotionAllowed: false,
    registryWriteAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    audioFilesWritten: false,
    registryWritesUsed: false,
    pronunciationReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      expectedMp3Count: packet.summary.expectedMp3Count,
      generatedFileValidatedCount: rows.filter((row) => row.generatedFileValidated).length,
      checksumEvidenceReadyCount: rows.filter((row) => row.checksumEvidenceReady).length,
      reviewerSignoffReadyCount: 0,
      explicitApprovalRecordCount: packet.summary.approvalRecordCount,
      finalPromotionReadyCount: packet.summary.productionReadyAudioCount,
      registryReadyCount: 0,
      blockedWorkflowRowCount: rows.filter((row) => row.productionReady === false).length,
      blockerCount: blockers.length,
    },
    blockers,
    workflowRows: rows,
    artifactPaths: {
      audioApprovalRecordPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_APPROVAL_RECORD_PACKET_PATH),
      audioProductionReadinessGate: relativeArtifactPath(GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH),
      finalAudioApprovalWorkflowAudit: relativeArtifactPath(GAVAN_WEEK1_FINAL_AUDIO_APPROVAL_WORKFLOW_AUDIT_PATH),
    },
    requiredNextActions: [
      'Provide all real MP3 files at the exact outputPath values before reviewer signoff can begin.',
      'Run generated-file validation and checksum evidence before creating explicit approval records.',
      'Collect one explicit reviewer approval record per validated generated audio asset.',
      'Promote approved generated audio to final assets before any registry pass.',
      'Run a separate guarded registry pass only after final audio promotion.',
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

function failureAudit(
  options: BuildOptions,
  issues: GavanWeek1FinalAudioApprovalWorkflowAuditIssue[],
): GavanWeek1FinalAudioApprovalWorkflowAudit {
  const emptyPacket: GavanWeek1AudioApprovalRecordPacket = {
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
      finalAudioRegistrationPreflight: '',
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
  const emptyGate = buildGavanWeek1AudioProductionReadinessGate(options).gate;
  const audit = auditFromSources(options, emptyPacket, emptyGate);

  return {
    ...audit,
    summary: {
      ...audit.summary,
      blockerCount: issues.length,
    },
  };
}

export function buildGavanWeek1FinalAudioApprovalWorkflowAudit(
  options: BuildOptions,
): BuildResult {
  const gateResult = buildGavanWeek1AudioProductionReadinessGate(options);

  if (!gateResult.valid) {
    const issues: GavanWeek1FinalAudioApprovalWorkflowAuditIssue[] = gateResult.issues.map((issue) => ({
      code: 'audio_readiness_gate_invalid',
      detail: `${issue.code}: ${issue.detail}`,
    }));

    return {
      valid: false,
      issues,
      audit: failureAudit(options, issues),
    };
  }

  const packetResult = buildGavanWeek1AudioApprovalRecordPacket(options);

  return {
    valid: true,
    issues: [],
    audit: auditFromSources(options, packetResult.packet, gateResult.gate),
  };
}

export function writeGavanWeek1FinalAudioApprovalWorkflowAudit(
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1FinalAudioApprovalWorkflowAuditIssue[] = [{
      code: 'target_path_not_allowed',
      detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
    }];

    return {
      valid: false,
      issues,
      audit: failureAudit(options, issues),
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeGavanWeek1AudioProductionReadinessGate({
    generatedAt: options.generatedAt,
    ownerId: options.ownerId,
    intakeOwnerId: options.intakeOwnerId,
    approvalOwnerId: options.approvalOwnerId,
    registrationOwnerId: options.registrationOwnerId,
    recordPacketOwnerId: options.recordPacketOwnerId,
    readinessOwnerId: options.readinessOwnerId,
    outputRoot: options.outputRoot,
    targetPath: GAVAN_WEEK1_AUDIO_PRODUCTION_READINESS_GATE_PATH,
  });
  const result = buildGavanWeek1FinalAudioApprovalWorkflowAudit(options);
  const bytesWritten = writeJson(options.targetPath, result.audit);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
