import { CONTENT_OPERATION_CAPABILITIES } from './admin-content-operations-state.js';

const activationApproved = false;
const productionReady = false;
const PERMISSIONS = Object.freeze({
  'community-pack-status': 'content.publish', 'card-pack-update': 'content.publish',
  'daily-phrase-upsert': 'content.publish', 'french-draft': 'content.draft.write',
  'french-rollback': 'content.publish', 'explain-report-status': 'content.reports.write', approve: 'content.approve',
});
function value(id) { return String(document.getElementById(id)?.value || '').trim(); }
function key(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function createContentOperationsController({ getModel, setModel, actions, render, route, authorized, can, message, errorMessage }) {
  async function load() {
    if (!authorized()) return; setModel({ ...getModel(), status: 'loading', error: '', activationApproved, productionReady }); render();
    try { const workspace = await actions().getContentOperationsWorkspace({ capabilityId: getModel().capabilityId, limit: 50 }); setModel({ ...getModel(), status: 'ready', workspace, detail: null, error: '', activationApproved: false, productionReady: false }); }
    catch (error) { setModel({ ...getModel(), status: 'error', error: errorMessage(error), activationApproved: false, productionReady: false }); }
    render();
  }
  async function selectCapability(capabilityId) { if (!CONTENT_OPERATION_CAPABILITIES.includes(capabilityId)) return; setModel({ ...getModel(), capabilityId, workspace: null, detail: null, preview: null, status: 'idle', activationApproved: false, productionReady: false }); render(); await load(); }
  async function detail(id) { const result = await actions().getContentOperationDetail({ capabilityId: getModel().capabilityId, id }); setModel({ ...getModel(), detail: result }); render(); }
  async function preview() {
    const action = value('content-mutation-action'); if (!can(PERMISSIONS[action] || 'content.approve')) return message('Недостаточно прав для контентной операции.', 'warning');
    let payload = {}; try { payload = JSON.parse(value('content-payload') || '{}'); } catch { return message('Payload должен быть корректным JSON.', 'warning'); }
    if (action.startsWith('french-')) payload = { ...payload, activationApproved: false, productionReady: false };
    const result = await actions().previewContentMutation({ action, targetId: value('content-target-id'), reason: value('content-reason'), expectedVersion: value('content-expected-version'), payload, idempotencyKey: key('content-preview'), confirmation: '' });
    setModel({ ...getModel(), preview: result, approvalStatus: '', activationApproved: false, productionReady: false }); render();
  }
  async function requestApproval() { const preview = getModel().preview; const confirmation = value('content-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); const result = await actions().requestContentApproval({ previewId: preview.previewId, confirmation }); setModel({ ...getModel(), approvalStatus: result.status || 'pending' }); render(); }
  async function approve() { if (!can('content.approve')) return message('Нужно право content.approve.', 'warning'); const result = await actions().approveContentMutation({ previewId: value('content-approval-preview-id'), reason: value('content-approval-reason') }); message(`Одобрение: ${result.status}.`, 'success'); }
  async function apply() { const preview = getModel().preview; const confirmation = value('content-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); await actions().applyContentMutation({ previewId: preview.previewId, confirmation, idempotencyKey: key(`content-${preview.previewId}`) }); setModel({ ...getModel(), preview: null, approvalStatus: '', activationApproved: false, productionReady: false }); await load(); }
  async function handleAction(action, element) { if (action === 'select') return selectCapability(element.getAttribute('data-capability') || ''); if (action === 'refresh') return load(); if (action === 'detail') return detail(element.getAttribute('data-id') || ''); if (action === 'preview') return preview(); if (action === 'request-approval') return requestApproval(); if (action === 'approve') return approve(); if (action === 'apply') return apply(); if (action === 'discard') { setModel({ ...getModel(), preview: null, approvalStatus: '' }); render(); } }
  function maybeLoad() { if (route() === 'content-operations' && authorized() && getModel().status === 'idle') void load(); }
  return Object.freeze({ load, selectCapability, handleAction, maybeLoad });
}
