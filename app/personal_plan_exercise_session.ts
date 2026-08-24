import {
  buildPlanRecoveryActions,
  type PlanRecoveryAction,
} from './personal_plan_recovery_actions';
import {
  canPlanAttemptAffectProgress,
  createPlanAttemptEvent,
  type PlanAttemptEvent,
  type PlanAttemptResult,
  type PlanExerciseBlock,
  type PlanExplanationTrigger,
} from './personal_plan_engine_contracts';
import {
  planExerciseRendererContractForType,
  validatePlanExerciseRendererContract,
  type PlanExerciseRendererContract,
  type PlanExerciseRendererContractIssue,
} from './personal_plan_exercise_renderer_contracts';

export type PlanExerciseSession = {
  id: string;
  planInstanceId: string;
  block: PlanExerciseBlock;
  renderer: PlanExerciseRendererContract;
  startedAt: string;
};

export type StartPlanExerciseSessionInput = {
  planInstanceId: string;
  startedAt?: string;
  sessionId?: string;
};

export type StartPlanExerciseSessionResult = {
  session?: PlanExerciseSession;
  issues: PlanExerciseRendererContractIssue[];
};

export type SubmitPlanExerciseAnswerInput = {
  result: PlanAttemptResult;
  contentUnitId?: string;
  expectedAnswer?: string;
  selectedAnswer?: string | null;
  grammarTags?: string[];
  vocabularyTags?: string[];
  mistakeTags?: string[];
  occurredAt?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
};

export type SubmitPlanExerciseAnswerResult = {
  attempt: PlanAttemptEvent;
  progressEligible: boolean;
  explanationTrigger: PlanExplanationTrigger;
  recoveryActions: PlanRecoveryAction[];
};

function explanationTriggerForResult(result: PlanAttemptResult): PlanExplanationTrigger {
  if (result === 'correct' || result === 'completed') return 'correct';
  return 'wrong';
}

export function startPlanExerciseSession(
  block: PlanExerciseBlock,
  input: StartPlanExerciseSessionInput,
): StartPlanExerciseSessionResult {
  const renderer = planExerciseRendererContractForType(block.type);
  const issues = validatePlanExerciseRendererContract(block);
  const planInstanceId = input.planInstanceId.trim();

  if (!renderer || issues.length > 0 || !planInstanceId) {
    return { issues };
  }

  return {
    issues: [],
    session: {
      id: input.sessionId || `${planInstanceId}:${block.id}`,
      planInstanceId,
      block,
      renderer,
      startedAt: input.startedAt || new Date().toISOString(),
    },
  };
}

export function submitPlanExerciseAnswer(
  session: PlanExerciseSession,
  input: SubmitPlanExerciseAnswerInput,
): SubmitPlanExerciseAnswerResult {
  const attempt = createPlanAttemptEvent(session.block, {
    id: `${session.id}:${input.contentUnitId || 'unit'}:${input.result}`,
    planInstanceId: session.planInstanceId,
    result: input.result,
    contentUnitId: input.contentUnitId,
    expectedAnswer: input.expectedAnswer,
    selectedAnswer: input.selectedAnswer,
    grammarTags: input.grammarTags,
    vocabularyTags: input.vocabularyTags,
    mistakeTags: input.mistakeTags,
    occurredAt: input.occurredAt,
    payload: input.payload,
  });

  return {
    attempt,
    progressEligible: canPlanAttemptAffectProgress(attempt),
    explanationTrigger: explanationTriggerForResult(input.result),
    recoveryActions: buildPlanRecoveryActions(session.block, attempt, {
      currentPlanInstanceId: session.planInstanceId,
    }),
  };
}
