export type PersonalPlanContentQualityIssueCode =
  | 'empty_phrase'
  | 'robotic_or_developer_copy'
  | 'corrupted_copy'
  | 'too_narrow_for_day_one'
  | 'exact_personal_data'
  | 'textbook_or_overformal_phrase'
  | 'explanation_mentions_unseen_option'
  | 'missing_new_word_explanation'
  | 'missing_first_seen_construction_explanation'
  | 'phrase_too_long_for_spoken_use'
  | 'duplicated_words_in_phrase'
  | 'untranslated_english_in_russian'
  | 'missing_sentence_punctuation'
  | 'mojibake_or_replacement_char';

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
  titleEs?: string;
  body: string;
  bodyEs?: string;
  covers?: string[];
  mentionedOptions?: string[];
  mentionedOptionsEs?: string[];
};

export type PersonalPlanPhraseDraft = {
  id: string;
  english: string;
  russian: string;
  spanish?: string;
  explanations?: PersonalPlanExplanationDraft[];
  visibleOptions?: string[];
  visibleOptionsEs?: string[];
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

// A spoken practice phrase should stay short enough to say in one breath.
// 14 words is a generous ceiling for conversational survival/work English.
const MAX_SPOKEN_PHRASE_WORDS = 14;

// Unicode replacement char or stray mojibake markers that slip past the
// narrower CORRUPTED_COPY_PATTERN check.
const REPLACEMENT_CHAR_PATTERN = /�/;

// Cyrillic letters present in the English field = untranslated/garbled mix.
const CYRILLIC_PATTERN = /[Ѐ-ӿ]/;

// Latin letters present in the Russian field (beyond short ALL-CAPS acronyms
// or quoted target words) usually means an untranslated English chunk.
const LATIN_WORD_IN_RUSSIAN_PATTERN = /[A-Za-z]{4,}/;

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasConsecutiveDuplicateWord(value: string): boolean {
  const words = value
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  for (let i = 1; i < words.length; i += 1) {
    if (words[i] === words[i - 1] && words[i].length > 1) return true;
  }
  return false;
}

function endsWithSentencePunctuation(value: string): boolean {
  return /[.!?…]"?$/.test(value.trim());
}

/**
 * Russian translation should not carry a long Latin word (a sign the English
 * leaked into the translation), with a carve-out for quoted English targets.
 */
function hasUntranslatedEnglish(russian: string): boolean {
  const withoutQuoted = russian.replace(/[«"'][^»"']*[»"']/g, ' ');
  return LATIN_WORD_IN_RUSSIAN_PATTERN.test(withoutQuoted);
}

function includesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function explanationText(explanations: PersonalPlanExplanationDraft[]): string {
  return explanations
    .flatMap((explanation) => [
      explanation.title ?? '',
      explanation.titleEs ?? '',
      explanation.body,
      explanation.bodyEs ?? '',
      ...(explanation.covers ?? []),
      ...(explanation.mentionedOptionsEs ?? []),
    ])
    .join(' ')
    .toLowerCase();
}

function fullPhraseText(phrase: PersonalPlanPhraseDraft): string {
  return [
    phrase.english,
    phrase.russian,
    phrase.spanish ?? '',
    ...(phrase.visibleOptions ?? []),
    ...(phrase.visibleOptionsEs ?? []),
    ...(phrase.explanations ?? []).flatMap((explanation) => [
      explanation.title ?? '',
      explanation.titleEs ?? '',
      explanation.body,
      explanation.bodyEs ?? '',
      ...(explanation.covers ?? []),
      ...(explanation.mentionedOptions ?? []),
      ...(explanation.mentionedOptionsEs ?? []),
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

  if (hasText(phrase.english) && wordCount(phrase.english) > MAX_SPOKEN_PHRASE_WORDS) {
    pushIssue(issues, 'phrase_too_long_for_spoken_use', phrase.id, phrase.english);
  }

  if (hasText(phrase.english) && hasConsecutiveDuplicateWord(phrase.english)) {
    pushIssue(issues, 'duplicated_words_in_phrase', phrase.id, phrase.english);
  }

  if (hasText(phrase.english) && CYRILLIC_PATTERN.test(phrase.english)) {
    pushIssue(issues, 'untranslated_english_in_russian', phrase.id, phrase.english);
  }

  if (hasText(phrase.russian) && hasUntranslatedEnglish(phrase.russian)) {
    pushIssue(issues, 'untranslated_english_in_russian', phrase.id, phrase.russian);
  }

  if (hasText(phrase.english) && !endsWithSentencePunctuation(phrase.english)) {
    pushIssue(issues, 'missing_sentence_punctuation', phrase.id, phrase.english);
  }

  if (REPLACEMENT_CHAR_PATTERN.test(fullPhraseText(phrase))) {
    pushIssue(issues, 'mojibake_or_replacement_char', phrase.id);
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
