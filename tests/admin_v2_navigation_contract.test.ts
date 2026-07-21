import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const router = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-router.js'), 'utf8');
const capabilities = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-capabilities.js'), 'utf8');

function resolveCapabilityHash(hash: string): { resolved: boolean; route: string; capabilityId: string } {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-capabilities.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify(m.resolveCapabilityHash(${JSON.stringify(hash)}))))`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout);
}

describe('Admin v2 canonical left navigation', () => {
  test('keeps the Control Panel as one separate utility item, not an Overview entry', () => {
    expect(core).toContain('const ADMIN_UTILITY_NAV_ITEMS');
    expect(core).toContain("{ id: 'control-panel', route: 'control-panel', label: 'Пульт управления' }");
    expect(core).toContain('const utilityNav = document.getElementById(\'utility-nav\')');
    expect(core).toContain('utilityNav.innerHTML = ADMIN_UTILITY_NAV_ITEMS.map(renderItem).join(\'\')');
    expect(core).toContain("capability.id !== 'control-panel'");
    expect(core).toContain('buildVisibleNavigationSearchIndex(groupsWithCanonicalItems, routeFor, ADMIN_UTILITY_NAV_ITEMS)');
    expect(router).toContain("'control-panel'");
    expect(resolveCapabilityHash('#control-panel')).toEqual({ resolved: false, route: 'control-panel', capabilityId: '' });
  });

  test('renders Users, Inbox, Report Center and Campaigns as distinct canonical entries', () => {
    expect(core).toContain('CANONICAL_LEFT_NAV_ITEMS');
    expect(core).toContain("{ id: 'users', route: 'users', label: 'Пользователи' }");
    expect(core).toContain("{ id: 'gmail-support', route: 'support', label: 'Почта поддержки' }");
    expect(core).toContain("{ id: 'reports', route: 'report-center', label: 'Центр репортов' }");
    expect(core).toContain("{ id: 'app-messages', route: 'campaigns', label: 'Кампании' }");
    expect(core).toContain('!CANONICAL_LEFT_NAV_ITEM_IDS.has(capability.id)');
    expect(core).toContain("support: 'users'");
    expect(core).toContain("'report-center': 'users'");
    expect(core).toContain("campaigns: 'application'");
    expect(core).toContain("aria-current=\"${isActive(capability) ? 'page' : 'false'}\"");
  });

  test('keeps existing canonical routes and aliases outside the navigation renderer', () => {
    for (const route of ['users', 'support', 'report-center', 'campaigns']) {
      expect(resolveCapabilityHash(`#${route}`)).toEqual({ resolved: false, route, capabilityId: '' });
    }
    expect(router).toContain("'campaigns'");
    expect(capabilities).toContain("nativeRoute: 'report-center'");
    expect(capabilities).toContain("nativeRoute: 'campaigns'");
    expect(core).not.toContain("{ id: 'mod-queue', route: 'community'");
  });

  test('uses the subscriptions analytics bookmark without colliding with the money route', () => {
    expect(core).toContain("['subscriptions', 'Подписки']");
    expect(core).toContain("subscriptions: 'subscriptions'");
    expect(core).not.toContain("['money', 'Деньги']");
    expect(core).not.toContain("subscriptions: 'money'");
    expect(resolveCapabilityHash('#subscriptions')).toEqual({ resolved: true, route: 'analytics', capabilityId: '' });
  });
});
