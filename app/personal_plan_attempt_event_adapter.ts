import {
  createPlanAttemptEvent,
  planRecoveryCandidatesForAttempt,
  type PlanAttemptEvent,
  type PlanExerciseBlock,
  type PlanRecoveryCandidate,
} from './personal_plan_engine_contracts';
import type {
  GavanDay1QuizChoiceDraft,
  GavanDay1QuizItemDraft,
} from './personal_plan_gavan_day1_quiz_draft';

export type PlanAttemptEventAdapterIssueCode =
  | 'block_type_mismatch'
  | 'unknown_choice_id'
  | 'missing_correct_choice'
  | 'content_unit_mismatch';

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

export type PlanQuizAttemptEventInput = {
  block: PlanExerciseBlock;
  item: GavanDay1QuizItemDraft;
  choiceId: string;
  planInstanceId: string;
  occurredAt?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
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

function compactTags(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function correctChoiceFor(item: GavanDay1QuizItemDraft): GavanDay1QuizChoiceDraft | undefined {
  return item.choices.find((choice) => choice.isCorrect);
}

function recoveryFor(block: PlanExerciseBlock, event: PlanAttemptEvent): PlanRecoveryCandidate[] {
  return planRecoveryCandidatesForAttempt(block, event);
}

export function buildPlanQuizAttemptEvent(
  input: PlanQuizAttemptEventInput,
): PlanAttemptEventAdapterResult {
  const { block, item } = input;

  if (block.type !== 'plan_quiz') {
    return blocked('block_type_mismatch', 'Quiz attempts require a plan_quiz block.');
  }

  if (!block.contentUnitIds.includes(item.sourcePhraseId)) {
    return blocked('content_unit_mismatch', 'Quiz item source phrase is not part of the exercise block.');
  }

  const chosenChoice = item.choices.find((choice) => choice.id === input.choiceId);
  if (!chosenChoice) {
    return blocked('unknown_choice_id', 'Quiz attempt choiceId does not belong to the quiz item.');
  }

  const correctChoice = correctChoiceFor(item);
  if (!correctChoice) {
    return blocked('missing_correct_choice', 'Quiz item needs one correct choice before attempt events can be created.');
  }

  const target = chosenChoice.explanationRequirement?.target;
  const event = createPlanAttemptEvent(block, {
    id: `attempt:${input.planInstanceId}:${item.id}:${chosenChoice.id}`,
    planInstanceId: input.planInstanceId,
    result: chosenChoice.isCorrect ? 'correct' : 'wrong',
    contentUnitId: item.sourcePhraseId,
    expectedAnswer: correctChoice.text,
    selectedAnswer: chosenChoice.text,
    occurredAt: input.occurredAt,
    grammarTags: compactTags([`quiz_skill:${item.skill}`]),
    vocabularyTags: compactTags([
      `source_phrase:${item.sourcePhraseId}`,
      target ? `target:${target}` : undefined,
    ]),
    mistakeTags: chosenChoice.isCorrect
      ? []
      : compactTags([
        'quiz_wrong_choice',
        `skill:${item.skill}`,
        target ? `target:${target}` : undefined,
      ]),
    payload: input.payload,
  });

  return {
    status: 'ready',
    event,
    recoveryCandidates: recoveryFor(block, event),
  };
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
