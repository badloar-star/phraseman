import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1Day3ReviewerContentUnitRow,
  GavanWeek1Day3ReviewerExerciseRow,
  GavanWeek1Day3ReviewerExplanationRow,
  GavanWeek1Day3ReviewerExport,
} from './personal_plan_gavan_week1_day3_reviewer_export';

export const GAVAN_WEEK1_DAY3_APPROVED_REVIEWER_EXPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day3-approved-reviewer-export.json',
);

const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

type ReviewerRow =
  | GavanWeek1Day3ReviewerContentUnitRow
  | GavanWeek1Day3ReviewerExplanationRow
  | GavanWeek1Day3ReviewerExerciseRow;
type ReviewerRowKind = ReviewerRow['kind'];

type ApprovalMetadata = {
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanWeek1Day3ReviewerApprovalRecord = {
  kind: 'gavan_week1_day3_reviewer_approval_record';
  rowKind: ReviewerRowKind;
  rowId: string;
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanWeek1Day3ReviewerApprovalInput = {
  kind: 'gavan_week1_day3_reviewer_approval_input';
  dayId: 'gavan-week1-day3';
  liveIntegration: false;
  approvals: GavanWeek1Day3ReviewerApprovalRecord[];
};

export type GavanWeek1Day3ReviewerApprovalInputOptions = {
  reviewerId: string;
  approvedAt: string;
};

export type GavanWeek1Day3ApprovedContentUnitRow =
  Omit<GavanWeek1Day3ReviewerContentUnitRow, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

export type GavanWeek1Day3ApprovedExplanationRow =
  Omit<GavanWeek1Day3ReviewerExplanationRow, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

export type GavanWeek1Day3ApprovedExerciseRow =
  Omit<GavanWeek1Day3ReviewerExerciseRow, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

type ApprovedReviewerRow =
  | GavanWeek1Day3ApprovedContentUnitRow
  | GavanWeek1Day3ApprovedExplanationRow
  | GavanWeek1Day3ApprovedExerciseRow;

export type GavanWeek1Day3ReviewerApprovalSummary = {
  contentUnits: number;
  explanationCards: number;
  exerciseBlueprints: number;
  totalApproved: number;
};

export type GavanWeek1Day3ApprovedReviewerExport = {
  kind: 'gavan_week1_day3_approved_reviewer_export';
  generatedAt: string;
  sourceReviewerExportGeneratedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day3';
  dayIndex: 3;
  liveIntegration: false;
  contentUnitRows: GavanWeek1Day3ApprovedContentUnitRow[];
  explanationRows: GavanWeek1Day3ApprovedExplanationRow[];
  exerciseRows: GavanWeek1Day3ApprovedExerciseRow[];
  mediaClaims: GavanWeek1Day3ReviewerExport['mediaClaims'];
  exerciseCoverage: GavanWeek1Day3ReviewerExport['exerciseCoverage'];
  summary: GavanWeek1Day3ReviewerApprovalSummary;
};

export type GavanWeek1Day3ReviewerApprovalIssueCode =
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

export type GavanWeek1Day3ReviewerApprovalIssue = {
  code: GavanWeek1Day3ReviewerApprovalIssueCode;
  detail: string;
  rowId?: string;
};

export type GavanWeek1Day3ReviewerApprovalGateResult = {
  valid: boolean;
  issues: GavanWeek1Day3ReviewerApprovalIssue[];
  summary: GavanWeek1Day3ReviewerApprovalSummary;
};

export type GavanWeek1Day3ReviewerApprovalResult =
  GavanWeek1Day3ReviewerApprovalGateResult & {
    approvedExport?: GavanWeek1Day3ApprovedReviewerExport;
  };

export type GavanWeek1Day3ApprovedReviewerExportWriteOptions =
  GavanWeek1Day3ReviewerApprovalInputOptions & {
    generatedAt: string;
    targetPath: string;
  };

export type GavanWeek1Day3ApprovedReviewerExportWriteResult =
  GavanWeek1Day3ReviewerApprovalResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1Day3ReviewerApprovalIssueCode,
  detail: string,
  rowId?: string,
): GavanWeek1Day3ReviewerApprovalIssue {
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

export function isGavanWeek1Day3ApprovedReviewerExportTargetAllowed(
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

function allReviewerRows(exported: GavanWeek1Day3ReviewerExport): ReviewerRow[] {
  return [
    ...(exported.contentUnitRows ?? []),
    ...(exported.explanationRows ?? []),
    ...(exported.exerciseRows ?? []),
  ];
}

function allApprovedRows(exported: GavanWeek1Day3ApprovedReviewerExport): ApprovedReviewerRow[] {
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

export function checksumGavanWeek1Day3ReviewerRow(row: ReviewerRow | ApprovedReviewerRow): string {
  return fnv1a(`${row.kind}|${row.id}|${reviewerRowVisibleText(row)}`);
}

function emptySummary(): GavanWeek1Day3ReviewerApprovalSummary {
  return {
    contentUnits: 0,
    explanationCards: 0,
    exerciseBlueprints: 0,
    totalApproved: 0,
  };
}

function summaryFromRecords(
  records: GavanWeek1Day3ReviewerApprovalRecord[],
): GavanWeek1Day3ReviewerApprovalSummary {
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
  exported: GavanWeek1Day3ApprovedReviewerExport,
): GavanWeek1Day3ReviewerApprovalSummary {
  return {
    contentUnits: exported.contentUnitRows.length,
    explanationCards: exported.explanationRows.length,
    exerciseBlueprints: exported.exerciseRows.length,
    totalApproved:
      exported.contentUnitRows.length + exported.explanationRows.length + exported.exerciseRows.length,
  };
}

function reviewerExportIssues(exported: GavanWeek1Day3ReviewerExport): string[] {
  const issues: string[] = [];

  if (exported.dayId !== 'gavan-week1-day3' || exported.dayIndex !== 3) {
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

export function buildGavanWeek1Day3ReviewerApprovalInput(
  exported: GavanWeek1Day3ReviewerExport,
  options: GavanWeek1Day3ReviewerApprovalInputOptions,
): GavanWeek1Day3ReviewerApprovalInput {
  return {
    kind: 'gavan_week1_day3_reviewer_approval_input',
    dayId: exported.dayId,
    liveIntegration: false,
    approvals: allReviewerRows(exported).map((row) => ({
      kind: 'gavan_week1_day3_reviewer_approval_record',
      rowKind: row.kind,
      rowId: row.id,
      reviewerId: options.reviewerId,
      approvedAt: options.approvedAt,
      textChecksum: checksumGavanWeek1Day3ReviewerRow(row),
    })),
  };
}

function approvalByRowId(
  approvals: GavanWeek1Day3ReviewerApprovalRecord[],
): Map<string, GavanWeek1Day3ReviewerApprovalRecord> {
  const byId = new Map<string, GavanWeek1Day3ReviewerApprovalRecord>();
  for (const approval of approvals) {
    if (!byId.has(approval.rowId)) {
      byId.set(approval.rowId, approval);
    }
  }
  return byId;
}

export function validateGavanWeek1Day3ReviewerApprovalGate(
  exported: GavanWeek1Day3ReviewerExport,
  input: GavanWeek1Day3ReviewerApprovalInput,
): GavanWeek1Day3ReviewerApprovalGateResult {
  const issues: GavanWeek1Day3ReviewerApprovalIssue[] = [];
  const rows = allReviewerRows(exported);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const seenApprovalIds = new Set<string>();
  const validApprovalRecords: GavanWeek1Day3ReviewerApprovalRecord[] = [];
  const exportIssues = reviewerExportIssues(exported);

  if (input.kind !== 'gavan_week1_day3_reviewer_approval_input') {
    issues.push(issue('wrong_approval_input_kind', 'Approval input must use the expected kind.'));
  }

  if (input.dayId !== exported.dayId || input.dayId !== 'gavan-week1-day3') {
    issues.push(issue('wrong_day_id', 'Approval input must describe Gavan week 1 day 3.'));
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

    if (record.textChecksum !== checksumGavanWeek1Day3ReviewerRow(row)) {
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

function approvalMetadata(record: GavanWeek1Day3ReviewerApprovalRecord): ApprovalMetadata {
  return {
    reviewerId: record.reviewerId,
    approvedAt: record.approvedAt,
    textChecksum: record.textChecksum,
  };
}

function approveContentRow(
  row: GavanWeek1Day3ReviewerContentUnitRow,
  record: GavanWeek1Day3ReviewerApprovalRecord,
): GavanWeek1Day3ApprovedContentUnitRow {
  return {
    ...row,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

function approveExplanationRow(
  row: GavanWeek1Day3ReviewerExplanationRow,
  record: GavanWeek1Day3ReviewerApprovalRecord,
): GavanWeek1Day3ApprovedExplanationRow {
  return {
    ...row,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

function approveExerciseRow(
  row: GavanWeek1Day3ReviewerExerciseRow,
  record: GavanWeek1Day3ReviewerApprovalRecord,
): GavanWeek1Day3ApprovedExerciseRow {
  return {
    ...row,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

export function approveGavanWeek1Day3ReviewerExport(
  exported: GavanWeek1Day3ReviewerExport,
  input: GavanWeek1Day3ReviewerApprovalInput,
  generatedAt = input.approvals[0]?.approvedAt ?? exported.generatedAt,
): GavanWeek1Day3ReviewerApprovalResult {
  const gate = validateGavanWeek1Day3ReviewerApprovalGate(exported, input);
  if (!gate.valid) {
    return gate;
  }

  const approvals = approvalByRowId(input.approvals);
  const approvedExport: GavanWeek1Day3ApprovedReviewerExport = {
    kind: 'gavan_week1_day3_approved_reviewer_export',
    generatedAt,
    sourceReviewerExportGeneratedAt: exported.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day3',
    dayIndex: 3,
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

export function validateGavanWeek1Day3ApprovedReviewerExport(
  exported: GavanWeek1Day3ApprovedReviewerExport,
): GavanWeek1Day3ReviewerApprovalGateResult {
  const issues: GavanWeek1Day3ReviewerApprovalIssue[] = [];
  const rows = allApprovedRows(exported);

  if (exported.kind !== 'gavan_week1_day3_approved_reviewer_export') {
    issues.push(issue('wrong_approved_export_kind', 'Approved export must use the expected kind.'));
  }

  if (exported.dayId !== 'gavan-week1-day3' || exported.dayIndex !== 3) {
    issues.push(issue('wrong_day_id', 'Approved export must describe Gavan week 1 day 3.'));
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

    if (row.approval.textChecksum !== checksumGavanWeek1Day3ReviewerRow(row)) {
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

export function serializeGavanWeek1Day3ApprovedReviewerExport(
  exported: GavanWeek1Day3ApprovedReviewerExport,
): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

export function writeGavanWeek1Day3ApprovedReviewerExport(
  exported: GavanWeek1Day3ReviewerExport,
  options: GavanWeek1Day3ApprovedReviewerExportWriteOptions,
): GavanWeek1Day3ApprovedReviewerExportWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1Day3ApprovedReviewerExportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 day 3 approved reviewer export can only write under .codex-tmp or docs/reports.',
        ),
      ],
      summary: emptySummary(),
    };
  }

  const input = buildGavanWeek1Day3ReviewerApprovalInput(exported, {
    reviewerId: options.reviewerId,
    approvedAt: options.approvedAt,
  });
  const approval = approveGavanWeek1Day3ReviewerExport(exported, input, options.generatedAt);

  if (!approval.valid || !approval.approvedExport) {
    return approval;
  }

  const serialized = serializeGavanWeek1Day3ApprovedReviewerExport(approval.approvedExport);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...approval,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
