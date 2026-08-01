import { Platform } from 'react-native';
import Purchases, { PRORATION_MODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { commitRevenueCatResultForGeneration } from './revenuecat_account_identity';
import {
  inferPremiumPlanFromCustomerInfo,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
  type PremiumStorePlan,
} from './premium_revenuecat_state';

export type ManagePlanChangeResult =
  | { status: 'stale' }
  | { status: 'unknown'; customerInfo: CustomerInfo }
  | { status: 'already_changed'; plan: PremiumStorePlan; customerInfo: CustomerInfo }
  | { status: 'purchased'; plan: 'yearly'; customerInfo: CustomerInfo };

export function isManageSubscriptionOperationCurrent(generation: AccountGenerationToken): boolean {
  return !!generation.stableId
    && isCurrentAccountGeneration(generation, generation.stableId);
}

async function revenueCatIdentityMatches(generation: AccountGenerationToken): Promise<boolean> {
  if (!isManageSubscriptionOperationCurrent(generation)) return false;
  const appUserId = await Purchases.getAppUserID().catch(() => '');
  return isManageSubscriptionOperationCurrent(generation) && appUserId === generation.stableId;
}

async function persistForGeneration(
  generation: AccountGenerationToken,
  plan: PremiumStorePlan,
  info: CustomerInfo,
  fallbackProductId?: string,
): Promise<boolean> {
  if (!isManageSubscriptionOperationCurrent(generation)) return false;
  const metadata = revenueCatPremiumMetadata(info, fallbackProductId);
  const committed = await commitRevenueCatResultForGeneration(generation, (isCurrent) => (
    persistStorePremiumLocally(plan, metadata, isCurrent, true, true)
  ));
  return committed.status === 'ok' && committed.value;
}

export async function changeManageSubscriptionPlanForGeneration(params: Readonly<{
  generation: AccountGenerationToken;
  yearlyPackage: PurchasesPackage;
  currentProductId?: string;
  fallbackPlan: PremiumStorePlan | null;
}>): Promise<ManagePlanChangeResult> {
  const { generation, yearlyPackage, currentProductId, fallbackPlan } = params;
  if (!await revenueCatIdentityMatches(generation)) return { status: 'stale' };
  const latestInfo = await Purchases.getCustomerInfo();
  if (!isManageSubscriptionOperationCurrent(generation)) return { status: 'stale' };
  if (!await revenueCatIdentityMatches(generation)) return { status: 'stale' };

  const latestPlan = inferPremiumPlanFromCustomerInfo(latestInfo, fallbackPlan);
  if (latestPlan && latestPlan !== 'monthly') {
    const persisted = await persistForGeneration(generation, latestPlan, latestInfo);
    return persisted && isManageSubscriptionOperationCurrent(generation)
      ? { status: 'already_changed', plan: latestPlan, customerInfo: latestInfo }
      : { status: 'stale' };
  }
  if (latestPlan == null) return { status: 'unknown', customerInfo: latestInfo };

  if (!await revenueCatIdentityMatches(generation)) return { status: 'stale' };
  const opts = Platform.OS === 'android'
    ? {
      googleProductChangeInfo: {
        oldProductIdentifier: currentProductId ?? '',
        prorationMode: PRORATION_MODE.DEFERRED,
      },
    }
    : undefined;
  const { customerInfo } = await Purchases.purchasePackage(yearlyPackage, opts as any);
  if (!isManageSubscriptionOperationCurrent(generation)) return { status: 'stale' };
  if (!await revenueCatIdentityMatches(generation)) return { status: 'stale' };
  const persisted = await persistForGeneration(
    generation,
    'yearly',
    customerInfo,
    yearlyPackage.product.identifier,
  );
  return persisted && isManageSubscriptionOperationCurrent(generation)
    ? { status: 'purchased', plan: 'yearly', customerInfo }
    : { status: 'stale' };
}

export default function __RouteShim() { return null; }
