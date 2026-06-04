import type {
  GavanDay1ApprovedExportReportRow,
  GavanDay1ApprovedExportReportRowGroup,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import type {
  GavanDay1ApprovedReportArtifact,
} from './personal_plan_gavan_day1_approved_report_artifact';

export type GavanDay1ArtifactCopyAuditIssueCode =
  | 'invalid_artifact_shape'
  | 'wrong_row_counts'
  | 'non_approved_row'
  | 'mojibake_marker'
  | 'developer_or_robotic_copy'
  | 'fake_selected_answer_context'
  | 'repetitive_formula_start'
  | 'phrase_explanation_too_short'
  | 'quiz_note_too_short'
  | 'technical_target_tail';

export type GavanDay1ArtifactCopyAuditIssue = {
  code: GavanDay1ArtifactCopyAuditIssueCode;
  group?: GavanDay1ApprovedExportReportRowGroup;
  snippetId?: string;
  excerpt: string;
  detail: string;
};

export type GavanDay1ArtifactCopyAuditSummary = {
  totalRows: number;
  rowGroups: Record<GavanDay1ApprovedExportReportRowGroup, number>;
  checkedRows: number;
};

export type GavanDay1ArtifactCopyAuditResult = {
  valid: boolean;
  issues: GavanDay1ArtifactCopyAuditIssue[];
  summary: GavanDay1ArtifactCopyAuditSummary;
};

const EXPECTED_ROW_GROUPS: Record<GavanDay1ApprovedExportReportRowGroup, number> = {
  phrase_explanations: 5,
  quiz_prompts: 10,
  quiz_notes: 30,
};

const MIN_PHRASE_EXPLANATION_CHARS = 80;
const MIN_QUIZ_NOTE_CHARS = 40;
const EXCERPT_LIMIT = 140;

const MOJIBAKE_MARKER_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;
const DEVELOPER_OR_ROBOTIC_COPY_RE =
  /\b(DEV|debug|draft|placeholder|TODO|renderer|contentUnit|sourcePhraseId|technical access|selected option)\b/i;
const FAKE_SELECTED_ANSWER_CONTEXT_RE =
  /\b(you chose|selected (?:choice|option|answer)|\u0442\u044b \u0432\u044b\u0431\u0440\u0430\u043b|\u0432\u044b \u0432\u044b\u0431\u0440\u0430\u043b\u0438|\u0442\u044b \u043d\u0430\u0436\u0430\u043b|\u0432\u044b \u043d\u0430\u0436\u0430\u043b\u0438)\b/i;
const REPETITIVE_FORMULA_START_RE = /^(?:\u0434\u0430|yes)[:.,\s]/i;
const TECHNICAL_TARGET_TAIL_RE = /\s(?:[A-Za-z][A-Za-z']*\s){1,5}[A-Za-z][A-Za-z']*$/;

function excerpt(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= EXCERPT_LIMIT
    ? compact
    : `${compact.slice(0, EXCERPT_LIMIT - 3)}...`;
}

function issue(
  code: GavanDay1ArtifactCopyAuditIssueCode,
  detail: string,
  row?: GavanDay1ApprovedExportReportRow,
): GavanDay1ArtifactCopyAuditIssue {
  return {
    code,
    group: row?.group,
    snippetId: row?.snippetId,
    excerpt: excerpt(row?.exactText ?? ''),
    detail,
  };
}

function allRows(artifact: GavanDay1ApprovedReportArtifact): GavanDay1ApprovedExportReportRow[] {
  return [
    ...artifact.report.groups.phraseExplanations,
    ...artifact.report.groups.quizPrompts,
    ...artifact.report.groups.quizNotes,
  ];
}

function summaryFor(artifact: GavanDay1ApprovedReportArtifact): GavanDay1ArtifactCopyAuditSummary {
  const rowGroups = {
    phrase_explanations: artifact.report.groups.phraseExplanations.length,
    quiz_prompts: artifact.report.groups.quizPrompts.length,
    quiz_notes: artifact.report.groups.quizNotes.length,
  };

  return {
    totalRows: rowGroups.phrase_explanations + rowGroups.quiz_prompts + rowGroups.quiz_notes,
    rowGroups,
    checkedRows: 0,
  };
}

function hasWrongCounts(summary: GavanDay1ArtifactCopyAuditSummary): boolean {
  return (
    summary.rowGroups.phrase_explanations !== EXPECTED_ROW_GROUPS.phrase_explanations ||
    summary.rowGroups.quiz_prompts !== EXPECTED_ROW_GROUPS.quiz_prompts ||
    summary.rowGroups.quiz_notes !== EXPECTED_ROW_GROUPS.quiz_notes
  );
}

function auditRow(row: GavanDay1ApprovedExportReportRow): GavanDay1ArtifactCopyAuditIssue[] {
  const issues: GavanDay1ArtifactCopyAuditIssue[] = [];
  const text = row.exactText.trim();

  if ((row.reviewStatus as string) !== 'approved') {
    issues.push(issue(
      'non_approved_row',
      'Approved artifact copy audit can only review approved rows.',
      row,
    ));
  }

  if (MOJIBAKE_MARKER_RE.test(text)) {
    issues.push(issue(
      'mojibake_marker',
      'Learner-facing copy cannot contain mojibake or replacement characters.',
      row,
    ));
  }

  if (DEVELOPER_OR_ROBOTIC_COPY_RE.test(text)) {
    issues.push(issue(
      'developer_or_robotic_copy',
      'Learner-facing copy cannot contain developer, placeholder, or internal-system wording.',
      row,
    ));
  }

  if (FAKE_SELECTED_ANSWER_CONTEXT_RE.test(text)) {
    issues.push(issue(
      'fake_selected_answer_context',
      'Static explanations cannot pretend to know what wrong answer the learner selected.',
      row,
    ));
  }

  if (REPETITIVE_FORMULA_START_RE.test(text)) {
    issues.push(issue(
      'repetitive_formula_start',
      'Explanations should not start with a repetitive confirmation formula.',
      row,
    ));
  }

  if (row.group === 'phrase_explanations') {
    if (text.length < MIN_PHRASE_EXPLANATION_CHARS) {
      issues.push(issue(
        'phrase_explanation_too_short',
        'Phrase explanation must be long enough to teach meaning and usage.',
        row,
      ));
    }

    if (TECHNICAL_TARGET_TAIL_RE.test(text)) {
      issues.push(issue(
        'technical_target_tail',
        'Phrase exactText appears to include technical covered-target words at the end.',
        row,
      ));
    }
  }

  if (row.group === 'quiz_notes' && text.length < MIN_QUIZ_NOTE_CHARS) {
    issues.push(issue(
      'quiz_note_too_short',
      'Quiz note must give enough context to help after an answer.',
      row,
    ));
  }

  return issues;
}

export function auditGavanDay1ApprovedArtifactCopy(
  artifact: GavanDay1ApprovedReportArtifact,
): GavanDay1ArtifactCopyAuditResult {
  const issues: GavanDay1ArtifactCopyAuditIssue[] = [];
  const summary = summaryFor(artifact);

  if (
    artifact.artifactKind !== 'gavan_day1_approved_report_artifact' ||
    artifact.report.kind !== 'gavan_day1_approved_export_report' ||
    artifact.report.dayId !== 'gavan-week1-day1' ||
    artifact.report.liveIntegration !== false
  ) {
    issues.push(issue(
      'invalid_artifact_shape',
      'Copy audit requires a non-live Gavan day 1 approved report artifact.',
    ));
  }

  if (hasWrongCounts(summary)) {
    issues.push(issue(
      'wrong_row_counts',
      'Copy audit requires 5 phrase explanations, 10 quiz prompts, and 30 quiz notes.',
    ));
  }

  const rows = allRows(artifact);
  for (const row of rows) {
    issues.push(...auditRow(row));
  }
  summary.checkedRows = rows.length;

  return {
    valid: issues.length === 0,
    issues,
    summary,
  };
}
