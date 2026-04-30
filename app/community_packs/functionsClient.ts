import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

/** Callable v2 задеплоєні в us-central1 (як у admin getFunctions(..., 'us-central1')). */
const FUNCTIONS_REGION = 'us-central1';

export function isCommunityPacksCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

export async function callCommunitySubmitPackForReview(data: {
  authorStableId: string;
  payload: unknown;
  updatePackId?: string;
}): Promise<{ submissionId: string }> {
  const fn = callable<typeof data, { submissionId: string }>('communitySubmitPackForReview');
  const res = await fn(data);
  return res.data;
}

export type CommunityPurchaseResponse = {
  alreadyOwned?: boolean;
  priceShards?: number;
  authorNetShards?: number;
  buyerBalanceAfter?: number;
};

export async function callCommunityPurchasePack(data: {
  buyerStableId: string;
  packId: string;
  buyerDisplayName: string;
}): Promise<CommunityPurchaseResponse> {
  const fn = callable<typeof data, CommunityPurchaseResponse>('communityPurchasePack');
  const res = await fn(data);
  return res.data;
}

export type CommunitySellerInboxEvent = {
  id: string;
  type?: string;
  seen?: boolean;
  createdAt?: number;
  result?: string;
  message?: string | null;
  submissionId?: string;
  /** UGC-набір (подія з адмінки) — у листі мають бути titleRu/titleUk; `packId` — для дозавантаження в клієнті. */
  packId?: string | null;
  titleRu?: string | null;
  titleUk?: string | null;
  [key: string]: unknown;
};

export async function callCommunityListSellerInbox(data: {
  authorStableId: string;
  limit?: number;
}): Promise<{ events: CommunitySellerInboxEvent[] }> {
  const fn = callable<typeof data, { events: CommunitySellerInboxEvent[] }>('communityListSellerInbox');
  const res = await fn(data);
  return res.data;
}

export async function callCommunityMarkSellerInboxSeen(data: {
  authorStableId: string;
  eventIds: string[];
}): Promise<{ ok: boolean }> {
  const fn = callable<typeof data, { ok: boolean }>('communityMarkSellerInboxSeen');
  const res = await fn(data);
  return res.data;
}

export type CommunityPackRatingSummary = {
  purchased: boolean;
  canRate: boolean;
  myStars: number | null;
  ratingAvg: number;
  ratingCount: number;
};

export async function callCommunityGetPackRatingSummary(data: {
  buyerStableId: string;
  packId: string;
}): Promise<CommunityPackRatingSummary> {
  const fn = callable<typeof data, CommunityPackRatingSummary>('communityGetPackRatingSummary');
  const res = await fn(data);
  return res.data;
}

export async function callCommunitySubmitPackRating(data: {
  buyerStableId: string;
  packId: string;
  stars: number;
}): Promise<{ ok: boolean; ratingAvg: number; ratingCount: number; myStars: number }> {
  const fn = callable<typeof data, { ok: boolean; ratingAvg: number; ratingCount: number; myStars: number }>(
    'communitySubmitPackRating',
  );
  const res = await fn(data);
  return res.data;
}

export async function callCommunityFetchPackCardsIfAccessible(data: {
  stableId: string;
  packId: string;
}): Promise<{ ok: boolean; cards: unknown[] }> {
  const fn = callable<typeof data, { ok: boolean; cards: unknown[] }>('communityFetchPackCardsIfAccessible');
  const res = await fn(data);
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
