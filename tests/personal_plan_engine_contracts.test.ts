import {
  PLAN_EXERCISE_TYPES,
  canPlanAttemptAffectProgress,
  createPlanAttemptEvent,
  planExerciseBlocksForDay,
  planRecoveryCandidatesForAttempt,
  sanitizePlanAttemptPayload,
  validatePlanEngineQuality,
  validatePlanAttemptEventContract,
  validatePlanExerciseBlockContract,
  validatePlanExplanationCardContract,
  type PlanAttemptEvent,
  type PlanExerciseBlock,
  type PlanExplanationCard,
} from '../app/personal_plan_engine_contracts';
import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import { buildPersonalPlanDayPassport } from '../app/personal_plan_quality';

const baseAttempt: PlanAttemptEvent = {
  id: 'attempt_1',
  planInstanceId: 'instance_1',
  planId: 'gavan',
  dayIndex: 1,
  blockId: 'block_1',
  exerciseType: 'plan_phrase_build',
  contentUnitId: 'unit_1',
  occurredAt: '2026-06-01T00:00:00.000Z',
  result: 'correct',
  progressEligible: true,
  expectedAnswer: 'I need help.',
  selectedAnswerKnown: false,
  grammarTags: ['present-simple'],
  vocabularyTags: ['help'],
  mistakeTags: [],
};

