import { Platform } from 'react-native';
import Purchases, {
  PRORATION_MODE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from '../../app/account_generation';
import { initRevenueCat, resolveMaxPackage, syncRevenueCatIdentity } from '../../app/revenuecat_init';
import {
  commitRevenueCatResultForGeneration,
  runRevenueCatOperationForGeneration,
  type RevenueCatAccountResult,
} from '../../app/revenuecat_account_identity';
import { revenueCatCustomerInfoHasMaxAccess } from '../../app/revenuecat_premium_access';
import { persistStorePremiumLocally, revenueCatMaxMetadata } from '../../app/premium_revenuecat_state';
import { confirmRevenueCatMaxProjectionForAccount } from '../../app/revenuecat_projection_sync';
import {
  clearPendingMaxActivationForGeneration,
  persistPendingMaxActivationForGeneration,
} from './pending';

export const MAX_REVENUECAT_OFFERING_ID = 'max' as const;
export const MAX_REVENUECAT_PACKAGE_ID = 'max_monthly' as const;
export const MAX_STORE_PRODUCT_ID = 'phraseman_max_monthly_v1' as const;

export type MaxSubscriptionResult =
  | { status: 'purchased' | 'restored' | 'already_active'; customerInfo: CustomerInfo }
  | { status: 'pending' | 'unavailable' | 'stale' };

async function persistConfirmedMax(
  generation: AccountGenerationToken,
  customerInfo: CustomerInfo,
  productId?: string,
): Promise<boolean> {
  if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
  const committed = await commitRevenueCatResultForGeneration(generation, (isCurrent) => (
    persistStorePremiumLocally(
      'max_monthly',
      revenueCatMaxMetadata(customerInfo, productId),
      isCurrent,
      true,
      true,
    )
  ));
  const persisted = committed.status === 'ok' && committed.value;
  if (persisted) await persistPendingMaxActivationForGeneration(generation);
  return persisted;
}

export async function loadMaxSubscriptionPackage(): Promise<PurchasesPackage | undefined> {
  await initRevenueCat();
  const offerings = await Purchases.getOfferings();
  return resolveMaxPackage(offerings);
}

async function currentMaxInfo(): Promise<CustomerInfo | null> {
  const info = await Purchases.getCustomerInfo();
  return revenueCatCustomerInfoHasMaxAccess(info) ? info : null;
}

export async function purchaseMaxSubscription(): Promise<MaxSubscriptionResult> {
  const generation = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(generation);
  await initRevenueCat(isCurrent);
  if (!generation.stableId || !isCurrent() || !(await syncRevenueCatIdentity(isCurrent))) {
    return { status: 'stale' };
  }

  const inventory = await runRevenueCatOperationForGeneration(generation, () => Purchases.getOfferings());
  if (inventory.status !== 'ok') return { status: 'stale' };
  const maxPackage = resolveMaxPackage(inventory.value);
  if (!maxPackage) return { status: 'unavailable' };

  const current = await runRevenueCatOperationForGeneration(generation, () => Purchases.getCustomerInfo());
  if (current.status !== 'ok') return { status: 'stale' };
  if (revenueCatCustomerInfoHasMaxAccess(current.value)) {
    return await persistConfirmedMax(generation, current.value, maxPackage.product.identifier)
      ? { status: 'already_active', customerInfo: current.value }
      : { status: 'stale' };
  }

  const oldProductId = current.value.activeSubscriptions.find((id) => id !== maxPackage.product.identifier);
  const googleProductChangeInfo = Platform.OS === 'android' && oldProductId
    ? { oldProductIdentifier: oldProductId, prorationMode: PRORATION_MODE.IMMEDIATE_WITH_TIME_PRORATION }
    : null;
  let purchased: RevenueCatAccountResult<{ customerInfo: CustomerInfo }>;
  try {
    purchased = await runRevenueCatOperationForGeneration(
      generation,
      () => Purchases.purchasePackage(maxPackage, null, googleProductChangeInfo),
    );
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (String(code) !== String(PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)) throw error;
    if (!isCurrent() || !(await syncRevenueCatIdentity(isCurrent))) return { status: 'stale' };
    await persistPendingMaxActivationForGeneration(generation);
    return { status: 'pending' };
  }
  if (purchased.status !== 'ok') return { status: 'stale' };
  if (!revenueCatCustomerInfoHasMaxAccess(purchased.value.customerInfo)) {
    await persistPendingMaxActivationForGeneration(generation);
    return { status: 'pending' };
  }
  return await persistConfirmedMax(generation, purchased.value.customerInfo, maxPackage.product.identifier)
    ? { status: 'purchased', customerInfo: purchased.value.customerInfo }
    : { status: 'stale' };
}

export async function restoreMaxSubscription(): Promise<MaxSubscriptionResult> {
  const generation = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(generation);
  await initRevenueCat(isCurrent);
  if (!generation.stableId || !isCurrent() || !(await syncRevenueCatIdentity(isCurrent))) {
    return { status: 'stale' };
  }
  const restored = await runRevenueCatOperationForGeneration(generation, () => Purchases.restorePurchases());
  if (restored.status !== 'ok') return { status: 'stale' };
  if (!revenueCatCustomerInfoHasMaxAccess(restored.value)) {
    return { status: 'unavailable' };
  }
  return await persistConfirmedMax(generation, restored.value)
    ? { status: 'restored', customerInfo: restored.value }
    : { status: 'stale' };
}

export async function hasCurrentMaxSubscription(): Promise<boolean> {
  await initRevenueCat();
  return (await currentMaxInfo()) !== null;
}

export async function confirmMaxSubscriptionActivation(): Promise<boolean> {
  const generation = captureAccountGeneration();
  if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
  const active = await confirmRevenueCatMaxProjectionForAccount(generation.stableId, {
    isCurrent: () => isCurrentAccountGeneration(generation),
  });
  if (active) await clearPendingMaxActivationForGeneration(generation);
  return active;
}
