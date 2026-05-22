import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerInfo } from 'react-native-purchases';
import { syncToCloud } from './cloud_sync';
import { invalidatePremiumCache, markPremiumStoreSeenNow } from './premium_guard';

export type PremiumStorePlan = 'monthly' | 'yearly';

export type RevenueCatPremiumMetadata = {
  productId?: string;
  periodType?: string;
  store?: string;
  expiryMs?: number | null;
  purchasedMs?: number | null;
};

function clean(raw: unknown): string {
  return String(raw ?? '').trim();
}

function activePremiumEntitlement(info: CustomerInfo | null | undefined): any | null {
  const active = info?.entitlements?.active ?? {};
  return (active as Record<string, any>).premium ?? Object.values(active as Record<string, any>)[0] ?? null;
}

export function inferPremiumPlanFromProductId(
  productId: unknown,
  defaultPlan: PremiumStorePlan = 'monthly',
): PremiumStorePlan {
  const id = clean(productId).toLowerCase();
  if (/year|yearly|annual|12.?month/.test(id)) return 'yearly';
  if (/month|monthly|1.?month/.test(id)) return 'monthly';
  return defaultPlan;
}

export function revenueCatPremiumMetadata(
  info: CustomerInfo | null | undefined,
  defaultProductId?: string | null,
): RevenueCatPremiumMetadata {
  const ent = activePremiumEntitlement(info);
  const productId =
    clean(defaultProductId) ||
    clean(ent?.productIdentifier) ||
    clean(info?.activeSubscriptions?.[0]);
  const periodType = clean(ent?.periodType).toUpperCase();
  const store = clean(ent?.store).toUpperCase();
  const expiryMs = typeof ent?.expirationDateMillis === 'number'
    ? ent.expirationDateMillis
    : null;
  const purchasedMs = typeof ent?.latestPurchaseDateMillis === 'number'
    ? ent.latestPurchaseDateMillis
    : null;

  return {
    ...(productId ? { productId } : {}),
    ...(periodType ? { periodType } : {}),
    ...(store ? { store } : {}),
    ...(expiryMs != null ? { expiryMs } : {}),
    ...(purchasedMs != null ? { purchasedMs } : {}),
  };
}

export async function persistStorePremiumLocally(
  plan: PremiumStorePlan,
  metadata: RevenueCatPremiumMetadata = {},
): Promise<void> {
  const now = Date.now();
  const pairs: [string, string][] = [
    ['premium_plan', plan],
    ['premium_expiry', '0'],
    ['premium_active', 'true'],
    ['tester_no_premium', 'false'],
    ['premium_rc_updated_at', String(now)],
  ];

  if (metadata.productId) pairs.push(['premium_rc_product_id', metadata.productId]);
  if (metadata.periodType) pairs.push(['premium_rc_period_type', metadata.periodType]);
  if (metadata.store) pairs.push(['premium_rc_store', metadata.store]);
  if (metadata.expiryMs != null && Number.isFinite(metadata.expiryMs)) {
    pairs.push(['premium_rc_expiry_ms', String(Math.max(0, Math.floor(metadata.expiryMs)))]);
  }
  if (metadata.purchasedMs != null && Number.isFinite(metadata.purchasedMs)) {
    pairs.push(['premium_rc_purchased_at_ms', String(Math.max(0, Math.floor(metadata.purchasedMs)))]);
  }

  await AsyncStorage.multiSet(pairs);
  await markPremiumStoreSeenNow();
  invalidatePremiumCache();
  await syncToCloud({ forceNow: true }).catch(() => {});
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
