import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const router = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-router.js'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'styles', 'admin.css'), 'utf8');
const index = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'index.html'), 'utf8');

describe('Admin v2 page settings', () => {
  test('adds a local admin settings page with the full settings surface', () => {
    expect(core).toContain("'admin-settings': { title: 'Настройки админки'");
    expect(router).toContain("'admin-settings': 'admin-settings'");
    expect(router).toContain("'settings': 'admin-settings'");
    expect(index).toContain('href="#admin-settings"');
    const adminSectionsBlock = core.match(/export const ADMIN_SECTIONS = Object\.freeze\(\[([\s\S]*?)\]\);/);
    expect(adminSectionsBlock?.[1].match(/route:/g) ?? []).toHaveLength(7);
    expect(adminSectionsBlock?.[1]).not.toContain('admin-settings');
    expect(core).toContain('renderAdminSettings');
    expect(core).toContain('data-admin-settings-panel="appearance"');
    expect(core).toContain('data-admin-settings-panel="workflow"');
    expect(core).toContain('data-admin-settings-panel="reports"');
    expect(core).toContain('data-admin-settings-panel="alerts"');
    expect(core).toContain('data-admin-settings-panel="safety"');
    expect(core).toContain('data-settings-target="settings-appearance"');
    expect(core).toContain('scrollIntoView({ block:');
    expect(core).not.toContain('href="#settings-appearance"');
    expect(core).not.toContain('href="#settings-workflow"');
  });

  test('keeps settings local to this browser and applies theme/accent tokens', () => {
    expect(core).toContain("ADMIN_V2_SETTINGS_STORAGE_KEY = 'phraseman.admin.v2.settings'");
    expect(core).toContain('loadAdminUiSettings');
    expect(core).toContain('saveAdminUiSettings');
    expect(core).toContain('applyAdminUiSettings');
    expect(core).toContain('globalThis.localStorage');
    expect(core).toContain("dataset.adminTheme");
    expect(core).toContain("dataset.adminAccent");
    expect(core).toContain('--admin-accent');
    expect(core).not.toContain('actions.saveAdminUiSettings');
    expect(core).not.toContain('adminUiSettings.set');
  });

  test('supports appearance, report defaults, alerts, and safety controls', () => {
    expect(core).toContain("theme: 'light'");
    expect(core).toContain("accent: 'lime'");
    expect(core).toContain("density: 'comfortable'");
    expect(core).toContain("defaultSinceDays: 7");
    expect(core).toContain("defaultSource: 'all'");
    expect(core).toContain("defaultLane: 'open'");
    expect(core).toContain("reportGrouping: 'status'");
    expect(core).toContain('showAnsweredBelowOpen');
    expect(core).toContain('hideArchivedByDefault');
    expect(core).toContain('criticalAlertSound');
    expect(core).toContain('sidebarCounters');
    expect(core).toContain('quietMode');
    expect(core).toContain('strongProductionWarning');
    expect(core).toContain('requireReasonForStatus');
    expect(core).toContain('collapseDangerousActions');
    expect(core).toContain("data-action=\"save-admin-settings\"");
    expect(core).toContain("data-action=\"reset-admin-settings\"");
  });

  test('adds dark mode, accent presets, and settings layout styles', () => {
    expect(styles).toContain('[data-admin-theme="dark"]');
    expect(styles).toContain('[data-admin-accent="blue"]');
    expect(styles).toContain('[data-admin-accent="purple"]');
    expect(styles).toContain('[data-admin-accent="red"]');
    expect(styles).toContain('[data-admin-accent="amber"]');
    expect(styles).toContain('.settings-layout');
    expect(styles).toContain('.settings-tabs');
    expect(styles).toContain('.accent-swatch');
  });
});
