import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const settingsStart = core.indexOf('function renderAdminSettings()');
const settingsEnd = core.indexOf('\nfunction renderOverviewOperationalState(', settingsStart);
const settings = core.slice(settingsStart, settingsEnd);
const overviewStart = core.indexOf('function renderOverview()');
const overviewEnd = core.indexOf('\nfunction renderApplication(', overviewStart);
const overview = core.slice(overviewStart, overviewEnd);

describe('Admin v2 dashboard widgets UI contract', () => {
  test('imports the pure registry and renders one settings panel between workflow and reports', () => {
    expect(core).toContain("from './admin-v2-dashboard-widgets.js'");
    expect(core.match(/id="settings-dashboard-widgets"/g)).toHaveLength(1);
    expect(settings.indexOf('id="settings-workflow"')).toBeLessThan(settings.indexOf('${renderDashboardWidgetSettings()}'));
    expect(settings.indexOf('${renderDashboardWidgetSettings()}')).toBeLessThan(settings.indexOf('id="settings-reports"'));
    expect(core).toContain('DASHBOARD_WIDGET_REGISTRY.map((widget) =>');
    expect(core).toContain('const inputId = `settings-dashboard-widget-${widget.id}`;');
    expect(core).toContain('data-dashboard-widget-id="${widget.id}"');
    expect(core).toContain('aria-describedby="${forced ? descriptionId : \'\'}"');
  });

  test('keeps widget choices in the existing local draft and save/reset lifecycle', () => {
    expect(core).toContain('readDashboardWidgetPreferences({');
    expect(core).toContain('migrateDashboardWidgetPreferences({');
    expect(core).toContain('writeDashboardWidgetPreferences({');
    expect(core).toContain('resetDashboardWidgetPreferences({');
    expect(core).toContain('data-dashboard-widget-id');
    expect(core).not.toContain('data-action="save-dashboard-widgets"');
    expect(core).not.toContain('data-action="reset-dashboard-widgets"');
  });

  test('uses sanitized visible IDs to conditionally render only optional overview blocks', () => {
    expect(overview).toContain("isDashboardWidgetVisible('operational_state')");
    expect(overview).toContain("isDashboardWidgetVisible('payment_summary')");
    expect(overview).toContain("isDashboardWidgetVisible('decision_queue')");
    expect(overview).toContain("isDashboardWidgetVisible('quick_links')");
    expect(core).toContain('sanitizeDashboardWidgetVisibility(');
  });
});
