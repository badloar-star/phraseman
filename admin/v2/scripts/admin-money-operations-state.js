export const MONEY_OPERATION_CAPABILITIES = Object.freeze([
  'ugc-purchases', 'refunds', 'referrals', 'telegram-payments', 'website-payments',
]);

export function createMoneyOperationsState() {
  return {
    status: 'idle', capabilityId: 'ugc-purchases', workspace: null, detail: null,
    preview: null, approvalStatus: '', error: '', operationKeys: {},
  };
}
