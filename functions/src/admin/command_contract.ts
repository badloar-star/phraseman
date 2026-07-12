import { hasAdminRole, type AdminRole } from './roles';

export type AdminCommandErrorCode =
  | 'permission_denied'
  | 'stale_version'
  | 'validation_failed'
  | 'duplicate_operation'
  | 'server_only_boundary';

export interface AdminCommandTarget {
  readonly collection: string;
  readonly id: string;
}

export interface AdminCommand {
  readonly action: string;
  readonly actorUid: string;
  readonly role: AdminRole;
  readonly reason: string;
  readonly target: AdminCommandTarget;
  readonly idempotencyKey: string;
  readonly expectedRevision: number;
  readonly requestId: string;
}

export function createAdminCommand(input: Omit<AdminCommand, 'role'> & { role: unknown }): AdminCommand {
  if (
    !input.action.trim()
    || !input.actorUid.trim()
    || !hasAdminRole(input.role)
    || !input.reason.trim()
    || !input.target.collection.trim()
    || !input.target.id.trim()
    || !input.idempotencyKey.trim()
    || !Number.isInteger(input.expectedRevision)
    || input.expectedRevision < 0
    || !input.requestId.trim()
  ) {
    throw new Error('validation_failed');
  }

  return Object.freeze({
    action: input.action.trim(),
    actorUid: input.actorUid.trim(),
    role: input.role,
    reason: input.reason.trim(),
    target: Object.freeze({ ...input.target }),
    idempotencyKey: input.idempotencyKey.trim(),
    expectedRevision: input.expectedRevision,
    requestId: input.requestId.trim(),
  });
}
