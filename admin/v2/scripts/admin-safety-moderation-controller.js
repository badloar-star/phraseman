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

  async function loadSafetyApprovals() {
    if (!context.can('users.moderation.approve')) {
      patch({ approvals: { state: 'empty', items: [], error: '' } });
      return;
    }
    patch({ approvals: { ...model().approvals, state: 'loading', error: '' } });
    context.render();
    try {
      const result = await context.actions().listSafetyModerationApprovals();
      const items = Array.isArray(result?.items) ? result.items : [];
      patch({ approvals: { state: items.length ? 'ready' : 'empty', items, error: '' } });
    } catch (error) {
      patch({ approvals: { state: 'error', items: model().approvals.items || [], error: context.errorMessage(error) } });
    } finally {
      context.render();
    }
  }

  async function loadSafetyHistory() {
    if (!context.can('users.moderation.restore')) {
      patch({ history: { state: 'empty', items: [], error: '' } });
      return;
    }
    patch({ history: { ...model().history, state: 'loading', error: '' } });
    context.render();
    try {
      const result = await context.actions().listSafetyModerationHistory();
      const items = Array.isArray(result?.items) ? result.items : [];
      patch({ history: { state: items.length ? 'ready' : 'empty', items, error: '' } });
    } catch (error) {
      patch({ history: { state: 'error', items: model().history.items || [], error: context.errorMessage(error) } });
    } finally {
      context.render();
    }
  }

  async function loadOverviewResources() {
    await Promise.allSettled([loadSafetyApprovals(), loadSafetyHistory()]);
  }

  async function load(append = false) {
    const input = request(append ? model().nextCursor : '');
    patch({ state: 'loading', filters: input.filters, error: '' });
    context.render();
    const overviewResources = !append && model().view === 'overview' ? loadOverviewResources() : Promise.resolve();
    let workspaceError = null;
    try {
      const workspace = await context.actions().getSafetyModerationWorkspace(input);
      const items = append ? [...model().items, ...(workspace.items || [])] : (workspace.items || []);
      patch({ workspace, items, nextCursor: String(workspace.nextCursor || ''), snapshotCursor: String(workspace.snapshotCursor || ''), selectedIds: [], state: deriveState(workspace, items), error: '' });
    } catch (error) {
      patch({ state: 'error', error: context.errorMessage(error) });
      workspaceError = error;
    } finally {
      await overviewResources;
      context.render();
    }
    if (workspaceError) throw workspaceError;
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
        const handoffParams = new URLSearchParams(globalThis.location.search);
        const moderateUser = String(handoffParams.get('moderateUser') || '').trim();
        const source = String(handoffParams.get('source') || '').trim().toLowerCase();
        const sourceTargetType = String(handoffParams.get('targetType') || '').trim().toLowerCase();
        const sourceTargetId = String(handoffParams.get('targetId') || '').trim();
        const manualBanContext = source === 'help_board'
          && ['topic', 'comment', 'compass'].includes(sourceTargetType)
          && /^[a-zA-Z0-9_.:-]{1,180}$/.test(sourceTargetId)
          ? { source: 'help_board', sourceTargetType, sourceTargetId }
          : { source: 'manual', sourceTargetType: '', sourceTargetId: '' };
        if (moderateUser) patch({ manualBanUid: moderateUser, manualBanContext });
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
        else if (action === 'safety-preview-manual-ban') {
          const uid = value('safety-manual-ban-uid');
          const reason = value('safety-manual-ban-reason');
          if (!uid) return context.message('Укажите канонический UID пользователя.', 'warning');
          await preview('user_ban', uid, { name: value('safety-manual-ban-name'), ...(model().manualBanContext || { source: 'manual' }) }, reason);
        }
        else if (action === 'safety-preview-unban') await preview('user_unban', target.dataset.targetId, { historyId: '' });
        else if (action === 'safety-preview-flag') await preview('safety_set_disposition', target.dataset.targetId, { handled: true, disposition: value(`safety-disposition-${target.dataset.targetId}`), note: value(`safety-note-${target.dataset.targetId}`) });
        else if (action === 'safety-preview-flags-bulk') await preview('safety_handle_bulk', model().selectedIds[0] || 'bulk-flags', { targetIds: model().selectedIds, disposition: 'reviewed', note: '' }, bulkReason());
        else if (action === 'safety-preview-restore') {
          const operationId = target.dataset.operationId || '';
          await preview('restore_operation', target.dataset.targetId, { operationId }, value(`safety-history-reason-${operationId}`));
        }
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
          const approvalId = String(target.dataset.approvalId || '').trim();
          const approval = (model().approvals.items || []).find((item) => item.approvalId === approvalId);
          const reason = value(`safety-approval-reason-${approvalId}`);
          if (!approval?.canApprove) return context.message('Инициатор запроса не может подтвердить собственную операцию.', 'warning');
          if (!reason) return context.message('Укажите основание подтверждения этой строки.', 'warning');
          const key = `approve:${approvalId}`;
          const operationKeys = { ...model().operationKeys, [key]: model().operationKeys[key] || context.id('safety-approve-operation') };
          patch({ operationKeys });
          await context.actions().approveSafetyModerationMutation({ approvalId, reason, requestId: context.id('safety-approve'), idempotencyKey: operationKeys[key] });
          context.message('Второй администратор подтвердил операцию.', 'success');
          await loadSafetyApprovals();
        } else if (action === 'safety-resume-bulk') {
          const manifestId = String(target.dataset.manifestId || '').trim();
          const reason = value(`safety-bulk-resume-reason-${manifestId}`);
          if (!manifestId || !reason) return context.message('Укажите основание продолжения пакетной операции.', 'warning');
          const key = `resume:${manifestId}`;
          const operationKeys = { ...model().operationKeys, [key]: model().operationKeys[key] || context.id('safety-bulk-resume-operation') };
          patch({ operationKeys });
          const result = await context.actions().resumeSafetyModerationBulk({ manifestId, reason, requestId: context.id('safety-bulk-resume'), idempotencyKey: operationKeys[key] });
          const nextOperationKeys = { ...model().operationKeys };
          delete nextOperationKeys[key];
          patch({ operationKeys: nextOperationKeys });
          context.message(`Пакетная операция продолжена: ${Number(result?.bulk?.processedCount || 0)} из ${Number(result?.bulk?.targetCount || 0)}.`, 'success');
          await loadSafetyHistory();
        } else if (action === 'safety-apply-preview') {
          const current = model().preview;
          const confirmation = value('safety-confirmation');
          const approvalId = model().approvalId;
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
