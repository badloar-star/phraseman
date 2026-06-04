import path from 'path';
import {
  buildGavanDay1ApprovedExportReport,
  validateGavanDay1ApprovedExportReport,
  type GavanDay1ApprovedExportReport,
  type GavanDay1ApprovedExportReportRow,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import {
  approveGavanDay1ReviewerExportFixture,
  buildGavanDay1ReviewerApprovalInput,
} from '../app/personal_plan_gavan_day1_reviewer_approval_gate';
import {
  buildGavanDay1ReviewerExportFixture,
} from '../app/personal_plan_gavan_day1_reviewer_export_fixture';
import {
  buildGavanDay1ApprovedReportArtifact,
  writeGavanDay1ApprovedReportArtifact,
  type GavanDay1ApprovedReportArtifact,
  type GavanDay1ApprovedReportArtifactIssue,
} from './personal_plan_gavan_day1_approved_report_artifact';

export const GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-day1-approved-report.json',
);

export type GavanDay1GeneratedArtifactOptions = {
  reviewerId: string;
  approvedAt: string;
  generatedAt: string;
  targetPath?: string;
};

export type GavanDay1ApprovedArtifactAuditIssueCode =
  | 'invalid_artifact_kind'
  | 'invalid_report'
  | 'live_integration_enabled'
  | 'missing_exact_text'
  | 'missing_approval_metadata'
  | 'missing_checksum'
  | 'totals_mismatch';

export type GavanDay1ApprovedArtifactAuditIssue = {
  code: GavanDay1ApprovedArtifactAuditIssueCode;
  snippetId?: string;
  detail: string;
};

export type GavanDay1ApprovedArtifactAuditSummary = {
  phraseExplanations: number;
  quizPrompts: number;
  quizNotes: number;
  totalRows: number;
  rowsWithExactText: number;
  rowsWithApprovalMetadata: number;
  rowsWithChecksum: number;
};

export type GavanDay1ApprovedArtifactAuditResult = {
  valid: boolean;
  issues: GavanDay1ApprovedArtifactAuditIssue[];
  summary: GavanDay1ApprovedArtifactAuditSummary;
};

export type GavanDay1GeneratedArtifactResult = {
  valid: boolean;
  issues: GavanDay1ApprovedReportArtifactIssue[];
  targetPath?: string;
  bytesWritten?: number;
  report: GavanDay1ApprovedExportReport;
  artifact: GavanDay1ApprovedReportArtifact;
  audit: GavanDay1ApprovedArtifactAuditResult;
};

function issue(
  code: GavanDay1ApprovedArtifactAuditIssueCode,
  detail: string,
  snippetId?: string,
): GavanDay1ApprovedArtifactAuditIssue {
  return { code, detail, snippetId };
}

function allRows(report: GavanDay1ApprovedExportReport): GavanDay1ApprovedExportReportRow[] {
  return [
    ...report.groups.phraseExplanations,
    ...report.groups.quizPrompts,
    ...report.groups.quizNotes,
  ];
}

function auditSummary(report: GavanDay1ApprovedExportReport): GavanDay1ApprovedArtifactAuditSummary {
  const rows = allRows(report);

  return {
    phraseExplanations: report.groups.phraseExplanations.length,
    quizPrompts: report.groups.quizPrompts.length,
    quizNotes: report.groups.quizNotes.length,
    totalRows: rows.length,
    rowsWithExactText: rows.filter((row) => row.exactText.trim().length > 0).length,
    rowsWithApprovalMetadata: rows.filter((row) =>
      row.reviewerId.trim().length > 0 && row.approvedAt.trim().length > 0,
    ).length,
    rowsWithChecksum: rows.filter((row) => row.textChecksum.trim().length > 0).length,
  };
}

export function buildCleanGavanDay1ApprovedReport(
  options: Pick<GavanDay1GeneratedArtifactOptions, 'reviewerId' | 'approvedAt'>,
): GavanDay1ApprovedExportReport {
  const fixture = buildGavanDay1ReviewerExportFixture();
  const approvalInput = buildGavanDay1ReviewerApprovalInput(fixture, {
    reviewerId: options.reviewerId,
    approvedAt: options.approvedAt,
  });
  const approvalResult = approveGavanDay1ReviewerExportFixture(fixture, approvalInput);

  if (!approvalResult.approvedExport) {
    throw new Error('Could not build approved Gavan day 1 export from valid fixture.');
  }

  return buildGavanDay1ApprovedExportReport(approvalResult.approvedExport);
}

export function auditGavanDay1ApprovedReportArtifact(
  artifact: GavanDay1ApprovedReportArtifact,
): GavanDay1ApprovedArtifactAuditResult {
  const issues: GavanDay1ApprovedArtifactAuditIssue[] = [];
  const report = artifact.report;
  const reportValidation = validateGavanDay1ApprovedExportReport(report);
  const summary = auditSummary(report);

  if (artifact.artifactKind !== 'gavan_day1_approved_report_artifact') {
    issues.push(issue(
      'invalid_artifact_kind',
      'Generated artifact must use the approved report artifact kind.',
    ));
  }

  if (!reportValidation.valid) {
    issues.push(issue(
      'invalid_report',
      'Generated artifact must contain a valid approved export report.',
    ));
  }

  if (report.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Generated artifact must stay outside live integration.',
    ));
  }

  for (const row of allRows(report)) {
    if (!row.exactText.trim()) {
      issues.push(issue('missing_exact_text', 'Every artifact row needs exact text.', row.snippetId));
    }
    if (!row.reviewerId.trim() || !row.approvedAt.trim()) {
      issues.push(issue(
        'missing_approval_metadata',
        'Every artifact row needs reviewer id and approval timestamp.',
        row.snippetId,
      ));
    }
    if (!row.textChecksum.trim()) {
      issues.push(issue('missing_checksum', 'Every artifact row needs a checksum.', row.snippetId));
    }
  }

  if (
    report.humanReviewTotals.phraseExplanations !== summary.phraseExplanations ||
    report.humanReviewTotals.quizPrompts !== summary.quizPrompts ||
    report.humanReviewTotals.quizNotes !== summary.quizNotes ||
    report.humanReviewTotals.totalApprovedRows !== summary.totalRows
  ) {
    issues.push(issue(
      'totals_mismatch',
      'Artifact audit totals must match report rows.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
    summary,
  };
}

export function generateGavanDay1ApprovedReportArtifact(
  options: GavanDay1GeneratedArtifactOptions,
): GavanDay1GeneratedArtifactResult {
  const report = buildCleanGavanDay1ApprovedReport({
    reviewerId: options.reviewerId,
    approvedAt: options.approvedAt,
  });
  const artifact = buildGavanDay1ApprovedReportArtifact(report, {
    generatedAt: options.generatedAt,
  });
  const audit = auditGavanDay1ApprovedReportArtifact(artifact);
  const writeResult = writeGavanDay1ApprovedReportArtifact(report, {
    targetPath: options.targetPath ?? GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH,
    generatedAt: options.generatedAt,
  });

  return {
    valid: writeResult.valid && audit.valid,
    issues: writeResult.issues,
    targetPath: writeResult.targetPath,
    bytesWritten: writeResult.bytesWritten,
    report,
    artifact,
    audit,
  };
}
