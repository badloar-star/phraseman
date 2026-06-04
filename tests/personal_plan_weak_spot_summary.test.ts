import {
  buildPlanWeakSpotSummary,
  type PlanWeakSpotSummaryInput,
} from '../app/personal_plan_weak_spot_summary';
import {
  buildPlanPhraseAttemptEvent,
  buildPlanQuizAttemptEvent,
  type PlanAttemptEventAdapterResult,
} from '../app/personal_plan_attempt_event_adapter';
import { buildGavanDay1QuizDraft } from '../app/personal_plan_gavan_day1_quiz_draft';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

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

type ReadyAttemptResult = Extract<PlanAttemptEventAdapterResult, { status: 'ready' }>;

function ready(result: PlanAttemptEventAdapterResult): ReadyAttemptResult {
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Expected ready result.');
  return result;
}

function summaryInput(): PlanWeakSpotSummaryInput {
  const quiz = buildGavanDay1QuizDraft();
  const item = quiz.items[0];
  const correctChoice = item.choices.find((choice) => choice.isCorrect)!;
  const wrongChoice = item.choices.find((choice) => !choice.isCorrect)!;

  const correctQuiz = ready(buildPlanQuizAttemptEvent({
    block: quizBlock,
    item,
    choiceId: correctChoice.id,
    planInstanceId: 'instance_gavan_1',
    occurredAt: '2026-06-01T10:00:00.000Z',
  }));
  const wrongQuiz = ready(buildPlanQuizAttemptEvent({
    block: quizBlock,
    item,
    choiceId: wrongChoice.id,
    planInstanceId: 'instance_gavan_1',
    occurredAt: '2026-06-01T10:01:00.000Z',
    payload: {
      safe: 'quiz weak target',
      email: 'beta@example.com',
    },
  }));
  const wrongPhrase = ready(buildPlanPhraseAttemptEvent({
    block: phraseBlock,
    planInstanceId: 'instance_gavan_1',
    contentUnitId: 'gavan-w1-d1-p1',
    expectedAnswer: "I'm here.",
    selectedAnswer: 'I here.',
    isCorrect: false,
    grammarTags: ['to-be'],
    vocabularyTags: ['here'],
    mistakeTags: ['missing-am'],
    occurredAt: '2026-06-01T10:02:00.000Z',
    payload: {
      note: 'card number 123456789',
    },
  }));

  return {
    attempts: [correctQuiz.event, wrongQuiz.event, wrongPhrase.event],
    recoveryCandidates: [
      ...correctQuiz.recoveryCandidates,
      ...wrongQuiz.recoveryCandidates,
      ...wrongPhrase.recoveryCandidates,
    ],
  };
}

describe('personal plan weak spot summary', () => {
  it('summarizes attempts and recovery due counts without treating correct answers as weak spots', () => {
    const summary = buildPlanWeakSpotSummary(summaryInput());

    expect(summary.totals).toEqual({
      attempts: 3,
      correct: 1,
      wrong: 2,
      skipped: 0,
      completed: 0,
      recoveryCandidates: 6,
    });
    expect(summary.due).toEqual({
      recall: { due: true, count: 2 },
      trainer: { due: true, count: 2 },
      mistakeAnalytics: { due: true, count: 2 },
    });
    expect(summary.weakSpots.find((spot) => spot.tag === 'quiz_skill:natural_choice')).toMatchObject({
      kind: 'grammar',
      wrongCount: 1,
      recallDueCount: 1,
      trainerDueCount: 1,
      mistakeAnalyticsDueCount: 1,
    });
    expect(summary.weakSpots.find((spot) => spot.tag === 'to-be')).toMatchObject({
      kind: 'grammar',
      wrongCount: 1,
      recallDueCount: 1,
      trainerDueCount: 1,
      mistakeAnalyticsDueCount: 1,
    });
    expect(summary.weakSpots.find((spot) => spot.tag === "target:I'm here")).toBeUndefined();
  });

  it('groups weak spots by grammar, vocabulary, and mistake tags with stable references', () => {
    const summary = buildPlanWeakSpotSummary(summaryInput());

    expect(summary.weakSpots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'grammar:quiz-skill-natural-choice',
        kind: 'grammar',
        tag: 'quiz_skill:natural_choice',
        planInstanceIds: ['instance_gavan_1'],
        blockIds: ['gavan-week1-day1:block-quiz'],
        dayIndexes: [1],
        contentUnitIds: ['gavan-w1-d1-p1'],
      }),
      expect.objectContaining({
        id: 'vocabulary:target-i-m',
        kind: 'vocabulary',
        tag: "target:I'm",
      }),
      expect.objectContaining({
        id: 'mistake:missing-am',
        kind: 'mistake',
        tag: 'missing-am',
      }),
    ]));
  });

  it('can filter to the current plan instance', () => {
    const input = summaryInput();
    input.attempts.push({
      ...input.attempts[1],
      id: 'attempt:other',
      planInstanceId: 'other_instance',
      grammarTags: ['other-grammar'],
      vocabularyTags: ['other-vocab'],
      mistakeTags: ['other-mistake'],
    });

    const summary = buildPlanWeakSpotSummary(input, {
      planInstanceId: 'instance_gavan_1',
    });

    expect(summary.totals.attempts).toBe(3);
    expect(summary.weakSpots.some((spot) => spot.tag === 'other-grammar')).toBe(false);
  });

  it('does not expose attempt payload or sensitive values in the summary', () => {
    const summaryText = JSON.stringify(buildPlanWeakSpotSummary(summaryInput()));

    expect(summaryText).not.toContain('sanitizedPayload');
    expect(summaryText).not.toContain('beta@example.com');
    expect(summaryText).not.toContain('123456789');
    expect(summaryText).not.toContain('card number');
  });
});
