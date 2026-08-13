import fs from 'node:fs';
import path from 'node:path';

import type {
  CoursePackReviewerLocaleApprovalPacketReport,
  CoursePackReviewerLocaleApprovalPacketRow,
} from '../app/course_pack_reviewer_locale_approval_packet';

type CliOptions = {
  approvalPacketReportPath?: string;
  approvalIntakeDryRunPath?: string;
  outputPath?: string;
  generatedAt?: string;
  batchSize?: number;
};

type ApprovalPacketEnvelope = {
  schemaVersion?: string;
  status?: 'PASS' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  productionActivationApproved?: boolean;
  packet?: CoursePackReviewerLocaleApprovalPacketReport;
  blockers?: unknown[];
};

type ApprovalIntakeDryRunEnvelope = {
  schemaVersion?: string;
  status?: 'PASS' | 'HOLD';
  dryRunStatus?: 'READY_FOR_INTAKE' | 'MISSING_FILLED_ARTIFACT' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  productionActivationApproved?: boolean;
  filledArtifactValidation?: {
    status?: 'PASS' | 'HOLD' | 'missing';
  };
  intakeDryRun?: {
    reviewerApprovedRows?: number;
    localePassedRows?: number;
    totalRows?: number;
  };
};

type ReviewerLocaleWorkOrderRow = {
  rowId: string;
  planId: string;
  dayIndex: number;
  path: string;
  contentHash: string;
  studyTarget: string;
  sourceLocale: string;
  requiredReviewerStatus: 'approved';
  requiredLocaleGateStatus: 'passed';
  reviewerStatus: 'unreviewed';
  localeGateStatus: 'unreviewed';
  reviewerEvidenceId: '';
  localeEvidenceId: '';
  reviewerNotes: '';
  localeNotes: '';
};

type ReviewerLocaleWorkOrderBatch = {
  batchId: string;
  startIndex: number;
  endIndex: number;
  rowCount: number;
  rows: ReviewerLocaleWorkOrderRow[];
};

type ReviewerLocaleWorkOrderEnvelope = {
  schemaVersion: 'plan-content-reviewer-locale-work-order-batches-v1';
  status: 'PASS' | 'HOLD';
  workOrderStatus: 'READY_FOR_REVIEW' | 'HOLD';
  generatedAt: string;
  approvalPacketReportPath: string;
  approvalIntakeDryRunPath: string;
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
  totalRows: number;
  batchSize: number;
  batchCount: number;
  reviewerApprovedRows: 0;
  localePassedRows: 0;
  generatedFilledApprovalArtifact: false;
  duplicateRowIds: string[];
  missingPacketRows: CoursePackReviewerLocaleApprovalPacketRow[];
  batches: ReviewerLocaleWorkOrderBatch[];
  evidenceBlockers: string[];
  blockers: string[];
};

