import type { PlanAttemptResult } from './personal_plan_engine_contracts';
import type { StoredPlanExerciseSubmissionResult } from './personal_plan_exercise_submission_store';
import type { PlanRecoveryActionTarget } from './personal_plan_recovery_actions';

export type PlanExerciseSubmissionPrimaryState =
  | 'success'
  | 'needs_recovery'
  | 'skipped'
  | 'completed';

export type PlanExerciseSubmissionNextAction =
  | 'continue_block'
  | 'show_explanation'
  | 'return_to_plan';

export type PlanExerciseSubmissionViewModel = {
  status: PlanAttemptResult;
  primaryState: PlanExerciseSubmissionPrimaryState;
  shouldShowExplanation: boolean;
  explanationTrigger: StoredPlanExerciseSubmissionResult['explanationTrigger'];
  progressEligible: boolean;
  recoveryTargets: PlanRecoveryActionTarget[];
  stored: true;
  selectedAnswerKnown: boolean;
  nextAction: PlanExerciseSubmissionNextAction;
};

function primaryStateForResult(result: PlanAttemptResult): PlanExerciseSubmissionPrimaryState {
  if (result === 'correct') return 'success';
  if (result === 'completed') return 'completed';
  if (result === 'skipped') return 'skipped';
  return 'needs_recovery';
}

function nextActionForViewModel(
  result: StoredPlanExerciseSubmissionResult,
): PlanExerciseSubmissionNextAction {
  if (result.explanationTrigger === 'wrong' || result.explanationTrigger === 'correct') {
    return 'show_explanation';
  }
  if (result.progressEligible) return 'continue_block';
  return 'return_to_plan';
}

export function buildPlanExerciseSubmissionViewModel(
  result: StoredPlanExerciseSubmissionResult,
): PlanExerciseSubmissionViewModel {
  const recoveryTargets = [...new Set(result.recoveryActions.map((action) => action.target))];

  return {
    status: result.attempt.result,
    primaryState: primaryStateForResult(result.attempt.result),
    shouldShowExplanation: true,
    explanationTrigger: result.explanationTrigger,
    progressEligible: result.progressEligible,
    recoveryTargets,
    stored: true,
    selectedAnswerKnown: result.attempt.selectedAnswerKnown,
    nextAction: nextActionForViewModel(result),
  };
}
