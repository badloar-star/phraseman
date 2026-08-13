import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from './personal_plan_engine_contracts';

export type PlanDayTaskSurfaceInputResolverIssueCode =
  | 'missing_plan_instance_id'
  | 'missing_blocks'
  | 'missing_attempt_events'
  | 'duplicate_block_id'
  | 'attempt_without_block'
  | 'attempt_wrong_plan_instance';

export type PlanDayTaskSurfaceInputResolverIssue = {
  code: PlanDayTaskSurfaceInputResolverIssueCode;
  blockId?: string;
  attemptId?: string;
};

export type PlanDayTaskSurfaceInput = {
  blocks?: PlanExerciseBlock[];
  planInstanceId?: string;
  attemptEvents?: PlanAttemptEvent[];
};

export type ResolvedPlanDayTaskSurfaceInput = {
  blocks: PlanExerciseBlock[];
  planInstanceId: string;
  attemptEvents: PlanAttemptEvent[];
};

export type PlanDayTaskSurfaceInputResolverResult = {
  ready: boolean;
  input?: ResolvedPlanDayTaskSurfaceInput;
  issues: PlanDayTaskSurfaceInputResolverIssue[];
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolvePlanDayTaskSurfaceInput(
  input: PlanDayTaskSurfaceInput,
): PlanDayTaskSurfaceInputResolverResult {
  const issues: PlanDayTaskSurfaceInputResolverIssue[] = [];

  if (!hasText(input.planInstanceId)) {
    issues.push({
      code: 'missing_plan_instance_id',
    });
  }

  if (!Array.isArray(input.blocks)) {
    issues.push({
      code: 'missing_blocks',
    });
  }

  if (!Array.isArray(input.attemptEvents)) {
    issues.push({
      code: 'missing_attempt_events',
    });
  }

  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const attemptEvents = Array.isArray(input.attemptEvents)
    ? input.attemptEvents
    : [];
  const planInstanceId = hasText(input.planInstanceId)
    ? input.planInstanceId
    : '';
  const blockIds = new Set<string>();

  for (const block of blocks) {
    if (blockIds.has(block.id)) {
      issues.push({
        code: 'duplicate_block_id',
        blockId: block.id,
      });
    }
    blockIds.add(block.id);
  }

  for (const attemptEvent of attemptEvents) {
    if (planInstanceId && attemptEvent.planInstanceId !== planInstanceId) {
      issues.push({
        code: 'attempt_wrong_plan_instance',
        attemptId: attemptEvent.id,
        blockId: attemptEvent.blockId,
      });
    }

    if (attemptEvent.blockId && !blockIds.has(attemptEvent.blockId)) {
      issues.push({
        code: 'attempt_without_block',
        attemptId: attemptEvent.id,
        blockId: attemptEvent.blockId,
      });
    }
  }

  if (issues.length > 0) {
    return {
      ready: false,
      issues,
    };
  }

  return {
    ready: true,
    input: {
      blocks,
      planInstanceId,
      attemptEvents,
    },
    issues: [],
  };
}
