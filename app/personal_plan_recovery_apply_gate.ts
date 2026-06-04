import type { PlanRecoveryAction } from './personal_plan_recovery_actions';
import type { PlanRecoveryWriteHandlers } from './personal_plan_recovery_write_adapter';

export type PlanRecoveryApplyGateCode =
  | 'empty_actions'
  | 'wrong_plan_instance'
  | 'duplicate_action'
  | 'missing_handler';

export type PlanRecoveryApplyGateIssue = {
  code: PlanRecoveryApplyGateCode;
  actionId?: string;
  target?: PlanRecoveryAction['target'];
};

export type PlanRecoveryApplyGateInput = {
  actions: PlanRecoveryAction[];
  currentPlanInstanceId: string;
  appliedActionIds?: Iterable<string>;
  handlers: PlanRecoveryWriteHandlers;
};

export function validatePlanRecoveryApplyGate(
  input: PlanRecoveryApplyGateInput,
): PlanRecoveryApplyGateIssue[] {
  const issues: PlanRecoveryApplyGateIssue[] = [];
  const currentPlanInstanceId = input.currentPlanInstanceId.trim();
  const seen = new Set(input.appliedActionIds ?? []);
  const batchSeen = new Set<string>();

  if (input.actions.length === 0) {
    issues.push({ code: 'empty_actions' });
    return issues;
  }

  for (const action of input.actions) {
    if (action.planInstanceId !== currentPlanInstanceId) {
      issues.push({
        code: 'wrong_plan_instance',
        actionId: action.id,
        target: action.target,
      });
    }

    if (seen.has(action.id) || batchSeen.has(action.id)) {
      issues.push({
        code: 'duplicate_action',
        actionId: action.id,
        target: action.target,
      });
    }
    batchSeen.add(action.id);

    if (!input.handlers[action.target]) {
      issues.push({
        code: 'missing_handler',
        actionId: action.id,
        target: action.target,
      });
    }
  }

  return issues;
}
