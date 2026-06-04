import {
  buildPlanPhraseAttemptEvent,
  buildPlanQuizAttemptEvent,
  type PlanAttemptEventAdapterResult,
} from '../app/personal_plan_attempt_event_adapter';
import { buildGavanDay1QuizDraft } from '../app/personal_plan_gavan_day1_quiz_draft';
import {
  canPlanAttemptAffectProgress,
  validatePlanAttemptEventContract,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';

const quizBlock: PlanExerciseBlock = {
  id: 'gavan-week1-day1:block-quiz',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_quiz',
  title: 'Проверить себя',
  contentUnitIds: ['gavan-w1-d1-p1', 'gavan-w1-d1-p2'],
  estimatedMinutes: 4,
  requiredFor: [15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

const phraseBlock: PlanExerciseBlock = {
  id: 'gavan-week1-day1:block-phrase',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_phrase_build',
  title: 'Собрать фразу',
  contentUnitIds: ['gavan-w1-d1-p1'],
  estimatedMinutes: 5,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

function expectReady(result: PlanAttemptEventAdapterResult) {
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Expected ready attempt event.');
  return result;
}

describe('personal plan attempt event adapter', () => {
  it('builds a correct quiz attempt from a chosen choice', () => {
    const item = buildGavanDay1QuizDraft().items[0];
    const choice = item.choices.find((candidate) => candidate.isCorrect)!;
    const result = expectReady(buildPlanQuizAttemptEvent({
      block: quizBlock,
      item,
      choiceId: choice.id,
      planInstanceId: 'instance_gavan_1',
      occurredAt: '2026-06-01T12:00:00.000Z',
      payload: {
        safeSource: 'day quiz',
        email: 'beta@example.com',
        note: 'card number 123456789',
      },
    }));

    expect(result.event).toMatchObject({
      planInstanceId: 'instance_gavan_1',
      planId: 'gavan',
      dayIndex: 1,
      blockId: quizBlock.id,
      exerciseType: 'plan_quiz',
      contentUnitId: 'gavan-w1-d1-p1',
      result: 'correct',
      progressEligible: true,
      expectedAnswer: "I'm here.",
      selectedAnswer: "I'm here.",
      selectedAnswerKnown: true,
      grammarTags: ['quiz_skill:natural_choice'],
      vocabularyTags: ['source_phrase:gavan-w1-d1-p1', "target:I'm here."],
      mistakeTags: [],
      sanitizedPayload: { safeSource: 'day quiz' },
    });
    expect(result.recoveryCandidates).toEqual([]);
    expect(canPlanAttemptAffectProgress(result.event)).toBe(true);
    expect(validatePlanAttemptEventContract(result.event)).toEqual([]);
  });

  it('builds a wrong quiz attempt that feeds recall, trainer, and mistake analytics', () => {
    const item = buildGavanDay1QuizDraft().items[0];
    const wrongChoice = item.choices.find((candidate) => !candidate.isCorrect)!;
    const result = expectReady(buildPlanQuizAttemptEvent({
      block: quizBlock,
      item,
      choiceId: wrongChoice.id,
      planInstanceId: 'instance_gavan_1',
      occurredAt: '2026-06-01T12:01:00.000Z',
    }));

    expect(result.event).toMatchObject({
      result: 'wrong',
      progressEligible: false,
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here.',
      selectedAnswerKnown: true,
      grammarTags: ['quiz_skill:natural_choice'],
      vocabularyTags: ['source_phrase:gavan-w1-d1-p1', "target:I'm"],
      mistakeTags: ['quiz_wrong_choice', 'skill:natural_choice', "target:I'm"],
    });
    expect(result.recoveryCandidates.map((candidate) => candidate.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
    expect(result.recoveryCandidates).toEqual(result.recoveryCandidates.map((candidate) =>
      expect.objectContaining({
        planInstanceId: 'instance_gavan_1',
        blockId: quizBlock.id,
        contentUnitId: 'gavan-w1-d1-p1',
        selectedAnswerKnown: true,
        selectedAnswer: 'I here.',
        reason: 'wrong_attempt',
      }),
    ));
    expect(canPlanAttemptAffectProgress(result.event)).toBe(false);
    expect(validatePlanAttemptEventContract(result.event)).toEqual([]);
  });

  it('does not claim a selected answer when the chosen choice has no text', () => {
    const item = buildGavanDay1QuizDraft().items[0];
    const wrongChoice = item.choices.find((candidate) => !candidate.isCorrect)!;
    wrongChoice.text = ' ';

    const result = expectReady(buildPlanQuizAttemptEvent({
      block: quizBlock,
      item,
      choiceId: wrongChoice.id,
      planInstanceId: 'instance_gavan_1',
    }));

    expect(result.event.selectedAnswerKnown).toBe(false);
    expect(result.event.selectedAnswer).toBeUndefined();
    expect(result.recoveryCandidates.every((candidate) => !candidate.selectedAnswerKnown)).toBe(true);
    expect(validatePlanAttemptEventContract(result.event)).toEqual([]);
  });

  it('blocks quiz attempts that point to an unknown choice or wrong block type', () => {
    const item = buildGavanDay1QuizDraft().items[0];

    expect(buildPlanQuizAttemptEvent({
      block: quizBlock,
      item,
      choiceId: 'missing-choice',
      planInstanceId: 'instance_gavan_1',
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'unknown_choice_id',
        detail: 'Quiz attempt choiceId does not belong to the quiz item.',
      },
    });

    expect(buildPlanQuizAttemptEvent({
      block: { ...quizBlock, type: 'plan_phrase_build' },
      item,
      choiceId: item.choices[0].id,
      planInstanceId: 'instance_gavan_1',
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'block_type_mismatch',
        detail: 'Quiz attempts require a plan_quiz block.',
      },
    });
  });

  it('builds phrase attempts with the same progress and recovery rules', () => {
    const result = expectReady(buildPlanPhraseAttemptEvent({
      block: phraseBlock,
      planInstanceId: 'instance_phrase_1',
      contentUnitId: 'gavan-w1-d1-p1',
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here.',
      isCorrect: false,
      grammarTags: ['to-be'],
      vocabularyTags: ['here'],
      mistakeTags: ['missing-am'],
      occurredAt: '2026-06-01T12:02:00.000Z',
    }));

    expect(result.event).toMatchObject({
      result: 'wrong',
      progressEligible: false,
      selectedAnswer: 'I here.',
      selectedAnswerKnown: true,
      grammarTags: ['to-be'],
      vocabularyTags: ['here'],
      mistakeTags: ['missing-am'],
    });
    expect(result.recoveryCandidates.map((candidate) => candidate.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
    expect(validatePlanAttemptEventContract(result.event)).toEqual([]);
  });
});
