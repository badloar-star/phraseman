import { MONEY_OPERATION_CAPABILITIES } from './admin-money-operations-state.js';

const PERMISSIONS = Object.freeze({ 'ugc-refund': 'money.refunds.write', 'telegram-activate': 'money.payment_orders.write', 'web-order-close': 'money.payment_orders.write', 'web-checkout-config': 'money.payment_config.write' });
function value(id) { return String(document.getElementById(id)?.value || '').trim(); }
function checked(id) { return document.getElementById(id)?.checked === true; }
function key(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function createMoneyOperationsController({ getModel, setModel, actions, render, route, authorized, can, message, errorMessage }) {
  async function load(append = false) { if (!authorized()) return; const previous = getModel().workspace; const filters = { query: value('money-filter-query') || getModel().filters?.query || '', status: value('money-filter-status') || getModel().filters?.status || '' }; setModel({ ...getModel(), status: 'loading', error: '', filters }); render(); try { const workspace = await actions().getMoneyOperationsWorkspace({ capabilityId: getModel().capabilityId, limit: 100, cursor: append ? previous?.nextCursor || '' : '', ...filters }); if (append && previous) workspace.items = [...(previous.items || []), ...(workspace.items || [])]; setModel({ ...getModel(), status: 'ready', workspace, detail: null, error: '', filters }); } catch (error) { setModel({ ...getModel(), status: 'error', error: errorMessage(error), filters }); } render(); }
  async function selectCapability(capabilityId) { if (!MONEY_OPERATION_CAPABILITIES.includes(capabilityId)) return; setModel({ ...getModel(), capabilityId, workspace: null, detail: null, preview: null, status: 'idle' }); render(); await load(); }
  async function openDetail(id, source) { const detail = await actions().getMoneyOperationDetail({ capabilityId: getModel().capabilityId, id, source }); setModel({ ...getModel(), detail }); render(); }
  function operationPayload(operation) {
    if (operation === 'ugc-refund') return { note: value('money-reason') };
    if (operation === 'telegram-activate') return { uid: value('money-user-uid') };
    if (operation === 'web-checkout-config') return { priceCents: { monthly: Number(value('money-price-monthly')), yearly: Number(value('money-price-yearly')), lifetime: Number(value('money-price-lifetime')) }, currency: value('money-currency'), paypalLive: checked('money-paypal-live') };
    return {};
  }
  async function preview(operation, element) {
    if (!can(PERMISSIONS[operation])) return message('Недостаточно прав для этой операции.', 'warning');
    const targetId = element?.getAttribute('data-id') || value('money-target-id'); const expectedVersion = element?.getAttribute('data-version') || value('money-expected-version'); const reason = value('money-reason');
    if (!targetId || !expectedVersion || !reason) return message('Выберите запись и укажите причину.', 'warning');
    const result = await actions().previewMoneyMutation({ action: operation, targetId, reason, expectedVersion, payload: operationPayload(operation) }); setModel({ ...getModel(), preview: result, approvalStatus: '' }); render();
  }
  async function requestApproval() { const preview = getModel().preview; const confirmation = value('money-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); const result = await actions().requestMoneyApproval({ previewId: preview.previewId, confirmation }); setModel({ ...getModel(), approvalStatus: result.status || 'pending' }); render(); }
  async function approve() { if (!can('money.approve')) return message('Нужно право money.approve.', 'warning'); const result = await actions().approveMoneyMutation({ previewId: value('money-approval-preview-id'), reason: value('money-approval-reason') }); message(`Одобрение: ${result.status}.`, 'success'); }
  async function apply() { const preview = getModel().preview; const confirmation = value('money-confirmation'); if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning'); await actions().applyMoneyMutation({ previewId: preview.previewId, confirmation, idempotencyKey: key(`money-${preview.previewId}`) }); setModel({ ...getModel(), preview: null, approvalStatus: '' }); await load(); }
  function exportReferrals() { if (!can('money.export')) return message('Нужно право money.export.', 'warning'); const rows = getModel().workspace?.items || []; const cells = (row) => [row.id, row.referrerStableId, row.refereeStableId, row.status, row.rewardDays || row.shardsAwarded].map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','); const blob = new Blob([['id,referrer,referee,status,reward', ...rows.map(cells)].join('\n')], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'referrals.csv'; link.click(); URL.revokeObjectURL(link.href); }
  async function handleAction(action, element) { if (action === 'select') return selectCapability(element.getAttribute('data-capability') || ''); if (action === 'refresh') return load(); if (action === 'load-more') return load(true); if (action === 'detail') return openDetail(element.getAttribute('data-id') || '', element.getAttribute('data-source') || ''); if (action === 'preview') return preview(element.getAttribute('data-operation') || '', element); if (action === 'export-referrals') return exportReferrals(); if (action === 'request-approval') return requestApproval(); if (action === 'approve') return approve(); if (action === 'apply') return apply(); if (action === 'discard') { setModel({ ...getModel(), preview: null, approvalStatus: '' }); render(); } }
  function maybeLoad() { if (route() === 'money-operations' && authorized() && getModel().status === 'idle') void load(); }
  return Object.freeze({ load, selectCapability, handleAction, maybeLoad });
}
