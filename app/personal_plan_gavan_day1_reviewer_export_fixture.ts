import {
  buildGavanDay1AuthoringBundle,
  type GavanDay1AuthoringBundleOptions,
} from './personal_plan_gavan_day1_authoring_bundle';
import {
  buildGavanDay1AuthoringDisplayModel,
  validateGavanDay1AuthoringDisplayModel,
  type GavanDay1AuthoringDisplayModel,
} from './personal_plan_gavan_day1_authoring_display_adapter';
import {
  buildGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';
import {
  buildGavanDay1QuizDraft,
  type GavanDay1QuizItemDraft,
} from './personal_plan_gavan_day1_quiz_draft';

export type GavanDay1ReviewerExportReviewStatus = 'needs_manual_review';

export type GavanDay1ReviewerExportPhraseExplanationSnippet = {
  id: string;
  kind: 'phrase_explanation';
  phraseId: string;
  english: string;
  russian: string;
  explanationTitle?: string;
  explanationBody: string;
  coveredTargets: string[];
  reviewStatus: GavanDay1ReviewerExportReviewStatus;
};

export type GavanDay1ReviewerExportQuizPromptSnippet = {
  id: string;
  kind: 'quiz_prompt';
  itemId: string;
  sourcePhraseId: string;
  prompt: string;
  reviewStatus: GavanDay1ReviewerExportReviewStatus;
};

export type GavanDay1ReviewerExportQuizNoteSnippet = {
  id: string;
  kind: 'quiz_note';
  itemId: string;
  sourcePhraseId: string;
  choiceId: string;
  choiceText: string;
  isCorrect: boolean;
  target: string;
  note: string;
  reviewStatus: GavanDay1ReviewerExportReviewStatus;
};

export type GavanDay1ReviewerExportFixture = {
  kind: 'gavan_day1_reviewer_export_fixture';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  display: GavanDay1AuthoringDisplayModel;
  releaseDecision: {
    canRelease: boolean;
    blockedSections: string[];
  };
  phraseExplanationSnippets: GavanDay1ReviewerExportPhraseExplanationSnippet[];
  quizPromptSnippets: GavanDay1ReviewerExportQuizPromptSnippet[];
  quizNoteSnippets: GavanDay1ReviewerExportQuizNoteSnippet[];
  summary: {
    displayCards: number;
    phraseExplanations: number;
    quizPrompts: number;
    quizNotes: number;
    snippetsNeedingManualReview: number;
    approvedSnippets: number;
  };
};

export type GavanDay1ReviewerExportFixtureIssueCode =
  | 'wrong_fixture_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'display_model_invalid'
  | 'release_decision_mismatch'
  | 'missing_review_snippet'
  | 'snippet_not_marked_for_manual_review'
  | 'unsafe_snippet_copy';

export type GavanDay1ReviewerExportFixtureIssue = {
  code: GavanDay1ReviewerExportFixtureIssueCode;
  snippetId?: string;
  detail: string;
};

export type GavanDay1ReviewerExportFixtureValidationResult = {
  valid: boolean;
  issues: GavanDay1ReviewerExportFixtureIssue[];
};

export type GavanDay1ReviewerExportFixtureOptions = {
  contentCandidate?: GavanDay1ContentCandidate;
  bundleOptions?: Omit<GavanDay1AuthoringBundleOptions, 'contentCandidate'>;
};

type ReviewSnippet =
  | GavanDay1ReviewerExportPhraseExplanationSnippet
  | GavanDay1ReviewerExportQuizPromptSnippet
  | GavanDay1ReviewerExportQuizNoteSnippet;

const REVIEW_STATUS: GavanDay1ReviewerExportReviewStatus = 'needs_manual_review';
const UNSAFE_SNIPPET_COPY_RE =
  /[\u00d0\u00d1\u00c2\u00e2\ufffd]|DEV|debug|draft|placeholder|TODO|sourcePhraseId|contentUnit|renderer|selected option|you chose|selected (?:choice|option|answer)/i;
const REPETITIVE_CONFIRMATION_RE = /^Да[:.,\s]/i;

function issue(
  code: GavanDay1ReviewerExportFixtureIssueCode,
  detail: string,
  snippetId?: string,
): GavanDay1ReviewerExportFixtureIssue {
  return { code, detail, snippetId };
}

function phraseExplanationSnippets(
  candidate: GavanDay1ContentCandidate,
): GavanDay1ReviewerExportPhraseExplanationSnippet[] {
  return candidate.phrases.flatMap((phrase) =>
    (phrase.explanations ?? []).map((explanation, index) => ({
      id: `phrase:${phrase.id}:explanation-${index + 1}`,
      kind: 'phrase_explanation' as const,
      phraseId: phrase.id,
      english: phrase.english,
      russian: phrase.russian,
      explanationTitle: explanation.title,
      explanationBody: explanation.body,
      coveredTargets: [...(explanation.covers ?? [])],
      reviewStatus: REVIEW_STATUS,
    })),
  );
}

function quizPromptSnippets(
  items: GavanDay1QuizItemDraft[],
): GavanDay1ReviewerExportQuizPromptSnippet[] {
  return items.map((item) => ({
    id: `quiz:${item.id}:prompt`,
    kind: 'quiz_prompt' as const,
    itemId: item.id,
    sourcePhraseId: item.sourcePhraseId,
    prompt: item.prompt,
    reviewStatus: REVIEW_STATUS,
  }));
}

function quizNoteSnippets(
  items: GavanDay1QuizItemDraft[],
): GavanDay1ReviewerExportQuizNoteSnippet[] {
  return items.flatMap((item) =>
    item.choices.map((choice) => ({
      id: `quiz:${item.id}:${choice.id}:note`,
      kind: 'quiz_note' as const,
      itemId: item.id,
      sourcePhraseId: item.sourcePhraseId,
      choiceId: choice.id,
      choiceText: choice.text,
      isCorrect: choice.isCorrect,
      target: choice.explanationRequirement?.target ?? '',
      note: choice.explanationRequirement?.note ?? '',
      reviewStatus: REVIEW_STATUS,
    })),
  );
}

function allReviewSnippets(fixture: GavanDay1ReviewerExportFixture): ReviewSnippet[] {
  return [
    ...fixture.phraseExplanationSnippets,
    ...fixture.quizPromptSnippets,
    ...fixture.quizNoteSnippets,
  ];
}

function snippetVisibleText(snippet: ReviewSnippet): string {
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

export function buildGavanDay1ReviewerExportFixture(
  options: GavanDay1ReviewerExportFixtureOptions = {},
): GavanDay1ReviewerExportFixture {
  const contentCandidate = options.contentCandidate ?? buildGavanDay1ContentCandidate();
  const bundle = buildGavanDay1AuthoringBundle({
    ...options.bundleOptions,
    contentCandidate,
  });
  const display = buildGavanDay1AuthoringDisplayModel(bundle);
  const quiz = buildGavanDay1QuizDraft({ contentCandidate });
  const phraseSnippets = phraseExplanationSnippets(contentCandidate);
  const promptSnippets = quizPromptSnippets(quiz.items);
  const noteSnippets = quizNoteSnippets(quiz.items);
  const snippetsNeedingManualReview =
    phraseSnippets.length + promptSnippets.length + noteSnippets.length;

  return {
    kind: 'gavan_day1_reviewer_export_fixture',
    dayId: 'gavan-week1-day1',
    liveIntegration: false,
    display,
    releaseDecision: {
      canRelease: display.summary.canRelease,
      blockedSections: [...display.summary.blockedSections],
    },
    phraseExplanationSnippets: phraseSnippets,
    quizPromptSnippets: promptSnippets,
    quizNoteSnippets: noteSnippets,
    summary: {
      displayCards: display.cards.length,
      phraseExplanations: phraseSnippets.length,
      quizPrompts: promptSnippets.length,
      quizNotes: noteSnippets.length,
      snippetsNeedingManualReview,
      approvedSnippets: 0,
    },
  };
}

export function validateGavanDay1ReviewerExportFixture(
  fixture: GavanDay1ReviewerExportFixture,
): GavanDay1ReviewerExportFixtureValidationResult {
  const issues: GavanDay1ReviewerExportFixtureIssue[] = [];

  if (fixture.kind !== 'gavan_day1_reviewer_export_fixture') {
    issues.push(issue(
      'wrong_fixture_kind',
      'Reviewer export fixture must use the expected kind.',
    ));
  }

  if (fixture.dayId !== 'gavan-week1-day1') {
    issues.push(issue('wrong_day_id', 'Reviewer export fixture must describe Gavan day 1.'));
  }

  if (fixture.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Reviewer export fixture must stay outside live integration.',
    ));
  }

  const displayValidation = validateGavanDay1AuthoringDisplayModel(fixture.display);
  if (!displayValidation.valid) {
    issues.push(issue(
      'display_model_invalid',
      'Reviewer export fixture must include a valid authoring display model.',
    ));
  }

  if (
    fixture.releaseDecision.canRelease !== fixture.display.summary.canRelease ||
    fixture.releaseDecision.blockedSections.join('|') !==
      fixture.display.summary.blockedSections.join('|')
  ) {
    issues.push(issue(
      'release_decision_mismatch',
      'Release decision must mirror the display model summary.',
    ));
  }

  const snippets = allReviewSnippets(fixture);
  if (snippets.length === 0) {
    issues.push(issue(
      'missing_review_snippet',
      'Reviewer export fixture must expose snippets for manual review.',
    ));
  }

  for (const snippet of snippets) {
    if (snippet.reviewStatus !== REVIEW_STATUS) {
      issues.push(issue(
        'snippet_not_marked_for_manual_review',
        'Every reviewer snippet must stay pending manual review.',
        snippet.id,
      ));
    }

    const visibleText = snippetVisibleText(snippet);
    if (
      UNSAFE_SNIPPET_COPY_RE.test(visibleText) ||
      REPETITIVE_CONFIRMATION_RE.test(visibleText)
    ) {
      issues.push(issue(
        'unsafe_snippet_copy',
        'Reviewer snippets cannot contain corrupted copy, developer wording, or fake runtime context.',
        snippet.id,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
