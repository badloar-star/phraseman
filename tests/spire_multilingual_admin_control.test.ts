import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'admin/v2/legacy.html'), 'utf8');
const panelStart = html.indexOf('id="tab-arena-content"');
const panelEndCandidate = html.indexOf('<div id="tab-', panelStart + 1);
const panelEnd = panelEndCandidate >= 0 ? panelEndCandidate : html.length;
const panel = panelStart >= 0 ? html.slice(panelStart, panelEnd) : '';
const scriptStart = html.indexOf('const ARENA_CONTENT_TARGET_LABELS');
const scriptEnd = html.indexOf('window.switchTab = function', scriptStart);
const script = scriptStart >= 0 && scriptEnd > scriptStart ? html.slice(scriptStart, scriptEnd) : '';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createControllerHarness() {
  const elements = new Map<string, any>();
  const makeElement = (id: string, value = '') => {
    const attributes = new Map<string, string>();
    const element = {
      id, value, textContent: '', innerHTML: '', disabled: false, checked: false, onclick: null,
      setAttribute: (name: string, next: unknown) => attributes.set(name, String(next)),
      getAttribute: (name: string) => attributes.get(name) ?? null,
    };
    elements.set(id, element);
    return element;
  };
  for (const id of [
    'arena-content-target', 'arena-content-status', 'spire-admin-flags-status',
    'spire-admin-flags-list', 'spire-admin-flags-reload', 'spire-admin-flag-add',
    'spire-admin-flag-task-id', 'spire-admin-flag-reason', 'spire-admin-build',
    'spire-admin-week', 'spire-admin-tier', 'spire-admin-force',
    'spire-admin-build-status', 'spire-admin-build-output', 'spire-admin-diagnostics-output',
  ]) makeElement(id);
  elements.get('arena-content-target').value = 'es';
  elements.get('spire-admin-tier').value = 'all';

  const calls: { name: string; payload: unknown }[] = [];
  const handlers = new Map<string, (payload: any) => Promise<any>>();
  const windowObject: Record<string, any> = {};
  const documentObject = {
    getElementById: (id: string) => elements.get(id) ?? null,
    querySelectorAll: (selector: string) => selector === '#spire-admin-flags-list button' ? [] : [],
  };
  const context = {
    window: windowObject,
    document: documentObject,
    httpsCallable: (_functions: unknown, name: string) => async (payload: unknown) => {
      calls.push({ name, payload });
      const handler = handlers.get(name);
      if (!handler) throw new Error(`missing handler: ${name}`);
      return handler(payload);
    },
    functionsUs: {},
    confirm: () => true,
    console,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    JSON,
    RegExp,
    Promise,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(script, context);
  return { window: windowObject, elements, calls, handlers };
}

describe('multilingual Spire admin control surface', () => {
  test('renames the preserved Arena content factory as Spire content', () => {
    expect(html).toContain("switchTab('arena-content')");
    // зачем (R1 §3а шаг 5а, 13.10): видимые подписи — «Пик» вместо «Шпиль/Spire»
    expect(html).toMatch(/switchTab\('arena-content'\)[^>]*>Контент Пика</u);
    expect(panel).toContain('>Контент Пика</h2>');
    expect(panel).toContain('Задания для игроков в «Пике»');
  });

  test('presents a plain-language owner workflow and hides diagnostics by default', () => {
    expect(panel).toContain('Что увидят игроки');
    expect(panel).toContain('Подготовить задания для Пика');
    expect(panel).toContain('Убрать плохое задание');
    expect(panel).toMatch(/<details[^>]*class="spire-admin-diagnostics"/u);
    expect(panel).toContain('<summary>Техническая информация</summary>');
    expect(panel).toContain('В приложении:');
  });

  test('manages every canonical Spire language contour from the same owner-facing selector', () => {
    for (const target of ['en', 'es', 'fr', 'de', 'it']) {
      expect(panel).toContain(`<option value="${target}">`);
      expect(script).toMatch(new RegExp(`(?:^|[,{ ]\\s*)${target}:`, 'u'));
    }
  });

  test('removes dead publication controls and raw transport jargon from the owner screen', () => {
    for (const id of [
      'arena-content-import',
      'arena-content-stage',
      'arena-content-publish',
      'arena-content-rollback',
    ]) expect(panel).not.toContain(`id="${id}"`);
    expect(panel).not.toContain('large_static_package_transport_unavailable');
    expect(panel).not.toContain('Проверить manifest');
  });

  test('offers a selected-language all-floor weekly build with force safety', () => {
    for (const id of [
      'spire-admin-force',
      'spire-admin-build',
      'spire-admin-build-status',
      'spire-admin-build-output',
    ]) expect(panel).toContain(`id="${id}"`);
    expect(panel).not.toContain('id="spire-admin-week"');
    expect(panel).not.toContain('id="spire-admin-tier"');
    expect(script).toContain("httpsCallable(functionsUs, 'adminSpirePackBuild')");
    expect(script).toContain('langs:[target]');
    expect(script).toMatch(/force[\s\S]{0,700}confirm\(/u);
    expect(script).toContain('unavailableLangs');
  });

  test('lists, adds and removes task flags for the selected language', () => {
    for (const id of [
      'spire-admin-flag-task-id',
      'spire-admin-flag-reason',
      'spire-admin-flag-add',
      'spire-admin-flags-status',
      'spire-admin-flags-list',
    ]) expect(panel).toContain(`id="${id}"`);
    for (const callable of [
      'adminSpireTaskFlagList',
      'adminSpireTaskFlagAdd',
      'adminSpireTaskFlagRemove',
    ]) expect(script).toContain(`httpsCallable(functionsUs, '${callable}')`);
    expect(script).toMatch(/removeSpireTaskFlag[\s\S]{0,700}confirm\(/u);
    expect(script).toContain("querySelectorAll('#spire-admin-flags-list button')");
  });

  test('refreshes flags when language changes and keeps controls accessible', () => {
    expect(panel).toContain('onchange="changeSpireContentTarget()"');
    expect(script).toMatch(/changeSpireContentTarget[\s\S]{0,300}loadSpireTaskFlags/u);
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain(':focus-visible');
    expect(panel).toContain('@media(max-width:760px)');
  });

  test('ignores a stale language response and never removes a task through another target', async () => {
    const harness = createControllerHarness();
    const es = deferred<any>();
    const fr = deferred<any>();
    harness.handlers.set('adminSpireTaskFlagList', ({ lang }) => lang === 'es' ? es.promise : fr.promise);

    const esLoad = harness.window.loadSpireTaskFlags(true);
    harness.elements.get('arena-content-target').value = 'fr';
    const frLoad = harness.window.loadSpireTaskFlags(true);
    fr.resolve({ data: { flagged: { 'fr-task': { reason: 'fr reason' } } } });
    await frLoad;
    es.resolve({ data: { flagged: { 'es-task': { reason: 'es reason' } } } });
    await esLoad;

    expect(harness.elements.get('spire-admin-flags-list').innerHTML).toContain('fr-task');
    expect(harness.elements.get('spire-admin-flags-list').innerHTML).not.toContain('es-task');

    await harness.window.removeSpireTaskFlag('es', 'es-task');
    expect(harness.calls.filter(({ name }) => name === 'adminSpireTaskFlagRemove')).toHaveLength(0);
  });

  test('consumes list errors and blocks duplicate task-flag mutations while one is in flight', async () => {
    const harness = createControllerHarness();
    harness.handlers.set('adminSpireTaskFlagList', async () => { throw new Error('offline'); });
    await expect(harness.window.loadSpireTaskFlags(true)).resolves.toBeNull();
    expect(harness.elements.get('spire-admin-flags-status').textContent).not.toContain('offline');
    expect(harness.elements.get('spire-admin-flags-status').textContent).not.toContain('task flags');
    expect(harness.elements.get('spire-admin-diagnostics-output').textContent).toContain('offline');

    const removal = deferred<any>();
    harness.handlers.set('adminSpireTaskFlagRemove', () => removal.promise);
    harness.handlers.set('adminSpireTaskFlagList', async () => ({ data: { flagged: {} } }));
    const first = harness.window.removeSpireTaskFlag('es', 'es-task');
    const second = harness.window.removeSpireTaskFlag('es', 'es-task');
    expect(harness.calls.filter(({ name }) => name === 'adminSpireTaskFlagRemove')).toHaveLength(1);
    removal.resolve({ data: { ok: true } });
    await Promise.all([first, second]);
  });

  test('reports failed pack outcomes as an error instead of saying the build is ready', async () => {
    const harness = createControllerHarness();
    harness.handlers.set('adminSpirePackBuild', async () => ({ data: {
      outcomes: [
        { lang: 'es', tier: 0, status: 'failed', reason: 'write_failed' },
        { lang: 'es', tier: 1, status: 'written' },
      ],
      unavailableLangs: {},
      poolReads: 4000,
    } }));

    await harness.window.buildSpireLanguagePack();
    const status = harness.elements.get('spire-admin-build-status').textContent;
    expect(status).toContain('Не все наборы');
    expect(status).not.toContain('write_failed');
    expect(harness.elements.get('spire-admin-build-output').textContent).toContain('write_failed');
    expect(status).not.toContain('Готово');
  });

  test('keeps raw server failure codes inside hidden diagnostics', async () => {
    const harness = createControllerHarness();
    harness.handlers.set('adminSpirePackBuild', async () => ({ data: {
      outcomes: [],
      unavailableLangs: { es: 'manifest_not_ready' },
    } }));

    await harness.window.buildSpireLanguagePack();
    expect(harness.elements.get('spire-admin-build-status').textContent).not.toContain('manifest_not_ready');
    expect(harness.elements.get('spire-admin-build-status').textContent).toContain('Технической информации');
    expect(harness.elements.get('spire-admin-build-output').textContent).toContain('manifest_not_ready');
  });

  test('distinguishes a saved task-flag mutation from a failed list refresh', async () => {
    const harness = createControllerHarness();
    harness.elements.get('spire-admin-flag-task-id').value = 'es-task';
    harness.elements.get('spire-admin-flag-reason').value = 'bad answer';
    harness.handlers.set('adminSpireTaskFlagAdd', async () => ({ data: { ok: true } }));
    harness.handlers.set('adminSpireTaskFlagList', async () => { throw new Error('offline'); });

    await harness.window.addSpireTaskFlag();
    expect(harness.elements.get('spire-admin-flags-status').textContent).toContain('убрано, но список пока не обновился');
  });
});
