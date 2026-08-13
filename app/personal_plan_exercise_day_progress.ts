import {
  buildPlanExerciseBlockProgress,
  type PlanExerciseBlockProgress,
  type PlanExerciseBlockProgressInput,
} from './personal_plan_exercise_block_progress';
import type { PlanExerciseBlock } from './personal_plan_engine_contracts';

export type PlanExerciseDayProgress = {
  totalBlocks: number;
  completedBlocks: number;
  totalRequiredUnits: number;
  completedUnits: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
  completed: boolean;
  blockProgress: PlanExerciseBlockProgress[];
};

function percent(completedUnits: number, totalRequiredUnits: number): number {
  if (totalRequiredUnits <= 0) return 0;
  return Math.round((completedUnits / totalRequiredUnits) * 100);
}

export function buildPlanExerciseDayProgress(
  blocks: PlanExerciseBlock[],
  inputs: PlanExerciseBlockProgressInput[],
): PlanExerciseDayProgress {
  const blockProgress = blocks.map((block) => buildPlanExerciseBlockProgress(block, inputs));
  const totalRequiredUnits = blockProgress.reduce((sum, progress) => sum + progress.requiredCount, 0);
  const completedUnits = blockProgress.reduce((sum, progress) => sum + progress.completedCount, 0);
  const wrongCount = blockProgress.reduce((sum, progress) => sum + progress.wrongCount, 0);
  const skippedCount = blockProgress.reduce((sum, progress) => sum + progress.skippedCount, 0);
  const completedBlocks = blockProgress.filter((progress) => progress.completed).length;

  return {
    totalBlocks: blocks.length,
    completedBlocks,
    totalRequiredUnits,
    completedUnits,
    wrongCount,
    skippedCount,
    percent: percent(completedUnits, totalRequiredUnits),
    completed: blocks.length > 0 && completedBlocks === blocks.length,
    blockProgress,
  };
}
