import {
  buildPlanRuntimeItem,
  submitPlanRuntimeAnswer,
  validatePlanRuntimeItem,
  type PlanRuntimeSubmissionResult,
} from '../app/personal_plan_exercise_runtime';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import {
  validatePlanAttemptEventContract,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';

const candidate = buildGavanDay1ContentCandidate();
const [herePhrase, minutePhrase, repeatPhrase] = candidate.phrases;

const baseBlock = {
  id: 'gavan-week1-day1:block-runtime',
  planId: 'gavan',
  dayIndex: 1,
  title: 'Фразы дня',
  contentUnitIds: candidate.phrases.map((phrase) => phrase.id),
  estimatedMinutes: 5,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
} satisfies Omit<PlanExerciseBlock, 'type'>;

function expectReady(result: PlanRuntimeSubmissionResult) {
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') {
    throw new Error(`Expected ready runtime result, got ${result.issue.code}`);
  }
  return result;
}

describe('personal plan exercise runtime', () => {
  it('builds a choose-natural-phrase item and records only correct answers as progress', () => {
    const block: PlanExerciseBlock = {
      ...baseBlock,
      id: 'gavan-week1-day1:block-choose',
      type: 'plan_choose_natural_phrase',
    };
    const item = buildPlanRuntimeItem({
      block,
      phrase: herePhrase,
      exerciseType: 'plan_choose_natural_phrase',
      distractors: ['I here.', "I'm at here."],
    });

    expect(item).toMatchObject({
      exerciseType: 'plan_choose_natural_phrase',
      phraseId: herePhrase.id,
      promptRu: 'Выберите естественную фразу.',
      targetRu: 'Я здесь.',
      correctAnswer: "I'm here.",
      hintsEnabled: false,
      correctWordHighlighting: false,
      errorsReturnLater: true,
    });
    expect(item.choices.map((choice) => choice.text)).toEqual([
      "I'm here.",
      'I here.',
      "I'm at here.",
    ]);
    expect(validatePlanRuntimeItem(item, block)).toEqual([]);

    const correct = expectReady(submitPlanRuntimeAnswer({
      block,
      item,
      selectedAnswer: "I'm here.",
      planInstanceId: 'instance_gavan_runtime',
      occurredAt: '2026-06-03T12:00:00.000Z',
    }));

    expect(correct.isCorrect).toBe(true);
    expect(correct.event).toMatchObject({
      result: 'correct',
      progressEligible: true,
      exerciseType: 'plan_choose_natural_phrase',
      contentUnitId: herePhrase.id,
      expectedAnswer: "I'm here.",
      selectedAnswer: "I'm here.",
      grammarTags: ["I'm"],
      vocabularyTags: ['here'],
      mistakeTags: [],
    });
    expect(correct.recoveryCandidates).toEqual([]);
    expect(validatePlanAttemptEventContract(correct.event)).toEqual([]);

    const wrong = expectReady(submitPlanRuntimeAnswer({
      block,
      item,
      selectedAnswer: 'I here.',
      planInstanceId: 'instance_gavan_runtime',
      occurredAt: '2026-06-03T12:01:00.000Z',
    }));

    expect(wrong.isCorrect).toBe(false);
    expect(wrong.event.progressEligible).toBe(false);
    expect(wrong.event.mistakeTags).toEqual([
      'plan_exercise_wrong_answer',
      'exercise:plan_choose_natural_phrase',
      "construction:I'm",
      'vocabulary:here',
    ]);
    expect(wrong.recoveryCandidates.map((recovery) => recovery.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
  });

  it('builds a missing-word item with exact word-count choices and grounded tags', () => {
    const block: PlanExerciseBlock = {
      ...baseBlock,
      id: 'gavan-week1-day1:block-missing',
      type: 'plan_missing_word',
    };
    const item = buildPlanRuntimeItem({
      block,
      phrase: minutePhrase,
      exerciseType: 'plan_missing_word',
      missingWord: 'need',
      distractors: ['help', 'repeat'],
    });

    expect(item.promptRu).toBe('Вставьте пропущенное слово.');
    expect(item.displayEnglish).toBe('I ___ a minute.');
    expect(item.correctAnswer).toBe('need');
    expect(item.choices.map((choice) => choice.text)).toEqual(['need', 'help', 'repeat']);
    expect(validatePlanRuntimeItem(item, block)).toEqual([]);

    const result = expectReady(submitPlanRuntimeAnswer({
      block,
      item,
      selectedAnswer: 'NEED',
      planInstanceId: 'instance_gavan_runtime',
    }));

    expect(result.isCorrect).toBe(true);
    expect(result.event).toMatchObject({
      result: 'correct',
      progressEligible: true,
      expectedAnswer: 'need',
      selectedAnswer: 'NEED',
      grammarTags: ['I need'],
      vocabularyTags: ['need', 'minute'],
    });
  });

  it('builds a lesson-style phrase-build item with exact word tiles and honest recovery', () => {
    const block: PlanExerciseBlock = {
      ...baseBlock,
      id: 'gavan-week1-day1:block-phrase-build',
      type: 'plan_phrase_build',
    };
    const item = buildPlanRuntimeItem({
      block,
      phrase: herePhrase,
      exerciseType: 'plan_phrase_build',
      distractors: ['ready', 'busy'],
    });

    expect(item).toMatchObject({
      exerciseType: 'plan_phrase_build',
      phraseId: herePhrase.id,
      correctAnswer: "I'm here.",
      choices: [],
      targetTokenCount: 2,
      wordTiles: ["I'm", 'here'],
      distractorTiles: ['ready', 'busy'],
      hintsEnabled: false,
      correctWordHighlighting: false,
      errorsReturnLater: true,
    });
    expect(validatePlanRuntimeItem(item, block)).toEqual([]);

    const correct = expectReady(submitPlanRuntimeAnswer({
      block,
      item,
      selectedAnswer: item.wordTiles?.join(' '),
      planInstanceId: 'instance_gavan_runtime',
    }));
    expect(correct.isCorrect).toBe(true);
    expect(correct.event.progressEligible).toBe(true);
    expect(correct.event.exerciseType).toBe('plan_phrase_build');

    const wrong = expectReady(submitPlanRuntimeAnswer({
      block,
      item,
      selectedAnswer: 'here I am',
      planInstanceId: 'instance_gavan_runtime',
    }));
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.event.progressEligible).toBe(false);
    expect(wrong.recoveryCandidates.map((recovery) => recovery.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
  });

  it('builds strict plan phrase recall with no hints and sends misses back to recovery', () => {
    const block: PlanExerciseBlock = {
      ...baseBlock,
      id: 'gavan-week1-day1:block-recall',
      type: 'plan_phrase_recall',
    };
    const item = buildPlanRuntimeItem({
      block,
      phrase: repeatPhrase,
      exerciseType: 'plan_phrase_recall',
    });

    expect(item.promptRu).toBe('Вспомните фразу без подсказок.');
    expect(item.choices).toEqual([]);
    expect(item.hintsEnabled).toBe(false);
    expect(item.correctWordHighlighting).toBe(false);
    expect(item.errorsReturnLater).toBe(true);
    expect(validatePlanRuntimeItem(item, block)).toEqual([]);

    const result = expectReady(submitPlanRuntimeAnswer({
      block,
      item,
      selectedAnswer: 'Could repeat that?',
      planInstanceId: 'instance_gavan_runtime',
    }));

    expect(result.isCorrect).toBe(false);
    expect(result.event).toMatchObject({
      result: 'wrong',
      progressEligible: false,
      expectedAnswer: 'Could you repeat that?',
      selectedAnswer: 'Could repeat that?',
      grammarTags: ['Could you'],
      vocabularyTags: ['repeat', 'that'],
    });
    expect(result.recoveryCandidates.map((recovery) => recovery.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
  });

  it('blocks mismatched blocks, missing content units, duplicate choices, and technical copy', () => {
    const chooseBlock: PlanExerciseBlock = {
      ...baseBlock,
      id: 'gavan-week1-day1:block-choose',
      type: 'plan_choose_natural_phrase',
    };
    const recallBlock: PlanExerciseBlock = {
      ...baseBlock,
      id: 'gavan-week1-day1:block-recall',
      type: 'plan_phrase_recall',
    };
    const item = buildPlanRuntimeItem({
      block: chooseBlock,
      phrase: herePhrase,
      exerciseType: 'plan_choose_natural_phrase',
      distractors: ["I'm here."],
    });

    expect(validatePlanRuntimeItem(item, chooseBlock)).toEqual([
      'duplicate_choice_text',
    ]);
    expect(validatePlanRuntimeItem({
      ...item,
      promptRu: 'DEV placeholder route renderer',
      choices: [{ id: 'ok', text: "I'm here.", isCorrect: true }],
    }, chooseBlock)).toEqual(expect.arrayContaining(['technical_copy']));

    expect(submitPlanRuntimeAnswer({
      block: recallBlock,
      item,
      selectedAnswer: "I'm here.",
      planInstanceId: 'instance_gavan_runtime',
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'block_type_mismatch',
        detail: 'Runtime item exercise type must match the exercise block type.',
      },
    });

    expect(submitPlanRuntimeAnswer({
      block: { ...chooseBlock, contentUnitIds: [] },
      item,
      selectedAnswer: "I'm here.",
      planInstanceId: 'instance_gavan_runtime',
    })).toEqual({
      status: 'blocked',
      issue: {
        code: 'content_unit_mismatch',
        detail: 'Runtime item phrase is not part of the exercise block.',
      },
    });
  });
});
