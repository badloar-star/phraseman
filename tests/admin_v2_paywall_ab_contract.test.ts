import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

type CapabilitySnapshot = {
  registry: { id: string; route: string; nativeRoute: string; label: string; description: string }[];
  retiredCapabilityIds: string[];
  resolutions: { hash: string; resolved: boolean; route: string; capabilityId: string }[];
};

function inspectCapabilityModule(hashes: string[]): CapabilitySnapshot {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-capabilities.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify({ registry: m.ADMIN_CAPABILITY_REGISTRY, retiredCapabilityIds: m.RETIRED_CAPABILITY_IDS, resolutions: ${JSON.stringify(hashes)}.map((hash) => ({ hash, ...m.resolveCapabilityHash(hash) })) })))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

describe('Admin v2 paywall A/B workflow', () => {
  test('registers paywall-ab as a native capability instead of a retired one', () => {
    const snapshot = inspectCapabilityModule(['#paywall-ab', '#application:paywall-ab']);

    expect(snapshot.retiredCapabilityIds).not.toContain('paywall-ab');
    const capability = snapshot.registry.find((entry) => entry.id === 'paywall-ab');
    expect(capability).toBeDefined();
    expect(capability).toMatchObject({ route: 'application', nativeRoute: 'application' });
    expect(capability?.label).toBe('A/B-тест пейволов');
    for (const resolution of snapshot.resolutions) {
      expect(resolution).toMatchObject({ resolved: true, route: 'application', capabilityId: '' });
    }
  });

  test('wires the linked-slider editor into the application workflow without browser writes', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');

    expect(core).toContain('function renderPaywallAbWorkflow()');
    expect(core).toContain('${renderPaywallAbWorkflow()}');
    expect(core).toContain('A/B-тест пейволов');
    expect(core).toContain('data-paywall-ab-slider');
    expect(core).toContain('data-paywall-ab-enabled');
    expect(core).toContain('function redistributePaywallAbShares(draft, changedLetter, rawPct)');
    expect(core).toContain('handlePaywallAbInput');
    expect(core).toContain('handlePaywallAbChange');
    expect(core).toContain('data-action="preview-paywall-ab"');
    expect(core).toContain('data-action="publish-paywall-ab"');
    expect(core).toContain('actions.publishPaywallAb');
    expect(core).toContain('actions.getPaywallAbWorkspace');

    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPublishPaywallAb')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetPaywallAbWorkspace')");
    expect(firebase).toContain('publishPaywallAb: async (input)');
    expect(firebase).toContain('getPaywallAbWorkspace: async ()');
    expect(firebase).not.toMatch(/setDoc\(\s*doc\(\s*db\s*,\s*'remote_config'/);
    expect(firebase).not.toContain('firebase-firestore');
    expect(firebase).not.toContain("collection(db, 'remote_config')");
  });

  test('guards the server callable with role permission, enabled-sum validation and audit', () => {
    const server = read('functions/src/admin_paywall_ab.ts');
    const index = read('functions/src/index.ts');

    expect(server).toContain('export const adminPublishPaywallAb = onCall(');
    expect(server).toContain('export const adminGetPaywallAbWorkspace = onCall(');
    expect(server).toContain("hasPermission(role, 'application.config.write')");
    expect(server).toContain('enabledPctSum');
    expect(server).toContain('sum of pct over enabled variants must equal 100');
    expect(server).toContain('at least one variant must be enabled');
    expect(server).toContain("db.collection('admin_command_operations')");
    expect(server).toContain("db.collection('admin_log')");
    expect(server).toContain("db.collection('remote_config_history')");
    expect(server).toContain('paywallAbChanges');
    expect(server).toContain('expectedUpdatedAt');

    expect(index).toContain('adminPublishPaywallAb');
    expect(index).toContain('adminGetPaywallAbWorkspace');
  });
});
