import type {
  PlanRecoveryAction,
  PlanRecoveryActionTarget,
} from './personal_plan_recovery_actions';

export type PlanRecoveryWriteMode = 'dry_run' | 'apply';

export type PlanRecoveryWriteHandler = (action: PlanRecoveryAction) => Promise<void> | void;

export type PlanRecoveryWriteHandlers = Partial<Record<PlanRecoveryActionTarget, PlanRecoveryWriteHandler>>;

export type PlanRecoveryWriteOptions = {
  mode?: PlanRecoveryWriteMode;
  currentPlanInstanceId?: string;
  appliedActionIds?: Iterable<string>;
  handlers?: PlanRecoveryWriteHandlers;
};

export type PlanRecoveryWriteStatus =
  | 'dry_run'
  | 'applied'
  | 'skipped';

export type PlanRecoveryWriteSkipReason =
  | 'duplicate_action'
  | 'wrong_plan_instance'
  | 'missing_handler';

export type PlanRecoveryWriteResult = {
  actionId: string;
  target: PlanRecoveryActionTarget;
  status: PlanRecoveryWriteStatus;
  reason?: PlanRecoveryWriteSkipReason;
};

function hasCurrentInstance(
  action: PlanRecoveryAction,
  currentPlanInstanceId: string | undefined,
): boolean {
  const instanceId = currentPlanInstanceId?.trim();
  return !instanceId || action.planInstanceId === instanceId;
}

export async function writePlanRecoveryActions(
  actions: PlanRecoveryAction[],
  options: PlanRecoveryWriteOptions = {},
): Promise<PlanRecoveryWriteResult[]> {
  const mode = options.mode ?? 'dry_run';
  const handlers = options.handlers ?? {};
  const seen = new Set(options.appliedActionIds ?? []);
  const results: PlanRecoveryWriteResult[] = [];

  for (const action of actions) {
    if (!hasCurrentInstance(action, options.currentPlanInstanceId)) {
      results.push({
        actionId: action.id,
        target: action.target,
        status: 'skipped',
        reason: 'wrong_plan_instance',
      });
      continue;
    }

    if (seen.has(action.id)) {
      results.push({
        actionId: action.id,
        target: action.target,
        status: 'skipped',
        reason: 'duplicate_action',
      });
      continue;
    }

    if (mode === 'dry_run') {
      seen.add(action.id);
      results.push({
        actionId: action.id,
        target: action.target,
        status: 'dry_run',
      });
      continue;
    }

    const handler = handlers[action.target];
    if (!handler) {
      results.push({
        actionId: action.id,
        target: action.target,
        status: 'skipped',
        reason: 'missing_handler',
      });
      continue;
    }

    await handler(action);
    seen.add(action.id);
    results.push({
      actionId: action.id,
      target: action.target,
      status: 'applied',
    });
  }

  return results;
}
