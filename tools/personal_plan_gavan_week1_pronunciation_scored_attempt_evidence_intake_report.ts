import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  validatePlanPronunciationAttempt,
  type PlanPronunciationAttempt,
  type PlanPronunciationAttemptIssue,
} from '../app/personal_plan_pronunciation_attempt';
import type {
  GavanWeek1PronunciationScoringProviderContract,
} from './personal_plan_gavan_week1_pronunciation_scoring_provider_contract';

export const GAVAN_WEEK1_PRONUNCIATION_SCORED_ATTEMPT_EVIDENCE_INTAKE_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-pronunciation-scored-attempt-evidence-intake-report.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId = Record<
  string,
  PlanPronunciationAttempt | undefined
>;

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportStatus =
  | 'blocked_missing_scorer_contract'
  | 'blocked_missing_scored_attempts'
  | 'blocked_invalid_scored_attempts'
  | 'ready_for_pronunciation_approval_review';

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeRowStatus =
  | 'blocked_missing_scorer_contract'
  | 'blocked_missing_scored_attempt'
  | 'blocked_invalid_scored_attempt'
  | 'valid_scored_attempt';

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssueCode =
  | 'wrong_provider_contract'
  | 'provider_contract_has_live_claim'
  | 'target_path_not_allowed';

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssue = {
  code: GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssueCode;
  detail: string;
};

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportOptions = {
  generatedAt: string;
  evidenceOwnerId: string;
};

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportWriteOptions =
  GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportOptions & {
    targetPath: string;
  };

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeRow = {
  referenceId: string;
  dayId: string;
  dayIndex: number;
  blockId: string;
  exerciseId: string;
  contentUnitId: string;
  targetText: string;
  runtimeMode: string;
  scorerContractStatus: string;
  status: GavanWeek1PronunciationScoredAttemptEvidenceIntakeRowStatus;
  attemptId?: string;
  recordingId?: string;
  recordingUri?: string;
  recordingDurationMs?: number;
  recognitionConfidence?: number;
  score?: number;
  attemptIssueCodes: string[];
  validForScoring: boolean;
  productionReady: false;
  progressPenaltyAllowed: false;
};

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport = {
  kind: 'gavan_week1_pronunciation_scored_attempt_evidence_intake_report';
  generatedAt: string;
  evidenceOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceContractStatus: GavanWeek1PronunciationScoringProviderContract['status'];
  status: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportStatus;
  readyForLive: false;
  pronunciationProductionReady: false;
  scoredAttemptEvidenceReady: boolean;
  scoringAdapterReady: false;
  progressPenaltyAllowed: false;
  approvalMayBeInferred: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  summary: {
    referenceCount: number;
    providedAttemptCount: number;
    validScoredAttemptCount: number;
    invalidScoredAttemptCount: number;
    missingScoredAttemptCount: number;
    missingScorerContractCount: number;
    productionReadyReferenceCount: 0;
  };
  rows: GavanWeek1PronunciationScoredAttemptEvidenceIntakeRow[];
  attemptValidationEvidence: Array<{
    referenceId: string;
    validForPractice: boolean;
    validForScoring: boolean;
    issues: PlanPronunciationAttemptIssue[];
  }>;
  requiredNextActions: [
    'Attach a real scorer contract before scored attempts can count.',
    'Provide one real recorded and scored attempt for every pronunciation reference.',
    'Run explicit pronunciation approval review before live scoring, progress penalties, or production readiness.',
    'Keep pronunciation scoring independent from listening audio approval.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    scoringFilesWritten: false;
    recordingFilesWritten: false;
  };
};

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportBuildResult = {
  valid: boolean;
  issues: GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssue[];
  report?: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport;
};

export type GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportWriteResult =
  GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssueCode,
  detail: string,
): GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssue {
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

export function isGavanWeek1PronunciationScoredAttemptEvidenceIntakeReportTargetAllowed(
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

function validateProviderContract(
  contract: GavanWeek1PronunciationScoringProviderContract,
): GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssue[] {
  const issues: GavanWeek1PronunciationScoredAttemptEvidenceIntakeIssue[] = [];

  if (
    contract.kind !== 'gavan_week1_pronunciation_scoring_provider_contract' ||
    contract.planId !== 'gavan' ||
    contract.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_provider_contract',
      'Pronunciation scored-attempt evidence intake requires the Gavan week 1 provider contract.',
    ));
  }

  if (
    contract.readyForLive ||
    contract.pronunciationProductionReady ||
    contract.scoringAdapterReady ||
    contract.approvalMayBeInferred ||
    contract.liveEditsAllowed
  ) {
    issues.push(issue(
      'provider_contract_has_live_claim',
      'Pronunciation scored-attempt evidence intake cannot consume a provider contract with live or inferred readiness claims.',
    ));
  }

  return issues;
}

function rowStatusFor(
  scorerContractReady: boolean,
  attempt: PlanPronunciationAttempt | undefined,
  validForScoring: boolean,
): GavanWeek1PronunciationScoredAttemptEvidenceIntakeRowStatus {
  if (!scorerContractReady) return 'blocked_missing_scorer_contract';
  if (!attempt) return 'blocked_missing_scored_attempt';
  if (!validForScoring) return 'blocked_invalid_scored_attempt';
  return 'valid_scored_attempt';
}

