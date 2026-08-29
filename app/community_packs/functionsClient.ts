import { getApp } from '@react-native-firebase/app';
import { DebugLogger } from '../debug-logger';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { initFirebaseAppCheckIfAvailable } from '../app_check_init';
import type { LevelSpinStarCreditExactResult } from '../../modules/phone-state/domains/economy';

/** Callable v2 задеплоєні в us-central1 (як у admin getFunctions(..., 'us-central1')). */
const FUNCTIONS_REGION = 'us-central1';
const communityPurchaseInFlight = new Map<string, Promise<CommunityPurchaseResponse>>();
const communityGiftRedeemInFlight = new Map<string, Promise<CommunityGiftRedeemResponse>>();

export function isCommunityPacksCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<TReq, TRes>(name);
  try {
    const res = await fn(data);
    return res.data;
  } catch (error) {
    // зачем (аудит 2026-08-29): сообщество не писало отказы никуда — покупка
    // пака могла молча падать. Денежные имена — critical (доезжают до
    // app_errors), остальное — warning (локальный журнал + support-бандл).
    const irreversible = name === 'communityPurchasePack' || name === 'communityRedeemPackGiftVoucher';
    DebugLogger.error(
      `community:${name}`,
      error instanceof Error ? error : new Error(String(error)),
      irreversible ? 'critical' : 'warning',
    );
    throw error;
  }
}

export async function callCommunitySubmitPackForReview(data: {
  authorStableId: string;
  payload: unknown;
  updatePackId?: string;
}): Promise<{ submissionId: string }> {
  return callFunction<typeof data, { submissionId: string }>('communitySubmitPackForReview', data);
}

/**
 * Cards 2.1 §1.2/§1.3: в КАТАЛОГЕ наборов покупки больше нет — набор добавляется
 * бесплатно через `communityPackActions.addCommunityPackToLibrary`, а `priceShards`
 * в ответе — легаси-поле, которое клиент игнорирует. Сам callable оставлен только
 * для легаси-пути «Магазина осколков» (`purchaseCommunityPack.ts`).
 */
export type CommunityPurchaseResponse = {
  alreadyOwned?: boolean;
  priceShards?: number;
  authorNetShards?: number;
  buyerBalanceAfter?: number;
  shardsUpdatedAtMs?: number;
  purchaseId?: string;
  studyTarget?: 'en' | 'fr';
};

export async function callCommunityPurchasePack(data: {
  buyerStableId: string;
  packId: string;
  studyTarget?: 'en' | 'fr';
  buyerDisplayName: string;
}): Promise<CommunityPurchaseResponse> {
  const key = communityPurchaseRequestKey(data);
  const existing = communityPurchaseInFlight.get(key);
  if (existing) return existing;

  const request = callFunction<typeof data, CommunityPurchaseResponse>('communityPurchasePack', data)
    .finally(() => {
      communityPurchaseInFlight.delete(key);
    });
  communityPurchaseInFlight.set(key, request);
  return request;
}

export type CommunityGiftRedeemResponse = {
  alreadyOwned?: boolean;
  gifted?: boolean;
  replayed?: boolean;
  studyTarget?: 'en' | 'fr';
};

export type FlashcardPackGiftRedeemResponse = CommunityGiftRedeemResponse & {
  packId?: string;
  packType?: 'official' | 'community';
};

export async function callFlashcardPackGiftRedeem(data: {
  buyerStableId: string;
  packId: string;
  packType: 'official' | 'community';
  studyTarget?: 'en' | 'fr';
  voucherId?: string;
  voucherOccurrenceId?: string;
}): Promise<FlashcardPackGiftRedeemResponse> {
  const key = JSON.stringify(data);
  const existing = communityGiftRedeemInFlight.get(key);
  if (existing) return existing;
  const request = callFunction<typeof data, FlashcardPackGiftRedeemResponse>('flashcardPackGiftRedeem', data)
    .finally(() => communityGiftRedeemInFlight.delete(key));
  communityGiftRedeemInFlight.set(key, request);
  return request;
}

export type FlashcardPackGiftSyncStateResponse = {
  vouchers: { voucherId?: string; occurrenceId?: string; expiresAt: number; source: string }[];
  entitlements: { packId: string; packType: 'official' | 'community'; studyTarget: 'en' | 'fr' }[];
};

export async function callFlashcardPackGiftSyncState(data: { stableId: string }): Promise<FlashcardPackGiftSyncStateResponse> {
  return callFunction<typeof data, FlashcardPackGiftSyncStateResponse>('flashcardPackGiftSyncState', data);
}

export async function callFlashcardPackGiftGrantGlobalBroadcast(data: {
  stableId: string;
  broadcastId: string;
}): Promise<{ voucherId: string; expiresAt: number; replayed?: boolean }> {
  return callFunction<typeof data, { voucherId: string; expiresAt: number; replayed?: boolean }>(
    'flashcardPackGiftGrantGlobalBroadcast',
    data,
  );
}

export type LevelGiftReservationResponse = {
  reservationId: string;
  giftId: string;
  allowedPackId?: string;
  displayed?: boolean;
  claimed?: boolean;
  replayed?: boolean;
};

export async function callLevelGiftReserve(data: {
  stableId: string;
  level: number;
  lane: 'f2p' | 'premium';
  studyTarget?: 'en' | 'fr';
}): Promise<LevelGiftReservationResponse> {
  return callFunction<typeof data, LevelGiftReservationResponse>('levelGiftReserve', data);
}

