import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  startPlanExerciseSession,
  type PlanExerciseSession,
} from '../app/personal_plan_exercise_session';
// zachem: append/read attempt-events zashishcheny "pokoleniem akkaunta" (gard ot gonki
// pri smene polzovatelya, throw 'stale_account_generation'). V teste realnogo akkaunta
// net, poetomu gard sryval vse keysy, hotya logika ispravna. Mokaem pokolenie stabilnym
// "tekushchim", kak v auth_clean_install_recovery_*.test.ts; sam gard pokryt otdelno.
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, phase: 'active', stableId: 'test_uid' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (fn: () => Promise<unknown>) => fn(),
}));


import { submitAndStorePlanExerciseAnswer } from '../app/personal_plan_exercise_submission_store';
import { buildPlanExerciseSubmissionViewModel } from '../app/personal_plan_exercise_submission_view_model';
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

function session(): PlanExerciseSession {
  const started = startPlanExerciseSession(block(), {
    planInstanceId: 'instance_1',
    sessionId: 'session_1',
  });
  if (!started.session) throw new Error(`Session did not start: ${started.issues.join(', ')}`);
  return started.session;
}

describe('personal plan exercise submission view model', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('builds a success view model for correct stored answers', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'correct',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: "I'm here.",
    });

    expect(buildPlanExerciseSubmissionViewModel(result)).toEqual({
      status: 'correct',
      primaryState: 'success',
      shouldShowExplanation: true,
      explanationTrigger: 'correct',
      progressEligible: true,
      recoveryTargets: [],
      stored: true,
      selectedAnswerKnown: true,
      nextAction: 'show_explanation',
    });
  });

  it('builds a recovery view model for wrong stored answers', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here',
      grammarTags: ['to-be'],
      mistakeTags: ['missing-verb'],
    });

    expect(buildPlanExerciseSubmissionViewModel(result)).toEqual(expect.objectContaining({
      status: 'wrong',
      primaryState: 'needs_recovery',
      shouldShowExplanation: true,
      explanationTrigger: 'wrong',
      progressEligible: false,
      recoveryTargets: ['recall', 'trainer', 'mistake_analytics'],
      stored: true,
      selectedAnswerKnown: true,
      nextAction: 'show_explanation',
    }));
  });

  it('builds a skipped view model without progress but with explanation path', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'skipped',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: null,
    });

    expect(buildPlanExerciseSubmissionViewModel(result)).toEqual(expect.objectContaining({
      status: 'skipped',
      primaryState: 'skipped',
      shouldShowExplanation: true,
      explanationTrigger: 'wrong',
      progressEligible: false,
      selectedAnswerKnown: false,
      nextAction: 'show_explanation',
    }));
  });

  it('keeps duplicate recovery targets unique', async () => {
    const result = await submitAndStorePlanExerciseAnswer(session(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here',
    });
    const duplicateResult = {
      ...result,
      recoveryActions: [...result.recoveryActions, result.recoveryActions[0]],
    };

    expect(buildPlanExerciseSubmissionViewModel(duplicateResult).recoveryTargets).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
  });
});
