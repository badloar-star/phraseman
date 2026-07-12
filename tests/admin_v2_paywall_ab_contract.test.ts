import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 Paywall A/B workspace', () => {
  test('uses protected server aggregation and guarded publishing instead of browser Firestore writes', () => {
    const server = read('functions/src/admin_paywall_ab.ts');
    const index = read('functions/src/index.ts');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const core = read('admin/v2/scripts/admin-core.js');

    expect(server).toContain('export const adminGetPaywallAbWorkspace = onCall(');
    expect(server).toContain('export const adminPublishPaywallAb = onCall(');
    expect(server).toContain("hasPermission(role, 'application.config.write')");
    expect(server).toContain("collection('paywall_funnel')");
    expect(server).toContain("action: 'paywall_ab.publish'");
    expect(server).toContain("collection('admin_command_operations')");
    expect(server).toContain("collection('admin_log')");
    expect(server).toContain("collection('remote_config_history')");
    expect(index).toContain('adminGetPaywallAbWorkspace');
    expect(index).toContain('adminPublishPaywallAb');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetPaywallAbWorkspace')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPublishPaywallAb')");
    expect(core).toContain('function renderPaywallAbWorkflow');
    expect(core).toContain('preview-paywall-ab');
    expect(core).toContain('publish-paywall-ab');
    expect(core).toContain('paywall-ab-reason');
  });

  test('does not add direct paywall Firestore access to the v2 browser bundle', () => {
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    expect(firebase).not.toContain("collection(db, 'paywall_funnel')");
    expect(firebase).not.toContain("doc(db, 'remote_config', 'paywall_ab')");
  });
});
