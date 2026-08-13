import {
  PlanDayTaskSurfaceItem,
  PlanDayTaskSurfaceModel,
} from './personal_plan_day_task_surface_model';

export type PlanDayTaskSurfaceGateIssueCode =
  | 'missing_task_identity'
  | 'missing_task_title'
  | 'invalid_estimated_minutes'
  | 'missing_progress'
  | 'missing_action'
  | 'open_action_missing_params'
  | 'blocked_action_missing_issues'
  | 'counts_mismatch'
  | 'duplicate_block_id';

export type PlanDayTaskSurfaceGateIssue = {
  code: PlanDayTaskSurfaceGateIssueCode;
  blockId?: string;
  index?: number;
};

export type PlanDayTaskSurfaceGateResult = {
  valid: boolean;
  issues: PlanDayTaskSurfaceGateIssue[];
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function pushIssue(
  issues: PlanDayTaskSurfaceGateIssue[],
  code: PlanDayTaskSurfaceGateIssueCode,
  item: Partial<PlanDayTaskSurfaceItem>,
  index: number,
) {
  issues.push({
    code,
    blockId: item.blockId,
    index,
  });
}

function validateTaskItem(
  item: Partial<PlanDayTaskSurfaceItem>,
  index: number,
  issues: PlanDayTaskSurfaceGateIssue[],
) {
  if (!hasText(item.blockId) || !hasText(item.type)) {
    pushIssue(issues, 'missing_task_identity', item, index);
  }

  if (!hasText(item.title)) {
    pushIssue(issues, 'missing_task_title', item, index);
  }

  if (!isPositiveNumber(item.estimatedMinutes)) {
    pushIssue(issues, 'invalid_estimated_minutes', item, index);
  }

  if (!item.progress) {
    pushIssue(issues, 'missing_progress', item, index);
  }

  if (!item.action) {
    pushIssue(issues, 'missing_action', item, index);
    return;
  }

  if (item.action.kind === 'blocked') {
    if (!Array.isArray(item.action.issues) || item.action.issues.length === 0) {
      pushIssue(issues, 'blocked_action_missing_issues', item, index);
    }
    return;
  }

  if (!item.action.params) {
    pushIssue(issues, 'open_action_missing_params', item, index);
  }
}

function countState(
  items: PlanDayTaskSurfaceItem[],
  state: PlanDayTaskSurfaceItem['state'],
): number {
  return items.filter((item) => item.state === state).length;
}

export function validatePlanDayTaskSurfaceModel(
  model: PlanDayTaskSurfaceModel,
): PlanDayTaskSurfaceGateResult {
  const issues: PlanDayTaskSurfaceGateIssue[] = [];
  const seenBlockIds = new Set<string>();

  model.items.forEach((item, index) => {
    validateTaskItem(item, index, issues);

    if (hasText(item.blockId)) {
      if (seenBlockIds.has(item.blockId)) {
        pushIssue(issues, 'duplicate_block_id', item, index);
      }
      seenBlockIds.add(item.blockId);
    }
  });

  const expectedCounts = {
    total: model.items.length,
    available: countState(model.items, 'available'),
    completed: countState(model.items, 'completed'),
    needsRetry: countState(model.items, 'needs_retry'),
    blocked: countState(model.items, 'blocked'),
  };

  if (
    model.counts.total !== expectedCounts.total
    || model.counts.available !== expectedCounts.available
    || model.counts.completed !== expectedCounts.completed
    || model.counts.needsRetry !== expectedCounts.needsRetry
    || model.counts.blocked !== expectedCounts.blocked
  ) {
    issues.push({
      code: 'counts_mismatch',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
