import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import {
  buildPlanDayOpenActions,
  PlanDayOpenAction,
} from './personal_plan_day_open_actions';
import {
  buildPlanExerciseBlockProgress,
} from './personal_plan_exercise_block_progress';

export type PlanDayTaskSurfaceState =
  | 'available'
  | 'completed'
  | 'needs_retry'
  | 'blocked';

export type PlanDayTaskSurfaceItem = {
  blockId: string;
  type: PlanExerciseBlock['type'];
  title: string;
  estimatedMinutes: number;
  state: PlanDayTaskSurfaceState;
  progress: ReturnType<typeof buildPlanExerciseBlockProgress>;
  action: PlanDayOpenAction;
};

export type PlanDayTaskSurfaceModel = {
  items: PlanDayTaskSurfaceItem[];
  counts: {
    total: number;
    available: number;
    completed: number;
    needsRetry: number;
    blocked: number;
  };
  hasBlockedItems: boolean;
  hasRetryItems: boolean;
};

function isProgressCompleted(
  progress: ReturnType<typeof buildPlanExerciseBlockProgress>,
): boolean {
  const progressSnapshot = progress as Record<string, unknown>;

  if (progressSnapshot.completed === true) {
    return true;
  }

  if (progressSnapshot.remaining === 0) {
    return true;
  }

  if (progressSnapshot.remainingContentUnitCount === 0) {
    return true;
  }

  return false;
}

function hasRetryProgress(
  progress: ReturnType<typeof buildPlanExerciseBlockProgress>,
): boolean {
  const progressSnapshot = progress as Record<string, unknown>;

  return [
    progressSnapshot.wrong,
    progressSnapshot.wrongCount,
    progressSnapshot.skipped,
    progressSnapshot.skippedCount,
  ].some((value) => typeof value === 'number' && value > 0);
}

function stateForTask(
  action: PlanDayOpenAction,
  progress: ReturnType<typeof buildPlanExerciseBlockProgress>,
): PlanDayTaskSurfaceState {
  if (action.kind === 'blocked') {
    return 'blocked';
  }

  if (isProgressCompleted(progress)) {
    return 'completed';
  }

  if (hasRetryProgress(progress)) {
    return 'needs_retry';
  }

  return 'available';
}

export function buildPlanDayTaskSurfaceModel(
  blocks: PlanExerciseBlock[],
  planInstanceId: string,
  attemptEvents: PlanAttemptEvent[],
): PlanDayTaskSurfaceModel {
  const openActionsResult = buildPlanDayOpenActions(blocks, planInstanceId);
  const items = blocks.map((block, index) => {
    const progress = buildPlanExerciseBlockProgress(block, attemptEvents);
    const action = openActionsResult.actions[index];
    const state = stateForTask(action, progress);

    return {
      blockId: block.id,
      type: block.type,
      title: block.title,
      estimatedMinutes: block.estimatedMinutes,
      state,
      progress,
      action,
    };
  });

  const available = items.filter((item) => item.state === 'available').length;
  const completed = items.filter((item) => item.state === 'completed').length;
  const needsRetry = items.filter((item) => item.state === 'needs_retry').length;
  const blocked = items.filter((item) => item.state === 'blocked').length;

  return {
    items,
    counts: {
      total: items.length,
      available,
      completed,
      needsRetry,
      blocked,
    },
    hasBlockedItems: blocked > 0,
    hasRetryItems: needsRetry > 0,
  };
}
