import { MONEY_OPERATION_CAPABILITIES } from './admin-money-operations-state.js';

const WRITE_PERMISSIONS = Object.freeze({
  'ugc-refund': 'money.refunds.write',
  'referral-status': 'money.payment_orders.write',
  'telegram-activate': 'money.payment_orders.write',
  'web-order-close': 'money.payment_orders.write',
  'web-checkout-config': 'money.payment_config.write',
  approve: 'money.approve',
});

function value(id) { return String(document.getElementById(id)?.value || '').trim(); }
function key(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function createMoneyOperationsController({ getModel, setModel, actions, render, route, authorized, can, message, errorMessage }) {
  async function load() {
    if (!authorized()) return;
    const model = getModel(); setModel({ ...model, status: 'loading', error: '' }); render();
    try {
      const workspace = await actions().getMoneyOperationsWorkspace({ capabilityId: model.capabilityId, limit: 50 });
      setModel({ ...getModel(), status: 'ready', workspace, detail: null, error: '' });
    } catch (error) { setModel({ ...getModel(), status: 'error', error: errorMessage(error) }); }
    render();
  }

  async function selectCapability(capabilityId) {
    if (!MONEY_OPERATION_CAPABILITIES.includes(capabilityId)) return;
    setModel({ ...getModel(), capabilityId, workspace: null, detail: null, preview: null, status: 'idle' });
    render(); await load();
  }

  async function openDetail(id) {
    const detail = await actions().getMoneyOperationDetail({ capabilityId: getModel().capabilityId, id });
    setModel({ ...getModel(), detail }); render();
  }

  async function preview() {
    const action = value('money-mutation-action'); const targetId = value('money-target-id'); const reason = value('money-reason');
    const expectedVersion = value('money-expected-version');
    if (!can(WRITE_PERMISSIONS[action] || 'money.approve')) return message('Недостаточно прав для этой денежной операции.', 'warning');
    if (action === 'provider-refund') return message('provider-owned: возврат оформляется в App Store / RevenueCat; здесь доступен только просмотр.', 'warning');
    let payload = {}; try { payload = JSON.parse(value('money-payload') || '{}'); } catch { return message('Payload должен быть корректным JSON.', 'warning'); }
    const result = await actions().previewMoneyMutation({ action, targetId, reason, expectedVersion, payload, idempotencyKey: key('money-preview'), confirmation: '' });
    setModel({ ...getModel(), preview: result, approvalStatus: '' }); render();
  }

  async function requestApproval() {
    const preview = getModel().preview; const confirmation = value('money-confirmation');
    if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning');
    const result = await actions().requestMoneyApproval({ previewId: preview.previewId, confirmation });
    setModel({ ...getModel(), approvalStatus: result.status || 'pending' }); render();
  }

  async function approve() {
    if (!can('money.approve')) return message('Нужно право money.approve.', 'warning');
    const previewId = value('money-approval-preview-id'); const reason = value('money-approval-reason');
    const result = await actions().approveMoneyMutation({ previewId, reason });
    message(`Одобрение: ${result.status}. Автор запроса не может одобрить свою операцию.`, 'success');
  }

  async function apply() {
    const preview = getModel().preview; const confirmation = value('money-confirmation');
    if (!preview || confirmation !== preview.confirmation) return message('Точное подтверждение не совпадает.', 'warning');
    await actions().applyMoneyMutation({ previewId: preview.previewId, confirmation, idempotencyKey: key(`money-${preview.previewId}`) });
    setModel({ ...getModel(), preview: null, approvalStatus: '' }); await load();
  }

  async function handleAction(action, element) {
    if (action === 'select') return selectCapability(element.getAttribute('data-capability') || '');
    if (action === 'refresh') return load();
    if (action === 'detail') return openDetail(element.getAttribute('data-id') || '');
    if (action === 'preview') return preview();
    if (action === 'request-approval') return requestApproval();
    if (action === 'approve') return approve();
    if (action === 'apply') return apply();
    if (action === 'discard') { setModel({ ...getModel(), preview: null, approvalStatus: '' }); render(); }
  }

  function maybeLoad() { if (route() === 'money-operations' && authorized() && getModel().status === 'idle') void load(); }
  return Object.freeze({ load, selectCapability, handleAction, maybeLoad });
}
