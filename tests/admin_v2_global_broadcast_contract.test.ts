import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 native global broadcast workflow', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const server = read('functions/src/admin_global_broadcast.ts');
  const index = read('functions/src/index.ts');

  test('renders a native campaign form with explicit preview, history and danger deactivation', () => {
    expect(core).toContain('function renderGlobalBroadcastPanel');
    expect(core).toContain('global-broadcast-title-ru');
    expect(core).toContain('global-broadcast-message-ru');
    expect(core).toContain('global-broadcast-reward-type');
    expect(core).toContain('global-broadcast-reward-amount');
    expect(core).toContain('global-broadcast-reason');
    expect(core).toContain('data-action="preview-global-broadcast"');
    expect(core).toContain('data-action="publish-global-broadcast"');
    expect(core).toContain('data-action="deactivate-global-broadcasts"');
    expect(core).toContain('data-action="load-global-broadcasts"');
    expect(core).toContain('danger');
  });

  test('does not offer Arena rewards in the mounted V2 broadcast form', () => {
    expect(core).not.toContain('arena_extra_5');
    expect(core).toContain("{ key: 'shards', label: 'Осколки знаний' }");
    expect(core).toContain("{ key: 'chain_shield_3', label: 'Щит цепочки на 3 дня' }");
  });

  test('keeps publish behind a stable preview and explicit confirmation', () => {
    expect(core).toContain('function buildGlobalBroadcastPreview');
    expect(core).toContain('function sameGlobalBroadcastPayload');
    expect(core).toContain('state.broadcasts.preview');
    expect(core).toContain("id('global-broadcast-publish')");
    expect(core).toContain("id('global-broadcast-request')");
    expect(core).toContain('globalThis.confirm');
    expect(core).toContain("can('campaigns.write')");
  });

  test('uses server-only callables with atomic replacement, audit and actor-bound idempotency', () => {
    for (const callable of ['adminListGlobalBroadcasts', 'adminPublishGlobalBroadcast', 'adminDeactivateGlobalBroadcasts']) {
      expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);
      expect(index).toContain(callable);
    }
    expect(server).toContain("collection('global_broadcast_modals')");
    expect(server).toContain("collection('admin_command_operations')");
    expect(server).toContain("collection('admin_log')");
    expect(server).toContain("where('active', '==', true)");
    expect(server).toContain('db.runTransaction');
    expect(server).toContain('createAuditRecord');
    expect(server).toContain("roleFor(request, 'campaigns.write')");
    expect(server).toContain('hasPermission(role, permission)');
    expect(server).toContain('operation.actorUid !== actorUid');
    expect(server).toContain('operation.action !== action');
    expect(server).toContain('activeSnapshot.size > MAX_ACTIVE_BROADCASTS');
    expect(server).toContain('const [activeSnapshot, historySnapshot] = await Promise.all');
    expect(server).toContain('for (const doc of [...activeSnapshot.docs, ...historySnapshot.docs])');
    expect(server).not.toContain('.catch(() => null)');
    expect(core).not.toContain("addDoc(collection(db, 'global_broadcast_modals')");
    expect(core).not.toContain("updateDoc(d.ref, {\n         active: false");
  });
});

