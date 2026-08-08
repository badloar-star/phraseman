import {
  buildPlanQuizAttemptEvent,
  type PlanAttemptEventAdapterResult,
} from './personal_plan_attempt_event_adapter';
import { appendPersonalPlanAttemptEvent } from './personal_plan_attempt_events';
import type { PlanAttemptEvent, PlanExerciseBlock } from './personal_plan_engine_contracts';
import type { PersonalPlanQuizQuestion } from './personal_plan_quiz_types';

export type PlanQuizAnswerAttemptInput = {
  block: PlanExerciseBlock;
  planInstanceId: string;
  question: PersonalPlanQuizQuestion;
  choiceId: string;
  attemptId: string;
  append?: (event: PlanAttemptEvent) => Promise<PlanAttemptEvent>;
};

/** Screen-used journal bridge: canonical event first, then durable attempt storage. */
export async function appendPlanQuizAnswerAttempt(
  input: PlanQuizAnswerAttemptInput,
): Promise<Extract<PlanAttemptEventAdapterResult, { status: 'ready' }> | null> {
  const result = buildPlanQuizAttemptEvent(input);
  if (result.status !== 'ready') return null;
  await (input.append ?? appendPersonalPlanAttemptEvent)(result.event);
  return result;
}
