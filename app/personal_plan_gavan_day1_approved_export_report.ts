import {
  validateGavanDay1ApprovedReviewerExport,
  type GavanDay1ApprovedPhraseExplanationSnippet,
  type GavanDay1ApprovedQuizNoteSnippet,
  type GavanDay1ApprovedQuizPromptSnippet,
  type GavanDay1ApprovedReviewerExport,
} from './personal_plan_gavan_day1_reviewer_approval_gate';

type ApprovedSnippet =
  | GavanDay1ApprovedPhraseExplanationSnippet
  | GavanDay1ApprovedQuizPromptSnippet
  | GavanDay1ApprovedQuizNoteSnippet;

export type GavanDay1ApprovedExportReportRowGroup =
  | 'phrase_explanations'
  | 'quiz_prompts'
  | 'quiz_notes';

export type GavanDay1ApprovedExportReportRow = {
  group: GavanDay1ApprovedExportReportRowGroup;
  snippetKind: ApprovedSnippet['kind'];
  snippetId: string;
  reviewStatus: 'approved';
  exactText: string;
  coveredTargets?: string[];
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanDay1ApprovedExportDisplayCardSummary = {
  total: number;
  ready: number;
  planned: number;
  blocked: number;
  cards: Array<{
    id: string;
    label: string;
    status: string;
    countSummary: string;
    issueCodes: string[];
  }>;
};

export type GavanDay1ApprovedExportReport = {
  kind: 'gavan_day1_approved_export_report';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  releaseDecision: GavanDay1ApprovedReviewerExport['releaseDecision'];
  displayCardSummary: GavanDay1ApprovedExportDisplayCardSummary;
  groups: {
    phraseExplanations: GavanDay1ApprovedExportReportRow[];
    quizPrompts: GavanDay1ApprovedExportReportRow[];
    quizNotes: GavanDay1ApprovedExportReportRow[];
  };
  humanReviewTotals: {
    displayCards: number;
    phraseExplanations: number;
    quizPrompts: number;
    quizNotes: number;
    totalApprovedRows: number;
  };
};

export type GavanDay1ApprovedExportReportIssueCode =
  | 'wrong_report_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'source_export_invalid'
  | 'missing_report_row'
  | 'pending_snippet_in_approved_report'
  | 'missing_approval_metadata'
  | 'checksum_mismatch'
  | 'human_review_totals_mismatch';

export type GavanDay1ApprovedExportReportIssue = {
  code: GavanDay1ApprovedExportReportIssueCode;
  snippetId?: string;
  detail: string;
};

export type GavanDay1ApprovedExportReportValidationResult = {
  valid: boolean;
  issues: GavanDay1ApprovedExportReportIssue[];
};

function issue(
  code: GavanDay1ApprovedExportReportIssueCode,
  detail: string,
  snippetId?: string,
): GavanDay1ApprovedExportReportIssue {
  return { code, detail, snippetId };
}

function approvedSnippetText(snippet: ApprovedSnippet): string {
  if (snippet.kind === 'phrase_explanation') {
    return [
      snippet.english,
      snippet.russian,
      snippet.explanationTitle ?? '',
      snippet.explanationBody,
    ].join(' ');
  }

  if (snippet.kind === 'quiz_prompt') {
    return snippet.prompt;
  }

  return [
    snippet.choiceText,
    snippet.target,
    snippet.note,
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

function checksumReportRow(row: GavanDay1ApprovedExportReportRow): string {
  return fnv1a(`${row.snippetKind}|${row.snippetId}|${row.exactText}`);
}

function row(
  group: GavanDay1ApprovedExportReportRowGroup,
  snippet: ApprovedSnippet,
): GavanDay1ApprovedExportReportRow {
  const reportRow: GavanDay1ApprovedExportReportRow = {
    group,
    snippetKind: snippet.kind,
    snippetId: snippet.id,
    reviewStatus: snippet.reviewStatus,
    exactText: approvedSnippetText(snippet),
    reviewerId: snippet.approval.reviewerId,
    approvedAt: snippet.approval.approvedAt,
    textChecksum: snippet.approval.textChecksum,
  };

  if (snippet.kind === 'phrase_explanation') {
    reportRow.coveredTargets = [...snippet.coveredTargets];
  }

  return reportRow;
}

function displayCardSummary(
  exported: GavanDay1ApprovedReviewerExport,
): GavanDay1ApprovedExportDisplayCardSummary {
  const cards = exported.display.cards.map((card) => ({
    id: card.id,
    label: card.label,
    status: card.status,
    countSummary: card.countSummary,
    issueCodes: [...card.issueCodes],
  }));

  return {
    total: cards.length,
    ready: cards.filter((card) => card.status === 'ready').length,
    planned: cards.filter((card) => card.status === 'planned').length,
    blocked: cards.filter((card) => card.status === 'blocked').length,
    cards,
  };
}

function allRows(report: GavanDay1ApprovedExportReport): GavanDay1ApprovedExportReportRow[] {
  return [
    ...report.groups.phraseExplanations,
    ...report.groups.quizPrompts,
    ...report.groups.quizNotes,
  ];
}

function expectedTotals(report: GavanDay1ApprovedExportReport) {
  return {
    displayCards: report.displayCardSummary.cards.length,
    phraseExplanations: report.groups.phraseExplanations.length,
    quizPrompts: report.groups.quizPrompts.length,
    quizNotes: report.groups.quizNotes.length,
    totalApprovedRows: allRows(report).length,
  };
}

export function buildGavanDay1ApprovedExportReport(
  exported: GavanDay1ApprovedReviewerExport,
): GavanDay1ApprovedExportReport {
  const groups = {
    phraseExplanations: exported.phraseExplanationSnippets.map((snippet) =>
      row('phrase_explanations', snippet),
    ),
    quizPrompts: exported.quizPromptSnippets.map((snippet) =>
      row('quiz_prompts', snippet),
    ),
    quizNotes: exported.quizNoteSnippets.map((snippet) =>
      row('quiz_notes', snippet),
    ),
  };
  const report: GavanDay1ApprovedExportReport = {
    kind: 'gavan_day1_approved_export_report',
    dayId: exported.dayId,
    liveIntegration: false,
    releaseDecision: exported.releaseDecision,
    displayCardSummary: displayCardSummary(exported),
    groups,
    humanReviewTotals: {
      displayCards: exported.display.cards.length,
      phraseExplanations: groups.phraseExplanations.length,
      quizPrompts: groups.quizPrompts.length,
      quizNotes: groups.quizNotes.length,
      totalApprovedRows:
        groups.phraseExplanations.length + groups.quizPrompts.length + groups.quizNotes.length,
    },
  };

  return report;
}

export function validateGavanDay1ApprovedExportReport(
  report: GavanDay1ApprovedExportReport,
): GavanDay1ApprovedExportReportValidationResult {
  const issues: GavanDay1ApprovedExportReportIssue[] = [];
  const rows = allRows(report);

  if (report.kind !== 'gavan_day1_approved_export_report') {
    issues.push(issue('wrong_report_kind', 'Approved export report must use the expected kind.'));
  }

  if (report.dayId !== 'gavan-week1-day1') {
    issues.push(issue('wrong_day_id', 'Approved export report must describe Gavan day 1.'));
  }

  if (report.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Approved export report must stay outside live integration.',
    ));
  }

  if (rows.length === 0) {
    issues.push(issue('missing_report_row', 'Approved export report must include snippet rows.'));
  }

  for (const currentRow of rows) {
    if (currentRow.reviewStatus !== 'approved') {
      issues.push(issue(
        'pending_snippet_in_approved_report',
        'Approved export report cannot contain pending snippets.',
        currentRow.snippetId,
      ));
    }

    if (
      !currentRow.reviewerId.trim() ||
      !currentRow.approvedAt.trim() ||
      !currentRow.textChecksum.trim()
    ) {
      issues.push(issue(
        'missing_approval_metadata',
        'Every approved report row needs reviewer id, approval timestamp, and checksum.',
        currentRow.snippetId,
      ));
    }

    if (currentRow.textChecksum !== checksumReportRow(currentRow)) {
      issues.push(issue(
        'checksum_mismatch',
        'Approved report row checksum must match snippet kind, id, and exact text.',
        currentRow.snippetId,
      ));
    }
  }

  const totals = expectedTotals(report);
  if (
    report.humanReviewTotals.displayCards !== totals.displayCards ||
    report.humanReviewTotals.phraseExplanations !== totals.phraseExplanations ||
    report.humanReviewTotals.quizPrompts !== totals.quizPrompts ||
    report.humanReviewTotals.quizNotes !== totals.quizNotes ||
    report.humanReviewTotals.totalApprovedRows !== totals.totalApprovedRows
  ) {
    issues.push(issue(
      'human_review_totals_mismatch',
      'Human review totals must match report rows and display cards.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateGavanDay1ApprovedExportReportSource(
  exported: GavanDay1ApprovedReviewerExport,
): GavanDay1ApprovedExportReportValidationResult {
  const sourceValidation = validateGavanDay1ApprovedReviewerExport(exported);
  if (sourceValidation.valid) {
    return { valid: true, issues: [] };
  }

  return {
    valid: false,
    issues: sourceValidation.issues.map((sourceIssue) => issue(
      'source_export_invalid',
      sourceIssue.detail,
      sourceIssue.snippetId,
    )),
  };
}
