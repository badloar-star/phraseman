export type PersonalPlanAuthoringExerciseType =
  | 'phrase_build'
  | 'missing_word'
  | 'choose_natural_phrase'
  | 'listen_choose'
  | 'listen_build'
  | 'phrase_recall'
  | 'plan_quiz'
  | 'pronunciation_placeholder';

export type PersonalPlanAuthoringBlockWeight = 'short' | 'medium' | 'heavy';
export type PersonalPlanAuthoringAssetStatus = 'placeholder' | 'final';
export type PersonalPlanAuthoringMinuteChoice = 5 | 10 | 15 | 20;

export interface PersonalPlanAuthoringExerciseBlock {
  id: string;
  type: PersonalPlanAuthoringExerciseType;
  title: string;
  weight: PersonalPlanAuthoringBlockWeight;
  focusTags: string[];
  tags: string[];
  audioStatus?: PersonalPlanAuthoringAssetStatus;
  pronunciationStatus?: PersonalPlanAuthoringAssetStatus;
  placeholder?: {
    kind: 'audio' | 'pronunciation';
    status: PersonalPlanAuthoringAssetStatus;
  };
}

export interface PersonalPlanAuthoringDayPassport {
  dayId: string;
  learningOutcome: string;
  exerciseMix: PersonalPlanAuthoringExerciseBlock[];
  loadByMinutes: Record<PersonalPlanAuthoringMinuteChoice, string[]>;
}

export interface PersonalPlanWeekAuthoringPassport {
  weekId: string;
  planId: string;
  days: PersonalPlanAuthoringDayPassport[];
}

export interface PersonalPlanWeekBlueprintReference {
  weekId: string;
  planId: string;
  days: Array<{
    dayId: string;
  }>;
}

export type PersonalPlanWeekAuthoringPassportIssueCode =
  | 'week_identity_mismatch'
  | 'day_count_mismatch'
  | 'missing_day_id'
  | 'unknown_day_id'
  | 'missing_learning_outcome'
  | 'missing_exercise_mix'
  | 'unsupported_exercise_type'
  | 'invalid_minute_choice'
  | 'missing_load_by_minutes'
  | 'load_too_thin'
  | 'unknown_load_block_id'
  | 'too_many_heavy_blocks_for_five_minutes'
  | 'day_one_narrow_scenario_block'
  | 'final_audio_or_pronunciation_claim';

export interface PersonalPlanWeekAuthoringPassportIssue {
  code: PersonalPlanWeekAuthoringPassportIssueCode;
  dayId?: string;
  blockId?: string;
  message: string;
}

export interface PersonalPlanWeekAuthoringPassportResult {
  ok: boolean;
  valid: boolean;
  issues: PersonalPlanWeekAuthoringPassportIssue[];
}

const ALLOWED_EXERCISE_TYPES: ReadonlySet<string> = new Set([
  'phrase_build',
  'missing_word',
  'choose_natural_phrase',
  'listen_choose',
  'listen_build',
  'phrase_recall',
  'plan_quiz',
  'pronunciation_placeholder',
]);

const REQUIRED_MINUTE_CHOICES = [5, 10, 15, 20] as const;

const MIN_BLOCKS_BY_MINUTES: Record<PersonalPlanAuthoringMinuteChoice, number> = {
  5: 1,
  10: 2,
  15: 3,
  20: 4,
};

const DAY_ONE_NARROW_SCENARIO_TAGS = new Set([
  'apartment',
  'apartment_viewing',
  'rent',
  'documents',
  'passport',
  'visa',
  'bank_card',
  'phone_number',
]);

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const issue = (
  issues: PersonalPlanWeekAuthoringPassportIssue[],
  code: PersonalPlanWeekAuthoringPassportIssueCode,
  message: string,
  dayId?: string,
  blockId?: string,
) => {
  issues.push({ code, message, dayId, blockId });
};

