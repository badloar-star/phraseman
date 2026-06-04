import {
  PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import {
  buildPlanExerciseRendererParams,
  PlanExerciseRendererParamsIssue,
  PlanExerciseRendererUnifiedParams,
} from './personal_plan_exercise_renderer_params_builder';

export type PlanDayOpenableRendererBlock = {
  block: PlanExerciseBlock;
  blockId: string;
  type: PlanExerciseBlock['type'];
  params: PlanExerciseRendererUnifiedParams;
};

export type PlanDayBlockedRendererBlock = {
  block: PlanExerciseBlock;
  blockId: string;
  type: PlanExerciseBlock['type'];
  issues: PlanExerciseRendererParamsIssue[];
};

export type PlanDayRendererParamsSummary = {
  totalBlocks: number;
  openableBlocks: number;
  blockedBlocks: number;
};

export type PlanDayRendererParamsAdapterResult = {
  openableBlocks: PlanDayOpenableRendererBlock[];
  blockedBlocks: PlanDayBlockedRendererBlock[];
  hasBlockingIssues: boolean;
  counts: PlanDayRendererParamsSummary;
};

export function buildPlanDayRendererParams(
  blocks: PlanExerciseBlock[],
  planInstanceId: string,
): PlanDayRendererParamsAdapterResult {
  const openableBlocks: PlanDayOpenableRendererBlock[] = [];
  const blockedBlocks: PlanDayBlockedRendererBlock[] = [];

  for (const block of blocks) {
    const result = buildPlanExerciseRendererParams(block, planInstanceId);

    if (result.params && result.issues.length === 0) {
      openableBlocks.push({
        block,
        blockId: block.id,
        type: block.type,
        params: result.params,
      });
      continue;
    }

    blockedBlocks.push({
      block,
      blockId: block.id,
      type: block.type,
      issues: result.issues,
    });
  }

  return {
    openableBlocks,
    blockedBlocks,
    hasBlockingIssues: blockedBlocks.length > 0,
    counts: {
      totalBlocks: blocks.length,
      openableBlocks: openableBlocks.length,
      blockedBlocks: blockedBlocks.length,
    },
  };
}
