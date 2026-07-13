import { COMMUNITY_OPERATION_CAPABILITIES } from './admin-community-operations-state.js';

const PERMISSIONS = Object.freeze({
  'mod-queue-status': 'community.moderate',
  'help-topic-status': 'community.help.write', 'help-comment-status': 'community.help.write', 'help-report-resolve': 'community.help.write', 'help-restriction': 'community.help.write', 'help-admin-post': 'community.help.write', 'helpers-description': 'community.help.write',
  'league-chat-status': 'community.chat.write', 'league-chat-report': 'community.chat.write', 'league-chat-restriction': 'community.chat.write', 'league-chat-admin-message': 'community.chat.write',
  'arena-profile-resync': 'community.arena.write', 'arena-placeholder-cleanup': 'community.arena.destructive', 'arena-wager-flag': 'community.arena.economy.write',
  'arena-room-close': 'community.arena.write', 'arena-room-delete': 'community.arena.destructive', 'arena-session-finish': 'community.arena.write',
});
function value(id) { return String(document.getElementById(id)?.value || '').trim(); }
function checked(id) { return document.getElementById(id)?.checked === true; }
function key(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function createCommunityOperationsController({ getModel, setModel, actions, render, route, authorized, can, message, errorMessage }) {
  async function readWorkspace() {
    if (!authorized(getModel().capabilityId)) return;
    const filters = { query: value('community-filter-query') || getModel().filters?.query || '', status: value('community-filter-status') || getModel().filters?.status || '' };
    setModel({ ...getModel(), status: 'loading', error: '', filters }); render();
    try { const workspace = await actions().getCommunityOperationsWorkspace({ capabilityId: getModel().capabilityId, limit: 100, ...filters }); setModel({ ...getModel(), status: 'ready', workspace, detail: null, error: '', filters }); }
    catch (error) { setModel({ ...getModel(), status: 'error', error: errorMessage(error), filters }); }
    render();
  }
  async function selectCapability(capabilityId) { if (!COMMUNITY_OPERATION_CAPABILITIES.includes(capabilityId)) return; setModel({ ...getModel(), capabilityId, workspace: null, detail: null, preview: null, status: 'idle' }); render(); await readWorkspace(); }
  async function detail(id, source) { const result = await actions().getCommunityOperationDetail({ capabilityId: getModel().capabilityId, id, source }); setModel({ ...getModel(), detail: result }); render(); }

  function payload(action) {
    if (action === 'mod-queue-status') return { decision: value('community-status'), message: value('community-resolution') };
    if (action === 'help-topic-status' || action === 'help-comment-status') return { status: value('community-status') };
    if (action === 'help-report-resolve' || action === 'league-chat-report') return { resolution: value('community-resolution') };
    if (action === 'help-restriction' || action === 'league-chat-restriction') return { active: checked('community-active'), reason: value('community-resolution') };
    if (action === 'help-admin-post') return { title: value('community-title'), body: value('community-body') };
    if (action === 'helpers-description') return { description: value('community-description') };
    if (action === 'league-chat-status') return { status: value('community-status') };
    if (action === 'league-chat-admin-message') return { roomId: value('community-room-id'), text: value('community-body') };
    if (action === 'arena-wager-flag') return { enabled: checked('community-active') };
    if (action === 'arena-session-finish') return { reason: value('community-resolution') };
    return {};
  }

  async function preview(action, element) {
    if (!action || !can(PERMISSIONS[action])) return message('Недостаточно прав для этой Community-операции.', 'warning');
    const cleanup = action === 'arena-placeholder-cleanup';
    const targetId = element?.getAttribute('data-id') || value('community-target-id') || (cleanup ? `arena-cleanup-${Date.now()}` : '');
    const expectedVersion = element?.getAttribute('data-version') || value('community-expected-version') || (cleanup ? 'missing' : '');
    const reason = value('community-reason');
    if (!targetId || !expectedVersion || !reason) return message('Выберите запись, укажите её версию и причину.', 'warning');
    try {
      const result = await actions().previewCommunityMutation({ action, targetId, reason, expectedVersion, payload: payload(action) });
      setModel({ ...getModel(), preview: result, approvalStatus: '' }); render();
    } catch (error) { message(errorMessage(error), 'danger'); }
  }
  async function requestApproval() { const preview = getModel().preview; const confirmation = value('community-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); const result = await actions().requestCommunityApproval({ previewId: preview.previewId, confirmation }); setModel({ ...getModel(), approvalStatus: result.status || 'pending' }); render(); }
  async function approve() { if (!can('community.approve')) return message('Нужно право community.approve.', 'warning'); const result = await actions().approveCommunityMutation({ previewId: value('community-approval-preview-id'), reason: value('community-approval-reason') }); message(`Одобрение: ${result.status}.`, 'success'); }
  async function apply() { const preview = getModel().preview; const confirmation = value('community-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); await actions().applyCommunityMutation({ previewId: preview.previewId, confirmation, idempotencyKey: key(`community-${preview.previewId}`) }); setModel({ ...getModel(), preview: null, approvalStatus: '' }); await readWorkspace(); }
  async function resume() { if (!can('community.arena.destructive')) return message('Нужно право community.arena.destructive.', 'warning'); const manifestId = value('community-manifest-id'); if (!manifestId) return message('Укажите manifest ID.', 'warning'); const result = await actions().resumeCommunityBulk({ manifestId, idempotencyKey: value('community-resume-key') || key(`community-resume-${manifestId}`) }); setModel({ ...getModel(), bulkProgress: result }); render(); }

  async function handleAction(action, element) {
    if (action === 'select') return selectCapability(element.getAttribute('data-capability') || '');
    if (action === 'refresh') return readWorkspace();
    if (action === 'detail') return detail(element.getAttribute('data-id') || '', element.getAttribute('data-source') || '');
    if (action === 'preview') return preview(element.getAttribute('data-operation') || '', element);
    if (action === 'request-approval') return requestApproval();
    if (action === 'approve') return approve();
    if (action === 'apply') return apply();
    if (action === 'resume') return resume();
    if (action === 'discard') { setModel({ ...getModel(), preview: null, approvalStatus: '' }); render(); }
  }
  function maybeLoad() { if (route() === 'community-operations' && authorized(getModel().capabilityId) && getModel().status === 'idle') void readWorkspace(); }
  return Object.freeze({ readWorkspace, selectCapability, handleAction, maybeLoad });
}
