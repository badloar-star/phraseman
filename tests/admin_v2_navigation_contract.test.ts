import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const router = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-router.js'), 'utf8');
const capabilities = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-capabilities.js'), 'utf8');

describe('Admin v2 canonical left navigation', () => {
  test('keeps the Control Panel as one separate utility item, not an Overview entry', () => {
    expect(core).toContain('const ADMIN_UTILITY_NAV_ITEMS');
    expect(core).toContain("{ id: 'control-panel', route: 'control-panel', label: 'Пульт управления' }");
    expect(core).toContain('const utilityNav = document.getElementById(\'utility-nav\')');
    expect(core).toContain('utilityNav.innerHTML = ADMIN_UTILITY_NAV_ITEMS.map(renderItem).join(\'\')');
    expect(core).toContain("capability.id !== 'control-panel'");
    expect(core).toContain('buildVisibleNavigationSearchIndex(groupsWithCanonicalItems, routeFor, ADMIN_UTILITY_NAV_ITEMS)');
    expect(router).toContain("'control-panel': 'control-panel'");
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
    for (const route of ["users: 'users'", "'gmail-support': 'support'", "'report-center': 'report-center'", "support: 'support'"]) {
      expect(router).toContain(route);
    }
    expect(capabilities).toContain("reports: 'report-center'");
    expect(capabilities).toContain("'app-messages': 'campaigns'");
    expect(core).not.toContain("{ id: 'mod-queue', route: 'community'");
  });
});
