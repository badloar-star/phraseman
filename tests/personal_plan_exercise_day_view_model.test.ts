import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildPlanExerciseDayViewModel } from '../app/personal_plan_exercise_day_view_model';
import {
  startPlanExerciseSession,
  submitPlanExerciseAnswer,
  type PlanExerciseSession,
} from '../app/personal_plan_exercise_session';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

function block(id: string, contentUnitIds: string[]): PlanExerciseBlock {
  return {
    id,
    planId: 'gavan',
    dayIndex: 1,
    type: 'plan_phrase_build',
    title: id,
    contentUnitIds,
    estimatedMinutes: 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
  };
}

function session(planBlock: PlanExerciseBlock): PlanExerciseSession {
  const started = startPlanExerciseSession(planBlock, {
    planInstanceId: 'instance_1',
    sessionId: `session_${planBlock.id}`,
  });
  if (!started.session) throw new Error(`Session did not start: ${started.issues.join(', ')}`);
  return started.session;
}

describe('personal plan exercise day view model', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns not_started for a day with no attempts', () => {
    const first = block('block_1', ['unit_1']);
    const second = block('block_2', ['unit_2']);

    expect(buildPlanExerciseDayViewModel([first, second], [])).toEqual(expect.objectContaining({
      primaryState: 'not_started',
      percent: 0,
      totalBlocks: 2,
      completedBlocks: 0,
      nextBlockId: 'block_1',
      completedBlockIds: [],
      remainingBlockIds: ['block_1', 'block_2'],
      shouldShowRestState: false,
    }));
  });

  it('returns in_progress and selects the first remaining block', () => {
    const first = block('block_1', ['unit_1']);
    const second = block('block_2', ['unit_2']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), {
        result: 'correct',
        contentUnitId: 'unit_1',
      }),
    ];

    expect(buildPlanExerciseDayViewModel([first, second], attempts)).toEqual(expect.objectContaining({
      primaryState: 'in_progress',
      percent: 50,
      completedBlocks: 1,
      nextBlockId: 'block_2',
      completedBlockIds: ['block_1'],
      remainingBlockIds: ['block_2'],
      shouldShowRestState: false,
    }));
  });

  it('returns completed and rest state when all blocks are done', () => {
    const first = block('block_1', ['unit_1']);
    const second = block('block_2', ['unit_2']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), {
        result: 'correct',
        contentUnitId: 'unit_1',
      }),
      submitPlanExerciseAnswer(session(second), {
        result: 'correct',
        contentUnitId: 'unit_2',
      }),
    ];

    expect(buildPlanExerciseDayViewModel([first, second], attempts)).toEqual(expect.objectContaining({
      primaryState: 'completed',
      percent: 100,
      completedBlocks: 2,
      nextBlockId: undefined,
      completedBlockIds: ['block_1', 'block_2'],
      remainingBlockIds: [],
      shouldShowRestState: true,
    }));
  });

  it('returns needs_attention when there are errors and no progress', () => {
    const first = block('block_1', ['unit_1']);
    const second = block('block_2', ['unit_2']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), {
        result: 'wrong',
        contentUnitId: 'unit_1',
      }),
      submitPlanExerciseAnswer(session(second), {
        result: 'skipped',
        contentUnitId: 'unit_2',
      }),
    ];

    expect(buildPlanExerciseDayViewModel([first, second], attempts)).toEqual(expect.objectContaining({
      primaryState: 'needs_attention',
      percent: 0,
      wrongCount: 1,
      skippedCount: 1,
      nextBlockId: 'block_1',
      shouldShowRestState: false,
    }));
  });

  it('handles empty day safely', () => {
    expect(buildPlanExerciseDayViewModel([], [])).toEqual(expect.objectContaining({
      primaryState: 'not_started',
      percent: 0,
      totalBlocks: 0,
      completedBlocks: 0,
      nextBlockId: undefined,
      completedBlockIds: [],
      remainingBlockIds: [],
      shouldShowRestState: false,
    }));
  });
});
