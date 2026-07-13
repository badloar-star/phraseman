import { createSafetyModerationState, safetyModerationViewFromCapability } from './admin-safety-moderation-state.js';

export function createSafetyModerationController(context) {
  const model = () => context.getModel();
  const patch = (value) => context.setModel({ ...model(), ...value });
  const value = (id) => String(document.getElementById(id)?.value || '').trim();
  const reasonFor = (targetId) => value(`safety-reason-${targetId}`) || value('safety-bulk-reason');
  const currentFilters = () => ({
    ...model().filters,
    query: value('safety-query') || model().filters.query,
    status: value('safety-status'),
    reason: value('safety-reason-filter'),
    category: value('safety-category'),
    sort: value('safety-sort') || model().filters.sort || 'date_desc',
  });
  const request = (cursor = '', exportCsv = false) => ({ view: model().view, filters: currentFilters(), pageSize: 50, cursor, exportCsv });

  function deriveState(workspace, items) {
    const sources = Array.isArray(workspace?.sources) ? workspace.sources : [];
    if (sources.some((source) => source.status === 'error')) return sources.every((source) => source.status === 'error') ? 'error' : 'partial';
    if (sources.some((source) => source.status === 'partial')) return 'partial';
    if (!items.length && !['overview', 'age-consent', 'policy-evidence', 'other-reports'].includes(model().view)) return 'empty';
    return 'ready';
  }

  async function load(append = false) {
    const input = request(append ? model().nextCursor : '');
    patch({ state: 'loading', filters: input.filters, error: '' });
    context.render();
    try {
      const workspace = await context.actions().getSafetyModerationWorkspace(input);
      const items = append ? [...model().items, ...(workspace.items || [])] : (workspace.items || []);
      patch({ workspace, items, nextCursor: String(workspace.nextCursor || ''), snapshotCursor: String(workspace.snapshotCursor || ''), selectedIds: [], state: deriveState(workspace, items), error: '' });
    } catch (error) {
      patch({ state: 'error', error: context.errorMessage(error) });
      throw error;
    } finally {
      context.render();
    }
  }

  async function preview(action, targetId, payload, reason = reasonFor(targetId)) {
    if (!reason) return context.message('Укажите обязательную причину действия.', 'warning');
    const result = await context.actions().previewSafetyModerationMutation({ action, targetId, payload, reason, requestId: context.id('safety-preview') });
    patch({ preview: result, approvalId: '' });
    context.render();
  }

  async function exportCsv() {
    const result = await context.actions().getSafetyModerationWorkspace({ ...request('', true), cursor: '', exportCsv: true });
    if (!result?.csv) throw new Error('Сервер не вернул CSV для этого снимка.');
    context.download(`phraseman-user-reports-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${result.csv}`);
  }

  function bulkReason() {
    const entered = value('safety-bulk-reason');
    if (entered) return entered;
    const text = globalThis.prompt?.('Укажите основание массового действия') || '';
    return String(text).trim();
  }

  return {
    reset(view = context.defaultView()) { context.setModel(createSafetyModerationState(view)); },
    selectCapability(id) {
      const view = safetyModerationViewFromCapability(id);
      if (model().view !== view) this.reset(view);
    },
    async maybeLoad() {
      if (context.route() === 'safety-moderation' && context.authorized() && model().state === 'idle') {
        if (model().view === 'overview' && !context.can('users.moderation.read')) this.reset(context.defaultView());
        await load(false);
      }
    },
    async handle(action, target) {
      if (!action?.startsWith('safety-')) return false;
      try {
        if (action === 'safety-load') await load(false);
        else if (action === 'safety-next') await load(true);
        else if (action === 'safety-export') await exportCsv();
        else if (action === 'safety-set-view') { this.reset(target.dataset.safetyView || 'overview'); await load(false); }
        else if (action === 'safety-sensitive-detail') {
          const flagId = target.dataset.targetId || '';
          const reason = value(`safety-sensitive-reason-${flagId}`) || value('safety-sensitive-reason');
          if (!reason) return context.message('Укажите, зачем нужен полный чувствительный контекст.', 'warning');
          const result = await context.actions().getSafetyModerationSensitiveDetail({ flagId, reason, requestId: context.id('safety-sensitive') });
          patch({ sensitive: { ...result, conversation: Array.isArray(result.historyContext) ? result.historyContext : [] } });
          context.render();
        } else if (action === 'safety-close-sensitive') { patch({ sensitive: null }); context.render(); }
        else if (action === 'safety-preview-report-status') await preview('report_set_status', target.dataset.targetId, { status: target.dataset.status });
        else if (action === 'safety-preview-report-bulk') await preview('report_archive_bulk', model().selectedIds[0] || 'bulk-reports', { targetIds: model().selectedIds }, bulkReason());
        else if (action === 'safety-preview-warning') await preview('report_warn', target.dataset.targetId, { uid: target.dataset.uid, name: target.dataset.name, message: value(`safety-warning-${target.dataset.targetId}`) });
        else if (action === 'safety-preview-rename') await preview('report_rename', target.dataset.targetId, { uid: target.dataset.uid, oldName: target.dataset.name, newName: value(`safety-rename-${target.dataset.targetId}`), sourceReportId: target.dataset.targetId });
        else if (action === 'safety-preview-ban') await preview('user_ban', target.dataset.targetId, { name: target.dataset.name, sourceReportId: target.dataset.reportId, source: 'user_report' }, reasonFor(target.dataset.reportId));
        else if (action === 'safety-preview-unban') await preview('user_unban', target.dataset.targetId, { historyId: '' });
        else if (action === 'safety-preview-flag') await preview('safety_set_disposition', target.dataset.targetId, { handled: true, disposition: value(`safety-disposition-${target.dataset.targetId}`), note: value(`safety-note-${target.dataset.targetId}`) });
        else if (action === 'safety-preview-flags-bulk') await preview('safety_handle_bulk', model().selectedIds[0] || 'bulk-flags', { targetIds: model().selectedIds, disposition: 'reviewed', note: '' }, bulkReason());
        else if (action === 'safety-preview-restore') await preview('restore_operation', target.dataset.targetId, { operationId: target.dataset.operationId });
        else if (action === 'safety-request-approval') {
          const current = model().preview;
          if (!current) return true;
          const key = `request:${current.previewId}`;
          const operationKeys = { ...model().operationKeys, [key]: model().operationKeys[key] || context.id('safety-approval-request-operation') };
          patch({ operationKeys });
          const result = await context.actions().requestSafetyModerationApproval({ previewId: current.previewId, reason: current.reason, requestId: context.id('safety-approval-request'), idempotencyKey: operationKeys[key] });
          patch({ approvalId: result.approvalId || '' });
          context.message(`Запрос подтверждения создан: ${result.approvalId || 'ID не получен'}. Второй администратор должен его подтвердить.`, 'success');
          context.render();
        } else if (action === 'safety-approve') {
          const approvalId = value('safety-approval-id') || model().approvalId;
          const reason = value('safety-approval-reason');
          if (!approvalId || !reason) return context.message('Укажите ID и основание подтверждения.', 'warning');
          const key = `approve:${approvalId}`;
          const operationKeys = { ...model().operationKeys, [key]: model().operationKeys[key] || context.id('safety-approve-operation') };
          patch({ operationKeys });
          await context.actions().approveSafetyModerationMutation({ approvalId, reason, requestId: context.id('safety-approve'), idempotencyKey: operationKeys[key] });
          patch({ approvalId });
          context.message('Второй администратор подтвердил операцию.', 'success');
        } else if (action === 'safety-apply-preview') {
          const current = model().preview;
          const confirmation = value('safety-confirmation');
          const approvalId = value('safety-approval-id') || model().approvalId;
          if (!current || confirmation !== current.confirmation) return context.message('Точное подтверждение не совпадает.', 'warning');
          if (current.requiresApproval && !approvalId) return context.message('Сначала требуется подтверждение второго администратора.', 'warning');
          const key = `apply:${current.previewId}`;
          const operationKeys = { ...model().operationKeys, [key]: model().operationKeys[key] || context.id('safety-apply-operation') };
          patch({ operationKeys });
          await context.actions().applySafetyModerationMutation({ previewId: current.previewId, approvalId, confirmation, reason: current.reason, requestId: context.id('safety-apply'), idempotencyKey: operationKeys[key] });
          patch({ preview: null, approvalId: '' });
          await load(false);
        } else if (action === 'safety-discard-preview') { patch({ preview: null, approvalId: '' }); context.render(); }
      } catch (error) {
        context.message(`Операция не выполнена: ${context.errorMessage(error)}`, 'warning');
        if (model().state === 'loading') patch({ state: model().workspace ? 'ready' : 'error', error: context.errorMessage(error) });
        context.render();
      }
      return true;
    },
    toggleSelection(id, checked) {
      const selected = new Set(model().selectedIds);
      if (checked) selected.add(id); else selected.delete(id);
      patch({ selectedIds: [...selected] });
      context.render();
    },
    async selectMobileView(view) { this.reset(view); await load(false); },
  };
}
