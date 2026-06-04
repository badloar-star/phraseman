import { validatePlanRecoveryApplyGate } from '../app/personal_plan_recovery_apply_gate';
import { buildPlanRecoveryActions } from '../app/personal_plan_recovery_actions';
import {
  createPlanAttemptEvent,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';

const block: PlanExerciseBlock = {
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

function recoveryActions(planInstanceId = 'instance_1') {
  const event = createPlanAttemptEvent(block, {
    id: `attempt_wrong_${planInstanceId}`,
    planInstanceId,
    result: 'wrong',
    contentUnitId: 'unit_1',
    expectedAnswer: "I'm here.",
    selectedAnswer: "I here.",
    grammarTags: ['to-be'],
    vocabularyTags: ['arrival'],
    mistakeTags: ['missing-verb'],
  });
  return buildPlanRecoveryActions(block, event);
}

describe('personal plan recovery apply gate', () => {
  it('passes when handlers cover every action for the current plan instance', () => {
    const issues = validatePlanRecoveryApplyGate({
      actions: recoveryActions(),
      currentPlanInstanceId: 'instance_1',
      handlers: {
        recall: () => undefined,
        trainer: () => undefined,
        mistake_analytics: () => undefined,
      },
    });

    expect(issues).toEqual([]);
  });

  it('reports missing handlers before apply can silently skip targets', () => {
    const issues = validatePlanRecoveryApplyGate({
      actions: recoveryActions(),
      currentPlanInstanceId: 'instance_1',
      handlers: {
        recall: () => undefined,
      },
    });

    expect(issues).toEqual([
      expect.objectContaining({ code: 'missing_handler', target: 'trainer' }),
      expect.objectContaining({ code: 'missing_handler', target: 'mistake_analytics' }),
    ]);
  });

  it('reports duplicate actions from persisted ids and from the same batch', () => {
    const actions = recoveryActions();
    const issues = validatePlanRecoveryApplyGate({
      actions: [...actions, actions[1]],
      currentPlanInstanceId: 'instance_1',
      appliedActionIds: [actions[0].id],
      handlers: {
        recall: () => undefined,
        trainer: () => undefined,
        mistake_analytics: () => undefined,
      },
    });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate_action', actionId: actions[0].id }),
      expect.objectContaining({ code: 'duplicate_action', actionId: actions[1].id }),
    ]));
  });

  it('reports cross-instance actions', () => {
    const [foreignAction] = recoveryActions('old_instance');

    expect(validatePlanRecoveryApplyGate({
      actions: [foreignAction],
      currentPlanInstanceId: 'fresh_instance',
      handlers: {
        recall: () => undefined,
        trainer: () => undefined,
        mistake_analytics: () => undefined,
      },
    })).toEqual([
      expect.objectContaining({
        code: 'wrong_plan_instance',
        actionId: foreignAction.id,
      }),
    ]);
  });

  it('reports empty action batches', () => {
    expect(validatePlanRecoveryApplyGate({
      actions: [],
      currentPlanInstanceId: 'instance_1',
      handlers: {
        recall: () => undefined,
        trainer: () => undefined,
        mistake_analytics: () => undefined,
      },
    })).toEqual([{ code: 'empty_actions' }]);
  });
});
