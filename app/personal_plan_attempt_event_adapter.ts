import {
  createPlanAttemptEvent,
  planRecoveryCandidatesForAttempt,
  type PlanAttemptEvent,
  type PlanExerciseBlock,
  type PlanRecoveryCandidate,
} from './personal_plan_engine_contracts';
import type { PersonalPlanQuizQuestion } from './personal_plan_quiz_types';

export type PlanAttemptEventAdapterIssueCode =
  | 'content_unit_mismatch'
  | 'block_type_mismatch'
  | 'unknown_choice_id'
  | 'missing_correct_choice';

export type PlanAttemptEventAdapterIssue = {
  code: PlanAttemptEventAdapterIssueCode;
  detail: string;
};

export type PlanAttemptEventAdapterResult =
  | {
    status: 'ready';
    event: PlanAttemptEvent;
    recoveryCandidates: PlanRecoveryCandidate[];
  }
  | {
    status: 'blocked';
    issue: PlanAttemptEventAdapterIssue;
  };

export type PlanPhraseAttemptEventInput = {
  block: PlanExerciseBlock;
  planInstanceId: string;
  contentUnitId: string;
  expectedAnswer: string;
  selectedAnswer?: string | null;
  isCorrect: boolean;
  grammarTags?: string[];
  vocabularyTags?: string[];
  mistakeTags?: string[];
  occurredAt?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
};

export type PlanQuizAttemptEventInput = {
  block: PlanExerciseBlock;
  planInstanceId: string;
  question: PersonalPlanQuizQuestion;
  choiceId: string;
  attemptId: string;
};

function blocked(
  code: PlanAttemptEventAdapterIssueCode,
  detail: string,
): PlanAttemptEventAdapterResult {
  return {
    status: 'blocked',
    issue: {
      code,
      detail,
    },
  };
}

function recoveryFor(block: PlanExerciseBlock, event: PlanAttemptEvent): PlanRecoveryCandidate[] {
  return planRecoveryCandidatesForAttempt(block, event);
}

export function buildPlanPhraseAttemptEvent(
  input: PlanPhraseAttemptEventInput,
): PlanAttemptEventAdapterResult {
  const { block } = input;

  if (!block.contentUnitIds.includes(input.contentUnitId)) {
    return blocked('content_unit_mismatch', 'Phrase attempt content unit is not part of the exercise block.');
  }

  const event = createPlanAttemptEvent(block, {
    id: `attempt:${input.planInstanceId}:${block.id}:${input.contentUnitId}`,
    planInstanceId: input.planInstanceId,
    result: input.isCorrect ? 'correct' : 'wrong',
    contentUnitId: input.contentUnitId,
    expectedAnswer: input.expectedAnswer,
    selectedAnswer: input.selectedAnswer,
    occurredAt: input.occurredAt,
    grammarTags: input.grammarTags,
    vocabularyTags: input.vocabularyTags,
    mistakeTags: input.isCorrect ? [] : input.mistakeTags,
    payload: input.payload,
  });

  return {
    status: 'ready',
    event,
    recoveryCandidates: recoveryFor(block, event),
  };
}

/** Builds the canonical plan-attempt event for the dedicated plan-only quiz. */
export function buildPlanQuizAttemptEvent(
  input: PlanQuizAttemptEventInput,
): PlanAttemptEventAdapterResult {
  const { block, question } = input;
  if (block.type !== 'plan_quiz') return blocked('block_type_mismatch', 'Quiz attempts require a plan_quiz block.');
  if (!question.sourcePhraseId || !block.contentUnitIds.includes(question.sourcePhraseId)) {
    return blocked('content_unit_mismatch', 'Quiz question source phrase is not part of the exercise block.');
  }
  const choice = question.choices.find((item) => item.id === input.choiceId);
  if (!choice) return blocked('unknown_choice_id', 'Quiz answer choice is not part of the question.');
  const correct = question.choices.find((item) => item.isCorrect);
  if (!correct) return blocked('missing_correct_choice', 'Quiz question must have one correct choice.');
  const event = createPlanAttemptEvent(block, {
    id: input.attemptId,
    planInstanceId: input.planInstanceId,
    result: choice.isCorrect ? 'correct' : 'wrong',
    contentUnitId: question.sourcePhraseId,
    expectedAnswer: correct.text,
    selectedAnswer: choice.text,
    vocabularyTags: [question.skill],
    mistakeTags: choice.isCorrect ? [] : ['plan_quiz_wrong_answer'],
    payload: { quizQuestionId: question.id, selectedChoiceId: choice.id },
  });
  return { status: 'ready', event, recoveryCandidates: recoveryFor(block, event) };
}
