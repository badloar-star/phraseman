import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1PronunciationScoringProviderContract,
} from './personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
  buildGavanWeek1PronunciationProductionReadinessGate,
  writeGavanWeek1PronunciationProductionReadinessGate,
  type GavanWeek1PronunciationProductionReadinessGate,
} from './personal_plan_gavan_week1_pronunciation_production_readiness_gate';
import {
  GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
  buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  type GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  type GavanWeek1PronunciationScoredAttemptEvidenceIntakeRow,
} from './personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report';

export const GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-pronunciation-approval-workflow-audit.json',
);

export type GavanWeek1PronunciationApprovalWorkflowAuditStatus =
  | 'blocked_before_scorer_provider_contract'
  | 'blocked_before_recording_evidence'
  | 'blocked_before_scored_attempt_evidence'
  | 'blocked_before_reviewer_signoff'
  | 'blocked_before_final_scorer_promotion'
  | 'blocked_before_live_adapter'
  | 'ready_for_live_pronunciation_review';

export type GavanWeek1PronunciationApprovalWorkflowAuditIssueCode =
  | 'pronunciation_readiness_gate_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1PronunciationApprovalWorkflowAuditIssue = {
  code: GavanWeek1PronunciationApprovalWorkflowAuditIssueCode;
  detail: string;
};

export type GavanWeek1PronunciationApprovalWorkflowAuditBlockerCode =
  | 'missing_scorer_provider_contract'
  | 'missing_real_recording_evidence'
  | 'missing_scored_attempt_evidence'
  | 'pronunciation_reviewer_signoff_blocked'
  | 'final_scorer_promotion_blocked'
  | 'live_pronunciation_adapter_blocked'
  | 'progress_penalty_blocked';

