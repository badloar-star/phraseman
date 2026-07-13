import { CONTENT_OPERATION_CAPABILITIES } from './admin-content-operations-state.js';

const activationApproved = false;
const productionReady = false;
const PERMISSIONS = Object.freeze({
  'community-submission-decision': 'community.moderate',
  'community-pack-status': 'content.publish',
  'community-pack-report-status': 'community.moderate',
  'card-pack-draft': 'content.draft.write',
  'card-pack-update': 'content.publish',
  'daily-phrase-draft': 'content.draft.write',
  'daily-phrase-upsert': 'content.publish',
  'daily-phrase-import': 'content.publish',
  'daily-phrase-reorder': 'content.publish',
  'daily-phrase-rollback': 'content.publish',
  'french-draft': 'content.draft.write',
  'french-rollback': 'content.publish',
  'explain-report-status': 'content.reports.write',
  'explain-reports-bulk': 'content.reports.write',
  'explain-report-delete': 'content.reports.write',
  'explain-cache-delete': 'content.reports.write',
  'explain-counter-delete': 'content.reports.write',
});

function value(id) { return String(document.getElementById(id)?.value || '').trim(); }
function checked(id) { return document.getElementById(id)?.checked === true; }
function key(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function lines(id) { return value(id).split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
function boolCell(cell, fallback = true) { const text = String(cell || '').trim().toLowerCase(); return text ? ['1', 'true', 'yes', 'да'].includes(text) : fallback; }
function csvLine(line) { return line.split(',').map((cell) => cell.trim()); }

function importItems() {
  return lines('content-import-lines').map((line, index) => {
    const [id, english, literal, meaning, scheduledDate, order, active, allowSave, expectedVersion] = csvLine(line);
    return { id, english, literal, meaning, scheduledDate, order: Number(order || index + 1), active: boolCell(active), allowSave: boolCell(allowSave), expectedVersion: expectedVersion || 'missing' };
  });
}

function reorderItems() {
  return lines('content-reorder-lines').map((line) => {
    const [id, scheduledDate, expectedVersion] = csvLine(line);
    return { id, scheduledDate, expectedVersion };
  });
}

function reportItems() {
  return lines('content-report-lines').map((line) => {
    const [id, expectedVersion] = csvLine(line);
    return { id, expectedVersion };
  });
}

export function createContentOperationsController({ getModel, setModel, actions, render, route, authorized, can, message, errorMessage }) {
  async function load() {
    if (!authorized()) return;
    const filters = { query: value('content-filter-query') || getModel().filters?.query || '', status: value('content-filter-status') || getModel().filters?.status || '' }; const dateRange = { fromDate: value('content-from-date') || getModel().dateRange?.fromDate || '', toDate: value('content-to-date') || getModel().dateRange?.toDate || '' };
    setModel({ ...getModel(), status: 'loading', error: '', filters, dateRange, activationApproved, productionReady }); render();
    try {
      const workspace = await actions().getContentOperationsWorkspace({ capabilityId: getModel().capabilityId, limit: 100, ...dateRange, ...filters });
      setModel({ ...getModel(), status: 'ready', workspace, detail: null, error: '', filters, dateRange, activationApproved, productionReady });
    } catch (error) { setModel({ ...getModel(), status: 'error', error: errorMessage(error), activationApproved, productionReady }); }
    render();
  }

  async function selectCapability(capabilityId) {
    if (!CONTENT_OPERATION_CAPABILITIES.includes(capabilityId)) return;
    setModel({ ...getModel(), capabilityId, workspace: null, detail: null, preview: null, status: 'idle', activationApproved, productionReady }); render(); await load();
  }

  async function detail(id, source) { const result = await actions().getContentOperationDetail({ capabilityId: getModel().capabilityId, id, source }); setModel({ ...getModel(), detail: result }); render(); }

  function payload(operation, element) {
    if (operation === 'community-submission-decision') return { decision: value('content-decision'), expectedStatus: element?.getAttribute('data-status') || value('content-expected-status') || 'pending', message: value('content-message') };
    if (operation === 'community-pack-status') return { decision: value('content-pack-decision'), message: value('content-message') };
    if (operation === 'community-pack-report-status') return { status: value('content-pack-report-status'), message: value('content-message') };
    if (operation === 'card-pack-draft') return { title: value('content-title'), category: value('content-category') };
    if (operation === 'card-pack-update') return { title: value('content-title'), priceShards: Number(value('content-price')), category: value('content-category'), status: value('content-card-status') };
    if (operation === 'daily-phrase-upsert' || operation === 'daily-phrase-draft') return { english: value('content-english'), literal: value('content-literal'), meaning: value('content-meaning'), scheduledDate: operation === 'daily-phrase-draft' ? '' : value('content-date'), order: Number(value('content-order') || 1), active: operation === 'daily-phrase-draft' ? false : checked('content-active'), allowSave: checked('content-allow-save') };
    if (operation === 'daily-phrase-import') return { items: importItems() };
    if (operation === 'daily-phrase-reorder') return { items: reorderItems() };
    if (operation === 'daily-phrase-rollback') return {};
    if (operation.startsWith('french-')) return { activationApproved, productionReady, status: 'HOLD' };
    if (operation === 'explain-report-status') return { status: value('content-report-status'), adminNote: value('content-message') };
    if (operation === 'explain-reports-bulk') return { status: value('content-report-status'), adminNote: value('content-message'), items: reportItems() };
    if (operation === 'explain-cache-delete') return { cacheCollection: element?.getAttribute('data-source') || value('content-cache-collection') };
    if (operation === 'explain-report-delete' || operation === 'explain-counter-delete') return {};
    return {};
  }

  async function preview(operation, element) {
    if (!operation || !can(PERMISSIONS[operation])) return message('Недостаточно прав для этой контентной операции.', 'warning');
    const bulk = ['daily-phrase-import', 'daily-phrase-reorder', 'explain-reports-bulk'].includes(operation);
    const targetId = element?.getAttribute('data-id') || value('content-target-id') || (bulk ? `${operation}-${Date.now()}` : '');
    const expectedVersion = element?.getAttribute('data-version') || value('content-expected-version') || (bulk ? 'missing' : '');
    const reason = value('content-reason');
    if (!targetId || !expectedVersion || !reason) return message('Выберите запись, укажите её версию и причину.', 'warning');
    try {
      const result = await actions().previewContentMutation({ action: operation, targetId, reason, expectedVersion, payload: payload(operation, element) });
      setModel({ ...getModel(), preview: result, approvalStatus: '', activationApproved, productionReady }); render();
    } catch (error) { message(errorMessage(error), 'danger'); }
  }

  async function requestApproval() { const preview = getModel().preview; const confirmation = value('content-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); const result = await actions().requestContentApproval({ previewId: preview.previewId, confirmation }); setModel({ ...getModel(), approvalStatus: result.status || 'pending' }); render(); }
  async function approve() { if (!can('content.approve')) return message('Нужно право content.approve.', 'warning'); const result = await actions().approveContentMutation({ previewId: value('content-approval-preview-id'), reason: value('content-approval-reason') }); message(`Одобрение: ${result.status}.`, 'success'); }
  async function apply() { const preview = getModel().preview; const confirmation = value('content-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); await actions().applyContentMutation({ previewId: preview.previewId, confirmation, idempotencyKey: key(`content-${preview.previewId}`) }); setModel({ ...getModel(), preview: null, approvalStatus: '', activationApproved, productionReady }); await load(); }

  async function handleAction(action, element) {
    if (action === 'select') return selectCapability(element.getAttribute('data-capability') || '');
    if (action === 'refresh') return load();
    if (action === 'detail') return detail(element.getAttribute('data-id') || '', element.getAttribute('data-source') || '');
    if (action === 'preview') return preview(element.getAttribute('data-operation') || '', element);
    if (action === 'request-approval') return requestApproval();
    if (action === 'approve') return approve();
    if (action === 'apply') return apply();
    if (action === 'discard') { setModel({ ...getModel(), preview: null, approvalStatus: '' }); render(); }
  }

  function maybeLoad() { if (route() === 'content-operations' && authorized() && getModel().status === 'idle') void load(); }
  return Object.freeze({ load, selectCapability, handleAction, maybeLoad });
}
