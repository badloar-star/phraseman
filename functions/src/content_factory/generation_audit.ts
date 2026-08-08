import { createHash } from 'node:crypto';
import type { AdminRole } from '../admin/roles';

export type GenerationAuditOutcome = 'needs_review' | 'succeeded' | 'failed';
export interface GenerationAuditEntity { readonly collection: 'content_factory_stages' | 'content_factory_job_units'; readonly id: string }

export function generationAuditOperationId(entity: GenerationAuditEntity, attempt: number, leaseToken: string): string {
  if (!entity.id || !Number.isSafeInteger(attempt) || attempt < 1 || !leaseToken) throw new Error('generation_audit_identity_invalid');
  return `generation-${createHash('sha256').update(`${entity.collection}\n${entity.id}\n${attempt}\n${leaseToken}`).digest('hex')}`;
}

export function buildGenerationTerminalAudit(input: {
  readonly actorUid: string; readonly role: AdminRole; readonly entity: GenerationAuditEntity;
  readonly attempt: number; readonly leaseToken: string; readonly outcome: GenerationAuditOutcome;
  readonly errorCategory: string | null; readonly before: Readonly<Record<string, unknown>>; readonly after: Readonly<Record<string, unknown>>;
}) {
  if (!['needs_review', 'succeeded', 'failed'].includes(input.outcome)) throw new Error('generation_audit_outcome_invalid');
  const action = input.entity.collection === 'content_factory_stages'
    ? (input.attempt === 1 ? 'content_factory.stage.generate' : 'content_factory.stage.retry')
    : (input.attempt === 1 ? 'content_factory.unit.generate' : 'content_factory.unit.retry');
  return Object.freeze({
    action,
    actorUid: input.actorUid, role: input.role, entity: input.entity,
    operationId: generationAuditOperationId(input.entity, input.attempt, input.leaseToken),
    reason: `Generation attempt ${input.attempt} ${input.outcome}`,
    before: input.before, after: input.after, attempt: input.attempt,
    outcome: input.outcome, errorCategory: input.errorCategory,
    timestamp: new Date().toISOString(),
  });
}