export type LevelGiftReservationActionStatus =
  | 'acquired'
  | 'already_displayed'
  | 'busy'
  | 'claimed'
  | 'already_claimed'
  | 'released';

export async function callLevelGiftReservationAction(data: {
  stableId: string;
  level: number;
  lane: 'f2p' | 'premium';
  studyTarget?: 'en' | 'fr';
  reservationId: string;
  action: 'display' | 'begin_claim' | 'complete_claim' | 'release_claim';
  giftId?: string;
  claimToken?: string;
}): Promise<{ status: LevelGiftReservationActionStatus; leaseUntil?: number; chainShield?: string; giftXpMultiplier?: string; clubGiftFreeBoostCount?: number }> {
  return callFunction<typeof data, { status: LevelGiftReservationActionStatus; leaseUntil?: number; chainShield?: string; giftXpMultiplier?: string; clubGiftFreeBoostCount?: number }>(
    'levelGiftReserve',
    data,
  );
}

export type LevelSpinDeliveryActionStatus = 'acquired' | 'claimed' | 'already_claimed' | 'busy' | 'released' | 'expired';

export async function callLevelSpinDeliveryAction(data: {
  stableId: string;
  requestId: string;
  lane: 'base' | 'premium';
  action: 'begin_delivery' | 'complete_delivery' | 'release_delivery';
  deliveryToken: string;
  selectedGiftId?: string;
}): Promise<{ status: LevelSpinDeliveryActionStatus; giftId?: string; leaseUntil?: number }> {
  return callFunction<typeof data, { status: LevelSpinDeliveryActionStatus; giftId?: string; leaseUntil?: number }>(
    'levelRewardSpinDelivery',
    data,
  );
}

export async function callLevelSpinActivatePackGift(data: {
  stableId: string;
  requestId: string;
  lane: 'base' | 'premium';
  deliveryToken: string;
}): Promise<{ voucherId: string; expiresAt: number; allowedPackId?: string; replayed?: boolean }> {
  return callFunction<
    typeof data,
    { voucherId: string; expiresAt: number; allowedPackId?: string; replayed?: boolean }
  >('levelSpinActivatePackGift', data);
}

export type LevelSpinStarMaterializationAck = Readonly<{
  materialized: true;
  operationId: string;
  requestFingerprint: string;
  replayed: boolean;
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

/** Persists an already committed client composite; the server never selects its reward. */
export async function callLevelSpinStarComposite(
  operation: LevelSpinStarCreditExactResult,
): Promise<LevelSpinStarMaterializationAck> {
  return callFunction<{ operation: LevelSpinStarCreditExactResult }, LevelSpinStarMaterializationAck>(
    'levelSpinStarGrant',
    { operation },
  );
}

export async function callLevelGiftActivatePackGift(data: {
  stableId: string;
  reservationId: string;
}): Promise<{ voucherId: string; expiresAt: number; allowedPackId?: string; replayed?: boolean }> {
  return callFunction<
    typeof data,
    { voucherId: string; expiresAt: number; allowedPackId?: string; replayed?: boolean }
  >('levelGiftActivatePackGift', data);
}

export async function callCommunityRedeemPackGiftVoucher(data: {
  buyerStableId: string;
  packId: string;
  studyTarget?: 'en' | 'fr';
}): Promise<CommunityGiftRedeemResponse> {
  return callFlashcardPackGiftRedeem({ ...data, packType: 'community' });
}

function communityPurchaseRequestKey(data: {
  buyerStableId: string;
  packId: string;
  studyTarget?: 'en' | 'fr';
  buyerDisplayName: string;
}): string {
  return JSON.stringify({
    buyerStableId: data.buyerStableId,
    packId: data.packId,
    studyTarget: data.studyTarget ?? 'en',
    buyerDisplayName: data.buyerDisplayName,
  });
}

export type CommunitySellerInboxEvent = {
  id: string;
  type?: string;
  seen?: boolean;
  createdAt?: number;
  result?: string;
  message?: string | null;
  submissionId?: string;
  studyTarget?: 'en' | 'fr';
  /** UGC-набір (подія з адмінки) — у листі мають бути titleRu/titleUk; `packId` — для дозавантаження в клієнті. */
  packId?: string | null;
  titleRu?: string | null;
  titleUk?: string | null;
  titleEs?: string | null;
  [key: string]: unknown;
};

export async function callCommunityListSellerInbox(data: {
  authorStableId: string;
  limit?: number;
}): Promise<{ events: CommunitySellerInboxEvent[] }> {
  return callFunction<typeof data, { events: CommunitySellerInboxEvent[] }>('communityListSellerInbox', data);
}

export async function callCommunityMarkSellerInboxSeen(data: {
  authorStableId: string;
  eventIds: string[];
}): Promise<{ ok: boolean }> {
  return callFunction<typeof data, { ok: boolean }>('communityMarkSellerInboxSeen', data);
}

export async function callCommunityFetchPackCardsIfAccessible(data: {
  stableId: string;
  packId: string;
  studyTarget?: 'en' | 'fr';
}): Promise<{ ok: boolean; cards: unknown[] }> {
  return callFunction<typeof data, { ok: boolean; cards: unknown[] }>('communityFetchPackCardsIfAccessible', data);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
