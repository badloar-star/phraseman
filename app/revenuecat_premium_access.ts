import type { CustomerInfo } from 'react-native-purchases';

function clean(raw: unknown): string {
  return String(raw ?? '').trim();
}

/** The only RevenueCat entitlement that unlocks Phraseman Premium. */
export function activeRevenueCatPremiumEntitlement(
  info: CustomerInfo | null | undefined,
): Record<string, any> | null {
  const active = (info?.entitlements?.active ?? {}) as Record<string, Record<string, any>>;
  return active.premium ?? null;
}

/** Generic access checks must never accept unrelated RevenueCat products. */
export function revenueCatCustomerInfoHasPremiumAccess(
  info: CustomerInfo | null | undefined,
): boolean {
  return activeRevenueCatPremiumEntitlement(info) !== null;
}

/**
 * A completed store dialog is not enough to unlock Premium: CustomerInfo must
 * confirm the exact package selected by the user on the canonical entitlement.
 */
export function customerInfoConfirmsProductAccess(
  info: CustomerInfo | null | undefined,
  expectedProductId: unknown,
): boolean {
  const expected = clean(expectedProductId);
  if (!expected) return false;

  const premium = activeRevenueCatPremiumEntitlement(info);
  if (premium) return clean(premium.productIdentifier) === expected;

  const activeSubscriptions = Array.isArray(info?.activeSubscriptions)
    ? info.activeSubscriptions
    : [];
  return activeSubscriptions.some((productId) => clean(productId) === expected);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
