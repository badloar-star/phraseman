import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 beta tester controls', () => {
  test('moves all legacy beta tester mutations behind guarded server commands', () => {
    const server = read('functions/src/admin_beta_testers.ts');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(server).toContain('export const adminListBetaTesters = onCall(');
    expect(server).toContain('export const adminUpdateBetaTester = onCall(');
    expect(server).toContain("hasPermission(role, 'users.write')");
    expect(server).toContain("hasPermission(role, 'money.manual_access.write')");
    expect(server).toContain("action: 'beta_tester.update'");
    expect(server).toContain("collection('admin_command_operations')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListBetaTesters')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminUpdateBetaTester')");
    expect(core).toContain('load-beta-testers');
    expect(core).toContain('preview-beta-tester-action');
    expect(core).toContain('confirm-beta-tester-action');
    expect(core).toContain('beta-tester-reason');
  });
});
