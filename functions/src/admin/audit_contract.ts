import { hasAdminRole, type AdminRole } from './roles';

export interface AdminAuditRecord {
  readonly action: string;
  readonly actorUid: string;
  readonly role: AdminRole;
  readonly entity: Readonly<{ collection: string; id: string }>;
  readonly reason: string;
  readonly before: Readonly<Record<string, unknown>>;
  readonly after: Readonly<Record<string, unknown>>;
  readonly rollbackReference: string | null;
  readonly requestId: string;
  readonly timestamp: string;
}

export function createAuditRecord(input: {
  action: string;
  actorUid: string;
  role: unknown;
  entity: { collection: string; id: string };
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  rollbackReference?: string | null;
  requestId: string;
  timestamp: string;
}): AdminAuditRecord {
  if (
    !input.action.trim()
    || !input.actorUid.trim()
    || !hasAdminRole(input.role)
    || !input.entity.collection.trim()
    || !input.entity.id.trim()
    || !input.reason.trim()
    || !input.requestId.trim()
    || !input.timestamp.trim()
  ) {
    throw new Error('validation_failed');
  }

  return Object.freeze({
    action: input.action.trim(),
    actorUid: input.actorUid.trim(),
    role: input.role,
    entity: Object.freeze({ ...input.entity }),
    reason: input.reason.trim(),
    before: Object.freeze({ ...input.before }),
    after: Object.freeze({ ...input.after }),
    rollbackReference: input.rollbackReference ?? null,
    requestId: input.requestId.trim(),
    timestamp: input.timestamp,
  });
}
