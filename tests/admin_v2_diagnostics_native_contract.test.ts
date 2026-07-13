import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 native diagnostics workspace', () => {
  test('uses one compact state, controller, and view for overview, App Health, archive, and audit archive', () => {
    const state = read('admin/v2/scripts/admin-diagnostics-state.js');
    const controller = read('admin/v2/scripts/admin-diagnostics-controller.js');
    const view = read('admin/v2/scripts/admin-diagnostics-view.js');
    const core = read('admin/v2/scripts/admin-core.js');

    for (const id of ['overview', 'app-health', 'archive', 'changelog-0608']) expect(state).toContain(`'${id}'`);
    expect(state).toContain('createDiagnosticsState');
    expect(state).toContain('diagnosticsViewFromCapability');
    expect(controller).toContain('createDiagnosticsController');
    expect(view).toContain('diagnostics-tabs');
    expect(view).toContain('diagnostics-mobile-view');
    expect(core).toContain("from './admin-diagnostics-controller.js'");
    expect(core).toContain('renderDiagnosticsWorkspace');
  });

  test('maps all three migrated capabilities natively to diagnostics', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    for (const id of ['app-health', 'archive', 'changelog-0608']) {
      expect(capabilities).toContain(`'${id}': 'diagnostics'`);
    }
  });

  test('preserves App Health periods, filters, KPIs, activity, detail, export, pagination, and three status actions', () => {
    const source = ['admin-diagnostics-state.js', 'admin-diagnostics-controller.js', 'admin-diagnostics-view.js']
      .map((file) => read(`admin/v2/scripts/${file}`)).join('\n');
    const controller = read('admin/v2/scripts/admin-diagnostics-controller.js');
    const view = read('admin/v2/scripts/admin-diagnostics-view.js');

    expect(source).not.toMatch(/collection\(|getDocs\(|setDoc\(|updateDoc\(|deleteDoc\(/);
    for (const period of ['1', '6', '24', '168']) expect(view).toContain(`value="${period}"`);
    for (const id of ['diagnostics-severity', 'diagnostics-status', 'diagnostics-feature', 'diagnostics-query']) expect(view).toContain(id);
    for (const label of ['Status', 'Critical', 'Warnings', 'Affected users', 'Top repeat']) expect(view).toContain(label);
    expect(controller).toContain('listAppHealth');
    expect(controller).toContain('listAppActivity');
    expect(controller).toContain('getAppHealthDetail');
    expect(controller).toContain('exportAppHealth');
    expect(controller).toContain('nextCursor');
    expect(controller).toContain('updateReportStatus');
    for (const status of ['reviewed', 'fixed', 'known']) expect(view).toContain(`data-next-status="${status}"`);
    expect(view).toContain('diagnostics-status-reason');
    expect(controller).toContain('expectedStatus');
    expect(controller).toContain('idempotencyKey');
    expect(controller).toContain('confirmation');
  });

  test('preserves archive type filtering and bounded detail without client Firestore access', () => {
    const controller = read('admin/v2/scripts/admin-diagnostics-controller.js');
    const view = read('admin/v2/scripts/admin-diagnostics-view.js');
    expect(controller).toContain('listDiagnosticsArchive');
    expect(controller).toContain('getDiagnosticsArchiveDetail');
    expect(view).toContain('diagnostics-archive-type');
    expect(view).toContain('value="user"');
    expect(view).toContain('value="error"');
    expect(view).toContain('archive-detail');
    expect(view).toContain('sourceHealth');
  });

  test('exposes every protected callable wrapper and safe static archive', () => {
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    for (const callable of [
      'adminListAppHealth',
      'adminListAppActivity',
      'adminGetAppHealthDetail',
      'adminExportAppHealth',
      'adminListDiagnosticsArchive',
      'adminGetDiagnosticsArchiveDetail',
    ]) expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);

    const view = read('admin/v2/scripts/admin-diagnostics-view.js');
    expect(view).toContain('data/changelog-0608.html');
    expect(view).toContain('sandbox=""');
    expect(fs.existsSync(path.join(root, 'admin/v2/data/changelog-0608.html'))).toBe(true);
  });

  test('keeps the workspace accessible and visibly honest about partial data', () => {
    const view = read('admin/v2/scripts/admin-diagnostics-view.js');
    const css = read('admin/v2/styles/admin.css');
    for (const stateName of ['loading', 'empty', 'ready', 'partial', 'truncated', 'error']) expect(view).toContain(stateName);
    expect(view).toContain('data-tooltip=');
    expect(view).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(view).toContain('Выборка ограничена');
    expect(view).toContain('aria-label="Раздел диагностики"');
    expect(css).toContain('.diagnostics-mobile-view');
    expect(css).toContain('.diagnostics-archive-frame');
  });
});
