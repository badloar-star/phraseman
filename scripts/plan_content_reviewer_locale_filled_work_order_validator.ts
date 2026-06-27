import fs from 'node:fs';
import path from 'node:path';

import type {
  CoursePackReviewerLocaleFilledApprovalArtifact,
  CoursePackReviewerLocaleFilledApprovalDecision,
} from '../app/course_pack_reviewer_locale_approval_packet';

/**
 * Phase 4I — filled work-order batch validator and approval artifact candidate assembler.
 *
 * Report-only. This tool:
 *   - reads the Phase 4H work-order batches report (the canonical, deterministic row set);
 *   - reads externally filled batch files (a directory of filled batch JSON files OR a single
 *     JSON list artifact), only from `.codex-tmp/plan-content/`;
 *   - validates every filled row against the work-order row of the same id;
 *   - assembles a candidate `plan-content-reviewer-locale-approval-v1` artifact ONLY when every
 *     work-order row is explicitly reviewer-approved and locale-passed with non-empty evidence ids;
 *   - never synthesizes decisions or evidence ids;
 *   - writes HOLD without throwing when no filled batches exist yet;
 *   - keeps every runtime/server/storage activation flag false.
 */

type CliOptions = {
  workOrderReportPath?: string;
  filledBatchesDir?: string;
  filledBatchesListPath?: string;
  outputPath?: string;
  candidateOutputPath?: string;
  generatedAt?: string;
};

type WorkOrderRow = {
  rowId: string;
  planId: string;
  dayIndex: number;
  path: string;
  contentHash: string;
  studyTarget: string;
  sourceLocale: string;
  requiredReviewerStatus: 'approved';
  requiredLocaleGateStatus: 'passed';
  reviewerStatus: string;
  localeGateStatus: string;
  reviewerEvidenceId: string;
  localeEvidenceId: string;
};

type WorkOrderBatch = {
  batchId: string;
  rows: WorkOrderRow[];
};

type WorkOrderEnvelope = {
  schemaVersion?: string;
  status?: 'PASS' | 'HOLD';
  workOrderStatus?: 'READY_FOR_REVIEW' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  productionActivationApproved?: boolean;
  totalRows?: number;
  reviewerApprovedRows?: number;
  localePassedRows?: number;
  generatedFilledApprovalArtifact?: boolean;
  duplicateRowIds?: unknown[];
  missingPacketRows?: unknown[];
  batches?: WorkOrderBatch[];
  evidenceBlockers?: unknown[];
  blockers?: unknown[];
};

type FilledDecision = {
  rowId?: string;
  planId?: unknown;
  dayIndex?: unknown;
  path?: unknown;
  contentHash?: unknown;
  studyTarget?: unknown;
  sourceLocale?: unknown;
  reviewerStatus?: unknown;
  localeGateStatus?: unknown;
  reviewerEvidenceId?: unknown;
  localeEvidenceId?: unknown;
  reviewerNotes?: unknown;
  localeNotes?: unknown;
};

type FilledBatchFile = {
  batchId?: unknown;
  rows?: FilledDecision[];
  decisions?: FilledDecision[];
};

type FilledBatchSource = {
  label: string;
  decisions: FilledDecision[];
};

type AssembledCandidate = {
  artifact: CoursePackReviewerLocaleFilledApprovalArtifact;
  candidateOutputPath: string;
};

type FilledWorkOrderValidationEnvelope = {
  schemaVersion: 'plan-content-reviewer-locale-filled-work-order-validation-v1';
  status: 'PASS' | 'HOLD';
  validationStatus: 'CANDIDATE_ASSEMBLED' | 'MISSING_FILLED_BATCHES' | 'HOLD';
  generatedAt: string;
  workOrderReportPath: string;
  filledBatchesDir?: string;
  filledBatchesListPath?: string;
  candidateArtifactPath?: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  runtimeLookupApproved: false;
  remoteLoadingApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  cloudRestoreRewriteApproved: false;
  studyTargetMutationApproved: false;
  sourceLocaleMutationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  candidateGenerated: boolean;
  generatedDecisionsOrEvidence: false;
  workOrderRows: number;
  filledDecisionRows: number;
  reviewerApprovedRows: number;
  localePassedRows: number;
  duplicateFilledRowIds: string[];
  unknownFilledRowIds: string[];
  missingWorkOrderRowIds: string[];
  evidenceBlockers: string[];
  blockers: string[];
};

