import type { PlanMinutesChoice } from './personal_plan_catalog';
import type {
  PlanExerciseBlock,
  PlanExerciseProgressPolicy,
  PlanExerciseRecoveryPolicy,
  PlanExerciseType,
} from './personal_plan_engine_contracts';
import { validatePlanExerciseBlockContract } from './personal_plan_engine_contracts';
import { HARBOR_WEEK1_AUTHORING_PASSPORT } from './personal_plan_harbor_week1_authoring_passport';
import { HARBOR_WEEK1_BLUEPRINT_DRAFT } from './personal_plan_harbor_week1_blueprint_draft';
import type {
  PersonalPlanAuthoringExerciseBlock,
  PersonalPlanWeekAuthoringPassport,
} from './personal_plan_week_authoring_passport';
import type { PersonalPlanWeekContentQualityInput } from './personal_plan_week_content_quality_gate';

export type GavanWeek1DraftBlockIssueCode =
  | 'unknown_day_id'
  | 'unknown_exercise_id_in_load'
  | 'unsupported_placeholder_conversion'
  | 'block_contract_failed'
  | 'load_membership_mismatch';

export type GavanWeek1DraftBlockIssue = {
  code: GavanWeek1DraftBlockIssueCode;
  dayId?: string;
  exerciseId?: string;
  detail: string;
};

export type GavanWeek1ExcludedPlaceholder = {
  dayId: string;
  exerciseId: string;
  reason: 'pronunciation_placeholder';
};

export type GavanWeek1DraftExerciseBlockBuildInput = {
  blueprint: PersonalPlanWeekContentQualityInput;
  passport: PersonalPlanWeekAuthoringPassport;
};

export type GavanWeek1DraftExerciseBlockBuildResult = {
  valid: boolean;
  planId: string;
  weekId: string;
  blocks: PlanExerciseBlock[];
  allBlocks: PlanExerciseBlock[];
  blocksByDayId: Record<string, PlanExerciseBlock[]>;
  issues: GavanWeek1DraftBlockIssue[];
  excludedPlaceholders: GavanWeek1ExcludedPlaceholder[];
};

const MINUTE_CHOICES: PlanMinutesChoice[] = [5, 10, 15, 20];

const AUTHORING_TO_ENGINE_TYPE: Partial<Record<string, PlanExerciseType>> = {
  phrase_build: 'plan_phrase_build',
  missing_word: 'plan_missing_word',
  choose_natural_phrase: 'plan_choose_natural_phrase',
  listen_choose: 'plan_listen_choose',
  listen_build: 'plan_listen_build',
  phrase_recall: 'plan_phrase_recall',
  plan_quiz: 'plan_quiz',
};

const ESTIMATED_MINUTES_BY_WEIGHT: Record<string, number> = {
  light: 2,
  short: 2,
  medium: 4,
  heavy: 5,
};

function issue(
  code: GavanWeek1DraftBlockIssueCode,
  detail: string,
  dayId?: string,
  exerciseId?: string,
): GavanWeek1DraftBlockIssue {
  return { code, detail, dayId, exerciseId };
}

function requiredMinutesForExercise(
  exerciseId: string,
  loadByMinutes: Record<number, string[]> | undefined,
): PlanMinutesChoice[] {
  return MINUTE_CHOICES.filter((minutes) =>
    (loadByMinutes?.[minutes] ?? []).includes(exerciseId),
  );
}

function progressPolicyForType(type: PlanExerciseType): PlanExerciseProgressPolicy {
  if (
    type === 'personal_practice_seeded' ||
    type === 'trainer_weak_spot' ||
    type === 'flashcards_plan_review'
  ) {
    return 'completion_only';
  }

  return 'correct_only';
}

function recoveryPolicyForType(type: PlanExerciseType): PlanExerciseRecoveryPolicy {
  if (type === 'trainer_weak_spot') return 'return_wrong_to_trainer';
  if (type === 'plan_phrase_build') return 'return_wrong_to_recall_and_trainer';
  if (
    type === 'plan_missing_word' ||
    type === 'plan_choose_natural_phrase' ||
    type === 'plan_listen_choose' ||
    type === 'plan_listen_build' ||
    type === 'plan_phrase_recall' ||
    type === 'plan_quiz'
  ) {
    return 'return_wrong_to_recall';
  }

  return 'none';
}

function originalExerciseId(dayId: string, blockId: string): string {
  return blockId.startsWith(`${dayId}:`)
    ? blockId.slice(dayId.length + 1)
    : blockId;
}

function isFinalPronunciationPlaceholder(exercise: PersonalPlanAuthoringExerciseBlock): boolean {
  return exercise.pronunciationStatus === 'final' || (
    exercise.placeholder?.kind === 'pronunciation' &&
    exercise.placeholder.status === 'final'
  );
}

export function validateGavanWeek1DraftExerciseBlocks(
  result: GavanWeek1DraftExerciseBlockBuildResult,
): GavanWeek1DraftBlockIssue[] {
  const issues = [...result.issues];

  Object.entries(result.blocksByDayId).forEach(([dayId, blocks]) => {
    blocks.forEach((block) => {
      const contractIssues = validatePlanExerciseBlockContract(block);
      contractIssues.forEach((contractIssue) => {
        issues.push(issue(
          'block_contract_failed',
          contractIssue,
          dayId,
          originalExerciseId(dayId, block.id),
        ));
      });

      const sortedRequiredFor = [...block.requiredFor].sort((a, b) => a - b);
      if (JSON.stringify(sortedRequiredFor) !== JSON.stringify(block.requiredFor)) {
        issues.push(issue(
          'load_membership_mismatch',
          'requiredFor must keep onboarding minute choices in ascending order.',
          dayId,
          originalExerciseId(dayId, block.id),
        ));
      }
    });
  });

  return issues;
}