function reportStatusFor(
  missingScorerContractCount: number,
  missingScoredAttemptCount: number,
  invalidScoredAttemptCount: number,
  validScoredAttemptCount: number,
  referenceCount: number,
): GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportStatus {
  if (missingScorerContractCount > 0) return 'blocked_missing_scorer_contract';
  if (invalidScoredAttemptCount > 0) return 'blocked_invalid_scored_attempts';
  if (missingScoredAttemptCount > 0) return 'blocked_missing_scored_attempts';
  if (validScoredAttemptCount === referenceCount && referenceCount > 0) {
    return 'ready_for_pronunciation_approval_review';
  }
  return 'blocked_missing_scored_attempts';
}

export function buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
  contract: GavanWeek1PronunciationScoringProviderContract,
  attemptsByReferenceId: GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  options: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportOptions,
): GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportBuildResult {
  const issues = validateProviderContract(contract);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const scorerContractReady = contract.scoringContractReady &&
    contract.status === 'pronunciation_scorer_contract_ready_for_scored_attempt_validation';
  const attemptValidationEvidence: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReport['attemptValidationEvidence'] = [];

  const rows = contract.references.map((reference) => {
    const attempt = attemptsByReferenceId[reference.id];
    const validation = attempt ? validatePlanPronunciationAttempt(attempt) : undefined;
    if (validation) {
      attemptValidationEvidence.push({
        referenceId: reference.id,
        validForPractice: validation.validForPractice,
        validForScoring: validation.validForScoring,
        issues: validation.issues,
      });
    }

    return {
      referenceId: reference.id,
      dayId: reference.dayId,
      dayIndex: reference.dayIndex,
      blockId: reference.blockId,
      exerciseId: reference.exerciseId,
      contentUnitId: reference.contentUnitId,
      targetText: reference.targetText,
      runtimeMode: reference.runtimeMode,
      scorerContractStatus: reference.scoringContractStatus,
      status: rowStatusFor(scorerContractReady, attempt, validation?.validForScoring === true),
      ...(attempt?.id ? { attemptId: attempt.id } : {}),
      ...(attempt?.recordingId ? { recordingId: attempt.recordingId } : {}),
      ...(attempt?.recordingUri ? { recordingUri: attempt.recordingUri } : {}),
      ...(attempt?.recordingDurationMs != null ? { recordingDurationMs: attempt.recordingDurationMs } : {}),
      ...(attempt?.recognitionConfidence != null ? { recognitionConfidence: attempt.recognitionConfidence } : {}),
      ...(attempt?.score != null ? { score: attempt.score } : {}),
      attemptIssueCodes: validation?.issues.map((item) => item.code) ?? [],
      validForScoring: validation?.validForScoring === true,
      productionReady: false as const,
      progressPenaltyAllowed: false as const,
    };
  });

  const referenceCount = rows.length;
  const providedAttemptCount = rows.filter((row) => Boolean(row.attemptId)).length;
  const validScoredAttemptCount = rows.filter((row) => row.status === 'valid_scored_attempt').length;
  const invalidScoredAttemptCount = rows.filter((row) => row.status === 'blocked_invalid_scored_attempt').length;
  const missingScoredAttemptCount = rows.filter((row) => row.status === 'blocked_missing_scored_attempt').length;
  const missingScorerContractCount = rows.filter((row) => row.status === 'blocked_missing_scorer_contract').length;
  const status = reportStatusFor(
    missingScorerContractCount,
    missingScoredAttemptCount,
    invalidScoredAttemptCount,
    validScoredAttemptCount,
    referenceCount,
  );

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_pronunciation_scored_attempt_evidence_intake_report',
      generatedAt: options.generatedAt,
      evidenceOwnerId: options.evidenceOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceContractStatus: contract.status,
      status,
      readyForLive: false,
      pronunciationProductionReady: false,
      scoredAttemptEvidenceReady: status === 'ready_for_pronunciation_approval_review',
      scoringAdapterReady: false,
      progressPenaltyAllowed: false,
      approvalMayBeInferred: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      summary: {
        referenceCount,
        providedAttemptCount,
        validScoredAttemptCount,
        invalidScoredAttemptCount,
        missingScoredAttemptCount,
        missingScorerContractCount,
        productionReadyReferenceCount: 0,
      },
      rows,
      attemptValidationEvidence,
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
    },
  };
}

export function writeGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
  contract: GavanWeek1PronunciationScoringProviderContract,
  attemptsByReferenceId: GavanWeek1PronunciationScoredAttemptEvidenceByReferenceId,
  options: GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportWriteOptions,
): GavanWeek1PronunciationScoredAttemptEvidenceIntakeReportWriteResult {
  if (!isGavanWeek1PronunciationScoredAttemptEvidenceIntakeReportTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Pronunciation scored-attempt evidence intake report can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  const result = buildGavanWeek1PronunciationScoredAttemptEvidenceIntakeReport(
    contract,
    attemptsByReferenceId,
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