type FilledWorkOrderValidationResult = {
  outputPath: string;
  report: FilledWorkOrderValidationEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_WORK_ORDER_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-decision-work-order-batches.json');
const DEFAULT_FILLED_BATCHES_DIR = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-filled-work-order-batches');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-filled-work-order-validation.json');
const DEFAULT_CANDIDATE_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-candidate.json');

const FILLED_APPROVAL_ARTIFACT_SCHEMA_VERSION = 'plan-content-reviewer-locale-approval-v1' as const;

export function resolvePlanContentFilledWorkOrderTempPath(
  repoRoot: string,
  requestedPath: string | undefined,
  fallbackPath: string,
  label: string,
): string {
  const reportRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);
  const requested = requestedPath
    ? path.resolve(repoRoot, requestedPath)
    : path.resolve(repoRoot, fallbackPath);

  if (requested !== reportRoot && !requested.startsWith(`${reportRoot}${path.sep}`)) {
    throw new Error(`${label} must stay under ${path.relative(repoRoot, reportRoot)}`);
  }

  return requested;
}

export function writePlanContentReviewerLocaleFilledWorkOrderValidation(
  repoRoot: string,
  options: CliOptions = {},
): FilledWorkOrderValidationResult {
  const workOrderReportPath = resolvePlanContentFilledWorkOrderTempPath(
    repoRoot,
    options.workOrderReportPath,
    DEFAULT_WORK_ORDER_PATH,
    'Reviewer/locale work-order report input',
  );
  const outputPath = resolvePlanContentFilledWorkOrderTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Reviewer/locale filled work-order validation output',
  );
  const candidateOutputPath = resolvePlanContentFilledWorkOrderTempPath(
    repoRoot,
    options.candidateOutputPath,
    DEFAULT_CANDIDATE_OUTPUT_PATH,
    'Reviewer/locale approval candidate output',
  );

  if (options.filledBatchesDir && options.filledBatchesListPath) {
    throw new Error('Provide either --filled-batches-dir or --filled-batches-list, not both');
  }

  const filledBatchesDir = options.filledBatchesListPath
    ? null
    : resolvePlanContentFilledWorkOrderTempPath(
      repoRoot,
      options.filledBatchesDir,
      DEFAULT_FILLED_BATCHES_DIR,
      'Filled work-order batches directory input',
    );
  const filledBatchesListPath = options.filledBatchesListPath
    ? resolvePlanContentFilledWorkOrderTempPath(
      repoRoot,
      options.filledBatchesListPath,
      options.filledBatchesListPath,
      'Filled work-order batches list input',
    )
    : null;

  const workOrderEnvelope = readJsonFile<WorkOrderEnvelope>(workOrderReportPath);
  const evidenceBlockers = validateWorkOrderEnvelope(workOrderEnvelope);
  const workOrderRows = collectWorkOrderRows(workOrderEnvelope);

  const filledSources = readFilledBatchSources(filledBatchesDir, filledBatchesListPath);
  const filledBatchesPresent = filledSources !== null && filledSources.length > 0;

  const identity = {
    packId: workOrderEnvelope.packId ?? '',
    studyTarget: workOrderEnvelope.studyTarget ?? '',
    sourceLocale: workOrderEnvelope.sourceLocale ?? '',
    surface: workOrderEnvelope.surface ?? '',
    contentVersion: workOrderEnvelope.contentVersion ?? '',
  };

  const validation = filledBatchesPresent
    ? validateFilledAgainstWorkOrder(workOrderRows, filledSources ?? [])
    : emptyValidation();

  const allRowsApproved = filledBatchesPresent
    && evidenceBlockers.length === 0
    && validation.rowBlockers.length === 0
    && validation.reviewerApprovedRows === workOrderRows.length
    && validation.localePassedRows === workOrderRows.length
    && validation.missingWorkOrderRowIds.length === 0
    && validation.unknownFilledRowIds.length === 0
    && validation.duplicateFilledRowIds.length === 0
    && workOrderRows.length > 0;

  let candidate: AssembledCandidate | null = null;
  if (allRowsApproved) {
    candidate = {
      artifact: assembleCandidateArtifact(identity, workOrderRows, validation.decisionsByRowId),
      candidateOutputPath,
    };
  }

  const missingBatchBlockers = filledBatchesPresent
    ? []
    : ['external filled reviewer/locale work-order batches are missing'];
  const blockers = uniqueStrings([
    ...evidenceBlockers,
    ...validation.rowBlockers,
    ...missingBatchBlockers,
  ]);

  const validationStatus: FilledWorkOrderValidationEnvelope['validationStatus'] = candidate
    ? 'CANDIDATE_ASSEMBLED'
    : filledBatchesPresent
      ? 'HOLD'
      : 'MISSING_FILLED_BATCHES';

  const report: FilledWorkOrderValidationEnvelope = {
    schemaVersion: 'plan-content-reviewer-locale-filled-work-order-validation-v1',
    status: candidate ? 'PASS' : 'HOLD',
    validationStatus,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    workOrderReportPath: relativePath(repoRoot, workOrderReportPath),
    ...(filledBatchesDir ? { filledBatchesDir: relativePath(repoRoot, filledBatchesDir) } : {}),
    ...(filledBatchesListPath ? { filledBatchesListPath: relativePath(repoRoot, filledBatchesListPath) } : {}),
    ...(candidate ? { candidateArtifactPath: relativePath(repoRoot, candidate.candidateOutputPath) } : {}),
    ...identity,
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
    remoteLoadingApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
    cacheLookupApproved: false,
    cacheReadApproved: false,
    cacheWriteApproved: false,
    cacheRepairApproved: false,
    storageMigrationApproved: false,
    cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    candidateGenerated: candidate !== null,
    generatedDecisionsOrEvidence: false,
    workOrderRows: workOrderRows.length,
    filledDecisionRows: validation.filledDecisionRows,
    reviewerApprovedRows: validation.reviewerApprovedRows,
    localePassedRows: validation.localePassedRows,
    duplicateFilledRowIds: validation.duplicateFilledRowIds,
    unknownFilledRowIds: validation.unknownFilledRowIds,
    missingWorkOrderRowIds: validation.missingWorkOrderRowIds,
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (candidate) {
    fs.mkdirSync(path.dirname(candidate.candidateOutputPath), { recursive: true });
    fs.writeFileSync(
      candidate.candidateOutputPath,
      `${JSON.stringify(candidate.artifact, null, 2)}\n`,
      'utf8',
    );
  }

  if (evidenceBlockers.length > 0) {
    throw new Error(`Reviewer/locale filled work-order validation evidence failed: ${evidenceBlockers.join('; ')}`);
  }
  if (filledBatchesPresent && report.status !== 'PASS') {
    throw new Error(`Reviewer/locale filled work-order validation failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateWorkOrderEnvelope(envelope: WorkOrderEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.schemaVersion !== 'plan-content-reviewer-locale-work-order-batches-v1') {
    errors.push('work-order report schemaVersion must be plan-content-reviewer-locale-work-order-batches-v1');
  }
  if (envelope.status !== 'PASS') {
    errors.push('work-order report status must be PASS');
  }
  if (envelope.workOrderStatus !== 'READY_FOR_REVIEW') {
    errors.push('work-order report workOrderStatus must be READY_FOR_REVIEW');
  }
  if (envelope.reviewerApprovedRows !== 0) {
    errors.push('work-order report reviewerApprovedRows must remain 0');
  }
  if (envelope.localePassedRows !== 0) {
    errors.push('work-order report localePassedRows must remain 0');
  }
  if (envelope.generatedFilledApprovalArtifact !== false) {
    errors.push('work-order report generatedFilledApprovalArtifact must remain false');
  }
  if (envelope.activationApproved !== false) {
    errors.push('work-order report activationApproved must remain false');
  }
  if (envelope.productionActivationApproved !== false) {
    errors.push('work-order report productionActivationApproved must remain false');
  }
  if (Array.isArray(envelope.duplicateRowIds) && envelope.duplicateRowIds.length > 0) {
    errors.push('work-order report duplicateRowIds must be empty');
  }
  if (Array.isArray(envelope.missingPacketRows) && envelope.missingPacketRows.length > 0) {
    errors.push('work-order report missingPacketRows must be empty');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('work-order report blockers must be empty');
  }
  if (!Array.isArray(envelope.batches) || envelope.batches.length === 0) {
    errors.push('work-order report must contain at least one batch');
  }
  return errors;
}

function collectWorkOrderRows(envelope: WorkOrderEnvelope): WorkOrderRow[] {
  const rows: WorkOrderRow[] = [];
  for (const batch of envelope.batches ?? []) {
    for (const row of batch.rows ?? []) {
      rows.push(row);
    }
  }
  return rows;
}

function readFilledBatchSources(
  filledBatchesDir: string | null,
  filledBatchesListPath: string | null,
): FilledBatchSource[] | null {
  if (filledBatchesListPath) {
    if (!fs.existsSync(filledBatchesListPath)) return null;
    const parsed = readJsonFile<FilledBatchFile | FilledBatchFile[] | FilledDecision[]>(filledBatchesListPath);
    return [{ label: 'filled-batches-list', decisions: extractDecisions(parsed) }];
  }

  if (filledBatchesDir) {
    if (!fs.existsSync(filledBatchesDir) || !fs.statSync(filledBatchesDir).isDirectory()) {
      return null;
    }
    const files = fs
      .readdirSync(filledBatchesDir)
      .filter((name) => name.toLowerCase().endsWith('.json'))
      .sort();
    if (files.length === 0) return null;
    return files.map((name) => {
      const parsed = readJsonFile<FilledBatchFile | FilledBatchFile[] | FilledDecision[]>(
        path.join(filledBatchesDir, name),
      );
      return { label: name, decisions: extractDecisions(parsed) };
    });
  }

  return null;
}

function extractDecisions(parsed: FilledBatchFile | FilledBatchFile[] | FilledDecision[]): FilledDecision[] {
  if (Array.isArray(parsed)) {
    // A bare JSON list may be a list of decisions or a list of batch files.
    const decisions: FilledDecision[] = [];
    for (const item of parsed) {
      if (item && typeof item === 'object' && (Array.isArray((item as FilledBatchFile).rows)
        || Array.isArray((item as FilledBatchFile).decisions))) {
        decisions.push(...extractDecisions(item as FilledBatchFile));
      } else {
        decisions.push(item as FilledDecision);
      }
    }
    return decisions;
  }
  if (parsed && typeof parsed === 'object') {
    const file = parsed as FilledBatchFile;
    if (Array.isArray(file.rows)) return file.rows;
    if (Array.isArray(file.decisions)) return file.decisions;
  }
  return [];
}

type FilledValidationState = {
  rowBlockers: string[];
  filledDecisionRows: number;
  reviewerApprovedRows: number;
  localePassedRows: number;
  duplicateFilledRowIds: string[];
  unknownFilledRowIds: string[];
  missingWorkOrderRowIds: string[];
  decisionsByRowId: Map<string, FilledDecision>;
};

function validateFilledAgainstWorkOrder(
  workOrderRows: WorkOrderRow[],
  sources: FilledBatchSource[],
): FilledValidationState {
  const rowBlockers: string[] = [];
  const duplicateFilledRowIds: string[] = [];
  const unknownFilledRowIds: string[] = [];
  const decisionsByRowId = new Map<string, FilledDecision>();
  const workOrderByRowId = new Map(workOrderRows.map((row) => [row.rowId, row]));
  let filledDecisionRows = 0;
  let reviewerApprovedRows = 0;
  let localePassedRows = 0;

  for (const source of sources) {
    for (const decision of source.decisions) {
      filledDecisionRows += 1;
      const rowId = resolveFilledRowId(decision);
      if (!rowId) {
        rowBlockers.push(`filled decision in ${source.label} is missing a resolvable rowId`);
        continue;
      }
      if (decisionsByRowId.has(rowId)) {
        duplicateFilledRowIds.push(rowId);
        rowBlockers.push(`duplicate filled reviewer/locale decision ${rowId}`);
        continue;
      }
      decisionsByRowId.set(rowId, decision);

      const workOrderRow = workOrderByRowId.get(rowId);
      if (!workOrderRow) {
        unknownFilledRowIds.push(rowId);
        rowBlockers.push(`filled reviewer/locale decision ${rowId} is not in the work-order`);
        continue;
      }

      const rowApproved = validateFilledRow(rowId, decision, workOrderRow, rowBlockers);
      if (rowApproved.reviewerApproved) reviewerApprovedRows += 1;
      if (rowApproved.localePassed) localePassedRows += 1;
    }
  }

  const missingWorkOrderRowIds: string[] = [];
  for (const row of workOrderRows) {
    if (!decisionsByRowId.has(row.rowId)) {
      missingWorkOrderRowIds.push(row.rowId);
      rowBlockers.push(`filled reviewer/locale work-order is missing decision ${row.rowId}`);
    }
  }

  return {
    rowBlockers,
    filledDecisionRows,
    reviewerApprovedRows,
    localePassedRows,
    duplicateFilledRowIds,
    unknownFilledRowIds,
    missingWorkOrderRowIds,
    decisionsByRowId,
  };
}

function validateFilledRow(
  rowId: string,
  decision: FilledDecision,
  workOrderRow: WorkOrderRow,
  rowBlockers: string[],
): { reviewerApproved: boolean; localePassed: boolean } {
  if (hasText(decision.studyTarget) && decision.studyTarget !== workOrderRow.studyTarget) {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} studyTarget must match the work-order`);
  }
  if (hasText(decision.sourceLocale) && decision.sourceLocale !== workOrderRow.sourceLocale) {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} sourceLocale must match the work-order`);
  }
  if (hasText(decision.contentHash) && decision.contentHash !== workOrderRow.contentHash) {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} contentHash must match the work-order`);
  }
  if (hasText(decision.path) && decision.path !== workOrderRow.path) {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} path must match the work-order`);
  }
  if (decision.planId !== undefined && decision.planId !== workOrderRow.planId) {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} planId must match the work-order`);
  }
  if (decision.dayIndex !== undefined && decision.dayIndex !== workOrderRow.dayIndex) {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} dayIndex must match the work-order`);
  }

  let reviewerApproved = false;
  if (decision.reviewerStatus === 'approved') {
    if (hasText(decision.reviewerEvidenceId)) {
      reviewerApproved = true;
    } else {
      rowBlockers.push(`filled reviewer/locale decision ${rowId} approved reviewerStatus requires a non-empty reviewerEvidenceId`);
    }
  } else {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} reviewerStatus must be approved`);
  }

  let localePassed = false;
  if (decision.localeGateStatus === 'passed') {
    if (hasText(decision.localeEvidenceId)) {
      localePassed = true;
    } else {
      rowBlockers.push(`filled reviewer/locale decision ${rowId} passed localeGateStatus requires a non-empty localeEvidenceId`);
    }
  } else {
    rowBlockers.push(`filled reviewer/locale decision ${rowId} localeGateStatus must be passed`);
  }

  return { reviewerApproved, localePassed };
}

