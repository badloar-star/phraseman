import { publishRemoteConfig, type RemoteConfigStore } from './remote_config_command';
import { createAdminCommand } from './command_contract';

function command(role: 'owner' | 'support' = 'owner') {
  return createAdminCommand({
    action: 'application.remote_config.publish', actorUid: 'admin-1', role,
    reason: 'Enable safe maintenance banner', target: { collection: 'remote_config', id: 'app' },
    idempotencyKey: 'op-1', expectedRevision: 4, requestId: 'req-1',
  });
}

function store(overrides: Partial<RemoteConfigStore> = {}): RemoteConfigStore {
  return {
    readCurrent: async () => ({ revision: 4, data: { maintenance: false } }),
    operationExists: async () => false,
    commit: async () => ({ auditId: 'audit-1', revision: 5 }),
    ...overrides,
  };
}

describe('remote config publish command', () => {
  it('publishes with compare-and-set and sends an atomic audit payload to the store', async () => {
    const commit = jest.fn(async () => ({ auditId: 'audit-1', revision: 5 }));
    const result = await publishRemoteConfig(command(), { maintenance: true }, store({ commit }));

    expect(result).toEqual({ ok: true, auditId: 'audit-1', revision: 5 });
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      before: { maintenance: false }, after: { maintenance: true }, auditAction: 'application.remote_config.publish',
    }));
  });

  it('rejects unauthorized roles, stale revisions, and duplicate idempotency keys', async () => {
    await expect(publishRemoteConfig(command('support'), { maintenance: true }, store())).rejects.toThrow('permission_denied');
    await expect(publishRemoteConfig(command(), { maintenance: true }, store({
      readCurrent: async () => ({ revision: 5, data: { maintenance: false } }),
    }))).rejects.toThrow('stale_version');
    await expect(publishRemoteConfig(command(), { maintenance: true }, store({
      operationExists: async () => true,
    }))).rejects.toThrow('duplicate_operation');
  });
});
