import type { Decision, DecisionStatus, Department } from './decision';

export const JARVIS_FOLLOW_UP_MAX_ATTEMPTS = 3 as const;

export type JarvisFollowUpTaskStatus = 'pending';

export interface JarvisInternalFollowUpTaskAudit {
  readonly createdBy: 'jarvis_safe_follow_up_v1';
  readonly sourceDecisionHash: string;
  readonly sourceDecisionRevision: number;
  readonly sourceDecisionStatus: 'awaiting_owner' | 'approved';
  readonly sourceActionability: 'confirmed_action';
  readonly sideEffectScope: 'internal_firestore_record_only';
  readonly externalDelivery: 'disabled';
}

export interface JarvisInternalFollowUpTask {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly status: JarvisFollowUpTaskStatus;
  readonly department: Department;
  readonly summary: string;
  readonly attemptCount: number;
  readonly maxAttempts: typeof JARVIS_FOLLOW_UP_MAX_ATTEMPTS;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly audit: JarvisInternalFollowUpTaskAudit;
}

const CONFIRMED_FOLLOW_UP_STATUSES: readonly DecisionStatus[] = ['awaiting_owner', 'approved'];

export function parseJarvisFollowUpTasksFlag(raw: string | undefined): boolean {
  return raw === 'true';
}

export interface BuildInternalFollowUpTaskInput {
  readonly decision: Decision;
  readonly existing: JarvisInternalFollowUpTask | null;
  readonly nowMs: number;
  readonly enabled: boolean;
}

function isConfirmedFollowUpStatus(status: DecisionStatus): status is 'awaiting_owner' | 'approved' {
  return CONFIRMED_FOLLOW_UP_STATUSES.includes(status);
}

/**
 * Produces only an owner-visible task record nested inside jarvis_plans. It never
 * sends a message or performs the recommendation represented by the decision.
 */
export function buildInternalFollowUpTask(
  input: BuildInternalFollowUpTaskInput,
): JarvisInternalFollowUpTask | null {
  const expectedId = `follow-up:${input.decision.contentHash}`;
  if (input.existing) {
    return input.existing.id === expectedId
      && input.existing.audit.sourceDecisionHash === input.decision.contentHash
      ? input.existing
      : null;
  }
  if (!input.enabled) return null;
  if (input.decision.actionability !== 'confirmed_action') return null;
  if (!isConfirmedFollowUpStatus(input.decision.status)) return null;

  const nowMs = Number.isSafeInteger(input.nowMs) && input.nowMs >= 0 ? input.nowMs : 0;
  return Object.freeze({
    schemaVersion: 1 as const,
    id: expectedId,
    status: 'pending' as const,
    department: input.decision.department,
    summary: input.decision.recommendation,
    attemptCount: 0,
    maxAttempts: JARVIS_FOLLOW_UP_MAX_ATTEMPTS,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    audit: Object.freeze({
      createdBy: 'jarvis_safe_follow_up_v1' as const,
      sourceDecisionHash: input.decision.contentHash,
      sourceDecisionRevision: input.decision.revision,
      sourceDecisionStatus: input.decision.status,
      sourceActionability: 'confirmed_action' as const,
      sideEffectScope: 'internal_firestore_record_only' as const,
      externalDelivery: 'disabled' as const,
    }),
  });
}
