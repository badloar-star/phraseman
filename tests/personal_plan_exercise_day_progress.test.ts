import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildPlanExerciseDayProgress } from '../app/personal_plan_exercise_day_progress';
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

describe('personal plan exercise day progress', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('aggregates progress across multiple blocks', () => {
    const first = block('block_1', ['unit_1', 'unit_2']);
    const second = block('block_2', ['unit_3', 'unit_4']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), { result: 'correct', contentUnitId: 'unit_1' }),
      submitPlanExerciseAnswer(session(first), { result: 'correct', contentUnitId: 'unit_2' }),
      submitPlanExerciseAnswer(session(second), { result: 'correct', contentUnitId: 'unit_3' }),
    ];

    expect(buildPlanExerciseDayProgress([first, second], attempts)).toEqual(expect.objectContaining({
      totalBlocks: 2,
      completedBlocks: 1,
      totalRequiredUnits: 4,
      completedUnits: 3,
      wrongCount: 0,
      skippedCount: 0,
      percent: 75,
      completed: false,
    }));
  });

  it('marks the day completed only when all required units in all blocks are done', () => {
    const first = block('block_1', ['unit_1']);
    const second = block('block_2', ['unit_2']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), { result: 'correct', contentUnitId: 'unit_1' }),
      submitPlanExerciseAnswer(session(second), { result: 'correct', contentUnitId: 'unit_2' }),
    ];

    expect(buildPlanExerciseDayProgress([first, second], attempts)).toEqual(expect.objectContaining({
      completedBlocks: 2,
      totalRequiredUnits: 2,
      completedUnits: 2,
      percent: 100,
      completed: true,
    }));
  });

  it('aggregates wrong and skipped counts without increasing progress', () => {
    const first = block('block_1', ['unit_1']);
    const second = block('block_2', ['unit_2']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), { result: 'wrong', contentUnitId: 'unit_1' }),
      submitPlanExerciseAnswer(session(second), { result: 'skipped', contentUnitId: 'unit_2' }),
    ];

    expect(buildPlanExerciseDayProgress([first, second], attempts)).toEqual(expect.objectContaining({
      completedBlocks: 0,
      completedUnits: 0,
      wrongCount: 1,
      skippedCount: 1,
      percent: 0,
      completed: false,
    }));
  });

  it('keeps duplicate correct attempts stable across the day', () => {
    const first = block('block_1', ['unit_1']);
    const attempts = [
      submitPlanExerciseAnswer(session(first), { result: 'correct', contentUnitId: 'unit_1' }),
      submitPlanExerciseAnswer(session(first), { result: 'correct', contentUnitId: 'unit_1' }),
    ];

    expect(buildPlanExerciseDayProgress([first], attempts)).toEqual(expect.objectContaining({
      totalRequiredUnits: 1,
      completedUnits: 1,
      percent: 100,
      completed: true,
    }));
  });

  it('handles empty day blocks safely', () => {
    expect(buildPlanExerciseDayProgress([], [])).toEqual({
      totalBlocks: 0,
      completedBlocks: 0,
      totalRequiredUnits: 0,
      completedUnits: 0,
      wrongCount: 0,
      skippedCount: 0,
      percent: 0,
      completed: false,
      blockProgress: [],
    });
  });
});
