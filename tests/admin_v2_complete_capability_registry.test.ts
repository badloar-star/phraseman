import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 complete capability registry', () => {
  test('places every legacy tab exactly once inside the seven-section control plane', () => {
    const legacy = read('admin/legacy.html');
    const registry = read('admin/v2/scripts/admin-capabilities.js');
    const legacyTabIds = [...legacy.matchAll(/<div id="tab-([^"]+)"/g)].map((match) => match[1]).sort();
    const registeredTabIds = [...registry.matchAll(/legacyTab: '([^']+)'/g)].map((match) => match[1]).sort();

    expect(legacyTabIds.length).toBeGreaterThan(50);
    expect(new Set(registeredTabIds).size).toBe(registeredTabIds.length);
    expect(registeredTabIds).toEqual(legacyTabIds);
    for (const route of ['overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics']) {
      expect(registry).toContain(`route: '${route}'`);
    }
  });

  test('keeps the four standalone legacy admin pages reachable from the new shell', () => {
    const registry = read('admin/v2/scripts/admin-capabilities.js');
    for (const page of ['testers.html', 'beta_testers.html', 'full.html', 'site.html']) {
      expect(registry).toContain(`legacyPage: '${page}'`);
    }
  });

  test('opens grouped modules through safe legacy links and supports stable deep links', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const router = read('admin/v2/scripts/admin-router.js');
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    expect(core).toContain('renderCapabilityWorkspace');
    expect(core).not.toContain('<iframe');
    expect(core).toContain('data-capability-id');
    expect(router).toContain('resolveCapabilityHash(globalThis.location.hash)');
    expect(capabilities).toContain("split(':')");
    expect(capabilities).toContain('decodeURIComponent(encoded)');
  });
});