export type GavanWeek1PronunciationApprovalWorkflowAuditBlocker = {
  code: GavanWeek1PronunciationApprovalWorkflowAuditBlockerCode;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1PronunciationApprovalWorkflowAuditRowStatus =
  | 'blocked_missing_scorer_provider'
  | 'blocked_missing_recording_evidence'
  | 'blocked_missing_scored_attempt'
  | 'blocked_waiting_for_reviewer_signoff'
  | 'blocked_waiting_for_final_scorer'
  | 'blocked_waiting_for_live_adapter'
  | 'ready_for_live_pronunciation_review';

export type GavanWeek1PronunciationApprovalWorkflowAuditRow = {
  referenceId: string;
  dayId: string;
  dayIndex: number;
  blockId: string;
  exerciseId: string;
  contentUnitId: string;
  targetText: string;
  runtimeMode: string;
  status: GavanWeek1PronunciationApprovalWorkflowAuditRowStatus;
  scorerProviderReady: boolean;
  recordingEvidenceReady: boolean;
  scoredAttemptReady: boolean;
  reviewerSignoffAllowed: false;
  approvalRecordCreated: false;
  finalScorerPromotionAllowed: false;
  liveAdapterAllowed: false;
  progressPenaltyAllowed: false;
  productionReady: false;
  blockedStage:
    | 'scorer_provider'
    | 'recording_evidence'
    | 'scored_attempt'
    | 'reviewer_signoff'
    | 'final_scorer'
    | 'live_adapter';
  requiredReviewerEvidence: [
    'reviewerId',
    'approvedAt',
    'referenceId',
    'recordingId',
    'scoringProvider',
    'scoringVersion',
    'score',
    'recognitionConfidence',
  ];
};

export type GavanWeek1PronunciationApprovalWorkflowAudit = {
  kind: 'gavan_week1_pronunciation_approval_workflow_audit';
  generatedAt: string;
  workflowOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceReadinessGateStatus: GavanWeek1PronunciationProductionReadinessGate['status'];
  sourceReleaseDecision: GavanWeek1PronunciationProductionReadinessGate['releaseDecision'];
  status: GavanWeek1PronunciationApprovalWorkflowAuditStatus;
  releaseDecision: 'hold' | 'ready_for_review';
  productionReady: false;
  readyForLive: false;
  pronunciationApprovalWorkflowReady: false;
  reviewerSignoffAllowed: false;
  approvalRecordsCreated: false;
  finalScorerPromotionAllowed: false;
  liveAdapterAllowed: false;
  progressPenaltyAllowed: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  recordingFilesWritten: false;
  scoringFilesWritten: false;
  audioReadinessMayBeInferred: false;
  phaseWriteTargets: [];
  summary: {
    referenceCount: number;
    scorerProviderReadyCount: number;
    recordingEvidenceReadyCount: number;
    scoredAttemptReadyCount: number;
    reviewerSignoffReadyCount: number;
    explicitApprovalRecordCount: 0;
    finalScorerReadyCount: 0;
    liveAdapterReadyCount: 0;
    progressPenaltyReadyCount: 0;
    blockedWorkflowRowCount: number;
    blockerCount: number;
  };
  blockers: GavanWeek1PronunciationApprovalWorkflowAuditBlocker[];
  workflowRows: GavanWeek1PronunciationApprovalWorkflowAuditRow[];
  artifactPaths: {
    scoredAttemptEvidenceIntake: string;
    pronunciationProductionReadinessGate: string;
    pronunciationApprovalWorkflowAudit: string;
  };
  requiredNextActions: [
    'Attach a real scorer provider contract before pronunciation reviewer signoff can begin.',
    'Provide one real recording and scored attempt for every pronunciation reference.',
    'Collect one explicit pronunciation approval record per valid scored attempt.',
    'Promote the approved scorer configuration before enabling live adapters.',
    'Enable progress penalties only after final scorer promotion and explicit approval.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    scoringFilesWritten: false;
    recordingFilesWritten: false;
    approvalRecordsWritten: false;
  };
};

type BuildOptions = {
  generatedAt: string;
  evidenceOwnerId: string;
  readinessOwnerId: string;
  workflowOwnerId: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1PronunciationApprovalWorkflowAuditIssue[];
  audit: GavanWeek1PronunciationApprovalWorkflowAudit;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Pronunciation approval workflow audit can only write under .codex-tmp or docs/reports.';

const REQUIRED_REVIEWER_EVIDENCE: [
  'reviewerId',
  'approvedAt',
  'referenceId',
  'recordingId',
  'scoringProvider',
  'scoringVersion',
  'score',
  'recognitionConfidence',
] = [
  'reviewerId',
  'approvedAt',
  'referenceId',
  'recordingId',
  'scoringProvider',
  'scoringVersion',
  'score',
  'recognitionConfidence',
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

function rowStateFor(
  row: GavanWeek1PronunciationScoredAttemptEvidenceIntakeRow,
): {
  status: GavanWeek1PronunciationApprovalWorkflowAuditRowStatus;
  blockedStage: GavanWeek1PronunciationApprovalWorkflowAuditRow['blockedStage'];
  scorerProviderReady: boolean;
  recordingEvidenceReady: boolean;
  scoredAttemptReady: boolean;
} {
  if (row.status === 'blocked_missing_scorer_contract') {
    return {
      status: 'blocked_missing_scorer_provider',
      blockedStage: 'scorer_provider',
      scorerProviderReady: false,
      recordingEvidenceReady: false,
      scoredAttemptReady: false,
    };
  }

  if (!row.recordingId || !row.recordingUri) {
    return {
      status: 'blocked_missing_recording_evidence',
      blockedStage: 'recording_evidence',
      scorerProviderReady: true,
      recordingEvidenceReady: false,
      scoredAttemptReady: false,
    };
  }

  if (row.status !== 'valid_scored_attempt') {
    return {
      status: 'blocked_missing_scored_attempt',
      blockedStage: 'scored_attempt',
      scorerProviderReady: true,
      recordingEvidenceReady: true,
      scoredAttemptReady: false,
    };
  }

  return {
    status: 'blocked_waiting_for_reviewer_signoff',
    blockedStage: 'reviewer_signoff',
    scorerProviderReady: true,
    recordingEvidenceReady: true,
    scoredAttemptReady: true,
  };
}

function workflowRows(
  report: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
): GavanWeek1PronunciationApprovalWorkflowAuditRow[] {
  return report.rows.map((row) => {
    const state = rowStateFor(row);

    return {
      referenceId: row.referenceId,
      dayId: row.dayId,
      dayIndex: row.dayIndex,
      blockId: row.blockId,
      exerciseId: row.exerciseId,
      contentUnitId: row.contentUnitId,
      targetText: row.targetText,
      runtimeMode: row.runtimeMode,
      status: state.status,
      scorerProviderReady: state.scorerProviderReady,
      recordingEvidenceReady: state.recordingEvidenceReady,
      scoredAttemptReady: state.scoredAttemptReady,
      reviewerSignoffAllowed: false,
      approvalRecordCreated: false,
      finalScorerPromotionAllowed: false,
      liveAdapterAllowed: false,
      progressPenaltyAllowed: false,
      productionReady: false,
      blockedStage: state.blockedStage,
      requiredReviewerEvidence: [...REQUIRED_REVIEWER_EVIDENCE],
    };
  });
}

function blockersForGate(
  gate: GavanWeek1PronunciationProductionReadinessGate,
): GavanWeek1PronunciationApprovalWorkflowAuditBlocker[] {
  const sourceCodes = new Set(gate.blockers.map((blocker) => blocker.code));
  const blockers: GavanWeek1PronunciationApprovalWorkflowAuditBlocker[] = [];

  if (sourceCodes.has('missing_scorer_provider_contract')) {
    blockers.push({
      code: 'missing_scorer_provider_contract',
      blocksProduction: true,
      detail: 'A real pronunciation scorer provider contract is missing.',
    });
  }

  if (sourceCodes.has('missing_real_scored_attempt_evidence')) {
    blockers.push(
      {
        code: 'missing_real_recording_evidence',
        blocksProduction: true,
        detail: 'Real pronunciation recording evidence is missing.',
      },
      {
        code: 'missing_scored_attempt_evidence',
        blocksProduction: true,
        detail: 'Valid scored-attempt evidence is missing.',
      },
    );
  }

  if (sourceCodes.has('invalid_real_scored_attempt_evidence')) {
    blockers.push({
      code: 'missing_scored_attempt_evidence',
      blocksProduction: true,
      detail: 'Invalid scored-attempt evidence must be replaced before approval review.',
    });
  }

  if (sourceCodes.has('missing_explicit_pronunciation_approval_records')) {
    blockers.push({
      code: 'pronunciation_reviewer_signoff_blocked',
      blocksProduction: true,
      detail: 'Pronunciation reviewer signoff is blocked until scorer and scored-attempt evidence are ready.',
    });
  }

  if (sourceCodes.has('missing_final_pronunciation_scorer_promotion')) {
    blockers.push({
      code: 'final_scorer_promotion_blocked',
      blocksProduction: true,
      detail: 'Final scorer promotion is blocked until explicit approval records are complete.',
    });
  }

  if (sourceCodes.has('live_pronunciation_adapter_blocked')) {
    blockers.push({
      code: 'live_pronunciation_adapter_blocked',
      blocksProduction: true,
      detail: 'Live pronunciation adapter writes remain blocked until final scorer promotion.',
    });
  }

  if (sourceCodes.has('progress_penalty_blocked')) {
    blockers.push({
      code: 'progress_penalty_blocked',
      blocksProduction: true,
      detail: 'Progress penalties remain blocked until explicit approval and final scorer promotion.',
    });
  }

  return blockers;
}

function statusForRows(
  rows: GavanWeek1PronunciationApprovalWorkflowAuditRow[],
): GavanWeek1PronunciationApprovalWorkflowAuditStatus {
  if (rows.some((row) => row.status === 'blocked_missing_scorer_provider')) {
    return 'blocked_before_scorer_provider_contract';
  }

  if (rows.some((row) => row.status === 'blocked_missing_recording_evidence')) {
    return 'blocked_before_recording_evidence';
  }

  if (rows.some((row) => row.status === 'blocked_missing_scored_attempt')) {
    return 'blocked_before_scored_attempt_evidence';
  }

  if (rows.some((row) => row.status === 'blocked_waiting_for_reviewer_signoff')) {
    return 'blocked_before_reviewer_signoff';
  }

  if (rows.some((row) => row.status === 'blocked_waiting_for_final_scorer')) {
    return 'blocked_before_final_scorer_promotion';
  }

  if (rows.some((row) => row.status === 'blocked_waiting_for_live_adapter')) {
    return 'blocked_before_live_adapter';
  }

  return 'ready_for_live_pronunciation_review';
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

function auditFromSources(
  options: BuildOptions,
  report: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  gate: GavanWeek1PronunciationProductionReadinessGate,
): GavanWeek1PronunciationApprovalWorkflowAudit {
  const rows = workflowRows(report);
  const blockers = blockersForGate(gate);

  return {
    kind: 'gavan_week1_pronunciation_approval_workflow_audit',
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
    pronunciationApprovalWorkflowReady: false,
    reviewerSignoffAllowed: false,
    approvalRecordsCreated: false,
    finalScorerPromotionAllowed: false,
    liveAdapterAllowed: false,
    progressPenaltyAllowed: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    recordingFilesWritten: false,
    scoringFilesWritten: false,
    audioReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      referenceCount: report.summary.referenceCount,
      scorerProviderReadyCount: rows.filter((row) => row.scorerProviderReady).length,
      recordingEvidenceReadyCount: rows.filter((row) => row.recordingEvidenceReady).length,
      scoredAttemptReadyCount: rows.filter((row) => row.scoredAttemptReady).length,
      reviewerSignoffReadyCount: 0,
      explicitApprovalRecordCount: 0,
      finalScorerReadyCount: 0,
      liveAdapterReadyCount: 0,
      progressPenaltyReadyCount: 0,
      blockedWorkflowRowCount: rows.filter((row) => row.productionReady === false).length,
      blockerCount: blockers.length,
    },
    blockers,
    workflowRows: rows,
    artifactPaths: {
      scoredAttemptEvidenceIntake: relativeArtifactPath(
        GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
      ),
      pronunciationProductionReadinessGate: relativeArtifactPath(
        GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
      ),
      pronunciationApprovalWorkflowAudit: relativeArtifactPath(
        GAVAN_WEEK1_PRONUNCIATION_APPROVAL_WORKFLOW_AUDIT_PATH,
      ),
    },
    requiredNextActions: [
      'Attach a real scorer provider contract before pronunciation reviewer signoff can begin.',
      'Provide one real recording and scored attempt for every pronunciation reference.',
      'Collect one explicit pronunciation approval record per valid scored attempt.',
      'Promote the approved scorer configuration before enabling live adapters.',
      'Enable progress penalties only after final scorer promotion and explicit approval.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      scoringFilesWritten: false,
      recordingFilesWritten: false,
      approvalRecordsWritten: false,
    },
  };
}

function failureAudit(
  options: BuildOptions,
  issues: GavanWeek1PronunciationApprovalWorkflowAuditIssue[],
): GavanWeek1PronunciationApprovalWorkflowAudit {
  const emptyReport: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport = {
    kind: 'gavan_week1_pronunciation_scored_attempt_evidence_intake_report',
    generatedAt: options.generatedAt,
    evidenceOwnerId: options.evidenceOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceContractStatus: 'pronunciation_scorer_contract_blocked_missing_provider',
    status: 'blocked_missing_scorer_contract',
    readyForLive: false,
    pronunciationProductionReady: false,
    scoredAttemptEvidenceReady: false,
    scoringAdapterReady: false,
    progressPenaltyAllowed: false,
    approvalMayBeInferred: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    summary: {
      referenceCount: 0,
      providedAttemptCount: 0,
      validScoredAttemptCount: 0,
      invalidScoredAttemptCount: 0,
      missingScoredAttemptCount: 0,
      missingScorerContractCount: 0,
      productionReadyReferenceCount: 0,
    },
    rows: [],
    attemptValidationEvidence: [],
    requiredNextActions: [
      'Attach a real scorer contract before scored attempts can count.',
      'Provide one real recorded and scored attempt for every pronunciation reference.',
      'Run explicit pronunciation approval review before live scoring, progress penalties, or production readiness.',
      'Keep pronunciation scoring independent from listening audio approval.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      scoringFilesWritten: false,
      recordingFilesWritten: false,
    },
  };
  const emptyGate = buildGavanWeek1PronunciationProductionReadinessGate(
    {
      kind: 'gavan_week1_pronunciation_scoring_provider_contract',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'pronunciation_scorer_contract_blocked_missing_provider',
      blockerStillOpen: 'missing_pronunciation_scorer',
      readyForLive: false,
      pronunciationProductionReady: false,
      scoringContractReady: false,
      scoringAdapterReady: false,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      readinessPacketEvidence: {
        kind: 'gavan_week1_pronunciation_scoring_readiness_packet',
        status: 'pronunciation_scoring_blocked_no_real_scorer',
        referenceCount: 0,
        pronunciationReferenceAdapterReady: true,
        scoringAdapterReady: false,
      },
      references: [],
      summary: {
        referenceCount: 0,
        missingProviderReferenceCount: 0,
        contractReadyReferenceCount: 0,
        approvedScoredAttemptValidationReferenceCount: 0,
        productionReadyReferenceCount: 0,
        fakeFinalClaimCount: 0,
      },
      requiredNextActions: [
        'Attach real pronunciation scorer provider metadata before scored-attempt validation.',
        'Run scored-attempt validation with recorded attempts and confidence/score evidence.',
        'Create explicit approval records before any live scoring adapter or progress penalty is enabled.',
      ],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        scoringFilesWritten: false,
      },
    },
    {},
    options,
  ).gate;
  const audit = auditFromSources(options, emptyReport, emptyGate);

  return {
    ...audit,
    summary: {
      ...audit.summary,
      blockerCount: issues.length,
    },
  };
}

export function buildGavanWeek1PronunciationApprovalWorkflowAudit(
  contract: GavanWeek1PronunciationScoringProviderContract,
  attemptsByReferenceId: GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  options: BuildOptions,
): BuildResult {
  const gateResult = buildGavanWeek1PronunciationProductionReadinessGate(
    contract,
    attemptsByReferenceId,
    options,
  );

  if (!gateResult.valid) {
    const issues: GavanWeek1PronunciationApprovalWorkflowAuditIssue[] = gateResult.issues.map((item) => ({
      code: 'pronunciation_readiness_gate_invalid',
      detail: `${item.code}: ${item.detail}`,
    }));

    return {
      valid: false,
      issues,
      audit: failureAudit(options, issues),
    };
  }

  const reportResult = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
    contract,
    attemptsByReferenceId,
    {
      generatedAt: options.generatedAt,
      evidenceOwnerId: options.evidenceOwnerId,
    },
  );

  if (!reportResult.valid || !reportResult.report) {
    const issues: GavanWeek1PronunciationApprovalWorkflowAuditIssue[] = reportResult.issues.map((item) => ({
      code: 'pronunciation_readiness_gate_invalid',
      detail: `${item.code}: ${item.detail}`,
    }));

    return {
      valid: false,
      issues,
      audit: failureAudit(options, issues),
    };
  }

  return {
    valid: true,
    issues: [],
    audit: auditFromSources(options, reportResult.report, gateResult.gate),
  };
}

export function writeGavanWeek1PronunciationApprovalWorkflowAudit(
  contract: GavanWeek1PronunciationScoringProviderContract,
  attemptsByReferenceId: GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1PronunciationApprovalWorkflowAuditIssue[] = [{
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

  writeGavanWeek1PronunciationProductionReadinessGate(
    contract,
    attemptsByReferenceId,
    {
      generatedAt: options.generatedAt,
      evidenceOwnerId: options.evidenceOwnerId,
      readinessOwnerId: options.readinessOwnerId,
      targetPath: GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
    },
  );
  const result = buildGavanWeek1PronunciationApprovalWorkflowAudit(
    contract,
    attemptsByReferenceId,
    options,
  );
  const bytesWritten = writeJson(options.targetPath, result.audit);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
