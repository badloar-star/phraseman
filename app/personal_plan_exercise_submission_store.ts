import {
  appendPersonalPlanAttemptEvent,
} from './personal_plan_attempt_events';
import {
  submitPlanExerciseAnswer,
  type PlanExerciseSession,
  type SubmitPlanExerciseAnswerInput,
  type SubmitPlanExerciseAnswerResult,
} from './personal_plan_exercise_session';
import {
  writePlanRecoveryActionsWithRegistry,
  type RegisteredPlanRecoveryWriteOptions,
} from './personal_plan_recovery_applied_registry';
import type { PlanRecoveryWriteResult } from './personal_plan_recovery_write_adapter';

export type StoredPlanExerciseSubmissionResult = SubmitPlanExerciseAnswerResult & {
  stored: true;
  recoveryWriteResults: PlanRecoveryWriteResult[];
};

export type SubmitAndStorePlanExerciseAnswerOptions = {
  recoveryWrite?: RegisteredPlanRecoveryWriteOptions;
};

export async function submitAndStorePlanExerciseAnswer(
  session: PlanExerciseSession,
  input: SubmitPlanExerciseAnswerInput,
  options: SubmitAndStorePlanExerciseAnswerOptions = {},
): Promise<StoredPlanExerciseSubmissionResult> {
  const result = submitPlanExerciseAnswer(session, input);
  const storedAttempt = await appendPersonalPlanAttemptEvent(result.attempt);
  const recoveryWriteResults = options.recoveryWrite
    ? await writePlanRecoveryActionsWithRegistry(
      session.planInstanceId,
      result.recoveryActions,
      options.recoveryWrite,
    )
    : [];

  return {
    ...result,
    attempt: storedAttempt,
    recoveryWriteResults,
    stored: true,
  };
}
