export type PaywallPlanForOutcome = 'monthly' | 'yearly' | 'lifetime';
export type PurchaseActivationType = 'trial' | 'paid' | 'pending';

type PurchaseCustomerInfo = {
  entitlements?: { active?: Record<string, { periodType?: unknown; productIdentifier?: unknown }> };
  activeSubscriptions?: readonly unknown[];
} | null | undefined;

export function classifyPurchaseActivation(
  customerInfo: PurchaseCustomerInfo,
  selected: PaywallPlanForOutcome,
  purchasedProductId: string,
): PurchaseActivationType {
  const active = Object.values(customerInfo?.entitlements?.active ?? {});
  const matchingEntitlements = active.filter(
    (item) => String(item.productIdentifier ?? '') === purchasedProductId,
  );
  const hasMatchingSubscription = (customerInfo?.activeSubscriptions ?? [])
    .some((productId) => String(productId) === purchasedProductId);
  if (matchingEntitlements.length === 0 && !hasMatchingSubscription) return 'pending';
  if (selected === 'yearly' && matchingEntitlements.some(
    (item) => String(item.periodType ?? '').toUpperCase() === 'TRIAL',
  )) {
    return 'trial';
  }
  return 'paid';
}
