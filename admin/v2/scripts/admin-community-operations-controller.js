import { COMMUNITY_OPERATION_CAPABILITIES } from './admin-community-operations-state.js';
const PERMISSIONS = Object.freeze({
  'mod-queue-status': 'community.moderate', 'help-topic-status': 'community.help.write',
  'helpers-description': 'community.help.write', 'league-chat-status': 'community.chat.write',
  'arena-profile-resync': 'community.arena.write', 'arena-placeholder-cleanup': 'community.arena.destructive',
  'arena-wager-flag': 'community.arena.economy.write', 'arena-room-close': 'community.arena.write', approve: 'community.approve',
});
const manifestFingerprint = 'server-owned';
function value(id) { return String(document.getElementById(id)?.value || '').trim(); }
function key(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function createCommunityOperationsController({ getModel, setModel, actions, render, route, authorized, can, message, errorMessage }) {
  async function readWorkspace() {
    if (!authorized(getModel().capabilityId)) return; setModel({ ...getModel(), status: 'loading', error: '' }); render();
    try { const workspace = await actions().getCommunityOperationsWorkspace({ capabilityId: getModel().capabilityId, limit: 50 }); setModel({ ...getModel(), status: 'ready', workspace, detail: null, error: '' }); }
    catch (error) { setModel({ ...getModel(), status: 'error', error: errorMessage(error) }); }
    render();
  }
  async function selectCapability(capabilityId) { if (!COMMUNITY_OPERATION_CAPABILITIES.includes(capabilityId)) return; setModel({ ...getModel(), capabilityId, workspace: null, detail: null, preview: null, status: 'idle' }); render(); await readWorkspace(); }
  async function detail(id) { const result = await actions().getCommunityOperationDetail({ capabilityId: getModel().capabilityId, id }); setModel({ ...getModel(), detail: result }); render(); }
  async function preview() {
    const action = value('community-mutation-action'); if (!can(PERMISSIONS[action] || 'community.approve')) return message('Недостаточно прав для операции Community.', 'warning'); let payload = {};
    try { payload = JSON.parse(value('community-payload') || '{}'); } catch { return message('Payload должен быть корректным JSON.', 'warning'); }
    const expectedVersion = value('community-expected-version');
    const idempotencyKey = key('community-preview');
    const confirmation = '';
    const result = await actions().previewCommunityMutation({ action, targetId: value('community-target-id'), reason: value('community-reason'), expectedVersion, payload, idempotencyKey, confirmation, manifestFingerprint });
    setModel({ ...getModel(), preview: result, approvalStatus: '' }); render();
  }
  async function requestApproval() { const preview = getModel().preview; const confirmation = value('community-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); const result = await actions().requestCommunityApproval({ previewId: preview.previewId, confirmation }); setModel({ ...getModel(), approvalStatus: result.status || 'pending' }); render(); }
  async function approve() { if (!can('community.approve')) return message('Нужно право community.approve.', 'warning'); const result = await actions().approveCommunityMutation({ previewId: value('community-approval-preview-id'), reason: value('community-approval-reason') }); message(`Одобрение: ${result.status}.`, 'success'); }
  async function apply() { const preview = getModel().preview; const confirmation = value('community-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); await actions().applyCommunityMutation({ previewId: preview.previewId, confirmation, idempotencyKey: key(`community-${preview.previewId}`) }); setModel({ ...getModel(), preview: null, approvalStatus: '' }); await readWorkspace(); }
  async function resume() { if (!can('community.arena.destructive')) return message('Нужно право community.arena.destructive.', 'warning'); const manifestId = value('community-manifest-id'); const result = await actions().resumeCommunityBulk({ manifestId, idempotencyKey: key(`community-resume-${manifestId}`) }); setModel({ ...getModel(), bulkProgress: result }); render(); }
  async function handleAction(action, element) { if (action === 'select') return selectCapability(element.getAttribute('data-capability') || ''); if (action === 'refresh') return readWorkspace(); if (action === 'detail') return detail(element.getAttribute('data-id') || ''); if (action === 'preview') return preview(); if (action === 'request-approval') return requestApproval(); if (action === 'approve') return approve(); if (action === 'apply') return apply(); if (action === 'resume') return resume(); if (action === 'discard') { setModel({ ...getModel(), preview: null, approvalStatus: '' }); render(); } }
  function maybeLoad() { if (route() === 'community-operations' && authorized(getModel().capabilityId) && getModel().status === 'idle') void readWorkspace(); }
  return Object.freeze({ readWorkspace, selectCapability, handleAction, maybeLoad });
}
