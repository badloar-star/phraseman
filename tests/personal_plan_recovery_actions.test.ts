import { buildPlanRecoveryActions } from '../app/personal_plan_recovery_actions';
import {
  createPlanAttemptEvent,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';

const baseBlock: PlanExerciseBlock = {
  id: 'gavan_day1_block',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_phrase_build',
  title: 'Useful phrase',
  contentUnitIds: ['unit_1'],
  estimatedMinutes: 3,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

describe('personal plan recovery actions', () => {
  it('maps wrong attempts to dry-run recall, trainer, and mistake analytics actions', () => {
    const event = createPlanAttemptEvent(baseBlock, {
      id: 'attempt_wrong',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: "I here.",
      grammarTags: ['to-be'],
      vocabularyTags: ['arrival'],
      mistakeTags: ['missing-verb'],
    });

    const actions = buildPlanRecoveryActions(baseBlock, event, {
      currentPlanInstanceId: 'instance_1',
    });

    expect(actions.map((action) => action.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
    expect(actions).toEqual(actions.map((action) => expect.objectContaining({
      mode: 'dry_run',
      planInstanceId: 'instance_1',
      planId: 'gavan',
      dayIndex: 1,
      blockId: 'gavan_day1_block',
      contentUnitId: 'unit_1',
      selectedAnswerKnown: true,
      selectedAnswer: 'I here.',
      planContext: expect.objectContaining({
        planId: 'gavan',
        planInstanceId: 'instance_1',
        planTaskId: 'gavan_day1_block',
        planDayIndex: 1,
        planPhraseLessonId: 'unit_1',
      }),
    })));
  });

  it('returns no actions for another plan instance', () => {
    const event = createPlanAttemptEvent(baseBlock, {
      id: 'attempt_old_instance',
      planInstanceId: 'old_instance',
      result: 'wrong',
      contentUnitId: 'unit_1',
    });

    expect(buildPlanRecoveryActions(baseBlock, event, {
      currentPlanInstanceId: 'fresh_instance',
    })).toEqual([]);
  });

  it('returns no actions for correct attempts or no recovery policy', () => {
    const correct = createPlanAttemptEvent(baseBlock, {
      id: 'attempt_correct',
      planInstanceId: 'instance_1',
      result: 'correct',
      contentUnitId: 'unit_1',
    });
    const nonePolicyBlock: PlanExerciseBlock = {
      ...baseBlock,
      recoveryPolicy: 'none',
    };
    const wrongWithNonePolicy = createPlanAttemptEvent(nonePolicyBlock, {
      id: 'attempt_none_policy',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_1',
    });

    expect(buildPlanRecoveryActions(baseBlock, correct)).toEqual([]);
    expect(buildPlanRecoveryActions(nonePolicyBlock, wrongWithNonePolicy)).toEqual([]);
  });

  it('does not carry raw selected answer when the attempt does not know it', () => {
    const event = createPlanAttemptEvent(baseBlock, {
      id: 'attempt_unknown_selection',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_1',
      selectedAnswer: ' ',
      grammarTags: ['word-order'],
    });

    const actions = buildPlanRecoveryActions(baseBlock, event);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.selectedAnswerKnown === false)).toBe(true);
    expect(actions.every((action) => action.selectedAnswer === undefined)).toBe(true);
  });

  it('keeps name-only mistakes out of grammar analytics while preserving recall and trainer actions', () => {
    const event = createPlanAttemptEvent(baseBlock, {
      id: 'attempt_name_only',
      planInstanceId: 'instance_1',
      result: 'wrong',
      contentUnitId: 'unit_1',
      grammarTags: ['name'],
      mistakeTags: ['name-slot'],
    });

    const actions = buildPlanRecoveryActions(baseBlock, event);

    expect(actions.map((action) => action.target)).toEqual([
      'recall',
      'trainer',
    ]);
  });
});
