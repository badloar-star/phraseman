export type PersonalPlanContentQualityIssueCode =
  | 'empty_phrase'
  | 'robotic_or_developer_copy'
  | 'corrupted_copy'
  | 'too_narrow_for_day_one'
  | 'exact_personal_data'
  | 'textbook_or_overformal_phrase'
  | 'explanation_mentions_unseen_option'
  | 'missing_new_word_explanation'
  | 'missing_first_seen_construction_explanation';

export type PersonalPlanContentQualityIssue = {
  code: PersonalPlanContentQualityIssueCode;
  phraseId?: string;
  detail?: string;
};

export type PersonalPlanContentQualityScope = {
  planId: string;
  weekIndex: number;
  dayIndex: number;
  mode?: 'universal_start' | 'regular_day';
};

export type PersonalPlanExplanationDraft = {
  title?: string;
  body: string;
  covers?: string[];
  mentionedOptions?: string[];
};

export type PersonalPlanPhraseDraft = {
  id: string;
  english: string;
  russian: string;
  explanations?: PersonalPlanExplanationDraft[];
  visibleOptions?: string[];
  newWords?: string[];
  firstSeenConstructions?: string[];
};

export type PersonalPlanContentQualityResult = {
  valid: boolean;
  issues: PersonalPlanContentQualityIssue[];
};

const DEVELOPER_COPY_PATTERNS = [
  /\bdev\b/i,
  /\bdebug\b/i,
  /\btodo\b/i,
  /\bdraft\b/i,
  /\bplaceholder\b/i,
  /\blorem\b/i,
  /черновик/i,
  /разработчик/i,
  /техническ/i,
];

const CORRUPTED_COPY_PATTERN = /[\u00d0\u00d1\u00c2\u00e2]/;

const TEXTBOOK_OR_OVERFORMAL_PATTERNS = [
  /how do you do/i,
  /pleased to make your acquaintance/i,
  /to whom it may concern/i,
  /dear sir or madam/i,
  /kindly be informed/i,
];

const DAY_ONE_NARROW_PATTERNS = [
  /apartment viewing/i,
  /\bviewing\b/i,
  /\brental\b/i,
  /\brent\b/i,
  /\blandlord\b/i,
  /\bpassport\b/i,
  /\bvisa\b/i,
  /\bbank card\b/i,
  /\bmy phone number is\b/i,
  /\bmy email is\b/i,
];

const EXACT_PERSONAL_DATA_PATTERNS = [
  /\b\d{3,}\b/,
  /\bmy phone number is\b/i,
  /\bmy email is\b/i,
  /\bmy name is\s+[A-Z][a-z]+/i,
  /\b(?:i am|i'm)\s+[A-Z][a-z]+\.?$/i,
  /@/,
];

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function includesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function explanationText(explanations: PersonalPlanExplanationDraft[]): string {
  return explanations
    .flatMap((explanation) => [
      explanation.title ?? '',
      explanation.body,
      ...(explanation.covers ?? []),
    ])
    .join(' ')
    .toLowerCase();
}

function fullPhraseText(phrase: PersonalPlanPhraseDraft): string {
  return [
    phrase.english,
    phrase.russian,
    ...(phrase.visibleOptions ?? []),
    ...(phrase.explanations ?? []).flatMap((explanation) => [
      explanation.title ?? '',
      explanation.body,
      ...(explanation.covers ?? []),
      ...(explanation.mentionedOptions ?? []),
    ]),
    ...(phrase.newWords ?? []),
    ...(phrase.firstSeenConstructions ?? []),
  ].join(' ');
}

function normalizedSet(values: string[] = []): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()));
}

function isUniversalStart(scope: PersonalPlanContentQualityScope): boolean {
  return scope.mode === 'universal_start'
    || (scope.weekIndex === 1 && scope.dayIndex === 1);
}

function pushIssue(
  issues: PersonalPlanContentQualityIssue[],
  code: PersonalPlanContentQualityIssueCode,
  phraseId: string,
  detail?: string,
) {
  issues.push({
    code,
    phraseId,
    detail,
  });
}

export function validatePersonalPlanContentQuality(
  phrase: PersonalPlanPhraseDraft,
  scope: PersonalPlanContentQualityScope,
): PersonalPlanContentQualityResult {
  const issues: PersonalPlanContentQualityIssue[] = [];
  const phraseText = `${phrase.english} ${phrase.russian}`;
  const explanations = phrase.explanations ?? [];
  const allExplanationText = explanationText(explanations);

  if (!hasText(phrase.english) || !hasText(phrase.russian)) {
    pushIssue(issues, 'empty_phrase', phrase.id);
  }

  if (
    includesAnyPattern(phraseText, DEVELOPER_COPY_PATTERNS)
    || includesAnyPattern(allExplanationText, DEVELOPER_COPY_PATTERNS)
  ) {
    pushIssue(issues, 'robotic_or_developer_copy', phrase.id);
  }

  if (CORRUPTED_COPY_PATTERN.test(fullPhraseText(phrase))) {
    pushIssue(issues, 'corrupted_copy', phrase.id);
  }

  if (includesAnyPattern(phraseText, TEXTBOOK_OR_OVERFORMAL_PATTERNS)) {
    pushIssue(issues, 'textbook_or_overformal_phrase', phrase.id);
  }

  if (includesAnyPattern(phraseText, EXACT_PERSONAL_DATA_PATTERNS)) {
    pushIssue(issues, 'exact_personal_data', phrase.id);
  }

  if (
    isUniversalStart(scope)
    && includesAnyPattern(phraseText, DAY_ONE_NARROW_PATTERNS)
  ) {
    pushIssue(issues, 'too_narrow_for_day_one', phrase.id);
  }

  const visibleOptions = normalizedSet([
    phrase.english,
    ...(phrase.visibleOptions ?? []),
  ]);

  for (const explanation of explanations) {
    for (const mentionedOption of explanation.mentionedOptions ?? []) {
      if (!visibleOptions.has(mentionedOption.trim().toLowerCase())) {
        pushIssue(
          issues,
          'explanation_mentions_unseen_option',
          phrase.id,
          mentionedOption,
        );
      }
    }
  }

  for (const newWord of phrase.newWords ?? []) {
    if (!allExplanationText.includes(newWord.toLowerCase())) {
      pushIssue(
        issues,
        'missing_new_word_explanation',
        phrase.id,
        newWord,
      );
    }
  }

  for (const construction of phrase.firstSeenConstructions ?? []) {
    if (!allExplanationText.includes(construction.toLowerCase())) {
      pushIssue(
        issues,
        'missing_first_seen_construction_explanation',
        phrase.id,
        construction,
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
