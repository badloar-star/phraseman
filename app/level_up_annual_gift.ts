import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStableId } from './stable_id';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';

export const LEVEL_UP_ANNUAL_GIFT_OFFERING_ID = 'level_up_annual_gift_v1' as const;
export const LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE = 'level_up_annual_gift_attempt_id' as const;
const LEVEL_UP_ANNUAL_GIFT_SAVED_OFFER_KEY = 'level_up_annual_gift_saved_offer_v1';

export type LevelUpAnnualGiftOfferState =
  | 'available'
  | 'trial_pending'
  | 'awaiting_first_paid_renewal'
  | 'granted'
  | 'expired';

export type LevelUpAnnualGiftOffer = Readonly<{
  offerId: string;
  level: number;
  state: LevelUpAnnualGiftOfferState;
  offeringId: typeof LEVEL_UP_ANNUAL_GIFT_OFFERING_ID;
  createdAtMs: number;
  offerExpiresAtMs: number;
  /** Authoritative trial end supplied by the RevenueCat webhook. */
  firstPaidExpectedAtMs?: number | null;
  grantedAtMs: number | null;
  bonusExpiryAtMs: number | null;
  /** Local dev-admin preview only. It can never enter the purchase flow. */
  preview?: boolean;
}>;

function isSavedOffer(value: unknown): value is LevelUpAnnualGiftOffer {
  if (!value || typeof value !== 'object') return false;
  const offer = value as Partial<LevelUpAnnualGiftOffer>;
  return typeof offer.offerId === 'string'
    && Number.isSafeInteger(offer.level)
    && typeof offer.state === 'string'
    && offer.offeringId === LEVEL_UP_ANNUAL_GIFT_OFFERING_ID
    && Number.isFinite(offer.offerExpiresAtMs)
    && (offer.preview === undefined || typeof offer.preview === 'boolean')
    && (offer.firstPaidExpectedAtMs === undefined
      || offer.firstPaidExpectedAtMs === null
      || Number.isFinite(offer.firstPaidExpectedAtMs));
}

/** Keeps the server-issued deadline available after the celebration has closed. */
export async function saveLevelUpAnnualGiftOffer(offer: LevelUpAnnualGiftOffer): Promise<void> {
  await AsyncStorage.setItem(LEVEL_UP_ANNUAL_GIFT_SAVED_OFFER_KEY, JSON.stringify(offer));
}

export async function loadSavedLevelUpAnnualGiftOffer(): Promise<LevelUpAnnualGiftOffer | null> {
  const raw = await AsyncStorage.getItem(LEVEL_UP_ANNUAL_GIFT_SAVED_OFFER_KEY);
  if (!raw) return null;
  try {
    const offer: unknown = JSON.parse(raw);
    if (!isSavedOffer(offer)) return null;
    return offer;
  } catch {
    return null;
  }
}

type PurchaseBinding = Readonly<{
  purchaseAttemptId: string;
  offerId: string;
  revenueCatAppUserId: string;
  offeringId: typeof LEVEL_UP_ANNUAL_GIFT_OFFERING_ID;
  annualProductId: string;
  expiresAtMs: number;
  subscriberAttribute: Readonly<{
    key: typeof LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE;
    value: string;
  }>;
}>;

type Callable<TRequest, TResponse> = (data: TRequest) => Promise<{ data: TResponse }>;

function callable<TRequest, TResponse>(name: string): Callable<TRequest, TResponse> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), 'us-central1'), name) as Callable<TRequest, TResponse>;
}

function requireNonEmpty(value: unknown, code: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

async function requireStableRevenueCatIdentity(): Promise<string> {
  const stableId = requireNonEmpty(await getStableId(), 'stable_id_unavailable');
  const revenueCatAppUserId = requireNonEmpty(await Purchases.getAppUserID(), 'revenuecat_identity_unavailable');
  if (revenueCatAppUserId !== stableId) throw new Error('revenuecat_identity_not_ready');
  return stableId;
}

async function requireAppCheck(): Promise<void> {
  if (!await initFirebaseAppCheckIfAvailable()) {
    throw new Error('app_check_unavailable');
  }
}

function annualPackageFromGiftOffering(offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>): PurchasesPackage {
  const offering = offerings.all?.[LEVEL_UP_ANNUAL_GIFT_OFFERING_ID];
  if (!offering || offering.identifier !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID) {
    throw new Error('gift_offering_unavailable');
  }
  if (!offering.annual) throw new Error('annual_package_unavailable');
  return offering.annual;
}

export async function getLevelUpAnnualGiftOffer(level: number): Promise<LevelUpAnnualGiftOffer> {
  if (!Number.isSafeInteger(level) || level <= 0) throw new Error('valid_level_required');
  await requireAppCheck();
  const stableId = requireNonEmpty(await getStableId(), 'stable_id_unavailable');
  const getOrCreate = callable<{ stableId: string; level: number }, LevelUpAnnualGiftOffer>(
    'levelUpAnnualGiftGetOrCreate',
  );
  const result = await withCallableTimeout(getOrCreate({ stableId, level }), 'levelUpAnnualGiftGetOrCreate');
  return result.data;
}

export async function purchaseLevelUpAnnualGift(offer: LevelUpAnnualGiftOffer): Promise<{
  customerInfo: CustomerInfo;
  purchaseAttemptId: string;
}> {
  if (offer.offeringId !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID) {
    throw new Error('gift_offering_mismatch');
  }
  if (offer.state !== 'available' && offer.state !== 'trial_pending') {
    throw new Error('gift_offer_not_purchasable');
  }

  await requireAppCheck();
  const stableId = await requireStableRevenueCatIdentity();
  const annualPackage = annualPackageFromGiftOffering(await Purchases.getOfferings());
  const annualProductId = requireNonEmpty(annualPackage.product?.identifier, 'annual_package_unavailable');
  const bindPurchase = callable<{
    stableId: string;
    offerId: string;
    revenueCatAppUserId: string;
    annualProductId: string;
  }, PurchaseBinding>('levelUpAnnualGiftBindPurchase');
  const binding = (await withCallableTimeout(bindPurchase({
    stableId,
    offerId: requireNonEmpty(offer.offerId, 'offer_id_required'),
    revenueCatAppUserId: stableId,
    annualProductId,
  }), 'levelUpAnnualGiftBindPurchase')).data;

  if (binding.offeringId !== LEVEL_UP_ANNUAL_GIFT_OFFERING_ID
    || binding.revenueCatAppUserId !== stableId
    || binding.annualProductId !== annualProductId
    || binding.subscriberAttribute.key !== LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE
    || binding.subscriberAttribute.value !== binding.purchaseAttemptId) {
    throw new Error('gift_purchase_binding_invalid');
  }

  await Purchases.setAttributes({
    [LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE]: binding.purchaseAttemptId,
  });
  const { customerInfo } = await Purchases.purchasePackage(annualPackage);
  return { customerInfo, purchaseAttemptId: binding.purchaseAttemptId };
}
