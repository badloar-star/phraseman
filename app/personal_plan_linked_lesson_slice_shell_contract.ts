import type { PlanExerciseBlock } from './personal_plan_engine_contracts';

export type PlanLinkedLessonSliceShellParamsIssue =
  | 'wrong_exercise_type'
  | 'missing_lesson_destination'
  | 'missing_lesson_id'
  | 'invalid_required_phrases'
  | 'missing_required_phrase_ids'
  | 'missing_plan_instance_id'
  | 'wrong_progress_policy';

export type PlanLinkedLessonSliceShellParams = {
  source: 'personal_plan';
  lessonShellMode: 'linked_lesson_slice';
  planPracticeMode: 'linked_lesson';
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  dayIndex: number;
  blockId: string;
  lessonId: number;
  requiredPhrases: number;
  requiredPhraseIds: string[];
  progressPolicy: 'correct_only';
  completionMode: 'required_correct_phrases';
  recoveryEnabled: boolean;
  recallEnabled: boolean;
};

export type BuildPlanLinkedLessonSliceShellParamsResult = {
  params?: PlanLinkedLessonSliceShellParams;
  issues: PlanLinkedLessonSliceShellParamsIssue[];
};

function lessonDestinationFor(block: PlanExerciseBlock) {
  return block.destination?.type === 'lesson' ? block.destination : undefined;
}

export function buildPlanLinkedLessonSliceShellParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanLinkedLessonSliceShellParamsResult {
  const issues: PlanLinkedLessonSliceShellParamsIssue[] = [];
  const cleanPlanInstanceId = planInstanceId.trim();
  const destination = lessonDestinationFor(block);
  const lessonId = destination?.lessonId;
  const requiredPhrases = destination?.requiredPhrases;
  const requiredPhraseIds = destination?.requiredPhraseIds?.length
    ? destination.requiredPhraseIds
    : block.contentUnitIds;

  if (block.type !== 'linked_lesson_slice') {
    issues.push('wrong_exercise_type');
  }
  if (!destination) {
    issues.push('missing_lesson_destination');
  }
  if (!Number.isFinite(lessonId) || (lessonId ?? 0) <= 0) {
    issues.push('missing_lesson_id');
  }
  if (!Number.isFinite(requiredPhrases) || (requiredPhrases ?? 0) <= 0) {
    issues.push('invalid_required_phrases');
  }
  if (requiredPhraseIds.length === 0) {
    issues.push('missing_required_phrase_ids');
  }
  if (!cleanPlanInstanceId) {
    issues.push('missing_plan_instance_id');
  }
  if (block.progressPolicy !== 'correct_only') {
    issues.push('wrong_progress_policy');
  }

  if (issues.length > 0) return { issues };

  return {
    issues: [],
    params: {
      source: 'personal_plan',
      lessonShellMode: 'linked_lesson_slice',
      planPracticeMode: 'linked_lesson',
      planInstanceId: cleanPlanInstanceId,
      planId: block.planId,
      dayIndex: block.dayIndex,
      blockId: block.id,
      lessonId: lessonId!,
      requiredPhrases: requiredPhrases!,
      requiredPhraseIds,
      progressPolicy: 'correct_only',
      completionMode: 'required_correct_phrases',
      recoveryEnabled: block.recoveryPolicy !== 'none',
      recallEnabled: block.recoveryPolicy === 'return_wrong_to_recall' ||
        block.recoveryPolicy === 'return_wrong_to_recall_and_trainer',
    },
  };
}
