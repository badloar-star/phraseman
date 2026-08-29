import type { CustomerInfo, MakePurchaseResult, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { initRevenueCat, syncRevenueCatIdentity } from '../../app/revenuecat_init';
import {
  clearPendingVoiceMinutePurchase,
  persistPendingVoiceMinutePurchase,
  readVoiceMinuteWalletStatus,
  type PendingVoiceMinutePurchase,
  type VoiceMinuteWalletStatus,
} from './wallet';
import {
  selectVoiceMinutePackages,
  type VoiceMinutePack,
} from './catalog';

export { selectVoiceMinutePackages } from './catalog';
export type { VoiceMinutePack } from './catalog';

export type VoiceMinutePurchaseResult = Readonly<{
  status: 'credited' | 'pending' | 'stale' | 'unavailable';
  transactionId?: string;
  wallet?: VoiceMinuteWalletStatus;
}>;

type PurchaseResultLike = Partial<MakePurchaseResult> & Readonly<{
  customerInfo?: CustomerInfo;
  productIdentifier?: string;
  transaction?: Readonly<{
    transactionIdentifier?: string;
    productIdentifier?: string;
  }>;
}>;

export type VoiceMinutePurchaseDependencies = Readonly<{
  isCurrent: () => boolean;
  readWallet: (expected?: Readonly<{
    expectedTransactionId?: string;
    expectedProductId?: string;
  }>) => Promise<VoiceMinuteWalletStatus>;
  purchasePackage: (pack: PurchasesPackage) => Promise<PurchaseResultLike>;
  persistPending: (marker: PendingVoiceMinutePurchase) => Promise<boolean>;
  clearPending: (stableId: string, transactionId: string) => Promise<void>;
  delay: (ms: number) => Promise<void>;
  maxAttempts?: number;
}>;

const defaultDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function executeVoiceMinutePurchase(
  input: Readonly<{ stableId: string; pack: VoiceMinutePack }>,
  deps: VoiceMinutePurchaseDependencies,
): Promise<VoiceMinutePurchaseResult> {
  const stableId = input.stableId.trim();
  if (!stableId || !deps.isCurrent()) return { status: 'stale' };

  const baseline = await deps.readWallet();
  if (!deps.isCurrent()) return { status: 'stale' };
  const purchased = await deps.purchasePackage(input.pack.revenueCatPackage);
  if (!deps.isCurrent()) return { status: 'stale' };

  const transactionId = String(purchased.transaction?.transactionIdentifier ?? '').trim();
  const purchasedProductId = String(
    purchased.transaction?.productIdentifier ?? purchased.productIdentifier ?? '',
  ).trim();
  if (!transactionId || purchasedProductId !== input.pack.productId) {
    return { status: 'pending' };
  }

  try {
    await deps.persistPending({
      stableId,
      transactionId,
      productId: input.pack.productId,
      baselineEventCount: baseline.eventCount,
      createdAtMs: Date.now(),
    });
    if (!deps.isCurrent()) return { status: 'stale', transactionId };

    const maxAttempts = Math.min(12, Math.max(1, Math.floor(deps.maxAttempts ?? 8)));
    let wallet = baseline;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) await deps.delay(Math.min(4_000, 600 + attempt * 400));
      if (!deps.isCurrent()) return { status: 'stale', transactionId };
      wallet = await deps.readWallet({
        expectedTransactionId: transactionId,
        expectedProductId: input.pack.productId,
      });
      if (!deps.isCurrent()) return { status: 'stale', transactionId };
      if (wallet.credited && wallet.eventCount > baseline.eventCount) {
        await deps.clearPending(stableId, transactionId).catch(() => undefined);
        return { status: 'credited', transactionId, wallet };
      }
    }
    return { status: 'pending', transactionId, wallet };
  } catch {
    // The store transaction already succeeded. Local persistence/callable
    // failures must remain an uncertain pending credit, never a payment error.
    return { status: 'pending', transactionId };
  }
}

export async function loadVoiceMinutePackages(): Promise<VoiceMinutePack[]> {
  await initRevenueCat();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Purchases = require('react-native-purchases').default as {
    getOfferings: () => Promise<PurchasesOfferings>;
  };
  return selectVoiceMinutePackages(await Purchases.getOfferings());
}

export async function purchaseVoiceMinutePack(pack: VoiceMinutePack): Promise<VoiceMinutePurchaseResult> {
  const generation = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(generation);
  if (!generation.stableId || !isCurrent()) return { status: 'stale' };
  await initRevenueCat(isCurrent);
  if (!isCurrent() || !(await syncRevenueCatIdentity(isCurrent))) return { status: 'stale' };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Purchases = require('react-native-purchases').default as {
    purchasePackage: (candidate: PurchasesPackage) => Promise<PurchaseResultLike>;
  };
  return executeVoiceMinutePurchase({ stableId: generation.stableId, pack }, {
    isCurrent,
    readWallet: readVoiceMinuteWalletStatus,
    purchasePackage: Purchases.purchasePackage.bind(Purchases),
    persistPending: persistPendingVoiceMinutePurchase,
    clearPending: clearPendingVoiceMinutePurchase,
    delay: defaultDelay,
  });
}
