import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1Day2ReviewerContentUnitRow,
  GavanWeek1Day2ReviewerExerciseRow,
  GavanWeek1Day2ReviewerExplanationRow,
  GavanWeek1Day2ReviewerExport,
} from './personal_plan_gavan_week1_day2_reviewer_export';

export const GAVAN_WEEK1_DAY2_APPROVED_REVIEWER_EXPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day2-approved-reviewer-export.json',
);

const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

type ReviewerRow =
  | GavanWeek1Day2ReviewerContentUnitRow
  | GavanWeek1Day2ReviewerExplanationRow
  | GavanWeek1Day2ReviewerExerciseRow;

type ReviewerRowKind = ReviewerRow['kind'];

export type GavanWeek1Day2ReviewerApprovalRecord = {
  kind: 'gavan_week1_day2_reviewer_approval_record';
  rowKind: ReviewerRowKind;
  rowId: string;
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanWeek1Day2ReviewerApprovalInput = {
  kind: 'gavan_week1_day2_reviewer_approval_input';
  dayId: 'gavan-week1-day2';
  liveIntegration: false;
  approvals: GavanWeek1Day2ReviewerApprovalRecord[];
};

export type GavanWeek1Day2ReviewerApprovalInputOptions = {
  reviewerId: string;
  approvedAt: string;
};

type ApprovalMetadata = {
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanWeek1Day2ApprovedContentUnitRow =
  Omit<GavanWeek1Day2ReviewerContentUnitRow, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

export type GavanWeek1Day2ApprovedExplanationRow =
  Omit<GavanWeek1Day2ReviewerExplanationRow, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

export type GavanWeek1Day2ApprovedExerciseRow =
  Omit<GavanWeek1Day2ReviewerExerciseRow, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

type ApprovedReviewerRow =
  | GavanWeek1Day2ApprovedContentUnitRow
  | GavanWeek1Day2ApprovedExplanationRow
  | GavanWeek1Day2ApprovedExerciseRow;

export type GavanWeek1Day2ReviewerApprovalSummary = {
  contentUnits: number;
  explanationCards: number;
  exerciseBlueprints: number;
  totalApproved: number;
};

export type GavanWeek1Day2ApprovedReviewerExport = {
  kind: 'gavan_week1_day2_approved_reviewer_export';
  generatedAt: string;
  sourceReviewerExportGeneratedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day2';
  dayIndex: 2;
  liveIntegration: false;
  contentUnitRows: GavanWeek1Day2ApprovedContentUnitRow[];
  explanationRows: GavanWeek1Day2ApprovedExplanationRow[];
  exerciseRows: GavanWeek1Day2ApprovedExerciseRow[];
  mediaClaims: GavanWeek1Day2ReviewerExport['mediaClaims'];
  exerciseCoverage: GavanWeek1Day2ReviewerExport['exerciseCoverage'];
  summary: GavanWeek1Day2ReviewerApprovalSummary;
};

export type GavanWeek1Day2ReviewerApprovalIssueCode =
  | 'wrong_approval_input_kind'
  | 'wrong_approved_export_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'reviewer_export_invalid'
  | 'missing_approval_record'
  | 'duplicate_approval_record'
  | 'unknown_row_id'
  | 'missing_reviewer_id'
  | 'invalid_approved_at'
  | 'row_kind_mismatch'
  | 'text_checksum_mismatch'
  | 'approved_export_contains_pending_row'
  | 'approved_export_missing_approval'
  | 'approved_export_checksum_mismatch'
  | 'target_path_not_allowed';

export type GavanWeek1Day2ReviewerApprovalIssue = {
  code: GavanWeek1Day2ReviewerApprovalIssueCode;
  detail: string;
  rowId?: string;
};

export type GavanWeek1Day2ReviewerApprovalGateResult = {
  valid: boolean;
  issues: GavanWeek1Day2ReviewerApprovalIssue[];
  summary: GavanWeek1Day2ReviewerApprovalSummary;
};

export type GavanWeek1Day2ReviewerApprovalResult =
  GavanWeek1Day2ReviewerApprovalGateResult & {
    approvedExport?: GavanWeek1Day2ApprovedReviewerExport;
  };

export type GavanWeek1Day2ApprovedReviewerExportWriteOptions =
  GavanWeek1Day2ReviewerApprovalInputOptions & {
    generatedAt: string;
    targetPath: string;
  };

export type GavanWeek1Day2ApprovedReviewerExportWriteResult =
  GavanWeek1Day2ReviewerApprovalResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1Day2ReviewerApprovalIssueCode,
  detail: string,
  rowId?: string,
): GavanWeek1Day2ReviewerApprovalIssue {
  return { code, detail, rowId };
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

export function isGavanWeek1Day2ApprovedReviewerExportTargetAllowed(
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

function allReviewerRows(exported: GavanWeek1Day2ReviewerExport): ReviewerRow[] {
  return [
    ...(exported.contentUnitRows ?? []),
    ...(exported.explanationRows ?? []),
    ...(exported.exerciseRows ?? []),
  ];
}

function allApprovedRows(exported: GavanWeek1Day2ApprovedReviewerExport): ApprovedReviewerRow[] {
  return [
    ...exported.contentUnitRows,
    ...exported.explanationRows,
    ...exported.exerciseRows,
  ];
}

function reviewerRowVisibleText(row: ReviewerRow | ApprovedReviewerRow): string {
  if (row.kind === 'content_unit') {
    return [
      row.english,
      row.meaningRu,
      row.newWords.join('|'),
      row.firstSeenConstructions.join('|'),
    ].join(' ');
  }

  if (row.kind === 'explanation_card') {
    return [
      row.covers.join('|'),
      row.body,
    ].join(' ');
  }

  return [
    row.exerciseType,
    row.purpose,
    row.sourceContentUnitIds.join('|'),
  ].join(' ');
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function isIsoTimestamp(value: string): boolean {
  if (!ISO_TIMESTAMP_RE.test(value)) {
    return false;
  }

  return new Date(value).toISOString() === value;
}

export function checksumGavanWeek1Day2ReviewerRow(row: ReviewerRow | ApprovedReviewerRow): string {
  return fnv1a(`${row.kind}|${row.id}|${reviewerRowVisibleText(row)}`);
}

function emptySummary(): GavanWeek1Day2ReviewerApprovalSummary {
  return {
    contentUnits: 0,
    explanationCards: 0,
    exerciseBlueprints: 0,
    totalApproved: 0,
  };
}

function summaryFromRecords(
  records: GavanWeek1Day2ReviewerApprovalRecord[],
): GavanWeek1Day2ReviewerApprovalSummary {
  const summary = emptySummary();
  const counted = new Set<string>();

  for (const record of records) {
    if (counted.has(record.rowId)) {
      continue;
    }
    counted.add(record.rowId);

    if (record.rowKind === 'content_unit') {
      summary.contentUnits += 1;
    } else if (record.rowKind === 'explanation_card') {
      summary.explanationCards += 1;
    } else if (record.rowKind === 'exercise_blueprint') {
      summary.exerciseBlueprints += 1;
    }
  }

  summary.totalApproved =
    summary.contentUnits + summary.explanationCards + summary.exerciseBlueprints;
  return summary;
}

function summaryFromApprovedExport(
  exported: GavanWeek1Day2ApprovedReviewerExport,
): GavanWeek1Day2ReviewerApprovalSummary {
  return {
    contentUnits: exported.contentUnitRows.length,
    explanationCards: exported.explanationRows.length,
    exerciseBlueprints: exported.exerciseRows.length,
    totalApproved:
      exported.contentUnitRows.length + exported.explanationRows.length + exported.exerciseRows.length,
  };
}

function reviewerExportIssues(exported: GavanWeek1Day2ReviewerExport): string[] {
  const issues: string[] = [];

  if (exported.dayId !== 'gavan-week1-day2' || exported.dayIndex !== 2) {
    issues.push('wrong day');
  }
  if (exported.liveIntegration !== false) {
    issues.push('live integration');
  }
  if (exported.reviewStatus !== 'needs_manual_review') {
    issues.push('review status');
  }
  if (!exported.forbiddenAnchorCheck?.valid || exported.forbiddenAnchorCheck.found.length > 0) {
    issues.push('forbidden anchors');
  }
  if (
    exported.mediaClaims?.finalAudioReady !== false ||
    exported.mediaClaims?.audioAssetStatus !== 'not_generated'
  ) {
    issues.push('audio claims');
  }
  if (
    exported.mediaClaims?.finalPronunciationScoringReady !== false ||
    exported.mediaClaims?.pronunciationScoringStatus !== 'not_built'
  ) {
    issues.push('pronunciation claims');
  }
  if (exported.exerciseCoverage?.valid !== true) {
    issues.push('exercise coverage');
  }
  if (
    exported.contentUnitRows.length !== exported.summary.contentUnits ||
    exported.explanationRows.length !== exported.summary.explanationCards ||
    exported.exerciseRows.length !== exported.summary.exerciseBlueprints
  ) {
    issues.push('summary mismatch');
  }
  if (allReviewerRows(exported).some((row) => row.reviewStatus !== 'needs_manual_review')) {
    issues.push('row review status');
  }

  return issues;
}

export function buildGavanWeek1Day2ReviewerApprovalInput(
  exported: GavanWeek1Day2ReviewerExport,
  options: GavanWeek1Day2ReviewerApprovalInputOptions,
): GavanWeek1Day2ReviewerApprovalInput {
  return {
    kind: 'gavan_week1_day2_reviewer_approval_input',
    dayId: exported.dayId,
    liveIntegration: false,
    approvals: allReviewerRows(exported).map((row) => ({
      kind: 'gavan_week1_day2_reviewer_approval_record',
      rowKind: row.kind,
      rowId: row.id,
      reviewerId: options.reviewerId,
      approvedAt: options.approvedAt,
      textChecksum: checksumGavanWeek1Day2ReviewerRow(row),
    })),
  };
}

function approvalByRowId(
  approvals: GavanWeek1Day2ReviewerApprovalRecord[],
): Map<string, GavanWeek1Day2ReviewerApprovalRecord> {
  const byId = new Map<string, GavanWeek1Day2ReviewerApprovalRecord>();
  for (const approval of approvals) {
    if (!byId.has(approval.rowId)) {
      byId.set(approval.rowId, approval);
    }
  }
  return byId;
}

export function validateGavanWeek1Day2ReviewerApprovalGate(
  exported: GavanWeek1Day2ReviewerExport,
  input: GavanWeek1Day2ReviewerApprovalInput,
): GavanWeek1Day2ReviewerApprovalGateResult {
  const issues: GavanWeek1Day2ReviewerApprovalIssue[] = [];
  const rows = allReviewerRows(exported);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const seenApprovalIds = new Set<string>();
  const validApprovalRecords: GavanWeek1Day2ReviewerApprovalRecord[] = [];
  const exportIssues = reviewerExportIssues(exported);

  if (input.kind !== 'gavan_week1_day2_reviewer_approval_input') {
    issues.push(issue('wrong_approval_input_kind', 'Approval input must use the expected kind.'));
  }

  if (input.dayId !== exported.dayId || input.dayId !== 'gavan-week1-day2') {
    issues.push(issue('wrong_day_id', 'Approval input must describe Gavan week 1 day 2.'));
  }

  if (input.liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Approval gate must stay outside live integration.'));
  }

  if (exportIssues.length > 0) {
    issues.push(issue(
      'reviewer_export_invalid',
      `Reviewer export is not safe to approve: ${exportIssues.join(', ')}.`,
    ));
  }

  for (const record of input.approvals) {
    const row = rowById.get(record.rowId);

    if (seenApprovalIds.has(record.rowId)) {
      issues.push(issue(
        'duplicate_approval_record',
        'Each reviewer row can have only one approval record.',
        record.rowId,
      ));
    }
    seenApprovalIds.add(record.rowId);

    if (!record.reviewerId.trim()) {
      issues.push(issue(
        'missing_reviewer_id',
        'Approval record must include a reviewer id.',
        record.rowId,
      ));
    }

    if (!isIsoTimestamp(record.approvedAt)) {
      issues.push(issue(
        'invalid_approved_at',
        'Approval record must include an ISO timestamp with milliseconds and Z timezone.',
        record.rowId,
      ));
    }

    if (!row) {
      issues.push(issue(
        'unknown_row_id',
        'Approval record references a row that does not exist in the reviewer export.',
        record.rowId,
      ));
      continue;
    }

    if (record.rowKind !== row.kind) {
      issues.push(issue(
        'row_kind_mismatch',
        'Approval record row kind must match the reviewer export row.',
        record.rowId,
      ));
    }

    if (record.textChecksum !== checksumGavanWeek1Day2ReviewerRow(row)) {
      issues.push(issue(
        'text_checksum_mismatch',
        'Approval record checksum must match the current reviewer row text.',
        record.rowId,
      ));
    }

    validApprovalRecords.push(record);
  }

  for (const row of rows) {
    if (!seenApprovalIds.has(row.id)) {
      issues.push(issue(
        'missing_approval_record',
        'Every reviewer row needs an explicit approval record.',
        row.id,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: summaryFromRecords(
      issues.length === 0 ? validApprovalRecords : input.approvals.filter((record) =>
        rowById.has(record.rowId),
      ),
    ),
  };
}

function approvalMetadata(record: GavanWeek1Day2ReviewerApprovalRecord): ApprovalMetadata {
  return {
    reviewerId: record.reviewerId,
    approvedAt: record.approvedAt,
    textChecksum: record.textChecksum,
  };
}

function approveContentRow(
  row: GavanWeek1Day2ReviewerContentUnitRow,
  record: GavanWeek1Day2ReviewerApprovalRecord,
): GavanWeek1Day2ApprovedContentUnitRow {
  return {
    ...row,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

function approveExplanationRow(
  row: GavanWeek1Day2ReviewerExplanationRow,
  record: GavanWeek1Day2ReviewerApprovalRecord,
): GavanWeek1Day2ApprovedExplanationRow {
  return {
    ...row,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

function approveExerciseRow(
  row: GavanWeek1Day2ReviewerExerciseRow,
  record: GavanWeek1Day2ReviewerApprovalRecord,
): GavanWeek1Day2ApprovedExerciseRow {
  return {
    ...row,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

export function approveGavanWeek1Day2ReviewerExport(
  exported: GavanWeek1Day2ReviewerExport,
  input: GavanWeek1Day2ReviewerApprovalInput,
  generatedAt = input.approvals[0]?.approvedAt ?? exported.generatedAt,
): GavanWeek1Day2ReviewerApprovalResult {
  const gate = validateGavanWeek1Day2ReviewerApprovalGate(exported, input);
  if (!gate.valid) {
    return gate;
  }

  const approvals = approvalByRowId(input.approvals);
  const approvedExport: GavanWeek1Day2ApprovedReviewerExport = {
    kind: 'gavan_week1_day2_approved_reviewer_export',
    generatedAt,
    sourceReviewerExportGeneratedAt: exported.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day2',
    dayIndex: 2,
    liveIntegration: false,
    contentUnitRows: exported.contentUnitRows.map((row) =>
      approveContentRow(row, approvals.get(row.id)!),
    ),
    explanationRows: exported.explanationRows.map((row) =>
      approveExplanationRow(row, approvals.get(row.id)!),
    ),
    exerciseRows: exported.exerciseRows.map((row) =>
      approveExerciseRow(row, approvals.get(row.id)!),
    ),
    mediaClaims: { ...exported.mediaClaims },
    exerciseCoverage: { ...exported.exerciseCoverage },
    summary: gate.summary,
  };

  return {
    ...gate,
    approvedExport,
  };
}

export function validateGavanWeek1Day2ApprovedReviewerExport(
  exported: GavanWeek1Day2ApprovedReviewerExport,
): GavanWeek1Day2ReviewerApprovalGateResult {
  const issues: GavanWeek1Day2ReviewerApprovalIssue[] = [];
  const rows = allApprovedRows(exported);

  if (exported.kind !== 'gavan_week1_day2_approved_reviewer_export') {
    issues.push(issue('wrong_approved_export_kind', 'Approved export must use the expected kind.'));
  }

  if (exported.dayId !== 'gavan-week1-day2' || exported.dayIndex !== 2) {
    issues.push(issue('wrong_day_id', 'Approved export must describe Gavan week 1 day 2.'));
  }

  if (exported.liveIntegration !== false) {
    issues.push(issue('live_integration_enabled', 'Approved export must stay outside live integration.'));
  }

  for (const row of rows) {
    if (row.reviewStatus !== 'approved') {
      issues.push(issue(
        'approved_export_contains_pending_row',
        'Approved export cannot contain pending rows.',
        row.id,
      ));
    }

    if (!row.approval) {
      issues.push(issue(
        'approved_export_missing_approval',
        'Approved rows must carry approval metadata.',
        row.id,
      ));
      continue;
    }

    if (row.approval.textChecksum !== checksumGavanWeek1Day2ReviewerRow(row)) {
      issues.push(issue(
        'approved_export_checksum_mismatch',
        'Approved row checksum must match the approved row text.',
        row.id,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: summaryFromApprovedExport(exported),
  };
}

export function serializeGavanWeek1Day2ApprovedReviewerExport(
  exported: GavanWeek1Day2ApprovedReviewerExport,
): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

export function writeGavanWeek1Day2ApprovedReviewerExport(
  exported: GavanWeek1Day2ReviewerExport,
  options: GavanWeek1Day2ApprovedReviewerExportWriteOptions,
): GavanWeek1Day2ApprovedReviewerExportWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1Day2ApprovedReviewerExportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 2 approved reviewer export can only write under .codex-tmp or docs/reports.',
        ),
      ],
      summary: emptySummary(),
    };
  }

  const input = buildGavanWeek1Day2ReviewerApprovalInput(exported, {
    reviewerId: options.reviewerId,
    approvedAt: options.approvedAt,
  });
  const approval = approveGavanWeek1Day2ReviewerExport(exported, input, options.generatedAt);

  if (!approval.valid || !approval.approvedExport) {
    return approval;
  }

  const serialized = serializeGavanWeek1Day2ApprovedReviewerExport(approval.approvedExport);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...approval,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
