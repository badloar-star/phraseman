import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addAppliedPlanRecoveryActionIds,
  clearAppliedPlanRecoveryActionIds,
  listAppliedPlanRecoveryActionIds,
  personalPlanRecoveryAppliedActionsStorageKey,
  writePlanRecoveryActionsWithRegistry,
} from '../app/personal_plan_recovery_applied_registry';
import { buildPlanRecoveryActions } from '../app/personal_plan_recovery_actions';
import {
  createPlanAttemptEvent,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

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

describe('personal plan recovery applied action registry', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
  });

  it('stores applied action ids by plan instance', async () => {
    await addAppliedPlanRecoveryActionIds('instance_a', ['a1', 'a2', 'a1']);
    await addAppliedPlanRecoveryActionIds('instance_b', ['b1']);

    expect(await listAppliedPlanRecoveryActionIds('instance_a')).toEqual(['a1', 'a2']);
    expect(await listAppliedPlanRecoveryActionIds('instance_b')).toEqual(['b1']);
  });

  it('clears one plan instance without clearing another', async () => {
    await addAppliedPlanRecoveryActionIds('instance_a', ['a1']);
    await addAppliedPlanRecoveryActionIds('instance_b', ['b1']);

    await clearAppliedPlanRecoveryActionIds('instance_a');

    expect(await listAppliedPlanRecoveryActionIds('instance_a')).toEqual([]);
    expect(await listAppliedPlanRecoveryActionIds('instance_b')).toEqual(['b1']);
  });

  it('uses persisted ids to skip duplicate recovery writes after restart', async () => {
    const actions = recoveryActions();
    const calls: string[] = [];
    await addAppliedPlanRecoveryActionIds('instance_1', [actions[0].id]);

    const results = await writePlanRecoveryActionsWithRegistry('instance_1', actions, {
      mode: 'apply',
      handlers: {
        recall: (action) => { calls.push(`recall:${action.id}`); },
        trainer: (action) => { calls.push(`trainer:${action.id}`); },
        mistake_analytics: (action) => { calls.push(`mistake:${action.id}`); },
      },
    });

    expect(results[0]).toEqual(expect.objectContaining({
      actionId: actions[0].id,
      status: 'skipped',
      reason: 'duplicate_action',
    }));
    expect(calls).toEqual([
      `trainer:${actions[1].id}`,
      `mistake:${actions[2].id}`,
    ]);
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual(actions.map((action) => action.id));
  });

  it('does not persist dry-run action ids', async () => {
    const actions = recoveryActions();

    const results = await writePlanRecoveryActionsWithRegistry('instance_1', actions, {
      handlers: {
        recall: () => undefined,
        trainer: () => undefined,
        mistake_analytics: () => undefined,
      },
    });

    expect(results.every((result) => result.status === 'dry_run')).toBe(true);
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual([]);
  });

  it('persists only actually applied actions', async () => {
    const actions = recoveryActions();

    const results = await writePlanRecoveryActionsWithRegistry('instance_1', actions, {
      mode: 'apply',
      handlers: {
        recall: () => undefined,
      },
    });

    expect(results).toEqual([
      expect.objectContaining({ target: 'recall', status: 'applied' }),
      expect.objectContaining({ target: 'trainer', status: 'skipped', reason: 'missing_handler' }),
      expect.objectContaining({ target: 'mistake_analytics', status: 'skipped', reason: 'missing_handler' }),
    ]);
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual([actions[0].id]);
  });

  it('keeps the registry in a separate storage key from attempt events', async () => {
    await addAppliedPlanRecoveryActionIds('instance_1', ['action_1']);

    const raw = await AsyncStorage.getItem(personalPlanRecoveryAppliedActionsStorageKey());

    expect(raw).toContain('action_1');
    expect(personalPlanRecoveryAppliedActionsStorageKey()).toBe('personal_plan_recovery_applied_actions_v1');
  });

  it('rejects a queued account-A registry write after account generation changes', async () => {
    let release!: () => void;
    const blocker = withAccountTransitionLock(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    await Promise.resolve();

    const write = addAppliedPlanRecoveryActionIds('instance_a', ['action-a']);
    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    release();
    await blocker;

    await expect(write).rejects.toThrow('stale_account_generation');
    expect(await AsyncStorage.getItem(personalPlanRecoveryAppliedActionsStorageKey())).toBeNull();
  });
});
