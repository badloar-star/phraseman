export type PaywallPlanForOutcome = 'monthly' | 'yearly' | 'lifetime';
export type PurchaseActivationType = 'trial' | 'paid' | 'pending';

type PurchaseCustomerInfo = {
  entitlements?: { active?: Record<string, { periodType?: unknown }> };
  activeSubscriptions?: readonly unknown[];
} | null | undefined;

export function classifyPurchaseActivation(
  customerInfo: PurchaseCustomerInfo,
  selected: PaywallPlanForOutcome,
): PurchaseActivationType {
  const active = Object.values(customerInfo?.entitlements?.active ?? {});
  if (active.length === 0 && (customerInfo?.activeSubscriptions?.length ?? 0) === 0) return 'pending';
  if (selected === 'yearly' && active.some((item) => String(item.periodType ?? '').toUpperCase() === 'TRIAL')) {
    return 'trial';
  }
  return 'paid';
}
