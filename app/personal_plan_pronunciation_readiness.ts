export type PlanPronunciationScoringRequirementStatus =
  | 'blocked_until_scoring'
  | 'ready';

export type PlanPronunciationScoringProvider =
  | 'openai'
  | 'manual'
  | 'system'
  | 'none'
  | 'unknown';

export type PlanPronunciationResultField =
  | 'score'
  | 'pronunciationScore'
  | 'fluencyScore'
  | 'intonationScore';

export type PlanPronunciationScoringRequirement = {
  id: string;
  exerciseId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  status: PlanPronunciationScoringRequirementStatus;
  scorerId?: string;
  scoringProvider?: PlanPronunciationScoringProvider;
  scoringVersion?: string;
  resultFields?: PlanPronunciationResultField[];
  minimumConfidence?: number;
  finalScoringReady?: boolean;
};

export type PlanPronunciationScoringRequirementIssueCode =
  | 'missing_pronunciation_requirement'
  | 'missing_pronunciation_exercise_id'
  | 'missing_pronunciation_block_id'
  | 'missing_pronunciation_content_units'
  | 'missing_pronunciation_target_text'
  | 'missing_pronunciation_scorer_id'
  | 'missing_pronunciation_scoring_provider'
  | 'missing_pronunciation_scoring_version'
  | 'missing_pronunciation_result_fields'
  | 'invalid_pronunciation_minimum_confidence'
  | 'ready_pronunciation_not_marked_final'
  | 'fake_final_pronunciation_claim';

export type PlanPronunciationScoringRequirementIssue = {
  code: PlanPronunciationScoringRequirementIssueCode;
  exerciseId?: string;
  detail: string;
};

export type PlanPronunciationScoringRequirementReadinessResult = {
  validForAuthoring: boolean;
  productionReady: boolean;
  issues: PlanPronunciationScoringRequirementIssue[];
};

export type BuildBlockedPlanPronunciationScoringRequirementInput = {
  exerciseId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
};

function compactStrings(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidMinimumConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function issue(
  code: PlanPronunciationScoringRequirementIssueCode,
  detail: string,
  requirement?: PlanPronunciationScoringRequirement,
): PlanPronunciationScoringRequirementIssue {
  return {
    code,
    detail,
    exerciseId: requirement?.exerciseId,
  };
}

export function buildBlockedPlanPronunciationScoringRequirement(
  input: BuildBlockedPlanPronunciationScoringRequirementInput,
): PlanPronunciationScoringRequirement {
  return {
    id: `pronunciation-blocked:${input.exerciseId}`,
    exerciseId: input.exerciseId.trim(),
    blockId: input.blockId.trim(),
    contentUnitIds: compactStrings(input.contentUnitIds),
    targetText: input.targetText.trim(),
    status: 'blocked_until_scoring',
    scoringProvider: 'none',
    finalScoringReady: false,
  };
}

export function validatePlanPronunciationScoringRequirement(
  requirement: PlanPronunciationScoringRequirement | undefined,
): PlanPronunciationScoringRequirementReadinessResult {
  const issues: PlanPronunciationScoringRequirementIssue[] = [];

  if (!requirement) {
    return {
      validForAuthoring: false,
      productionReady: false,
      issues: [issue(
        'missing_pronunciation_requirement',
        'Pronunciation tasks need a scoring readiness requirement.',
      )],
    };
  }

  if (!hasText(requirement.exerciseId)) {
    issues.push(issue(
      'missing_pronunciation_exercise_id',
      'Pronunciation readiness must point to the exercise it unlocks.',
      requirement,
    ));
  }

  if (!hasText(requirement.blockId)) {
    issues.push(issue(
      'missing_pronunciation_block_id',
      'Pronunciation readiness must point to the daily block.',
      requirement,
    ));
  }

  if (compactStrings(requirement.contentUnitIds).length === 0) {
    issues.push(issue(
      'missing_pronunciation_content_units',
      'Pronunciation readiness must list the trained phrase units.',
      requirement,
    ));
  }

  if (!hasText(requirement.targetText)) {
    issues.push(issue(
      'missing_pronunciation_target_text',
      'Pronunciation readiness must include the exact phrase text.',
      requirement,
    ));
  }

  if (requirement.finalScoringReady && requirement.status !== 'ready') {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'Only ready pronunciation scoring can be marked final.',
      requirement,
    ));
  }

  if (requirement.status === 'ready') {
    if (!hasText(requirement.scorerId)) {
      issues.push(issue(
        'missing_pronunciation_scorer_id',
        'Ready pronunciation scoring needs a stable scorer id.',
        requirement,
      ));
    }

    if (
      !requirement.scoringProvider ||
      requirement.scoringProvider === 'none' ||
      requirement.scoringProvider === 'unknown'
    ) {
      issues.push(issue(
        'missing_pronunciation_scoring_provider',
        'Ready pronunciation scoring needs a real provider.',
        requirement,
      ));
    }

    if (!hasText(requirement.scoringVersion)) {
      issues.push(issue(
        'missing_pronunciation_scoring_version',
        'Ready pronunciation scoring needs a scoring version.',
        requirement,
      ));
    }

    if (compactStrings(requirement.resultFields).length === 0) {
      issues.push(issue(
        'missing_pronunciation_result_fields',
        'Ready pronunciation scoring needs explicit result fields.',
        requirement,
      ));
    }

    if (!isValidMinimumConfidence(requirement.minimumConfidence)) {
      issues.push(issue(
        'invalid_pronunciation_minimum_confidence',
        'Ready pronunciation scoring needs a minimum confidence between 0 and 1.',
        requirement,
      ));
    }

    if (!requirement.finalScoringReady) {
      issues.push(issue(
        'ready_pronunciation_not_marked_final',
        'Ready pronunciation scoring must explicitly mark finalScoringReady.',
        requirement,
      ));
    }
  }

  const authoringBlockingCodes: PlanPronunciationScoringRequirementIssueCode[] = [
    'missing_pronunciation_requirement',
    'missing_pronunciation_exercise_id',
    'missing_pronunciation_block_id',
    'missing_pronunciation_content_units',
    'missing_pronunciation_target_text',
    'fake_final_pronunciation_claim',
  ];

  return {
    validForAuthoring: issues.every((item) => !authoringBlockingCodes.includes(item.code)),
    productionReady: requirement.status === 'ready' && issues.length === 0,
    issues,
  };
}
