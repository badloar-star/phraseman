import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1PronunciationScoringProviderContract,
} from './personal_plan_gavan_week1_pronunciation_scoring_provider_contract';
import {
  GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
  buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  type GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
} from './personal_plan_gavan_week1_pronunciation_scored_attempt_evidence_intake_report';

export const GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-pronunciation-production-readiness-gate.json',
);

export type GavanWeek1PronunciationProductionReadinessGateStatus =
  | 'hold_missing_scorer_provider'
  | 'hold_missing_scored_attempt_evidence'
  | 'hold_invalid_scored_attempt_evidence'
  | 'hold_missing_explicit_pronunciation_approval'
  | 'hold_missing_final_pronunciation_scorer_promotion'
  | 'hold_live_pronunciation_adapter_blocked'
  | 'ready_for_live_pronunciation_release_review';

export type GavanWeek1PronunciationProductionReadinessReleaseDecision =
  | 'hold'
  | 'ready_for_review';

export type GavanWeek1PronunciationProductionReadinessIssueCode =
  | 'scored_attempt_evidence_intake_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1PronunciationProductionReadinessIssue = {
  code: GavanWeek1PronunciationProductionReadinessIssueCode;
  detail: string;
};

export type GavanWeek1PronunciationProductionReadinessBlockerCode =
  | 'missing_scorer_provider_contract'
  | 'missing_real_scored_attempt_evidence'
  | 'invalid_real_scored_attempt_evidence'
  | 'missing_explicit_pronunciation_approval_records'
  | 'missing_final_pronunciation_scorer_promotion'
  | 'live_pronunciation_adapter_blocked'
  | 'progress_penalty_blocked';

