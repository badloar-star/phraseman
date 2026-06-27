import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { initFirebaseAppCheckIfAvailable } from '../app_check_init';

/** Callable v2 задеплоєні в us-central1 (як у admin getFunctions(..., 'us-central1')). */
const FUNCTIONS_REGION = 'us-central1';
const communityPurchaseInFlight = new Map<string, Promise<CommunityPurchaseResponse>>();

export function isCommunityPacksCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<TReq, TRes>(name);
  const res = await fn(data);
  return res.data;
}

export async function callCommunitySubmitPackForReview(data: {
  authorStableId: string;
  payload: unknown;
  updatePackId?: string;
}): Promise<{ submissionId: string }> {
  return callFunction<typeof data, { submissionId: string }>('communitySubmitPackForReview', data);
}

export type CommunityPurchaseResponse = {
  alreadyOwned?: boolean;
  priceShards?: number;
  authorNetShards?: number;
  buyerBalanceAfter?: number;
  shardsUpdatedAtMs?: number;
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
