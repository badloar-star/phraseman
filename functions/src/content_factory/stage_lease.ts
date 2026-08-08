import type { GenerationStageState } from './stage_contracts';
import { canCommitGenerationExecution } from './generation_execution';

export interface StageLeaseDocument {
  readonly state?: GenerationStageState | string;
  readonly attempts?: number;
  readonly leaseToken?: string;
  readonly leaseExpiresAtMs?: number;
}

export type StageLeaseDecision =
  | Readonly<{ action: 'run'; attempt: number; leaseToken: string; leaseExpiresAtMs: number }>
  | Readonly<{ action: 'busy' }>
  | Readonly<{ action: 'replay' }>
  | Readonly<{ action: 'blocked' }>;

export function acquireStageLease(current: StageLeaseDocument, input: { nowMs: number; leaseMs: number; leaseToken: string }): StageLeaseDecision {
  if (!Number.isSafeInteger(input.nowMs) || !Number.isSafeInteger(input.leaseMs) || input.leaseMs < 1000 || !/^[A-Za-z0-9._-]{1,160}$/.test(input.leaseToken)) throw new Error('content_stage_lease_invalid');
  if (current.state === 'needs_review' || current.state === 'approved' || current.state === 'rejected') return Object.freeze({ action: 'replay' as const });
  if (current.state === 'paused' || current.state === 'cancelled' || current.state === 'superseded') return Object.freeze({ action: 'blocked' as const });
  if (current.state === 'running' && Number(current.leaseExpiresAtMs ?? 0) > input.nowMs) return Object.freeze({ action: 'busy' as const });
  const attempt = Math.max(0, Number(current.attempts ?? 0)) + 1;
  return Object.freeze({ action: 'run' as const, attempt, leaseToken: input.leaseToken, leaseExpiresAtMs: input.nowMs + input.leaseMs });
}

export function canCommitStageLease(current: StageLeaseDocument, lease: { attempt: number; leaseToken: string }): boolean {
  return canCommitGenerationExecution(current, lease, ['running']);
}
