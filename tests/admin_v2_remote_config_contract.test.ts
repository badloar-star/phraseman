import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 remote config workflow', () => {
  test('uses protected server reads and guarded revision publishing', () => {
    const server = read('functions/src/admin_remote_config.ts');
    const index = read('functions/src/index.ts');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const core = read('admin/v2/scripts/admin-core.js');

    expect(server).toContain('export const adminGetRemoteConfigWorkspace = onCall(');
    expect(server).toContain("hasPermission(role, 'application.config.write')");
    expect(server).toContain("collection('remote_config_history').limit(100)");
    expect(index).toContain('adminGetRemoteConfigWorkspace');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetRemoteConfigWorkspace')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPublishRemoteConfig')");
    expect(firebase).not.toContain("collection(db, 'remote_config')");
    expect(core).toContain('preview-remote-config');
    expect(core).toContain('publish-remote-config');
    expect(core).toContain("can('application.config.write')");
  });
});