export function validatePersonalPlanWeekAuthoringPassport(
  passport: PersonalPlanWeekAuthoringPassport,
  blueprint: PersonalPlanWeekBlueprintReference,
): PersonalPlanWeekAuthoringPassportResult {
  const issues: PersonalPlanWeekAuthoringPassportIssue[] = [];

  if (passport.weekId !== blueprint.weekId || passport.planId !== blueprint.planId) {
    issue(
      issues,
      'week_identity_mismatch',
      'Authoring passport must describe the same plan and week as the content blueprint.',
    );
  }

  if (passport.days.length !== blueprint.days.length) {
    issue(
      issues,
      'day_count_mismatch',
      'Authoring passport must have the same number of days as the content blueprint.',
    );
  }

  const blueprintDayIds = new Set(blueprint.days.map((day) => day.dayId));

  passport.days.forEach((day, dayIndex) => {
    if (!hasText(day.dayId)) {
      issue(issues, 'missing_day_id', 'Every authoring day must have a stable dayId.');
      return;
    }

    if (!blueprintDayIds.has(day.dayId)) {
      issue(
        issues,
        'unknown_day_id',
        'Authoring dayId must exist in the matching content blueprint.',
        day.dayId,
      );
    }

    if (!hasText(day.learningOutcome)) {
      issue(
        issues,
        'missing_learning_outcome',
        'Every day needs a clear human learning outcome before exercises are authored.',
        day.dayId,
      );
    }

    if (!Array.isArray(day.exerciseMix) || day.exerciseMix.length === 0) {
      issue(
        issues,
        'missing_exercise_mix',
        'Every day needs an exercise mix, not only a list of phrases.',
        day.dayId,
      );
    }

    const blockById = new Map<string, PersonalPlanAuthoringExerciseBlock>();
    day.exerciseMix.forEach((block) => {
      blockById.set(block.id, block);

      if (!ALLOWED_EXERCISE_TYPES.has(block.type)) {
        issue(
          issues,
          'unsupported_exercise_type',
          'Exercise type must be part of the approved Personal Plans training set.',
          day.dayId,
          block.id,
        );
      }

      if (
        block.audioStatus === 'final' ||
        block.pronunciationStatus === 'final' ||
        block.placeholder?.status === 'final'
      ) {
        issue(
          issues,
          'final_audio_or_pronunciation_claim',
          'Week 1 authoring may reserve audio/pronunciation work, but must not claim final assets or scoring before the pipeline exists.',
          day.dayId,
          block.id,
        );
      }

      if (
        dayIndex === 0 &&
        [...block.focusTags, ...block.tags].some((tag) =>
          DAY_ONE_NARROW_SCENARIO_TAGS.has(tag),
        )
      ) {
        issue(
          issues,
          'day_one_narrow_scenario_block',
          'Day 1 must stay universal and cannot start with narrow relocation scenarios.',
          day.dayId,
          block.id,
        );
      }
    });

    const minuteKeys = Object.keys(day.loadByMinutes ?? {}).map(Number);
    const hasAllRequiredMinutes = REQUIRED_MINUTE_CHOICES.every((minutes) =>
      minuteKeys.includes(minutes),
    );

    if (!hasAllRequiredMinutes) {
      issue(
        issues,
        'missing_load_by_minutes',
        'Load must be authored for exactly the onboarding choices: 5, 10, 15, and 20 minutes.',
        day.dayId,
      );
    }

    minuteKeys.forEach((minutes) => {
      if (!REQUIRED_MINUTE_CHOICES.includes(minutes as PersonalPlanAuthoringMinuteChoice)) {
        issue(
          issues,
          'invalid_minute_choice',
          'Plans can only use the four onboarding minute choices: 5, 10, 15, and 20.',
          day.dayId,
        );
      }
    });

    REQUIRED_MINUTE_CHOICES.forEach((minutes) => {
      const blockIds = day.loadByMinutes?.[minutes] ?? [];
      if (blockIds.length < MIN_BLOCKS_BY_MINUTES[minutes]) {
        issue(
          issues,
          'load_too_thin',
          'Each minute choice needs enough blocks to feel like a real daily training session.',
          day.dayId,
        );
      }

      blockIds.forEach((blockId) => {
        if (!blockById.has(blockId)) {
          issue(
            issues,
            'unknown_load_block_id',
            'Load references must point to blocks in the same day exercise mix.',
            day.dayId,
            blockId,
          );
        }
      });
    });

    const fiveMinuteHeavyBlocks = (day.loadByMinutes?.[5] ?? [])
      .map((blockId) => blockById.get(blockId))
      .filter((block): block is PersonalPlanAuthoringExerciseBlock => block?.weight === 'heavy');

    if (fiveMinuteHeavyBlocks.length > 1) {
      issue(
        issues,
        'too_many_heavy_blocks_for_five_minutes',
        'The 5-minute route must stay light: no more than one heavy block.',
        day.dayId,
      );
    }
  });

  return {
    ok: issues.length === 0,
    valid: issues.length === 0,
    issues,
  };
}
