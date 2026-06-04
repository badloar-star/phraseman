import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearAppliedPlanRecoveryActionIds,
  listAppliedPlanRecoveryActionIds,
  writePlanRecoveryActionsWithRegistry,
} from '../app/personal_plan_recovery_applied_registry';
import { createPlanRecoveryLegacyHandlers, type PlanRecoveryLegacyPayload } from '../app/personal_plan_recovery_legacy_handlers';
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

function actionsForAttempt(input?: Partial<Parameters<typeof createPlanAttemptEvent>[1]>) {
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
    ...input,
  });
  return buildPlanRecoveryActions(block, event, {
    currentPlanInstanceId: 'instance_1',
  });
}

describe('personal plan recovery legacy handlers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearAppliedPlanRecoveryActionIds('instance_1');
  });

  it('does not call legacy writers in dry-run mode', async () => {
    const calls: PlanRecoveryLegacyPayload[] = [];
    const handlers = createPlanRecoveryLegacyHandlers({
      recall: (payload) => { calls.push(payload); },
      trainer: (payload) => { calls.push(payload); },
      mistakeAnalytics: (payload) => { calls.push(payload); },
    });

    const results = await writePlanRecoveryActionsWithRegistry('instance_1', actionsForAttempt(), {
      handlers,
    });

    expect(results.every((result) => result.status === 'dry_run')).toBe(true);
    expect(calls).toEqual([]);
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual([]);
  });

  it('maps apply actions to safe legacy payloads and persists applied ids', async () => {
    const recall: PlanRecoveryLegacyPayload[] = [];
    const trainer: PlanRecoveryLegacyPayload[] = [];
    const mistakes: PlanRecoveryLegacyPayload[] = [];
    const actions = actionsForAttempt();

    const handlers = createPlanRecoveryLegacyHandlers({
      recall: (payload) => { recall.push(payload); },
      trainer: (payload) => { trainer.push(payload); },
      mistakeAnalytics: (payload) => { mistakes.push(payload); },
    });
    const results = await writePlanRecoveryActionsWithRegistry('instance_1', actions, {
      mode: 'apply',
      handlers,
    });

    expect(results.map((result) => result.status)).toEqual(['applied', 'applied', 'applied']);
    expect(recall[0]).toEqual(expect.objectContaining({
      actionId: actions[0].id,
      planInstanceId: 'instance_1',
      phrase: "I'm here.",
      selectedAnswer: 'I here.',
      category: 'to-be',
      planContext: expect.objectContaining({
        planId: 'gavan',
        planInstanceId: 'instance_1',
        planTaskId: 'gavan_day1_block',
      }),
    }));
    expect(trainer[0]).toEqual(expect.objectContaining({
      actionId: actions[1].id,
      phrase: "I'm here.",
      category: 'to-be',
    }));
    expect(mistakes[0]).toEqual(expect.objectContaining({
      actionId: actions[2].id,
      phrase: "I'm here.",
      category: 'to-be',
    }));
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual(actions.map((action) => action.id));
  });

  it('does not write duplicate legacy payloads after registry marks actions applied', async () => {
    const calls: string[] = [];
    const actions = actionsForAttempt();
    const handlers = createPlanRecoveryLegacyHandlers({
      recall: (payload) => { calls.push(payload.actionId); },
      trainer: (payload) => { calls.push(payload.actionId); },
      mistakeAnalytics: (payload) => { calls.push(payload.actionId); },
    });

    await writePlanRecoveryActionsWithRegistry('instance_1', actions, {
      mode: 'apply',
      handlers,
    });
    const second = await writePlanRecoveryActionsWithRegistry('instance_1', actions, {
      mode: 'apply',
      handlers,
    });

    expect(calls).toEqual(actions.map((action) => action.id));
    expect(second.every((result) => result.status === 'skipped' && result.reason === 'duplicate_action')).toBe(true);
  });

  it('does not store selected answer when selectedAnswerKnown is false', async () => {
    const payloads: PlanRecoveryLegacyPayload[] = [];
    const handlers = createPlanRecoveryLegacyHandlers({
      recall: (payload) => { payloads.push(payload); },
      trainer: (payload) => { payloads.push(payload); },
      mistakeAnalytics: (payload) => { payloads.push(payload); },
    });

    await writePlanRecoveryActionsWithRegistry('instance_1', actionsForAttempt({
      id: 'attempt_unknown_selection',
      selectedAnswer: ' ',
    }), {
      mode: 'apply',
      handlers,
    });

    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads.every((payload) => payload.selectedAnswerKnown === false)).toBe(true);
    expect(payloads.every((payload) => payload.selectedAnswer === undefined)).toBe(true);
  });

  it('keeps name-only attempts out of mistake analytics', async () => {
    const calls: string[] = [];
    const handlers = createPlanRecoveryLegacyHandlers({
      recall: () => { calls.push('recall'); },
      trainer: () => { calls.push('trainer'); },
      mistakeAnalytics: () => { calls.push('mistake'); },
    });

    await writePlanRecoveryActionsWithRegistry('instance_1', actionsForAttempt({
      id: 'attempt_name',
      grammarTags: ['name'],
      mistakeTags: ['name-slot'],
    }), {
      mode: 'apply',
      handlers,
    });

    expect(calls).toEqual(['recall', 'trainer']);
  });
});
