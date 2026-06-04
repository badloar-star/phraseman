import { buildPlanRecoveryActions } from '../app/personal_plan_recovery_actions';
import {
  writePlanRecoveryActions,
  type PlanRecoveryWriteHandlers,
} from '../app/personal_plan_recovery_write_adapter';
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

function recoveryActions() {
  const event = createPlanAttemptEvent(block, {
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
  return buildPlanRecoveryActions(block, event, {
    currentPlanInstanceId: 'instance_1',
  });
}

describe('personal plan recovery write adapter', () => {
  it('defaults to dry-run and does not call write handlers', async () => {
    const calls: string[] = [];
    const handlers: PlanRecoveryWriteHandlers = {
      recall: () => { calls.push('recall'); },
      trainer: () => { calls.push('trainer'); },
      mistake_analytics: () => { calls.push('mistake_analytics'); },
    };

    const results = await writePlanRecoveryActions(recoveryActions(), { handlers });

    expect(calls).toEqual([]);
    expect(results.map((result) => result.status)).toEqual([
      'dry_run',
      'dry_run',
      'dry_run',
    ]);
  });

  it('applies actions only when apply mode and handlers are explicit', async () => {
    const calls: string[] = [];
    const handlers: PlanRecoveryWriteHandlers = {
      recall: (action) => { calls.push(`recall:${action.contentUnitId}`); },
      trainer: (action) => { calls.push(`trainer:${action.planContext.planTaskId}`); },
      mistake_analytics: (action) => { calls.push(`mistake:${action.grammarTags[0]}`); },
    };

    const results = await writePlanRecoveryActions(recoveryActions(), {
      mode: 'apply',
      currentPlanInstanceId: 'instance_1',
      handlers,
    });

    expect(calls).toEqual([
      'recall:unit_1',
      'trainer:gavan_day1_block',
      'mistake:to-be',
    ]);
    expect(results.map((result) => result.status)).toEqual([
      'applied',
      'applied',
      'applied',
    ]);
  });

  it('does not double-write duplicate actions in one batch', async () => {
    const actions = recoveryActions();
    const calls: string[] = [];
    const results = await writePlanRecoveryActions([...actions, actions[0]], {
      mode: 'apply',
      handlers: {
        recall: (action) => { calls.push(action.id); },
        trainer: (action) => { calls.push(action.id); },
        mistake_analytics: (action) => { calls.push(action.id); },
      },
    });

    expect(calls).toEqual(actions.map((action) => action.id));
    expect(results[results.length - 1]).toEqual(expect.objectContaining({
      actionId: actions[0].id,
      status: 'skipped',
      reason: 'duplicate_action',
    }));
  });

  it('skips already applied actions and actions from another plan instance', async () => {
    const actions = recoveryActions();
    const calls: string[] = [];
    const results = await writePlanRecoveryActions(actions, {
      mode: 'apply',
      currentPlanInstanceId: 'fresh_instance',
      appliedActionIds: [actions[0].id],
      handlers: {
        recall: (action) => { calls.push(action.id); },
        trainer: (action) => { calls.push(action.id); },
        mistake_analytics: (action) => { calls.push(action.id); },
      },
    });

    expect(calls).toEqual([]);
    expect(results.map((result) => result.reason)).toEqual([
      'wrong_plan_instance',
      'wrong_plan_instance',
      'wrong_plan_instance',
    ]);
  });

  it('skips apply actions without handlers instead of writing implicitly', async () => {
    const results = await writePlanRecoveryActions(recoveryActions(), {
      mode: 'apply',
      currentPlanInstanceId: 'instance_1',
      handlers: {
        recall: () => undefined,
      },
    });

    expect(results).toEqual([
      expect.objectContaining({ target: 'recall', status: 'applied' }),
      expect.objectContaining({ target: 'trainer', status: 'skipped', reason: 'missing_handler' }),
      expect.objectContaining({ target: 'mistake_analytics', status: 'skipped', reason: 'missing_handler' }),
    ]);
  });
});