type ReviewerLocaleWorkOrderResult = {
  outputPath: string;
  report: ReviewerLocaleWorkOrderEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_PACKET_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-packet.json');
const DEFAULT_INTAKE_DRY_RUN_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-intake-dry-run.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-decision-work-order-batches.json');
const DEFAULT_BATCH_SIZE = 25;

export function resolvePlanContentReviewerLocaleWorkOrderTempPath(
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

export function writePlanContentReviewerLocaleWorkOrderBatches(
  repoRoot: string,
  options: CliOptions = {},
): ReviewerLocaleWorkOrderResult {
  const approvalPacketReportPath = resolvePlanContentReviewerLocaleWorkOrderTempPath(
    repoRoot,
    options.approvalPacketReportPath,
    DEFAULT_PACKET_PATH,
    'Reviewer/locale approval packet report input',
  );
  const approvalIntakeDryRunPath = resolvePlanContentReviewerLocaleWorkOrderTempPath(
    repoRoot,
    options.approvalIntakeDryRunPath,
    DEFAULT_INTAKE_DRY_RUN_PATH,
    'Reviewer/locale approval intake dry-run input',
  );
  const outputPath = resolvePlanContentReviewerLocaleWorkOrderTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Reviewer/locale work-order output',
  );
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error('batchSize must be an integer from 1 to 100');
  }

  const packetEnvelope = readJsonFile<ApprovalPacketEnvelope>(approvalPacketReportPath);
  const dryRunEnvelope = readJsonFile<ApprovalIntakeDryRunEnvelope>(approvalIntakeDryRunPath);
  const evidenceBlockers = [
    ...validatePacketEnvelope(packetEnvelope),
    ...validateDryRunEnvelope(packetEnvelope, dryRunEnvelope),
  ];
  const packetRows = packetEnvelope.packet?.packetRows ?? [];
  const { batches, duplicateRowIds } = buildBatches(packetRows, batchSize);
  const batchedRowIds = new Set(batches.flatMap((batch) => batch.rows.map((row) => row.rowId)));
  const missingPacketRows = packetRows.filter((row) => !batchedRowIds.has(rowId(row)));
  const blockers = [
    ...evidenceBlockers,
    ...(duplicateRowIds.length > 0 ? [`duplicate work-order row ids: ${duplicateRowIds.join(', ')}`] : []),
    ...(missingPacketRows.length > 0 ? [`work-order is missing ${missingPacketRows.length} packet rows`] : []),
  ];

  const report: ReviewerLocaleWorkOrderEnvelope = {
    schemaVersion: 'plan-content-reviewer-locale-work-order-batches-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    workOrderStatus: blockers.length === 0 ? 'READY_FOR_REVIEW' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    approvalPacketReportPath: relativePath(repoRoot, approvalPacketReportPath),
    approvalIntakeDryRunPath: relativePath(repoRoot, approvalIntakeDryRunPath),
    packId: packetEnvelope.packId ?? packetEnvelope.packet?.packId ?? '',
    studyTarget: packetEnvelope.studyTarget ?? packetEnvelope.packet?.studyTarget ?? '',
    sourceLocale: packetEnvelope.sourceLocale ?? packetEnvelope.packet?.sourceLocale ?? '',
    surface: packetEnvelope.surface ?? packetEnvelope.packet?.surface ?? '',
    contentVersion: packetEnvelope.contentVersion ?? packetEnvelope.packet?.contentVersion ?? '',
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
    totalRows: packetRows.length,
    batchSize,
    batchCount: batches.length,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    generatedFilledApprovalArtifact: false,
    duplicateRowIds,
    missingPacketRows,
    batches,
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Reviewer/locale work-order batches failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validatePacketEnvelope(envelope: ApprovalPacketEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.schemaVersion !== 'plan-content-reviewer-locale-approval-packet-report-v1') {
    errors.push('approval packet report schemaVersion must be plan-content-reviewer-locale-approval-packet-report-v1');
  }
  if (envelope.status !== 'PASS') {
    errors.push('approval packet report status must be PASS');
  }
  if (!envelope.packet) {
    errors.push('approval packet report must contain packet payload');
  } else {
    if (envelope.packet.status !== 'PASS') errors.push('approval packet payload status must be PASS');
    if (envelope.packet.packetStatus !== 'READY_FOR_REVIEW') {
      errors.push('approval packet payload must be READY_FOR_REVIEW');
    }
    if (envelope.packet.reviewerApprovedRows !== 0) {
      errors.push('approval packet reviewerApprovedRows must remain 0');
    }
    if (envelope.packet.localePassedRows !== 0) {
      errors.push('approval packet localePassedRows must remain 0');
    }
  }
  if (envelope.activationApproved !== false) errors.push('approval packet activationApproved must remain false');
  if (envelope.productionActivationApproved !== false) errors.push('approval packet productionActivationApproved must remain false');
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('approval packet report blockers must be empty');
  }
  return errors;
}

