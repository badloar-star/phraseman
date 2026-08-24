import {
  planRecoveryCandidatesForAttempt,
  type PlanAttemptEvent,
  type PlanExerciseBlock,
  type PlanRecoveryCandidate,
  type PlanRecoveryCandidateTarget,
} from './personal_plan_engine_contracts';
import {
  compactPlanMistakeContext,
  type PersonalPlanMistakeContext,
} from './personal_plan_mistake_context';

export type PlanRecoveryActionTarget = PlanRecoveryCandidateTarget;

export type PlanRecoveryAction = {
  id: string;
  mode: 'dry_run';
  target: PlanRecoveryActionTarget;
  candidateId: string;
  planInstanceId: string;
  planId: string;
  dayIndex: number;
  blockId: string;
  exerciseType: string;
  contentUnitId?: string;
  expectedAnswer?: string;
  selectedAnswer?: string;
  selectedAnswerKnown: boolean;
  grammarTags: string[];
  vocabularyTags: string[];
  mistakeTags: string[];
  reason: 'wrong_attempt' | 'skipped_attempt';
  planContext: PersonalPlanMistakeContext;
};

export type BuildPlanRecoveryActionsOptions = {
  currentPlanInstanceId?: string;
};

function isCurrentInstance(
  event: PlanAttemptEvent,
  options: BuildPlanRecoveryActionsOptions | undefined,
): boolean {
  const currentPlanInstanceId = options?.currentPlanInstanceId?.trim();
  return !currentPlanInstanceId || event.planInstanceId === currentPlanInstanceId;
}

function actionForCandidate(candidate: PlanRecoveryCandidate): PlanRecoveryAction {
  return {
    id: `${candidate.id}:dry_run`,
    mode: 'dry_run',
    target: candidate.target,
    candidateId: candidate.id,
    planInstanceId: candidate.planInstanceId,
    planId: candidate.planId,
    dayIndex: candidate.dayIndex,
    blockId: candidate.blockId,
    exerciseType: candidate.exerciseType,
    contentUnitId: candidate.contentUnitId,
    expectedAnswer: candidate.expectedAnswer,
    selectedAnswer: candidate.selectedAnswerKnown ? candidate.selectedAnswer : undefined,
    selectedAnswerKnown: candidate.selectedAnswerKnown,
    grammarTags: candidate.grammarTags,
    vocabularyTags: candidate.vocabularyTags,
    mistakeTags: candidate.mistakeTags,
    reason: candidate.reason,
    planContext: compactPlanMistakeContext({
      planId: candidate.planId,
      planInstanceId: candidate.planInstanceId,
      planTaskId: candidate.blockId,
      planDayIndex: candidate.dayIndex,
      planPhraseLessonId: candidate.contentUnitId,
    }),
  };
}

export function buildPlanRecoveryActions(
  block: PlanExerciseBlock,
  event: PlanAttemptEvent,
  options?: BuildPlanRecoveryActionsOptions,
): PlanRecoveryAction[] {
  if (!isCurrentInstance(event, options)) return [];

  return planRecoveryCandidatesForAttempt(block, event)
    .map(actionForCandidate);
}
