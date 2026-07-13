import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

function renderDiagnostics(model: Record<string, unknown>, canRead = true): string {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-diagnostics-view.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => {
    const html = m.renderDiagnosticsWorkspace(${JSON.stringify(model)}, {
      escapeHtml: (value) => String(value ?? ''),
      can: (permission) => permission === 'diagnostics.read' ? ${JSON.stringify(canRead)} : true,
    });
    process.stdout.write(html);
  })`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return run.stdout;
}

function runDiagnosticsRuntimeProtections(): Record<string, any> {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-diagnostics-controller.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then(async (m) => {
    const createModel = (view = 'app-health') => ({
      view, state: 'idle', error: '',
      filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' },
      archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      operationKeys: {},
    });
    const appResult = (id) => ({ state: 'ready', groups: [{ id }], kpis: {}, health: { level: 'GREEN', conclusive: true, kpis: {} }, sourceHealth: [], nextCursor: '', truncated: false, partial: false });
    const archiveResult = { state: 'empty', items: [], sourceHealth: [], nextCursor: '', truncated: false, partial: false };
    const fields = {
      'diagnostics-period': '24', 'diagnostics-severity': 'all', 'diagnostics-status': 'all',
      'diagnostics-feature': '', 'diagnostics-query': '', 'diagnostics-archive-type': 'all',
    };
    globalThis.document = { getElementById: (id) => ({ value: fields[id] || '' }) };
    globalThis.location = { hash: '#app-health' };
    const makeController = ({ getModel, setModel, actions, route = () => 'diagnostics', authorized = () => true, messages = [] }) => m.createDiagnosticsController({
      getModel, setModel, actions: () => actions, render: () => {}, route, authorized,
      message: (message) => messages.push(message), errorMessage: (error) => String(error),
      id: () => 'id', download: () => {}, copy: async () => {},
    });

    let cursorModel = createModel();
    cursorModel.state = 'ready';
    cursorModel.filters.query = 'committed-query';
    cursorModel.appHealth.nextCursor = 'app-cursor';
    fields['diagnostics-query'] = 'unsaved-query';
    const cursorInputs = [];
    let holdFresh = false;
    let resolveFresh;
    const cursorActions = {
      listAppHealth: (input) => {
        cursorInputs.push({ kind: 'app', input });
        if (holdFresh) return new Promise((resolve) => { resolveFresh = resolve; });
        return Promise.resolve(appResult('append'));
      },
      listDiagnosticsArchive: async (input) => {
        cursorInputs.push({ kind: 'archive', input });
        return archiveResult;
      },
    };
    const cursorController = makeController({
      getModel: () => cursorModel,
      setModel: (value) => { cursorModel = value; },
      actions: cursorActions,
    });
    await cursorController.handle('diagnostics-next-app-health', { dataset: {} });
    cursorModel = { ...cursorModel, view: 'archive', state: 'ready', archive: { ...cursorModel.archive, type: 'user', nextCursor: 'archive-cursor' } };
    fields['diagnostics-archive-type'] = 'error';
    await cursorController.handle('diagnostics-next-archive', { dataset: {} });
    cursorModel = createModel();
    cursorModel.state = 'ready';
    cursorModel.filters.query = 'previous-query';
    cursorModel.appHealth.nextCursor = 'stale-cursor';
    fields['diagnostics-query'] = 'fresh-query';
    holdFresh = true;
    const freshRequest = cursorController.handle('diagnostics-load-app-health', { dataset: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const cursorDuringFreshLoad = cursorModel.appHealth.nextCursor;
    resolveFresh(appResult('fresh'));
    await freshRequest;

    let permissionModel = createModel();
    let permissionCalls = 0;
    const permissionMessages = [];
    const permissionController = makeController({
      getModel: () => permissionModel,
      setModel: (value) => { permissionModel = value; },
      actions: { listAppHealth: async () => { permissionCalls += 1; return appResult('forbidden'); } },
      authorized: () => false,
      messages: permissionMessages,
    });
    await permissionController.handle('diagnostics-load-app-health', { dataset: {} });

    let lifecycleModel = createModel();
    let lifecycleRoute = 'diagnostics';
    let lifecycleCalls = 0;
    let resolveFirst;
    const lifecycleController = makeController({
      getModel: () => lifecycleModel,
      setModel: (value) => { lifecycleModel = value; },
      actions: { listAppHealth: () => {
        lifecycleCalls += 1;
        if (lifecycleCalls === 1) return new Promise((resolve) => { resolveFirst = resolve; });
        return Promise.resolve(appResult('returned'));
      } },
      route: () => lifecycleRoute,
    });
    const firstLoad = lifecycleController.maybeLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));
    lifecycleRoute = 'overview';
    await lifecycleController.maybeLoad();
    const stateWhileAway = lifecycleModel.state;
    resolveFirst(appResult('stale'));
    await firstLoad;
    lifecycleRoute = 'diagnostics';
    await lifecycleController.maybeLoad();

    process.stdout.write(JSON.stringify({
      cursor: { inputs: cursorInputs, cursorDuringFreshLoad },
      permission: { calls: permissionCalls, state: permissionModel.state, messages: permissionMessages },
      lifecycle: { calls: lifecycleCalls, stateWhileAway, state: lifecycleModel.state, items: lifecycleModel.appHealth.items },
    }));
  }).catch((error) => { console.error(error); process.exitCode = 1; })`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout) as Record<string, any>;
}

