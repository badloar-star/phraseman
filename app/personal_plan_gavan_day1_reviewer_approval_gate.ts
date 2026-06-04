import {
  validateGavanDay1ReviewerExportFixture,
  type GavanDay1ReviewerExportFixture,
  type GavanDay1ReviewerExportPhraseExplanationSnippet,
  type GavanDay1ReviewerExportQuizNoteSnippet,
  type GavanDay1ReviewerExportQuizPromptSnippet,
} from './personal_plan_gavan_day1_reviewer_export_fixture';

type ReviewerSnippet =
  | GavanDay1ReviewerExportPhraseExplanationSnippet
  | GavanDay1ReviewerExportQuizPromptSnippet
  | GavanDay1ReviewerExportQuizNoteSnippet;

type ReviewerSnippetKind = ReviewerSnippet['kind'];

export type GavanDay1ReviewerApprovalRecord = {
  kind: 'gavan_day1_reviewer_approval_record';
  snippetKind: ReviewerSnippetKind;
  snippetId: string;
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanDay1ReviewerApprovalInput = {
  kind: 'gavan_day1_reviewer_approval_input';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  approvals: GavanDay1ReviewerApprovalRecord[];
};

export type GavanDay1ReviewerApprovalInputOptions = {
  reviewerId: string;
  approvedAt: string;
};

type ApprovalMetadata = {
  reviewerId: string;
  approvedAt: string;
  textChecksum: string;
};

export type GavanDay1ApprovedPhraseExplanationSnippet =
  Omit<GavanDay1ReviewerExportPhraseExplanationSnippet, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

export type GavanDay1ApprovedQuizPromptSnippet =
  Omit<GavanDay1ReviewerExportQuizPromptSnippet, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

export type GavanDay1ApprovedQuizNoteSnippet =
  Omit<GavanDay1ReviewerExportQuizNoteSnippet, 'reviewStatus'> & {
    reviewStatus: 'approved';
    approval: ApprovalMetadata;
  };

type ApprovedReviewerSnippet =
  | GavanDay1ApprovedPhraseExplanationSnippet
  | GavanDay1ApprovedQuizPromptSnippet
  | GavanDay1ApprovedQuizNoteSnippet;

export type GavanDay1ApprovedReviewerExport = {
  kind: 'gavan_day1_approved_reviewer_export';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  display: GavanDay1ReviewerExportFixture['display'];
  releaseDecision: GavanDay1ReviewerExportFixture['releaseDecision'];
  phraseExplanationSnippets: GavanDay1ApprovedPhraseExplanationSnippet[];
  quizPromptSnippets: GavanDay1ApprovedQuizPromptSnippet[];
  quizNoteSnippets: GavanDay1ApprovedQuizNoteSnippet[];
  summary: GavanDay1ReviewerApprovalSummary;
};

export type GavanDay1ReviewerApprovalSummary = {
  phraseExplanations: number;
  quizPrompts: number;
  quizNotes: number;
  totalApproved: number;
};

export type GavanDay1ReviewerApprovalIssueCode =
  | 'wrong_approval_input_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'reviewer_export_fixture_invalid'
  | 'missing_approval_record'
  | 'duplicate_approval_record'
  | 'unknown_snippet_id'
  | 'missing_reviewer_id'
  | 'invalid_approved_at'
  | 'snippet_kind_mismatch'
  | 'text_checksum_mismatch'
  | 'approved_export_contains_pending_snippet'
  | 'approved_export_missing_approval'
  | 'approved_export_checksum_mismatch';

export type GavanDay1ReviewerApprovalIssue = {
  code: GavanDay1ReviewerApprovalIssueCode;
  snippetId?: string;
  detail: string;
};

export type GavanDay1ReviewerApprovalGateResult = {
  valid: boolean;
  issues: GavanDay1ReviewerApprovalIssue[];
  summary: GavanDay1ReviewerApprovalSummary;
};

export type GavanDay1ReviewerApprovalResult =
  GavanDay1ReviewerApprovalGateResult & {
    approvedExport?: GavanDay1ApprovedReviewerExport;
  };

const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function issue(
  code: GavanDay1ReviewerApprovalIssueCode,
  detail: string,
  snippetId?: string,
): GavanDay1ReviewerApprovalIssue {
  return { code, detail, snippetId };
}

function allFixtureSnippets(fixture: GavanDay1ReviewerExportFixture): ReviewerSnippet[] {
  return [
    ...fixture.phraseExplanationSnippets,
    ...fixture.quizPromptSnippets,
    ...fixture.quizNoteSnippets,
  ];
}

function allApprovedSnippets(exported: GavanDay1ApprovedReviewerExport): ApprovedReviewerSnippet[] {
  return [
    ...exported.phraseExplanationSnippets,
    ...exported.quizPromptSnippets,
    ...exported.quizNoteSnippets,
  ];
}

function snippetVisibleText(snippet: ReviewerSnippet | ApprovedReviewerSnippet): string {
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

function isIsoTimestamp(value: string): boolean {
  if (!ISO_TIMESTAMP_RE.test(value)) {
    return false;
  }

  return new Date(value).toISOString() === value;
}

function emptySummary(): GavanDay1ReviewerApprovalSummary {
  return {
    phraseExplanations: 0,
    quizPrompts: 0,
    quizNotes: 0,
    totalApproved: 0,
  };
}

function summaryFromRecords(
  records: GavanDay1ReviewerApprovalRecord[],
): GavanDay1ReviewerApprovalSummary {
  const summary = emptySummary();
  const counted = new Set<string>();

  for (const record of records) {
    if (counted.has(record.snippetId)) {
      continue;
    }
    counted.add(record.snippetId);

    if (record.snippetKind === 'phrase_explanation') {
      summary.phraseExplanations += 1;
    } else if (record.snippetKind === 'quiz_prompt') {
      summary.quizPrompts += 1;
    } else if (record.snippetKind === 'quiz_note') {
      summary.quizNotes += 1;
    }
  }

  summary.totalApproved =
    summary.phraseExplanations + summary.quizPrompts + summary.quizNotes;
  return summary;
}

function approvalBySnippetId(
  approvals: GavanDay1ReviewerApprovalRecord[],
): Map<string, GavanDay1ReviewerApprovalRecord> {
  const byId = new Map<string, GavanDay1ReviewerApprovalRecord>();
  for (const record of approvals) {
    if (!byId.has(record.snippetId)) {
      byId.set(record.snippetId, record);
    }
  }
  return byId;
}

export function checksumGavanDay1ReviewerSnippet(
  snippet: ReviewerSnippet | ApprovedReviewerSnippet,
): string {
  return fnv1a(`${snippet.kind}|${snippet.id}|${snippetVisibleText(snippet)}`);
}

export function buildGavanDay1ReviewerApprovalInput(
  fixture: GavanDay1ReviewerExportFixture,
  options: GavanDay1ReviewerApprovalInputOptions,
): GavanDay1ReviewerApprovalInput {
  return {
    kind: 'gavan_day1_reviewer_approval_input',
    dayId: fixture.dayId,
    liveIntegration: false,
    approvals: allFixtureSnippets(fixture).map((snippet) => ({
      kind: 'gavan_day1_reviewer_approval_record',
      snippetKind: snippet.kind,
      snippetId: snippet.id,
      reviewerId: options.reviewerId,
      approvedAt: options.approvedAt,
      textChecksum: checksumGavanDay1ReviewerSnippet(snippet),
    })),
  };
}

export function validateGavanDay1ReviewerApprovalGate(
  fixture: GavanDay1ReviewerExportFixture,
  input: GavanDay1ReviewerApprovalInput,
): GavanDay1ReviewerApprovalGateResult {
  const issues: GavanDay1ReviewerApprovalIssue[] = [];
  const fixtureValidation = validateGavanDay1ReviewerExportFixture(fixture);
  const snippets = allFixtureSnippets(fixture);
  const snippetById = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const seenApprovalIds = new Set<string>();
  const validApprovalRecords: GavanDay1ReviewerApprovalRecord[] = [];

  if (input.kind !== 'gavan_day1_reviewer_approval_input') {
    issues.push(issue(
      'wrong_approval_input_kind',
      'Approval input must use the expected kind.',
    ));
  }

  if (input.dayId !== fixture.dayId) {
    issues.push(issue('wrong_day_id', 'Approval input must describe the same day as the fixture.'));
  }

  if (input.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Approval gate must stay outside live integration.',
    ));
  }

  if (!fixtureValidation.valid) {
    issues.push(issue(
      'reviewer_export_fixture_invalid',
      'Approval gate requires a valid reviewer export fixture.',
    ));
  }

  for (const record of input.approvals) {
    const snippet = snippetById.get(record.snippetId);

    if (seenApprovalIds.has(record.snippetId)) {
      issues.push(issue(
        'duplicate_approval_record',
        'Each snippet can have only one approval record in this gate.',
        record.snippetId,
      ));
    }
    seenApprovalIds.add(record.snippetId);

    if (!record.reviewerId.trim()) {
      issues.push(issue(
        'missing_reviewer_id',
        'Approval record must include a reviewer id.',
        record.snippetId,
      ));
    }

    if (!isIsoTimestamp(record.approvedAt)) {
      issues.push(issue(
        'invalid_approved_at',
        'Approval record must include an ISO timestamp with milliseconds and Z timezone.',
        record.snippetId,
      ));
    }

    if (!snippet) {
      issues.push(issue(
        'unknown_snippet_id',
        'Approval record references a snippet that does not exist in the fixture.',
        record.snippetId,
      ));
      continue;
    }

    if (record.snippetKind !== snippet.kind) {
      issues.push(issue(
        'snippet_kind_mismatch',
        'Approval record snippet kind must match the fixture snippet.',
        record.snippetId,
      ));
    }

    if (record.textChecksum !== checksumGavanDay1ReviewerSnippet(snippet)) {
      issues.push(issue(
        'text_checksum_mismatch',
        'Approval record checksum must match the current snippet text.',
        record.snippetId,
      ));
    }

    validApprovalRecords.push(record);
  }

  for (const snippet of snippets) {
    if (!seenApprovalIds.has(snippet.id)) {
      issues.push(issue(
        'missing_approval_record',
        'Every reviewer snippet needs an explicit approval record.',
        snippet.id,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: summaryFromRecords(
      issues.length === 0 ? validApprovalRecords : input.approvals.filter((record) =>
        snippetById.has(record.snippetId),
      ),
    ),
  };
}

function approvalMetadata(record: GavanDay1ReviewerApprovalRecord): ApprovalMetadata {
  return {
    reviewerId: record.reviewerId,
    approvedAt: record.approvedAt,
    textChecksum: record.textChecksum,
  };
}

function approvePhraseSnippet(
  snippet: GavanDay1ReviewerExportPhraseExplanationSnippet,
  record: GavanDay1ReviewerApprovalRecord,
): GavanDay1ApprovedPhraseExplanationSnippet {
  return {
    ...snippet,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

function approvePromptSnippet(
  snippet: GavanDay1ReviewerExportQuizPromptSnippet,
  record: GavanDay1ReviewerApprovalRecord,
): GavanDay1ApprovedQuizPromptSnippet {
  return {
    ...snippet,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

function approveNoteSnippet(
  snippet: GavanDay1ReviewerExportQuizNoteSnippet,
  record: GavanDay1ReviewerApprovalRecord,
): GavanDay1ApprovedQuizNoteSnippet {
  return {
    ...snippet,
    reviewStatus: 'approved',
    approval: approvalMetadata(record),
  };
}

export function approveGavanDay1ReviewerExportFixture(
  fixture: GavanDay1ReviewerExportFixture,
  input: GavanDay1ReviewerApprovalInput,
): GavanDay1ReviewerApprovalResult {
  const gate = validateGavanDay1ReviewerApprovalGate(fixture, input);
  if (!gate.valid) {
    return gate;
  }

  const approvals = approvalBySnippetId(input.approvals);

  const approvedExport: GavanDay1ApprovedReviewerExport = {
    kind: 'gavan_day1_approved_reviewer_export',
    dayId: fixture.dayId,
    liveIntegration: false,
    display: fixture.display,
    releaseDecision: fixture.releaseDecision,
    phraseExplanationSnippets: fixture.phraseExplanationSnippets.map((snippet) =>
      approvePhraseSnippet(snippet, approvals.get(snippet.id)!),
    ),
    quizPromptSnippets: fixture.quizPromptSnippets.map((snippet) =>
      approvePromptSnippet(snippet, approvals.get(snippet.id)!),
    ),
    quizNoteSnippets: fixture.quizNoteSnippets.map((snippet) =>
      approveNoteSnippet(snippet, approvals.get(snippet.id)!),
    ),
    summary: gate.summary,
  };

  return {
    ...gate,
    approvedExport,
  };
}

export function validateGavanDay1ApprovedReviewerExport(
  exported: GavanDay1ApprovedReviewerExport,
): GavanDay1ReviewerApprovalGateResult {
  const issues: GavanDay1ReviewerApprovalIssue[] = [];
  const snippets = allApprovedSnippets(exported);

  if (exported.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Approved reviewer export must stay outside live integration.',
    ));
  }

  for (const snippet of snippets) {
    if (snippet.reviewStatus !== 'approved') {
      issues.push(issue(
        'approved_export_contains_pending_snippet',
        'Approved reviewer export cannot contain pending snippets.',
        snippet.id,
      ));
    }

    if (!snippet.approval) {
      issues.push(issue(
        'approved_export_missing_approval',
        'Approved reviewer export snippets must carry approval metadata.',
        snippet.id,
      ));
      continue;
    }

    if (snippet.approval.textChecksum !== checksumGavanDay1ReviewerSnippet(snippet)) {
      issues.push(issue(
        'approved_export_checksum_mismatch',
        'Approved reviewer export checksum must match the approved snippet text.',
        snippet.id,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      phraseExplanations: exported.phraseExplanationSnippets.length,
      quizPrompts: exported.quizPromptSnippets.length,
      quizNotes: exported.quizNoteSnippets.length,
      totalApproved: snippets.length,
    },
  };
}
