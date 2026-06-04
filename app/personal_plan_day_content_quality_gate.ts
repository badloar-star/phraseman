import {
  validatePersonalPlanContentQuality,
  PersonalPlanContentQualityIssue,
  PersonalPlanContentQualityIssueCode,
  PersonalPlanContentQualityScope,
  PersonalPlanPhraseDraft,
} from './personal_plan_content_quality_contract';

export type PersonalPlanDayContentQualityIssueCode =
  | PersonalPlanContentQualityIssueCode
  | 'empty_day'
  | 'day_one_contains_personal_data'
  | 'day_one_contains_narrow_phrase'
  | 'day_has_missing_explanations';

export type PersonalPlanDayPhraseQualitySummary = {
  phraseId: string;
  valid: boolean;
  issues: PersonalPlanContentQualityIssue[];
};

export type PersonalPlanDayContentQualitySummary = {
  total: number;
  valid: number;
  invalid: number;
};

export type PersonalPlanDayContentQualityInput = {
  dayId: string;
  scope: PersonalPlanContentQualityScope;
  phrases: PersonalPlanPhraseDraft[];
};

export type PersonalPlanDayContentQualityResult = {
  valid: boolean;
  dayId: string;
  summary: PersonalPlanDayContentQualitySummary;
  issuesByPhrase: PersonalPlanDayPhraseQualitySummary[];
  dayIssueCodes: PersonalPlanDayContentQualityIssueCode[];
};

function uniqueIssueCodes(
  codes: PersonalPlanDayContentQualityIssueCode[],
): PersonalPlanDayContentQualityIssueCode[] {
  return [...new Set(codes)];
}

function isDayOne(scope: PersonalPlanContentQualityScope): boolean {
  return scope.weekIndex === 1 && scope.dayIndex === 1;
}

export function validatePersonalPlanDayContentQuality(
  input: PersonalPlanDayContentQualityInput,
): PersonalPlanDayContentQualityResult {
  const issuesByPhrase = input.phrases.map((phrase) => {
    const result = validatePersonalPlanContentQuality(phrase, input.scope);

    return {
      phraseId: phrase.id,
      valid: result.valid,
      issues: result.issues,
    };
  });

  const dayIssueCodes: PersonalPlanDayContentQualityIssueCode[] = [];

  if (input.phrases.length === 0) {
    dayIssueCodes.push('empty_day');
  }

  for (const phraseSummary of issuesByPhrase) {
    for (const issue of phraseSummary.issues) {
      dayIssueCodes.push(issue.code);

      if (isDayOne(input.scope) && issue.code === 'exact_personal_data') {
        dayIssueCodes.push('day_one_contains_personal_data');
      }

      if (isDayOne(input.scope) && issue.code === 'too_narrow_for_day_one') {
        dayIssueCodes.push('day_one_contains_narrow_phrase');
      }

      if (
        issue.code === 'missing_new_word_explanation'
        || issue.code === 'missing_first_seen_construction_explanation'
      ) {
        dayIssueCodes.push('day_has_missing_explanations');
      }
    }
  }

  const validCount = issuesByPhrase.filter((phrase) => phrase.valid).length;
  const invalidCount = issuesByPhrase.length - validCount;
  const uniqueDayIssueCodes = uniqueIssueCodes(dayIssueCodes);

  return {
    valid: uniqueDayIssueCodes.length === 0,
    dayId: input.dayId,
    summary: {
      total: input.phrases.length,
      valid: validCount,
      invalid: invalidCount,
    },
    issuesByPhrase,
    dayIssueCodes: uniqueDayIssueCodes,
  };
}
