import { createDiagnosticsState, diagnosticsViewFromCapability } from './admin-diagnostics-state.js';

const APP_HEALTH_PAGE_SIZE = 50;
const ACTIVITY_PAGE_SIZE = 50;
const ARCHIVE_PAGE_SIZE = 50;

export function buildAppErrorStatusConfirmation(reportId, expectedStatus, nextStatus) {
  return `CONFIRM app_errors/${reportId} ${expectedStatus}->${nextStatus}`;
}

export function createDiagnosticsController(context) {
  let appHealthRequestGeneration = 0;
  let activityRequestGeneration = 0;
  let archiveRequestGeneration = 0;
  let appHealthDetailGeneration = 0;
  let archiveDetailGeneration = 0;
  const model = () => context.getModel();
  const patch = (value) => context.setModel({ ...model(), ...value });
  const value = (id) => String(document.getElementById(id)?.value || '').trim();
  const patchAppHealth = (value) => patch({ appHealth: { ...model().appHealth, ...value } });
  const patchActivity = (value) => patch({ activity: { ...model().activity, ...value } });
  const patchArchive = (value) => patch({ archive: { ...model().archive, ...value } });
  const activeView = (view) => context.route() === 'diagnostics' && context.authorized() && model().view === view;

  function invalidateRequests() {
    appHealthRequestGeneration += 1;
    activityRequestGeneration += 1;
    archiveRequestGeneration += 1;
    appHealthDetailGeneration += 1;
    archiveDetailGeneration += 1;
  }

  function filtersFromDocument() {
    const periodHours = Number(value('diagnostics-period') || model().filters.periodHours || 24);
    return {
      periodHours: [1, 6, 24, 168].includes(periodHours) ? periodHours : 24,
      severity: value('diagnostics-severity'),
      status: value('diagnostics-status'),
      feature: value('diagnostics-feature'),
      query: value('diagnostics-query'),
    };
  }

  function resultState(result, items) {
    const sourceHealth = Array.isArray(result?.sourceHealth) ? result.sourceHealth : [];
    const states = sourceHealth.map((source) => String(source.status || source.state || '')).filter(Boolean);
    if (result?.state === 'error') return 'error';
    if (states.length && states.every((state) => state === 'error')) return 'error';
    if (result?.state === 'truncated' || result?.truncated || states.some((state) => state === 'truncated')) return 'truncated';
    if (result?.state === 'partial' || result?.partial || states.some((state) => state === 'partial' || state === 'error')) return 'partial';
    return items.length ? 'ready' : 'empty';
  }

  function appHealthInput(cursor = '') {
    const filters = filtersFromDocument();
    return {
      ...filters,
      severity: filters.severity || 'all',
      status: filters.status || 'all',
      pageSize: APP_HEALTH_PAGE_SIZE,
      cursor,
    };
  }

  async function loadAppHealth(append = false) {
    const generation = ++appHealthRequestGeneration;
    if (!append) {
      activityRequestGeneration += 1;
      appHealthDetailGeneration += 1;
      patchActivity({ state: 'idle', items: [], sourceHealth: [], nextCursor: '', truncated: false, error: '' });
    }
    const input = appHealthInput(append ? model().appHealth.nextCursor : '');
    patch({ state: 'loading', filters: { ...model().filters, ...input, pageSize: undefined, cursor: undefined }, error: '' });
    context.render();
    try {
      const result = await context.actions().listAppHealth(input);
      if (generation !== appHealthRequestGeneration || !activeView('app-health')) return;
      const incoming = Array.isArray(result?.groups) ? result.groups : Array.isArray(result?.items) ? result.items : [];
      const items = append ? [...model().appHealth.items, ...incoming] : incoming;
      patchAppHealth({
        items,
        kpis: {
          ...(result?.kpis || result?.summary || {}),
          ...(result?.health?.kpis || {}),
          health: result?.health?.level || result?.kpis?.health || '',
          conclusive: result?.health?.conclusive !== false,
        },
        sourceHealth: Array.isArray(result?.sourceHealth) ? result.sourceHealth : [],
        nextCursor: String(result?.nextCursor || ''),
        truncated: Boolean(result?.truncated),
        partial: Boolean(result?.partial),
        detail: append ? model().appHealth.detail : null,
      });
      patch({ state: resultState(result, items), error: '' });
    } catch (error) {
      if (generation === appHealthRequestGeneration && activeView('app-health')) patch({ state: 'error', error: context.errorMessage(error) });
    } finally {
      if (generation === appHealthRequestGeneration && activeView('app-health')) context.render();
    }
  }

  async function loadAppActivity(append = false) {
    const generation = ++activityRequestGeneration;
    const cursor = append ? model().activity.nextCursor : '';
    const input = {
      periodHours: model().filters.periodHours || 24,
      result: 'all',
      feature: model().filters.feature || '',
      query: model().filters.query || '',
      pageSize: ACTIVITY_PAGE_SIZE,
      cursor,
    };
    patchActivity({ state: 'loading', error: '' });
    context.render();
    try {
      const result = await context.actions().listAppActivity(input);
      if (generation !== activityRequestGeneration || !activeView('app-health')) return;
      const incoming = Array.isArray(result?.items) ? result.items : [];
      const items = append ? [...model().activity.items, ...incoming] : incoming;
      patchActivity({
        state: resultState(result, items),
        items,
        sourceHealth: Array.isArray(result?.sourceHealth) ? result.sourceHealth : [],
        nextCursor: String(result?.nextCursor || ''),
        truncated: Boolean(result?.truncated),
        error: '',
      });
    } catch (error) {
      if (generation === activityRequestGeneration && activeView('app-health')) patchActivity({ state: 'error', error: context.errorMessage(error) });
    } finally {
      if (generation === activityRequestGeneration && activeView('app-health')) context.render();
    }
  }

  async function loadAppHealthDetail(reportId) {
    if (!reportId) return;
    const generation = ++appHealthDetailGeneration;
    try {
      const detail = await context.actions().getAppHealthDetail({ id: reportId });
      if (generation !== appHealthDetailGeneration || !activeView('app-health')) return;
      patchAppHealth({ detail });
      context.render();
    } catch (error) {
      if (generation === appHealthDetailGeneration && activeView('app-health')) context.message(`Не удалось открыть детали: ${context.errorMessage(error)}`, 'warning');
    }
  }

  async function requestAppHealthExport(format) {
    const filters = filtersFromDocument();
    const result = await context.actions().exportAppHealth({
      ...filters,
      severity: filters.severity || 'all',
      status: filters.status || 'all',
      format,
    });
    if (typeof result?.content !== 'string') throw new Error(result?.error || 'Серверный экспорт недоступен.');
    return result;
  }

  async function exportAppHealth() {
    try {
      const result = await requestAppHealthExport('json');
      const payload = result.content;
      context.download(result?.filename || `phraseman-app-health-${new Date().toISOString().slice(0, 10)}.json`, `${payload}\n`, result?.mimeType || 'application/json;charset=utf-8');
      context.message('Защищённый JSON-снимок подготовлен сервером.', 'success');
    } catch (error) {
      context.message(`Экспорт не выполнен: ${context.errorMessage(error)}`, 'warning');
    }
  }

  async function copyAppHealth(format) {
    try {
      const result = await requestAppHealthExport(format);
      await context.copy(result.content);
      context.message(format === 'ai' ? 'Безопасный отчёт для ИИ скопирован.' : 'Безопасный JSON скопирован.', 'success');
    } catch (error) {
      context.message(`Копирование не выполнено: ${context.errorMessage(error)}`, 'warning');
    }
  }

  function statusOperation(scope) {
    const existing = model().operationKeys[scope];
    if (existing) return existing;
    const operation = {
      idempotencyKey: context.id('diagnostics-status'),
      requestId: context.id('diagnostics-status-request'),
    };
    patch({ operationKeys: { ...model().operationKeys, [scope]: operation } });
    return operation;
  }

  async function updateReportStatus(target) {
    const reportId = String(target.dataset.reportId || '').trim();
    const expectedStatus = String(target.dataset.expectedStatus || '').trim();
    const nextStatus = String(target.dataset.nextStatus || '').trim();
    const reason = value(`diagnostics-status-reason-${reportId}`) || value('diagnostics-status-reason');
    if (!reportId || !expectedStatus || !['reviewed', 'fixed', 'known'].includes(nextStatus)) return;
    if (!reason) return context.message('Укажите причину изменения статуса.', 'warning');
    const confirmation = buildAppErrorStatusConfirmation(reportId, expectedStatus, nextStatus);
    if (!globalThis.confirm?.(`Подтвердите изменение статуса на «${nextStatus}».\n\n${confirmation}`)) return;
    const scope = `${reportId}:${expectedStatus}:${nextStatus}:${reason}`;
    const operation = statusOperation(scope);
    try {
      await context.actions().updateReportStatus({
        source: 'app_errors',
        reportId,
        expectedStatus,
        nextStatus,
        reason,
        idempotencyKey: operation.idempotencyKey,
        requestId: operation.requestId,
        confirmation,
      });
      const operationKeys = { ...model().operationKeys };
      delete operationKeys[scope];
      patch({ operationKeys });
      context.message('Статус события обновлён и записан в журнал.', 'success');
      await loadAppHealth(false);
    } catch (error) {
      context.message(`Статус не изменён: ${context.errorMessage(error)}`, 'warning');
    }
  }

  async function loadArchive(append = false) {
    const generation = ++archiveRequestGeneration;
    if (!append) archiveDetailGeneration += 1;
    const type = value('diagnostics-archive-type') || model().archive.type || 'all';
    const input = {
      type,
      pageSize: ARCHIVE_PAGE_SIZE,
      cursor: append ? model().archive.nextCursor : '',
    };
    patch({ state: 'loading', error: '' });
    patchArchive({ type });
    context.render();
    try {
      const result = await context.actions().listDiagnosticsArchive(input);
      if (generation !== archiveRequestGeneration || !activeView('archive')) return;
      const incoming = Array.isArray(result?.items) ? result.items : [];
      const items = append ? [...model().archive.items, ...incoming] : incoming;
      patchArchive({
        type,
        items,
        sourceHealth: Array.isArray(result?.sourceHealth) ? result.sourceHealth : [],
        nextCursor: String(result?.nextCursor || ''),
        detail: append ? model().archive.detail : null,
        truncated: Boolean(result?.truncated),
        partial: Boolean(result?.partial),
      });
      patch({ state: resultState(result, items), error: '' });
    } catch (error) {
      if (generation === archiveRequestGeneration && activeView('archive')) patch({ state: 'error', error: context.errorMessage(error) });
    } finally {
      if (generation === archiveRequestGeneration && activeView('archive')) context.render();
    }
  }

  async function loadArchiveDetail(type, reportId) {
    if (!['user', 'error'].includes(type) || !reportId) return;
    const generation = ++archiveDetailGeneration;
    try {
      const detail = await context.actions().getDiagnosticsArchiveDetail({ type, id: reportId });
      if (generation !== archiveDetailGeneration || !activeView('archive')) return;
      patchArchive({ detail });
      context.render();
    } catch (error) {
      if (generation === archiveDetailGeneration && activeView('archive')) context.message(`Не удалось открыть архивную запись: ${context.errorMessage(error)}`, 'warning');
    }
  }

  async function selectView(view) {
    const next = diagnosticsViewFromCapability(view);
    const hash = next === 'overview' ? 'diagnostics' : next;
    const currentHash = decodeURIComponent(String(globalThis.location?.hash || '').replace(/^#/, '').split(':').pop() || '');
    if (currentHash !== hash && globalThis.location) {
      invalidateRequests();
      globalThis.location.hash = hash;
      return;
    }
    if (model().view !== next) {
      invalidateRequests();
      context.setModel(createDiagnosticsState(next));
    }
    context.render();
    if (next === 'app-health') await loadAppHealth(false);
    else if (next === 'archive') await loadArchive(false);
  }

  return {
    reset(view = 'overview') { invalidateRequests(); context.setModel(createDiagnosticsState(view)); },
    selectCapability(id) {
      const view = diagnosticsViewFromCapability(id);
      if (model().view !== view) this.reset(view);
    },
    async maybeLoad() {
      if (!context.actions() || context.route() !== 'diagnostics' || !context.authorized() || model().state !== 'idle') return;
      if (model().view === 'app-health') await loadAppHealth(false);
      else if (model().view === 'archive') await loadArchive(false);
    },
    async handle(action, target) {
      if (!action?.startsWith('diagnostics-')) return false;
      if (action === 'diagnostics-set-view') await selectView(target.dataset.diagnosticsView || 'overview');
      else if (action === 'diagnostics-load-app-health') await loadAppHealth(false);
      else if (action === 'diagnostics-next-app-health') await loadAppHealth(true);
      else if (action === 'diagnostics-load-activity') await loadAppActivity(false);
      else if (action === 'diagnostics-next-activity') await loadAppActivity(true);
      else if (action === 'diagnostics-app-health-detail') await loadAppHealthDetail(target.dataset.reportId || '');
      else if (action === 'diagnostics-close-app-health-detail') { appHealthDetailGeneration += 1; patchAppHealth({ detail: null }); context.render(); }
      else if (action === 'diagnostics-export-app-health') await exportAppHealth();
      else if (action === 'diagnostics-copy-app-health-ai') await copyAppHealth('ai');
      else if (action === 'diagnostics-copy-app-health-json') await copyAppHealth('json');
      else if (action === 'diagnostics-update-status') await updateReportStatus(target);
      else if (action === 'diagnostics-load-archive') await loadArchive(false);
      else if (action === 'diagnostics-next-archive') await loadArchive(true);
      else if (action === 'diagnostics-archive-detail') await loadArchiveDetail(target.dataset.type || '', target.dataset.reportId || '');
      else if (action === 'diagnostics-close-archive-detail') { archiveDetailGeneration += 1; patchArchive({ detail: null }); context.render(); }
      return true;
    },
    async selectMobileView(view) { await selectView(view); },
  };
}