export function buildHarborWeek1DraftBlocks(
  input: GavanWeek1DraftExerciseBlockBuildInput = {
    blueprint: HARBOR_WEEK1_BLUEPRINT_DRAFT,
    passport: HARBOR_WEEK1_AUTHORING_PASSPORT,
  },
): GavanWeek1DraftExerciseBlockBuildResult {
  const blocksByDayId: Record<string, PlanExerciseBlock[]> = {};
  const issues: GavanWeek1DraftBlockIssue[] = [];
  const excludedPlaceholders: GavanWeek1ExcludedPlaceholder[] = [];
  const blueprintDaysById = new Map(input.blueprint.days.map((day) => [day.dayId, day]));

  input.passport.days.forEach((authoringDay) => {
    const blueprintDay = blueprintDaysById.get(authoringDay.dayId);
    if (!blueprintDay) {
      issues.push(issue(
        'unknown_day_id',
        'Authoring day must exist in the matching week blueprint.',
        authoringDay.dayId,
      ));
      return;
    }

    const authoringBlocksById = new Map(
      authoringDay.exerciseMix.map((exercise) => [exercise.id, exercise]),
    );
    const dayBlocks: PlanExerciseBlock[] = [];

    MINUTE_CHOICES.forEach((minutes) => {
      (authoringDay.loadByMinutes?.[minutes] ?? []).forEach((exerciseId) => {
        if (!authoringBlocksById.has(exerciseId)) {
          issues.push(issue(
            'unknown_exercise_id_in_load',
            'Minute load references an exercise that is not in this day exercise mix.',
            authoringDay.dayId,
            exerciseId,
          ));
        }
      });
    });

    authoringDay.exerciseMix.forEach((exercise) => {
      if (exercise.type === 'pronunciation_placeholder') {
        if (isFinalPronunciationPlaceholder(exercise)) {
          issues.push(issue(
            'unsupported_placeholder_conversion',
            'Pronunciation placeholders must not become ready production blocks before scoring exists.',
            authoringDay.dayId,
            exercise.id,
          ));
          return;
        }

        excludedPlaceholders.push({
          dayId: authoringDay.dayId,
          exerciseId: exercise.id,
          reason: 'pronunciation_placeholder',
        });
        return;
      }

      const engineType = AUTHORING_TO_ENGINE_TYPE[exercise.type];
      if (!engineType) {
        issues.push(issue(
          'unsupported_placeholder_conversion',
          `Exercise type cannot be converted to an engine block yet: ${exercise.type}`,
          authoringDay.dayId,
          exercise.id,
        ));
        return;
      }

      const requiredFor = requiredMinutesForExercise(exercise.id, authoringDay.loadByMinutes);
      if (requiredFor.length === 0) {
        issues.push(issue(
          'load_membership_mismatch',
          'Convertible exercise is not included in any onboarding minute load.',
          authoringDay.dayId,
          exercise.id,
        ));
      }

      dayBlocks.push({
        id: `${authoringDay.dayId}:${exercise.id}`,
        planId: input.blueprint.planId as PlanExerciseBlock['planId'],
        dayIndex: blueprintDay.scope.dayIndex,
        type: engineType,
        title: exercise.title,
        contentUnitIds: blueprintDay.phrases.map((phrase) => phrase.id),
        estimatedMinutes: ESTIMATED_MINUTES_BY_WEIGHT[exercise.weight] ?? 3,
        requiredFor,
        prerequisiteLessonIds: [],
        progressPolicy: progressPolicyForType(engineType),
        recoveryPolicy: recoveryPolicyForType(engineType),
      });
    });

    blocksByDayId[authoringDay.dayId] = dayBlocks;
  });

  const draftResult: GavanWeek1DraftExerciseBlockBuildResult = {
    valid: false,
    planId: input.passport.planId,
    weekId: input.passport.weekId,
    blocks: Object.values(blocksByDayId).flat(),
    allBlocks: Object.values(blocksByDayId).flat(),
    blocksByDayId,
    issues,
    excludedPlaceholders,
  };
  const allIssues = validateGavanWeek1DraftExerciseBlocks(draftResult);

  return {
    ...draftResult,
    issues: allIssues,
    valid: allIssues.length === 0,
  };
}

export const buildGavanWeek1DraftBlocks = buildHarborWeek1DraftBlocks;
export const buildGavanWeek1DraftExerciseBlocks = buildHarborWeek1DraftBlocks;

export const HARBOR_WEEK1_DRAFT_BLOCKS = buildHarborWeek1DraftBlocks().blocks;
export const GAVAN_WEEK1_DRAFT_BLOCKS = HARBOR_WEEK1_DRAFT_BLOCKS;
export const HARBOR_WEEK1_DRAFT_BLOCKS_BY_DAY_ID =
  buildHarborWeek1DraftBlocks().blocksByDayId;
export const GAVAN_WEEK1_DRAFT_BLOCKS_BY_DAY_ID = HARBOR_WEEK1_DRAFT_BLOCKS_BY_DAY_ID;
