import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildPlanExerciseBlockProgress } from '../app/personal_plan_exercise_block_progress';
import {
  startPlanExerciseSession,
  submitPlanExerciseAnswer,
  type PlanExerciseSession,
} from '../app/personal_plan_exercise_session';
import { submitAndStorePlanExerciseAnswer } from '../app/personal_plan_exercise_submission_store';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

function block(overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: 'block_1',
    planId: 'gavan',
    dayIndex: 1,
    type: 'plan_phrase_build',
    title: 'Build the useful phrase',
    contentUnitIds: ['unit_1', 'unit_2', 'unit_3'],
    estimatedMinutes: 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    ...overrides,
  };
}

function session(planBlock = block()): PlanExerciseSession {
  const started = startPlanExerciseSession(planBlock, {
    planInstanceId: 'instance_1',
    sessionId: 'session_1',
  });
  if (!started.session) throw new Error(`Session did not start: ${started.issues.join(', ')}`);
  return started.session;
}

describe('personal plan exercise block progress', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('counts unique correct content units and remaining ids', () => {
    const planBlock = block();
    const planSession = session(planBlock);
    const first = submitPlanExerciseAnswer(planSession, {
      result: 'correct',
      contentUnitId: 'unit_1',
    });
    const second = submitPlanExerciseAnswer(planSession, {
      result: 'correct',
      contentUnitId: 'unit_2',
    });

    expect(buildPlanExerciseBlockProgress(planBlock, [first, second])).toEqual({
      blockId: 'block_1',
      requiredCount: 3,
      completedCount: 2,
      wrongCount: 0,
      skippedCount: 0,
      completed: false,
      percent: 67,
      completedContentUnitIds: ['unit_1', 'unit_2'],
      remainingContentUnitIds: ['unit_3'],
    });
  });

  it('counts duplicate correct attempts for the same content unit only once', () => {
    const planBlock = block();
    const planSession = session(planBlock);
    const first = submitPlanExerciseAnswer(planSession, {
      result: 'correct',
      contentUnitId: 'unit_1',
    });
    const duplicate = submitPlanExerciseAnswer(planSession, {
      result: 'correct',
      contentUnitId: 'unit_1',
    });

    expect(buildPlanExerciseBlockProgress(planBlock, [first, duplicate])).toEqual(expect.objectContaining({
      completedCount: 1,
      percent: 33,
      completedContentUnitIds: ['unit_1'],
      remainingContentUnitIds: ['unit_2', 'unit_3'],
    }));
  });

  it('does not let wrong or skipped attempts increase progress', () => {
    const planBlock = block();
    const planSession = session(planBlock);
    const wrong = submitPlanExerciseAnswer(planSession, {
      result: 'wrong',
      contentUnitId: 'unit_1',
    });
    const skipped = submitPlanExerciseAnswer(planSession, {
      result: 'skipped',
      contentUnitId: 'unit_2',
    });

    expect(buildPlanExerciseBlockProgress(planBlock, [wrong, skipped])).toEqual(expect.objectContaining({
      completedCount: 0,
      wrongCount: 1,
      skippedCount: 1,
      percent: 0,
      completed: false,
      remainingContentUnitIds: ['unit_1', 'unit_2', 'unit_3'],
    }));
  });

  it('ignores attempts for unsupported content units and other blocks', () => {
    const planBlock = block();
    const planSession = session(planBlock);
    const unsupported = submitPlanExerciseAnswer(planSession, {
      result: 'correct',
      contentUnitId: 'unit_missing',
    });
    const otherBlock = submitPlanExerciseAnswer({
      ...planSession,
      block: {
        ...planBlock,
        id: 'other_block',
      },
    }, {
      result: 'correct',
      contentUnitId: 'unit_1',
    });

    expect(buildPlanExerciseBlockProgress(planBlock, [unsupported, otherBlock])).toEqual(expect.objectContaining({
      completedCount: 0,
      percent: 0,
      remainingContentUnitIds: ['unit_1', 'unit_2', 'unit_3'],
    }));
  });

  it('accepts stored submission results as input', async () => {
    const planBlock = block({ contentUnitIds: ['unit_1'] });
    const stored = await submitAndStorePlanExerciseAnswer(session(planBlock), {
      result: 'correct',
      contentUnitId: 'unit_1',
    });

    expect(buildPlanExerciseBlockProgress(planBlock, [stored])).toEqual(expect.objectContaining({
      completedCount: 1,
      completed: true,
      percent: 100,
      remainingContentUnitIds: [],
    }));
  });
});
