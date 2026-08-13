import {
  buildPlanExerciseDayProgress,
  type PlanExerciseDayProgress,
} from './personal_plan_exercise_day_progress';
import type { PlanExerciseBlockProgressInput } from './personal_plan_exercise_block_progress';
import type { PlanExerciseBlock } from './personal_plan_engine_contracts';

export type PlanExerciseDayPrimaryState =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'needs_attention';

export type PlanExerciseDayViewModel = {
  primaryState: PlanExerciseDayPrimaryState;
  percent: number;
  totalBlocks: number;
  completedBlocks: number;
  wrongCount: number;
  skippedCount: number;
  nextBlockId?: string;
  completedBlockIds: string[];
  remainingBlockIds: string[];
  shouldShowRestState: boolean;
  progress: PlanExerciseDayProgress;
};

function primaryState(progress: PlanExerciseDayProgress): PlanExerciseDayPrimaryState {
  if (progress.completed) return 'completed';
  if (progress.completedUnits === 0 && (progress.wrongCount > 0 || progress.skippedCount > 0)) {
    return 'needs_attention';
  }
  if (progress.completedUnits === 0) return 'not_started';
  return 'in_progress';
}

export function buildPlanExerciseDayViewModel(
  blocks: PlanExerciseBlock[],
  inputs: PlanExerciseBlockProgressInput[],
): PlanExerciseDayViewModel {
  const progress = buildPlanExerciseDayProgress(blocks, inputs);
  const completedBlockIds = progress.blockProgress
    .filter((blockProgress) => blockProgress.completed)
    .map((blockProgress) => blockProgress.blockId);
  const remainingBlockIds = progress.blockProgress
    .filter((blockProgress) => !blockProgress.completed)
    .map((blockProgress) => blockProgress.blockId);

  return {
    primaryState: primaryState(progress),
    percent: progress.percent,
    totalBlocks: progress.totalBlocks,
    completedBlocks: progress.completedBlocks,
    wrongCount: progress.wrongCount,
    skippedCount: progress.skippedCount,
    nextBlockId: remainingBlockIds[0],
    completedBlockIds,
    remainingBlockIds,
    shouldShowRestState: progress.completed,
    progress,
  };
}