function runDiagnosticsLoadRace(): Array<{ id: string }> {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-diagnostics-controller.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then(async (m) => {
    let model = {
      view: 'app-health', state: 'idle', error: '',
      filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' },
      archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      operationKeys: {},
    };
    const fields = { 'diagnostics-period': '24', 'diagnostics-severity': 'all', 'diagnostics-status': 'all', 'diagnostics-feature': '', 'diagnostics-query': 'first' };
    globalThis.document = { getElementById: (id) => ({ value: fields[id] || '' }) };
    globalThis.location = { hash: '#app-health' };
    const pending = [];
    const actions = { listAppHealth: (input) => new Promise((resolve) => pending.push({ input, resolve })) };
    const controller = m.createDiagnosticsController({
      getModel: () => model,
      setModel: (value) => { model = value; },
      actions: () => actions,
      render: () => {}, route: () => 'diagnostics', authorized: () => true,
      message: () => {}, errorMessage: (error) => String(error), id: () => 'id', download: () => {}, copy: async () => {},
    });
    const first = controller.handle('diagnostics-load-app-health', { dataset: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fields['diagnostics-query'] = 'second';
    const second = controller.handle('diagnostics-load-app-health', { dataset: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const result = (id) => ({ state: 'ready', groups: [{ id }], kpis: {}, health: { level: 'GREEN', conclusive: true, kpis: {} }, sourceHealth: [], nextCursor: '', truncated: false, partial: false });
    pending[1].resolve(result('second'));
    await second;
    pending[0].resolve(result('first'));
    await first;
    process.stdout.write(JSON.stringify(model.appHealth.items));
  }).catch((error) => { console.error(error); process.exitCode = 1; })`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout) as Array<{ id: string }>;
}

function runDiagnosticsLoadResult(result: Record<string, unknown>): Record<string, any> {
  const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-diagnostics-controller.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then(async (m) => {
    let model = {
      view: 'app-health', state: 'idle', error: '',
      filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' },
      archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      operationKeys: {},
    };
    globalThis.document = { getElementById: () => ({ value: '' }) };
    globalThis.location = { hash: '#app-health' };
    const controller = m.createDiagnosticsController({
      getModel: () => model,
      setModel: (value) => { model = value; },
      actions: () => ({ listAppHealth: async () => (${JSON.stringify(result)}) }),
      render: () => {}, route: () => 'diagnostics', authorized: () => true,
      message: () => {}, errorMessage: (error) => String(error), id: () => 'id', download: () => {}, copy: async () => {},
    });
    await controller.handle('diagnostics-load-app-health', { dataset: {} });
    process.stdout.write(JSON.stringify(model));
  }).catch((error) => { console.error(error); process.exitCode = 1; })`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout) as Record<string, any>;
}

function renderAppHealthStatus(status: string): string {
  return renderDiagnostics({
    view: 'app-health', state: 'ready', error: '',
    filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
    appHealth: {
      items: [{ id: 'event-1', context: 'audio.playback', severity: 'warning', status, repeatCount: 1, affectedUsers: 1, lastSeenAtMs: 1 }],
      kpis: { health: 'GREEN', critical: 0, warnings: 1, affectedUsers: 1, topRepeat: 1 },
      sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false,
    },
    activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' },
    archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
    operationKeys: {},
  });
}

function statusButton(html: string, nextStatus: string): string {
  const match = html.match(new RegExp(`<button[^>]*data-next-status="${nextStatus}"[^>]*>`));
  expect(match).not.toBeNull();
  return match![0];
}

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
    expect(controller).toContain('!context.actions()');
    expect(view).toContain('diagnostics-tabs');
    expect(view).toContain('diagnostics-mobile-view');
    expect(core).toContain("from './admin-diagnostics-controller.js'");
    expect(core).toContain('renderDiagnosticsWorkspace');
  });

  test('retries the lazy diagnostics load when admin actions arrive after authentication', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const start = core.indexOf('export function setAdminActions');
    const end = core.indexOf('export function setAuthState', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(core.slice(start, end)).toContain('getDiagnosticsController().maybeLoad();');
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
    expect(view).toContain("option('info'");
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
    for (const action of ['diagnostics-copy-app-health-ai', 'diagnostics-copy-app-health-json']) {
      expect(source).toContain(action);
    }
    expect(controller).toContain("copyAppHealth('ai')");
    expect(controller).toContain("copyAppHealth('json')");
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

  test('renders bounded nested archive metadata instead of dropping server-projected detail sections', () => {
    const html = renderDiagnostics({
      view: 'archive',
      state: 'ready',
      error: '',
      filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: null },
      activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', error: '' },
      archive: {
        type: 'all', items: [], sourceHealth: [], nextCursor: '',
        detail: { item: {
          id: 'archive-1', comment: 'Bounded detail',
          user: { maskedId: 'user_abc123' },
          learning: { dataId: 'lesson-7', userLevel: 12 },
          device: { model: 'Pixel' },
          app: { version: '2.4.0' },
          review: { at: '2026-07-13T10:00:00.000Z', by: null },
        } },
      },
    });

    for (const value of ['user.maskedId', 'user_abc123', 'learning.dataId', 'lesson-7', 'device.model', 'Pixel', 'app.version', '2.4.0']) {
      expect(html).toContain(value);
    }
    expect(html).not.toContain('[object Object]');
  });

  test('ignores an older App Health response that arrives after a newer filter request', () => {
    expect(runDiagnosticsLoadRace()).toEqual([{ id: 'second' }]);
  });

  test('binds cursors to committed filters, blocks unauthorized reads, and recovers after leaving mid-load', () => {
    const result = runDiagnosticsRuntimeProtections();

    expect(result.cursor.inputs[0]).toMatchObject({ kind: 'app', input: { cursor: 'app-cursor', query: 'committed-query' } });
    expect(result.cursor.inputs[1]).toMatchObject({ kind: 'archive', input: { cursor: 'archive-cursor', type: 'user' } });
    expect(result.cursor.cursorDuringFreshLoad).toBe('');

    expect(result.permission.calls).toBe(0);
    expect(result.permission.state).toBe('idle');
    expect(result.permission.messages.length).toBeGreaterThan(0);

    expect(result.lifecycle.stateWhileAway).toBe('idle');
    expect(result.lifecycle.calls).toBe(2);
    expect(result.lifecycle.state).toBe('ready');
    expect(result.lifecycle.items).toEqual([{ id: 'returned' }]);
  });

  test('renders callable detail error and empty envelopes as explicit states', () => {
    const base = {
      state: 'ready', error: '',
      filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
      activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' },
      operationKeys: {},
    };
    const appHtml = renderDiagnostics({
      ...base,
      view: 'app-health',
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: { state: 'error', item: null, error: 'detail failed' }, truncated: false, partial: false },
      archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
    });
    const archiveHtml = renderDiagnostics({
      ...base,
      view: 'archive',
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: { state: 'empty', item: null }, truncated: false, partial: false },
    });

    expect(appHtml).toContain('data-diagnostics-detail-state="error"');
    expect(appHtml).toContain('role="alert"');
    expect(appHtml).not.toContain('diagnostics-detail-grid');
    expect(archiveHtml).toContain('data-diagnostics-detail-state="empty"');
    expect(archiveHtml).toContain('role="status"');
    expect(archiveHtml).not.toContain('diagnostics-detail-grid');
  });

  test('renders a fail-closed no-permission state without live read actions', () => {
    const html = renderDiagnostics({
      view: 'app-health', state: 'idle', error: '',
      filters: { periodHours: 24, severity: 'all', status: 'all', feature: '', query: '' },
      appHealth: { items: [], kpis: null, sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      activity: { state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' },
      archive: { type: 'all', items: [], sourceHealth: [], nextCursor: '', detail: null, truncated: false, partial: false },
      operationKeys: {},
    }, false);

    expect(html).toContain('data-diagnostics-no-read');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('data-action="diagnostics-load-app-health"');
  });

  test('keeps truncation visible when the same backend response is also partial', () => {
    const model = runDiagnosticsLoadResult({
      state: 'truncated',
      groups: [{ id: 'event-1', severity: 'info' }],
      kpis: { critical: 0, warnings: 0, affectedUsers: 1, topRepeat: 1 },
      health: { level: 'GREEN', conclusive: false, kpis: { critical: 0, warnings: 0, affectedUsers: 1, topRepeat: 1 } },
      sourceHealth: [{ source: 'app_errors', state: 'partial', truncated: true, partial: true }],
      nextCursor: 'next',
      truncated: true,
      partial: true,
    });

    expect(model).toMatchObject({
      state: 'truncated',
      appHealth: {
        truncated: true,
        partial: true,
        sourceHealth: [{ source: 'app_errors', state: 'partial', truncated: true, partial: true }],
      },
    });
    const html = renderDiagnostics(model);
    expect(html).toContain('data-state="truncated"');
    expect(html).toContain('app_errors');
  });

  test('disables App Health status actions that the server transition map will reject', () => {
    const fixed = renderAppHealthStatus('fixed');
    for (const next of ['reviewed', 'fixed', 'known']) expect(statusButton(fixed, next)).toContain('disabled');

    const known = renderAppHealthStatus('known');
    expect(statusButton(known, 'reviewed')).toContain('disabled');
    expect(statusButton(known, 'known')).toContain('disabled');
    expect(statusButton(known, 'fixed')).not.toContain('disabled');
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

  test('gives the Diagnostics source-health retry button the same title and keyboard tooltip', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const start = core.indexOf('function renderDiagnosticsSourceHealth');
    const end = core.indexOf('function auditSummary', start);
    const block = core.slice(start, end);
    const retryButton = block.match(/<button\b[^>]*data-action="load-daily-briefing"[^>]*>/)?.[0] || '';

    expect(retryButton).toContain('title="Повторно прочитать состояние источников"');
    expect(retryButton).toContain('data-tooltip="Повторно прочитать состояние источников"');
  });

  test('makes ops source-health badges keyboard-focusable with a non-empty tooltip', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const start = core.indexOf('function renderOpsLogPanel');
    const end = core.indexOf('function renderDiagnostics()', start);
    const block = core.slice(start, end);
    const healthStart = block.indexOf('<section class="report-health section"');
    const healthEnd = block.indexOf('<div class="hint section">', healthStart);
    const healthBlock = block.slice(healthStart, healthEnd);

    expect(healthStart).toBeGreaterThanOrEqual(0);
    expect(healthBlock).toContain('tabindex="0"');
    expect(healthBlock).toContain('data-tooltip="${escapeHtml(sourceTooltip)}"');
    expect(healthBlock).toContain("const sourceTooltip = source.error");
    expect(healthBlock).not.toContain("title=\"${escapeHtml(source.error || '')}\"");
  });

  test('keeps the workspace accessible and visibly honest about partial data', () => {
    const view = read('admin/v2/scripts/admin-diagnostics-view.js');
    const css = read('admin/v2/styles/admin.css');
    for (const stateName of ['loading', 'empty', 'ready', 'partial', 'truncated', 'error']) expect(view).toContain(stateName);
    expect(view).toContain('data-tooltip=');
    expect(view).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(view).toContain('Выборка ограничена');
    expect(view).toContain('aria-label="Раздел диагностики"');
    const buttons = view.match(/<button\b[^>]*>/g) || [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toContain('title=');
      expect(button).toContain('data-tooltip=');
    }
    expect(css).toMatch(/\.diagnostics-workspace\s+\.button\.small\s*\{[^}]*min-height:\s*44px[^}]*\}/);
    expect(css).toContain('[data-tooltip]:hover::after, [data-tooltip]:focus-visible::after');
    expect(css).toContain('.diagnostics-mobile-view');
    expect(css).toContain('.diagnostics-archive-frame');
  });
});
