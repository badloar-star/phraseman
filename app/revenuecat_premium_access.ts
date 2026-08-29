import type { CustomerInfo } from 'react-native-purchases';

function clean(raw: unknown): string {
  return String(raw ?? '').trim();
}

export function isRevenueCatMaxProductId(raw: unknown): boolean {
  return /^phraseman_max_monthly_v1(?::monthly-base)?$/i.test(clean(raw));
}

export function isRevenueCatVoiceMinuteProductId(raw: unknown): boolean {
  return /^phraseman_voice_minutes_(?:30|120|300)$/i.test(clean(raw));
}

function isRevenueCatPremiumProductId(raw: unknown): boolean {
  const value = clean(raw).toLowerCase();
  if (isRevenueCatMaxProductId(value) || isRevenueCatVoiceMinuteProductId(value)) return false;
  return /^(?:phraseman_(?:premium_)?|premium_)(?:monthly|yearly|annual|lifetime)(?:_[a-z0-9]+)*(?::(?:monthly|yearly|annual|lifetime)-base)?$/.test(value);
}

export function activeRevenueCatMaxEntitlement(
  info: CustomerInfo | null | undefined,
): Record<string, any> | null {
  // Retired MAX receipts remain detectable by product id but never grant access.
  void info;
  return null;
}

export function revenueCatCustomerInfoHasMaxAccess(
  info: CustomerInfo | null | undefined,
): boolean {
  return activeRevenueCatMaxEntitlement(info) !== null;
}

/** The only RevenueCat entitlement that unlocks Phraseman Premium. */
export function activeRevenueCatPremiumEntitlement(
  info: CustomerInfo | null | undefined,
): Record<string, any> | null {
  const active = (info?.entitlements?.active ?? {}) as Record<string, Record<string, any>>;
  const premium = active.premium ?? null;
  return premium && isRevenueCatPremiumProductId(premium.productIdentifier) ? premium : null;
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