export type GavanWeek1PronunciationProductionReadinessBlocker = {
  code: GavanWeek1PronunciationProductionReadinessBlockerCode;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1PronunciationProductionReadinessGate = {
  kind: 'gavan_week1_pronunciation_production_readiness_gate';
  generatedAt: string;
  readinessOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceEvidenceIntakeStatus: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport['status'];
  status: GavanWeek1PronunciationProductionReadinessGateStatus;
  releaseDecision: GavanWeek1PronunciationProductionReadinessReleaseDecision;
  productionReady: false;
  readyForLive: false;
  pronunciationProductionReady: false;
  scoredAttemptEvidenceReady: boolean;
  explicitApprovalReady: false;
  finalScorerReady: false;
  liveScoringAdapterAllowed: false;
  progressPenaltyAllowed: false;
  approvalRecordsCreated: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  recordingFilesWritten: false;
  scoringFilesWritten: false;
  audioReadinessMayBeInferred: false;
  phaseWriteTargets: [];
  summary: {
    referenceCount: number;
    scorerContractReadyCount: number;
    validScoredAttemptCount: number;
    missingScoredAttemptCount: number;
    invalidScoredAttemptCount: number;
    missingScorerContractCount: number;
    explicitApprovalRecordCount: 0;
    finalScorerReadyCount: 0;
    liveAdapterReadyCount: 0;
    productionReadyReferenceCount: 0;
    blockerCount: number;
  };
  blockers: GavanWeek1PronunciationProductionReadinessBlocker[];
  artifactPaths: {
    scoredAttemptEvidenceIntake: string;
    pronunciationProductionReadinessGate: string;
  };
  requiredNextActions: [
    'Attach a real scorer provider contract before pronunciation release review.',
    'Provide one real recorded and scored attempt for every pronunciation reference.',
    'Create explicit pronunciation approval records only after scored attempts validate.',
    'Promote the approved scorer configuration before any live adapter or progress penalty is enabled.',
    'Keep listening audio readiness separate from pronunciation readiness.',
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
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1PronunciationProductionReadinessIssue[];
  gate: GavanWeek1PronunciationProductionReadinessGate;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Pronunciation production readiness gate can only write under .codex-tmp or docs/reports.';

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

function blockersForReport(
  report: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
): GavanWeek1PronunciationProductionReadinessBlocker[] {
  const blockers: GavanWeek1PronunciationProductionReadinessBlocker[] = [];

  if (report.summary.missingScorerContractCount > 0) {
    blockers.push({
      code: 'missing_scorer_provider_contract',
      blocksProduction: true,
      detail: 'A real pronunciation scorer provider contract is missing for one or more references.',
    });
  }

  if (report.summary.validScoredAttemptCount < report.summary.referenceCount) {
    blockers.push({
      code: 'missing_real_scored_attempt_evidence',
      blocksProduction: true,
      detail: 'Every pronunciation reference needs a real recorded and scored attempt before release review.',
    });
  }

  if (report.summary.invalidScoredAttemptCount > 0) {
    blockers.push({
      code: 'invalid_real_scored_attempt_evidence',
      blocksProduction: true,
      detail: 'Invalid scored attempts must be replaced before pronunciation release review.',
    });
  }

  blockers.push(
    {
      code: 'missing_explicit_pronunciation_approval_records',
      blocksProduction: true,
      detail: 'Explicit pronunciation approval records are required after scored attempts validate.',
    },
    {
      code: 'missing_final_pronunciation_scorer_promotion',
      blocksProduction: true,
      detail: 'Approved pronunciation scoring configuration has not been promoted to a final scorer.',
    },
    {
      code: 'live_pronunciation_adapter_blocked',
      blocksProduction: true,
      detail: 'Live pronunciation scoring adapter writes remain blocked until final approval.',
    },
    {
      code: 'progress_penalty_blocked',
      blocksProduction: true,
      detail: 'Progress penalties cannot be enabled without real scoring evidence and explicit approval.',
    },
  );

  return blockers;
}

function statusForBlockers(
  blockers: GavanWeek1PronunciationProductionReadinessBlocker[],
): GavanWeek1PronunciationProductionReadinessGateStatus {
  if (blockers.some((blocker) => blocker.code === 'missing_scorer_provider_contract')) {
    return 'hold_missing_scorer_provider';
  }

  if (blockers.some((blocker) => blocker.code === 'invalid_real_scored_attempt_evidence')) {
    return 'hold_invalid_scored_attempt_evidence';
  }

  if (blockers.some((blocker) => blocker.code === 'missing_real_scored_attempt_evidence')) {
    return 'hold_missing_scored_attempt_evidence';
  }

  if (blockers.some((blocker) => blocker.code === 'missing_explicit_pronunciation_approval_records')) {
    return 'hold_missing_explicit_pronunciation_approval';
  }

  if (blockers.some((blocker) => blocker.code === 'missing_final_pronunciation_scorer_promotion')) {
    return 'hold_missing_final_pronunciation_scorer_promotion';
  }

  if (blockers.some((blocker) => blocker.code === 'live_pronunciation_adapter_blocked')) {
    return 'hold_live_pronunciation_adapter_blocked';
  }

  return 'ready_for_live_pronunciation_release_review';
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

function gateFromReport(
  report: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport,
  options: BuildOptions,
): GavanWeek1PronunciationProductionReadinessGate {
  const blockers = blockersForReport(report);

  return {
    kind: 'gavan_week1_pronunciation_production_readiness_gate',
    generatedAt: options.generatedAt,
    readinessOwnerId: options.readinessOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceEvidenceIntakeStatus: report.status,
    status: statusForBlockers(blockers),
    releaseDecision: blockers.length === 0 ? 'ready_for_review' : 'hold',
    productionReady: false,
    readyForLive: false,
    pronunciationProductionReady: false,
    scoredAttemptEvidenceReady: report.scoredAttemptEvidenceReady,
    explicitApprovalReady: false,
    finalScorerReady: false,
    liveScoringAdapterAllowed: false,
    progressPenaltyAllowed: false,
    approvalRecordsCreated: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    recordingFilesWritten: false,
    scoringFilesWritten: false,
    audioReadinessMayBeInferred: false,
    phaseWriteTargets: [],
    summary: {
      referenceCount: report.summary.referenceCount,
      scorerContractReadyCount: report.summary.referenceCount - report.summary.missingScorerContractCount,
      validScoredAttemptCount: report.summary.validScoredAttemptCount,
      missingScoredAttemptCount: report.summary.missingScoredAttemptCount,
      invalidScoredAttemptCount: report.summary.invalidScoredAttemptCount,
      missingScorerContractCount: report.summary.missingScorerContractCount,
      explicitApprovalRecordCount: 0,
      finalScorerReadyCount: 0,
      liveAdapterReadyCount: 0,
      productionReadyReferenceCount: 0,
      blockerCount: blockers.length,
    },
    blockers,
    artifactPaths: {
      scoredAttemptEvidenceIntake: relativeArtifactPath(
        GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
      ),
      pronunciationProductionReadinessGate: relativeArtifactPath(
        GAVAN_WEEK1_PRONUNCIATION_PRODUCTION_READINESS_GATE_PATH,
      ),
    },
    requiredNextActions: [
      'Attach a real scorer provider contract before pronunciation release review.',
      'Provide one real recorded and scored attempt for every pronunciation reference.',
      'Create explicit pronunciation approval records only after scored attempts validate.',
      'Promote the approved scorer configuration before any live adapter or progress penalty is enabled.',
      'Keep listening audio readiness separate from pronunciation readiness.',
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

function failureGate(
  options: BuildOptions,
  issues: GavanWeek1PronunciationProductionReadinessIssue[],
): GavanWeek1PronunciationProductionReadinessGate {
  return gateFromReport({
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
  }, options);
}

export function buildGavanWeek1PronunciationProductionReadinessGate(
  contract: GavanWeek1PronunciationScoringProviderContract,
  attemptsByReferenceId: GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  options: BuildOptions,
): BuildResult {
  const reportResult = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
    contract,
    attemptsByReferenceId,
    {
      generatedAt: options.generatedAt,
      evidenceOwnerId: options.evidenceOwnerId,
    },
  );

  if (!reportResult.valid || !reportResult.report) {
    const issues: GavanWeek1PronunciationProductionReadinessIssue[] = reportResult.issues.map((item) => ({
      code: 'scored_attempt_evidence_intake_invalid',
      detail: `${item.code}: ${item.detail}`,
    }));

    return {
      valid: false,
      issues,
      gate: failureGate(options, issues),
    };
  }

  return {
    valid: true,
    issues: [],
    gate: gateFromReport(reportResult.report, options),
  };
}

export function writeGavanWeek1PronunciationProductionReadinessGate(
  contract: GavanWeek1PronunciationScoringProviderContract,
  attemptsByReferenceId: GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1PronunciationProductionReadinessIssue[] = [{
      code: 'target_path_not_allowed',
      detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
    }];

    return {
      valid: false,
      issues,
      gate: failureGate(options, issues),
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
    contract,
    attemptsByReferenceId,
    {
      generatedAt: options.generatedAt,
      evidenceOwnerId: options.evidenceOwnerId,
      targetPath: GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH,
    },
  );
  const result = buildGavanWeek1PronunciationProductionReadinessGate(
    contract,
    attemptsByReferenceId,
    options,
  );
  const bytesWritten = writeJson(options.targetPath, result.gate);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
