import { createAdminCommand, type AdminCommand } from './command_contract';

describe('admin command contract', () => {
  it('creates a serializable command envelope with operation metadata', () => {
    const command = createAdminCommand({
      action: 'config.publish',
      actorUid: 'admin-1',
      role: 'owner',
      reason: 'Enable maintenance message',
      target: { collection: 'remote_config', id: 'app' },
      idempotencyKey: 'op-1',
      expectedRevision: 4,
      requestId: 'req-1',
    });

    expect(command).toMatchObject<Partial<AdminCommand>>({
      action: 'config.publish',
      actorUid: 'admin-1',
      role: 'owner',
      idempotencyKey: 'op-1',
      expectedRevision: 4,
      requestId: 'req-1',
    });
    expect(() => JSON.stringify(command)).not.toThrow();
  });

  it('rejects empty reason and invalid revision before a command can be sent', () => {
    expect(() => createAdminCommand({
      action: 'config.publish', actorUid: 'admin-1', role: 'owner', reason: ' ',
      target: { collection: 'remote_config', id: 'app' }, idempotencyKey: 'op-2',
      expectedRevision: 1, requestId: 'req-2',
    })).toThrow('validation_failed');

    expect(() => createAdminCommand({
      action: 'config.publish', actorUid: 'admin-1', role: 'owner', reason: 'valid',
      target: { collection: 'remote_config', id: 'app' }, idempotencyKey: 'op-3',
      expectedRevision: -1, requestId: 'req-3',
    })).toThrow('validation_failed');
  });
});
