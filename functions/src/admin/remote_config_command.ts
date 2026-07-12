import { hasPermission } from './permissions';
import type { AdminCommand } from './command_contract';

export interface RemoteConfigStore {
  readCurrent: () => Promise<{ revision: number; data: Readonly<Record<string, unknown>> }>;
  operationExists: (idempotencyKey: string) => Promise<boolean>;
  commit: (input: {
    operationId: string;
    expectedRevision: number;
    before: Readonly<Record<string, unknown>>;
    after: Readonly<Record<string, unknown>>;
    auditAction: string;
    actorUid: string;
    role: AdminCommand['role'];
    reason: string;
    requestId: string;
  }) => Promise<{ auditId: string; revision: number }>;
}

export async function publishRemoteConfig(
  command: AdminCommand,
  nextConfig: Readonly<Record<string, unknown>>,
  store: RemoteConfigStore,
): Promise<{ ok: true; auditId: string; revision: number }> {
  if (!hasPermission(command.role, 'application.config.write')) throw new Error('permission_denied');
  if (Object.keys(nextConfig).length === 0) throw new Error('validation_failed');
  if (await store.operationExists(command.idempotencyKey)) throw new Error('duplicate_operation');

  const current = await store.readCurrent();
  if (current.revision !== command.expectedRevision) throw new Error('stale_version');

  const result = await store.commit({
    operationId: command.idempotencyKey,
    expectedRevision: command.expectedRevision,
    before: current.data,
    after: Object.freeze({ ...nextConfig }),
    auditAction: command.action,
    actorUid: command.actorUid,
    role: command.role,
    reason: command.reason,
    requestId: command.requestId,
  });

  return { ok: true, auditId: result.auditId, revision: result.revision };
}