function resolveFilledRowId(decision: FilledDecision): string | null {
  if (hasText(decision.rowId)) return decision.rowId;
  if (
    hasText(decision.studyTarget)
    && hasText(decision.sourceLocale)
    && hasText(decision.planId as string)
    && (typeof decision.dayIndex === 'number' || typeof decision.dayIndex === 'string')
    && hasText(decision.contentHash)
  ) {
    return `${decision.studyTarget}:${decision.sourceLocale}:${decision.planId}:${decision.dayIndex}:${decision.contentHash}`;
  }
  return null;
}

function assembleCandidateArtifact(
  identity: {
    packId: string;
    studyTarget: string;
    sourceLocale: string;
    surface: string;
    contentVersion: string;
  },
  workOrderRows: WorkOrderRow[],
  decisionsByRowId: Map<string, FilledDecision>,
): CoursePackReviewerLocaleFilledApprovalArtifact {
  const decisions: CoursePackReviewerLocaleFilledApprovalDecision[] = workOrderRows.map((row) => {
    const filled = decisionsByRowId.get(row.rowId);
    if (!filled) {
      // Unreachable: candidate assembly only runs when every work-order row has a filled decision.
      throw new Error(`Cannot assemble candidate: missing filled decision for ${row.rowId}`);
    }
    return {
      planId: row.planId,
      dayIndex: row.dayIndex,
      path: row.path,
      contentHash: row.contentHash,
      studyTarget: row.studyTarget,
      sourceLocale: row.sourceLocale,
      reviewerStatus: 'approved',
      localeGateStatus: 'passed',
      reviewerEvidenceId: String(filled.reviewerEvidenceId),
      localeEvidenceId: String(filled.localeEvidenceId),
      ...(hasText(filled.reviewerNotes) ? { reviewerNotes: String(filled.reviewerNotes) } : {}),
      ...(hasText(filled.localeNotes) ? { localeNotes: String(filled.localeNotes) } : {}),
    };
  });

  return {
    schemaVersion: FILLED_APPROVAL_ARTIFACT_SCHEMA_VERSION,
    status: 'PASS',
    packId: identity.packId,
    studyTarget: identity.studyTarget,
    sourceLocale: identity.sourceLocale,
    surface: identity.surface,
    contentVersion: identity.contentVersion,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
    remoteLoadingApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
    cacheLookupApproved: false,
    cacheReadApproved: false,
    cacheWriteApproved: false,
    cacheRepairApproved: false,
    storageMigrationApproved: false,
    cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    blockers: [],
    decisions,
  };
}

function emptyValidation(): FilledValidationState {
  return {
    rowBlockers: [],
    filledDecisionRows: 0,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    duplicateFilledRowIds: [],
    unknownFilledRowIds: [],
    missingWorkOrderRowIds: [],
    decisionsByRowId: new Map(),
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');
  return JSON.parse(source) as T;
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--work-order-report') {
      options.workOrderReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--filled-batches-dir') {
      options.filledBatchesDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--filled-batches-list') {
      options.filledBatchesListPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--candidate-out') {
      options.candidateOutputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function main(): void {
  const repoRoot = process.cwd();
  const result = writePlanContentReviewerLocaleFilledWorkOrderValidation(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content reviewer/locale filled work-order validation: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Validation: ${result.report.validationStatus}`);
  console.log(`Candidate generated: ${result.report.candidateGenerated}`);
  console.log(`Work-order rows: ${result.report.workOrderRows}`);
  console.log(`Reviewer approved rows: ${result.report.reviewerApprovedRows}/${result.report.workOrderRows}`);
  console.log(`Locale passed rows: ${result.report.localePassedRows}/${result.report.workOrderRows}`);
  if (result.report.candidateArtifactPath) {
    console.log(`Candidate artifact: ${result.report.candidateArtifactPath}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
