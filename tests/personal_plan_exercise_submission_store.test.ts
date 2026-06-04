import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  listPersonalPlanAttemptEvents,
} from '../app/personal_plan_attempt_events';
import {
  startPlanExerciseSession,
  type PlanExerciseSession,
} from '../app/personal_plan_exercise_session';
import { submitAndStorePlanExerciseAnswer } from '../app/personal_plan_exercise_submission_store';
import { createPlanRecoveryDefaultHandlers } from '../app/personal_plan_recovery_default_handlers';
import { listAppliedPlanRecoveryActionIds } from '../app/personal_plan_recovery_applied_registry';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

function block(overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: 'block_1',
    planId: 'gavan',
    dayIndex: 1,
    type: 'plan_phrase_build',
    title: 'Build the useful phrase',
    contentUnitIds: ['unit_1'],
    estimatedMinutes: 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    ...overrides,
  };
}

function session(planInstanceId = 'instance_1'): PlanExerciseSession {
  const started = startPlanExerciseSession(block(), {
    planInstanceId,
    sessionId: `session_${planInstanceId}`,
    startedAt: '2026-06-01T00:00:00.000Z',
  });
  if (!started.session) throw new Error(`Session did not start: ${started.issues.join(', ')}`);
  return started.session;
}

describe('personal plan exercise submission store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores correct attempts and keeps them progress eligible', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'correct',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: "I'm here.",
      grammarTags: ['to-be'],
    });

    expect(result.stored).toBe(true);
    expect(result.progressEligible).toBe(true);
    expect(result.recoveryActions).toEqual([]);
    expect(await listPersonalPlanAttemptEvents('instance_1')).toEqual([result.attempt]);
  });

  it('stores wrong attempts and returns recovery actions without applying legacy writes', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here',
      grammarTags: ['to-be'],
      vocabularyTags: ['arrival'],
      mistakeTags: ['missing-verb'],
    });

    expect(result.stored).toBe(true);
    expect(result.progressEligible).toBe(false);
    expect(result.recoveryActions.map((action) => action.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
    expect(await listPersonalPlanAttemptEvents('instance_1')).toEqual([result.attempt]);
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual([]);
  });

  it('can explicitly apply recovery writes after storing a wrong attempt', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here',
      grammarTags: ['to-be'],
      vocabularyTags: ['arrival'],
      mistakeTags: ['missing-verb'],
    }, {
      recoveryWrite: {
        mode: 'apply',
        handlers: createPlanRecoveryDefaultHandlers({ studyTarget: 'en' }),
      },
    });

    expect(result.recoveryWriteResults.map((item) => item.status)).toEqual([
      'applied',
      'applied',
      'applied',
    ]);
    expect(await listAppliedPlanRecoveryActionIds('instance_1')).toEqual(
      result.recoveryActions.map((action) => action.id),
    );
  });

  it('keeps attempt storage isolated by planInstanceId', async () => {
    const first = await submitAndStorePlanExerciseAnswer(session('instance_a'), {
      result: 'correct',
      contentUnitId: 'unit_1',
    });
    const second = await submitAndStorePlanExerciseAnswer(session('instance_b'), {
      result: 'wrong',
      contentUnitId: 'unit_1',
    });

    expect(await listPersonalPlanAttemptEvents('instance_a')).toEqual([first.attempt]);
    expect(await listPersonalPlanAttemptEvents('instance_b')).toEqual([second.attempt]);
  });

  it('rejects invalid attempts before storing them', async () => {
    const badSession: PlanExerciseSession = {
      ...session(),
      planInstanceId: ' ',
    };

    await expect(submitAndStorePlanExerciseAnswer(badSession, {
      result: 'wrong',
      contentUnitId: 'unit_1',
    })).rejects.toThrow('missing_plan_instance_id');
    expect(await listPersonalPlanAttemptEvents('instance_1')).toEqual([]);
  });

  it('keeps selectedAnswerKnown honest when storing', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: ' ',
    });

    expect(result.attempt.selectedAnswerKnown).toBe(false);
    expect(result.attempt.selectedAnswer).toBeUndefined();
    expect((await listPersonalPlanAttemptEvents('instance_1'))[0].selectedAnswerKnown).toBe(false);
  });
});
