import {
  canPlanAttemptAffectProgress,
  type PlanAttemptEvent,
  type PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import type { SubmitPlanExerciseAnswerResult } from './personal_plan_exercise_session';
import type { StoredPlanExerciseSubmissionResult } from './personal_plan_exercise_submission_store';

export type PlanExerciseBlockProgressInput =
  | PlanAttemptEvent
  | SubmitPlanExerciseAnswerResult
  | StoredPlanExerciseSubmissionResult;

export type PlanExerciseBlockProgress = {
  blockId: string;
  requiredCount: number;
  completedCount: number;
  wrongCount: number;
  skippedCount: number;
  completed: boolean;
  percent: number;
  completedContentUnitIds: string[];
  remainingContentUnitIds: string[];
};

function attemptFromInput(input: PlanExerciseBlockProgressInput): PlanAttemptEvent {
  return 'attempt' in input ? input.attempt : input;
}

function percent(completedCount: number, requiredCount: number): number {
  if (requiredCount <= 0) return 0;
  return Math.round((completedCount / requiredCount) * 100);
}

export function buildPlanExerciseBlockProgress(
  block: PlanExerciseBlock,
  inputs: PlanExerciseBlockProgressInput[],
): PlanExerciseBlockProgress {
  const requiredIds = [...new Set(block.contentUnitIds)];
  const requiredIdSet = new Set(requiredIds);
  const completedIds = new Set<string>();
  let wrongCount = 0;
  let skippedCount = 0;

  for (const input of inputs) {
    const attempt = attemptFromInput(input);
    if (attempt.blockId !== block.id) continue;
    if (attempt.contentUnitId && !requiredIdSet.has(attempt.contentUnitId)) continue;

    if (attempt.result === 'wrong') wrongCount += 1;
    if (attempt.result === 'skipped') skippedCount += 1;

    if (attempt.contentUnitId && canPlanAttemptAffectProgress(attempt)) {
      completedIds.add(attempt.contentUnitId);
    }
  }

  const completedContentUnitIds = requiredIds.filter((id) => completedIds.has(id));
  const remainingContentUnitIds = requiredIds.filter((id) => !completedIds.has(id));

  return {
    blockId: block.id,
    requiredCount: requiredIds.length,
    completedCount: completedContentUnitIds.length,
    wrongCount,
    skippedCount,
    completed: requiredIds.length > 0 && completedContentUnitIds.length >= requiredIds.length,
    percent: percent(completedContentUnitIds.length, requiredIds.length),
    completedContentUnitIds,
    remainingContentUnitIds,
  };
}