function validateDryRunEnvelope(
  packetEnvelope: ApprovalPacketEnvelope,
  dryRun: ApprovalIntakeDryRunEnvelope,
): string[] {
  const errors: string[] = [];
  if (dryRun.schemaVersion !== 'plan-content-reviewer-locale-approval-intake-dry-run-report-v1') {
    errors.push('approval intake dry-run schemaVersion must be plan-content-reviewer-locale-approval-intake-dry-run-report-v1');
  }
  if (dryRun.dryRunStatus !== 'MISSING_FILLED_ARTIFACT') {
    errors.push('approval intake dry-run must be MISSING_FILLED_ARTIFACT before work-order batching');
  }
  if (dryRun.filledArtifactValidation?.status !== 'missing') {
    errors.push('approval intake dry-run filledArtifactValidation must be missing before work-order batching');
  }
  if (dryRun.intakeDryRun?.reviewerApprovedRows !== 0) {
    errors.push('approval intake dry-run reviewerApprovedRows must remain 0');
  }
  if (dryRun.intakeDryRun?.localePassedRows !== 0) {
    errors.push('approval intake dry-run localePassedRows must remain 0');
  }
  for (const field of ['packId', 'studyTarget', 'sourceLocale', 'surface', 'contentVersion'] as const) {
    const packetValue = packetEnvelope[field] ?? packetEnvelope.packet?.[field];
    if (dryRun[field] !== packetValue) {
      errors.push(`approval intake dry-run ${field} must match approval packet`);
    }
  }
  if (dryRun.activationApproved !== false) errors.push('approval intake dry-run activationApproved must remain false');
  if (dryRun.productionActivationApproved !== false) {
    errors.push('approval intake dry-run productionActivationApproved must remain false');
  }
  return errors;
}

function buildBatches(
  packetRows: CoursePackReviewerLocaleApprovalPacketRow[],
  batchSize: number,
): { batches: ReviewerLocaleWorkOrderBatch[]; duplicateRowIds: string[] } {
  const rows = packetRows.map(workOrderRow);
  const seen = new Set<string>();
  const duplicateRowIds: string[] = [];
  for (const row of rows) {
    if (seen.has(row.rowId)) duplicateRowIds.push(row.rowId);
    seen.add(row.rowId);
  }
  const batches: ReviewerLocaleWorkOrderBatch[] = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    const batchRows = rows.slice(index, index + batchSize);
    batches.push({
      batchId: `reviewer-locale-batch-${String(batches.length + 1).padStart(3, '0')}`,
      startIndex: index,
      endIndex: index + batchRows.length - 1,
      rowCount: batchRows.length,
      rows: batchRows,
    });
  }
  return { batches, duplicateRowIds };
}

function workOrderRow(row: CoursePackReviewerLocaleApprovalPacketRow): ReviewerLocaleWorkOrderRow {
  return {
    rowId: rowId(row),
    planId: row.planId,
    dayIndex: row.dayIndex,
    path: row.path,
    contentHash: row.contentHash,
    studyTarget: row.studyTarget,
    sourceLocale: row.sourceLocale,
    requiredReviewerStatus: 'approved',
    requiredLocaleGateStatus: 'passed',
    reviewerStatus: 'unreviewed',
    localeGateStatus: 'unreviewed',
    reviewerEvidenceId: '',
    localeEvidenceId: '',
    reviewerNotes: '',
    localeNotes: '',
  };
}

function rowId(row: {
  studyTarget: string;
  sourceLocale: string;
  planId: string;
  dayIndex: number;
  contentHash: string;
}): string {
  return `${row.studyTarget}:${row.sourceLocale}:${row.planId}:${row.dayIndex}:${row.contentHash}`;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--approval-packet-report') {
      options.approvalPacketReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--approval-intake-dry-run') {
      options.approvalIntakeDryRunPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--batch-size') {
      options.batchSize = Number(readValue(argv, index, arg));
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
  const result = writePlanContentReviewerLocaleWorkOrderBatches(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content reviewer/locale work-order batches: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Work order: ${result.report.workOrderStatus}`);
  console.log(`Rows: ${result.report.totalRows}`);
  console.log(`Batches: ${result.report.batchCount}`);
  console.log(`Reviewer approved rows: ${result.report.reviewerApprovedRows}/${result.report.totalRows}`);
  console.log(`Locale passed rows: ${result.report.localePassedRows}/${result.report.totalRows}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