describe('personal plan engine contracts', () => {
  it('declares the first implementation exercise types before content work starts', () => {
    expect(PLAN_EXERCISE_TYPES).toEqual(expect.arrayContaining([
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_phrase_recall',
    ]));
    expect(PLAN_EXERCISE_TYPES).toContain('plan_quiz');
  });

  it('allows progress only from correct or completed eligible attempts', () => {
    expect(canPlanAttemptAffectProgress(baseAttempt)).toBe(true);

    expect(canPlanAttemptAffectProgress({
      ...baseAttempt,
      id: 'attempt_wrong',
      result: 'wrong',
      progressEligible: false,
    })).toBe(false);
  });

  it('rejects wrong attempts that try to count toward progress', () => {
    const issues = validatePlanAttemptEventContract({
      ...baseAttempt,
      id: 'attempt_bad',
      result: 'wrong',
      progressEligible: true,
    });

    expect(issues).toContain('wrong_attempt_marked_progress_eligible');
  });

  it('requires planInstanceId and blocks sensitive attempt payloads', () => {
    const issues = validatePlanAttemptEventContract({
      ...baseAttempt,
      planInstanceId: '',
      sanitizedPayload: {
        note: 'my email is alex@example.com',
      },
    });

    expect(issues).toEqual(expect.arrayContaining([
      'missing_plan_instance_id',
      'sensitive_payload',
    ]));
  });

  it('does not allow selected-answer explanations unless the selected answer is known', () => {
    const issues = validatePlanAttemptEventContract({
      ...baseAttempt,
      selectedAnswerKnown: true,
      selectedAnswer: '',
    });

    expect(issues).toContain('selected_answer_claim_without_value');
  });

  it('requires plan exercise blocks to have content units unless they are linked lesson slices', () => {
    const block: PlanExerciseBlock = {
      id: 'block_1',
      planId: 'gavan',
      dayIndex: 1,
      type: 'plan_missing_word',
      title: 'One useful phrase',
      contentUnitIds: [],
      estimatedMinutes: 3,
      requiredFor: [5, 10, 15, 20],
      prerequisiteLessonIds: [1],
      progressPolicy: 'correct_only',
      recoveryPolicy: 'return_wrong_to_recall',
    };

    expect(validatePlanExerciseBlockContract(block)).toContain('missing_content_units');
  });

  it('blocks wrong-answer explanation cards that could invent a selected option', () => {
    const card: PlanExplanationCard = {
      id: 'explain_1',
      contentUnitId: 'unit_1',
      trigger: 'wrong',
      tone: 'correction',
      title: 'Try this version',
      body: 'Use this phrase when you want a simple, polite request.',
      grammarTags: [],
      vocabularyTags: ['request'],
      explainsSelectedAnswerOnlyWhenKnown: false,
    };

    expect(validatePlanExplanationCardContract(card)).toContain('wrong_explanation_can_hallucinate_selection');
  });

  it('maps existing daily tasks into stable exercise blocks after the day 1 clean reset', () => {
    const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
    const day1 = gavan.days[0];

    const blocks = planExerciseBlocksForDay(gavan, day1);

    expect(blocks.map((block) => block.type)).toEqual([
      'plan_phrase_build',
      'plan_missing_word',
      'plan_phrase_recall',
      'plan_pronunciation_repeat',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_quiz',
    ]);
    expect(blocks.filter((block) => block.type !== 'plan_pronunciation_repeat').every((block) => block.progressPolicy === 'correct_only')).toBe(true);
    expect(blocks.find((block) => block.type === 'plan_pronunciation_repeat')?.progressPolicy).toBe('completion_only');
    expect(blocks.every((block) => validatePlanExerciseBlockContract(block).length === 0)).toBe(true);
    expect(blocks.find((block) => block.type === 'plan_missing_word')?.recoveryPolicy).not.toBe('none');

    const passport = buildPersonalPlanDayPassport(gavan, day1);
    expect(passport.ready).toBe(true);
    expect(passport.issues.map((issue) => issue.code)).not.toContain('scaffold_day');
  });

  it('collects engine quality issues across blocks and attempts', () => {
    const badBlock: PlanExerciseBlock = {
      id: 'bad_recall',
      planId: 'gavan',
      dayIndex: 1,
      type: 'plan_phrase_recall',
      title: 'Recall',
      contentUnitIds: [],
      estimatedMinutes: 0,
      requiredFor: [15],
      prerequisiteLessonIds: [],
      progressPolicy: 'correct_only',
      recoveryPolicy: 'none',
    };

    const issues = validatePlanEngineQuality({
      blocks: [badBlock],
      attempts: [{
        ...baseAttempt,
        id: 'bad_attempt',
        planInstanceId: '',
        blockId: 'missing_block',
        exerciseType: 'not_real_exercise' as any,
        result: 'wrong',
        progressEligible: true,
        selectedAnswerKnown: true,
        selectedAnswer: '',
        sanitizedPayload: { note: 'card number 123456789' },
      }],
      explanationCards: [{
        id: 'bad_explanation',
        contentUnitId: 'unit_1',
        trigger: 'wrong',
        tone: 'correction',
        title: 'Debug route',
        body: 'Wrong option explanation without known selection.',
        grammarTags: [],
        vocabularyTags: [],
        explainsSelectedAnswerOnlyWhenKnown: false,
      }],
    });

    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'missing_content_units',
      'invalid_estimated_minutes',
      'recall_without_recovery_policy',
      'missing_plan_instance_id',
      'unknown_exercise_type',
      'wrong_attempt_marked_progress_eligible',
      'selected_answer_claim_without_value',
      'sensitive_payload',
      'attempt_block_missing',
      'wrong_explanation_can_hallucinate_selection',
      'technical_copy',
    ]));
  });

  it('accepts mapped current Gavan blocks as engine-valid with a ready day passport', () => {
    const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
    const day1 = gavan.days[0];
    const blocks = planExerciseBlocksForDay(gavan, day1);

    expect(validatePlanEngineQuality({ blocks }).map((issue) => issue.code)).toEqual([]);
    expect(buildPersonalPlanDayPassport(gavan, day1).ready).toBe(true);
  });

  it('creates safe attempt events from exercise blocks', () => {
    const block: PlanExerciseBlock = {
      id: 'block_1',
      planId: 'gavan',
      dayIndex: 2,
      type: 'plan_phrase_build',
      title: 'Useful phrase',
      contentUnitIds: ['unit_1'],
      estimatedMinutes: 4,
      requiredFor: [10, 15, 20],
      prerequisiteLessonIds: [1],
      progressPolicy: 'correct_only',
      recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    };

    const event = createPlanAttemptEvent(block, {
      id: 'attempt_factory_1',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: 'I need help.',
      selectedAnswer: ' ',
      grammarTags: ['present-simple'],
      vocabularyTags: ['help'],
      mistakeTags: ['word-order'],
      occurredAt: '2026-06-01T10:00:00.000Z',
      payload: {
        safeReason: 'word order',
        email: 'alex@example.com',
        phone: '+353 123456789',
        detail: 'card number 123456789',
      },
    });

    expect(event).toEqual(expect.objectContaining({
      id: 'attempt_factory_1',
      planInstanceId: 'instance_1',
      planId: 'gavan',
      dayIndex: 2,
      blockId: 'block_1',
      exerciseType: 'plan_phrase_build',
      result: 'wrong',
      progressEligible: false,
      selectedAnswerKnown: false,
      expectedAnswer: 'I need help.',
    }));
    expect(event.sanitizedPayload).toEqual({ safeReason: 'word order' });
    expect(validatePlanAttemptEventContract(event)).toEqual([]);
  });

  it('uses block progress policy when creating attempt events', () => {
    const completionBlock: PlanExerciseBlock = {
      id: 'practice_block',
      planId: 'gavan',
      dayIndex: 3,
      type: 'personal_practice_seeded',
      title: 'Practice',
      contentUnitIds: ['practice:daily'],
      estimatedMinutes: 5,
      requiredFor: [15, 20],
      prerequisiteLessonIds: [],
      progressPolicy: 'completion_only',
      recoveryPolicy: 'none',
    };

    const completed = createPlanAttemptEvent(completionBlock, {
      id: 'attempt_completed',
      planInstanceId: 'instance_1',
      result: 'completed',
    });
    const correct = createPlanAttemptEvent(completionBlock, {
      id: 'attempt_correct',
      planInstanceId: 'instance_1',
      result: 'correct',
    });

    expect(canPlanAttemptAffectProgress(completed)).toBe(true);
    expect(canPlanAttemptAffectProgress(correct)).toBe(false);
  });

  it('sanitizes sensitive attempt payload values without mutating safe values', () => {
    expect(sanitizePlanAttemptPayload({
      safe: 'short retry',
      email: 'beta@example.com',
      address: '221 Baker Street',
      count: 2,
      ok: true,
      empty: null,
    })).toEqual({
      safe: 'short retry',
      count: 2,
      ok: true,
      empty: null,
    });
  });

  it('creates recovery candidates from wrong attempts without making progress eligible', () => {
    const block: PlanExerciseBlock = {
      id: 'block_recovery',
      planId: 'gavan',
      dayIndex: 4,
      type: 'plan_missing_word',
      title: 'Natural phrase',
      contentUnitIds: ['unit_recovery'],
      estimatedMinutes: 3,
      requiredFor: [10, 15, 20],
      prerequisiteLessonIds: [1],
      progressPolicy: 'correct_only',
      recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    };
    const event = createPlanAttemptEvent(block, {
      id: 'attempt_recovery',
      planInstanceId: 'instance_recovery',
      result: 'wrong',
      contentUnitId: 'unit_recovery',
      expectedAnswer: "I'm here.",
      selectedAnswer: undefined,
      grammarTags: ['to-be'],
      vocabularyTags: ['arrival'],
      mistakeTags: ['missing-subject'],
    });

    const candidates = planRecoveryCandidatesForAttempt(block, event);

    expect(canPlanAttemptAffectProgress(event)).toBe(false);
    expect(candidates.map((candidate) => candidate.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
    expect(candidates).toEqual(candidates.map((candidate) => expect.objectContaining({
      planInstanceId: 'instance_recovery',
      planId: 'gavan',
      dayIndex: 4,
      blockId: 'block_recovery',
      contentUnitId: 'unit_recovery',
      reason: 'wrong_attempt',
      selectedAnswerKnown: false,
    })));
    expect(candidates.every((candidate) => candidate.selectedAnswer === undefined)).toBe(true);
  });

  it('does not create recovery candidates for correct attempts, none policy, or mismatched content units', () => {
    const block: PlanExerciseBlock = {
      id: 'block_recovery_none',
      planId: 'gavan',
      dayIndex: 5,
      type: 'plan_choose_natural_phrase',
      title: 'Choose the natural phrase',
      contentUnitIds: ['unit_ok'],
      estimatedMinutes: 2,
      requiredFor: [5, 10, 15, 20],
      prerequisiteLessonIds: [1],
      progressPolicy: 'correct_only',
      recoveryPolicy: 'none',
    };
    const wrongWithNonePolicy = createPlanAttemptEvent(block, {
      id: 'attempt_none',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_ok',
    });
    const correctWithRecoveryPolicy = createPlanAttemptEvent({
      ...block,
      recoveryPolicy: 'return_wrong_to_recall',
    }, {
      id: 'attempt_correct_recovery',
      planInstanceId: 'instance_1',
      result: 'correct',
      contentUnitId: 'unit_ok',
    });
    const wrongMismatchedUnit = createPlanAttemptEvent({
      ...block,
      recoveryPolicy: 'return_wrong_to_recall',
    }, {
      id: 'attempt_bad_unit',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_missing',
    });

    expect(planRecoveryCandidatesForAttempt(block, wrongWithNonePolicy)).toEqual([]);
    expect(planRecoveryCandidatesForAttempt({ ...block, recoveryPolicy: 'return_wrong_to_recall' }, correctWithRecoveryPolicy)).toEqual([]);
    expect(planRecoveryCandidatesForAttempt({ ...block, recoveryPolicy: 'return_wrong_to_recall' }, wrongMismatchedUnit)).toEqual([]);
  });

  it('keeps selected answer only when the attempt really knows it', () => {
    const block: PlanExerciseBlock = {
      id: 'block_selected_answer',
      planId: 'gavan',
      dayIndex: 6,
      type: 'plan_phrase_build',
      title: 'Build a phrase',
      contentUnitIds: ['unit_selected_answer'],
      estimatedMinutes: 3,
      requiredFor: [10, 15, 20],
      prerequisiteLessonIds: [1],
      progressPolicy: 'correct_only',
      recoveryPolicy: 'return_wrong_to_recall',
    };
    const event = createPlanAttemptEvent(block, {
      id: 'attempt_selected_answer',
      planInstanceId: 'instance_selected',
      result: 'wrong',
      contentUnitId: 'unit_selected_answer',
      expectedAnswer: 'Could you repeat that?',
      selectedAnswer: 'Can you say that again?',
      vocabularyTags: ['repeat'],
    });

    expect(planRecoveryCandidatesForAttempt(block, event)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        target: 'recall',
        selectedAnswerKnown: true,
        selectedAnswer: 'Can you say that again?',
      }),
      expect.objectContaining({
        target: 'mistake_analytics',
        selectedAnswerKnown: true,
        selectedAnswer: 'Can you say that again?',
      }),
    ]));
  });
});
