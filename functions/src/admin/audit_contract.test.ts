import { createAuditRecord } from './audit_contract';

describe('admin audit contract', () => {
  it('creates an immutable before/after audit record with rollback reference', () => {
    const record = createAuditRecord({
      action: 'config.publish', actorUid: 'admin-1', role: 'owner',
      entity: { collection: 'remote_config', id: 'app' },
      reason: 'Enable maintenance message', before: { enabled: false }, after: { enabled: true },
      rollbackReference: 'audit-previous-1', requestId: 'req-1', timestamp: '2026-07-10T12:00:00.000Z',
    });

    expect(record).toMatchObject({
      action: 'config.publish', actorUid: 'admin-1', role: 'owner',
      before: { enabled: false }, after: { enabled: true }, rollbackReference: 'audit-previous-1',
    });
    expect(Object.isFrozen(record)).toBe(true);
  });
});
