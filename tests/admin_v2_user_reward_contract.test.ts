import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('Admin v2 guarded individual reward workflow', () => {
  test('wires the unified profile to the protected callable with preview and confirmation', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');

    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGrantReward')");
    expect(firebase).toContain('grantUserReward: async (input)');
    expect(core).toContain("'users.write'");
    expect(core).toContain('function renderUserRewardWorkflow');
    expect(core).toContain('data-action="preview-user-reward"');
    expect(core).toContain('data-action="grant-user-reward"');
    expect(core).toContain('function buildUserRewardPreview');
    expect(core).toContain('sameUserRewardPayload');
    expect(core).toContain("authStillValid(authGeneration, 'users.write')");
    expect(core).toContain('globalThis.confirm(`Выдать награду пользователю');
    expect(core).toContain('idempotencyKey: id(\'admin-user-reward\')');
    expect(core).toContain('requestId: id(\'admin-user-reward-request\')');
    for (const action of ['preview-user-reward', 'discard-user-reward-preview', 'grant-user-reward']) {
      expect(core).toMatch(new RegExp(`data-action="${action}"[^>]*title="[^"]+"`));
    }
  });

  test('enforces role, audit and idempotency on the server instead of trusting the browser', () => {
    const server = read('functions/src/admin_grant.ts');

    expect(server).toContain("hasPermission(role, 'users.write')");
    expect(server).toContain("collection('admin_command_operations').doc(input.idempotencyKey)");
    expect(server).toContain('adminGrantRewardFingerprint(input)');
    expect(server).toContain('assertAdminRewardReplay');
    expect(server).toContain("action: 'grant_reward'");
    expect(server).toContain('createAuditRecord({');
    expect(server).toContain('tx.create(operationRef');
    expect(server).toContain('tx.create(rewardRef');
    expect(server).toContain('tx.create(shardLogRef');
  });

  test('keeps the legacy reward button compatible with the strengthened command contract', () => {
    const legacy = read('admin/legacy.html');

    expect(legacy).toContain("reason: String(comment || '').trim() ||");
    expect(legacy).toContain('idempotencyKey: `legacy-reward-${commandNonce}`');
    expect(legacy).toContain('requestId: `legacy-reward-request-${commandNonce}`');
  });

  test('does not accidentally port premium grants or moderation mutations in this packet', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    expect(core).not.toContain('data-action="grant-user-plus"');
    expect(core).not.toContain('data-action="revoke-user-plus"');
    expect(core).not.toContain('data-action="ban-user"');
    expect(core).not.toContain('data-action="unban-user"');
  });
});
