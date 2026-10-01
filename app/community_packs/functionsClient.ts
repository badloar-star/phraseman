import { getApp } from '@react-native-firebase/app';
import { DebugLogger } from '../debug-logger';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type { LevelSpinStarCreditExactResult } from '../../modules/phone-state/domains/economy';
// зачем (2026-09-20): здесь было жёстко зашито `'en' | 'fr'` в десяти подписях —
// тип отстал от реального набора языков (добавились es и de), и любой вызов
// с испанским не компилировался и ронял тестовые сюиты. Берём канонический
// список из learning_language_contour, чтобы он больше не расходился.
import type { LearningLanguageTarget } from '../learning_language_contour';

/** Callable v2 задеплоєні в us-central1 (як у admin getFunctions(..., 'us-central1')). */
const FUNCTIONS_REGION = 'us-central1';
const communityGiftRedeemInFlight = new Map<string, Promise<CommunityGiftRedeemResponse>>();

export function isCommunityPacksCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  const fn = callable<TReq, TRes>(name);
  try {
    const res = await fn(data);
    return res.data;
  } catch (error) {
    // зачем (аудит 2026-08-29): сообщество не писало отказы никуда — покупка
    // пака могла молча падать. Денежные имена — critical (доезжают до
    // app_errors), остальное — warning (локальный журнал + support-бандл).
    const irreversible = name === 'communityRedeemPackGiftVoucher';
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
  submissionKey?: string;
  replacePending?: boolean;
}): Promise<{ submissionId: string }> {
  const result = await callFunction<typeof data, { submissionId: string }>('communitySubmitPackForReview', data);
  return result;
}

export async function callCommunityAuthorRemovePack(data: {
  authorStableId: string;
  packId: string;
  submissionKey?: string;
}): Promise<{ ok: boolean }> {
  return callFunction<typeof data, { ok: boolean }>('communityAuthorRemovePack', data);
}

export type CommunityGiftRedeemResponse = {
  alreadyOwned?: boolean;
  gifted?: boolean;
  replayed?: boolean;
  studyTarget?: LearningLanguageTarget;
};

export type FlashcardPackGiftRedeemResponse = CommunityGiftRedeemResponse & {
  packId?: string;
  packType?: 'official' | 'community';
};

export async function callFlashcardPackGiftRedeem(data: {
  buyerStableId: string;
  packId: string;
  packType: 'official' | 'community';
  studyTarget?: LearningLanguageTarget;
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

/** Q-COIN (b): ответ разовой серверной сверки кошелька (functions/src/coin_reconcile_v1.ts). */
export type CoinReconcileV1Response = Readonly<{
  status: 'raised' | 'nothing_to_raise' | 'replayed';
  raisedBy: number;
  operationIds: readonly string[];
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

export async function callCoinReconcileV1(data: {
  ownerStableId: string;
  /** Только для лога сервера: основанием для подъёма НЕ является. */
  clientVisibleBalance: number;
}): Promise<CoinReconcileV1Response> {
  return callFunction<typeof data, CoinReconcileV1Response>('coinReconcileV1', data);
}

export async function callCommunityRedeemPackGiftVoucher(data: {
  buyerStableId: string;
  packId: string;
  studyTarget?: LearningLanguageTarget;
}): Promise<CommunityGiftRedeemResponse> {
  return callFlashcardPackGiftRedeem({ ...data, packType: 'community' });
}

export type CommunitySellerInboxEvent = {
  id: string;
  type?: string;
  seen?: boolean;
  createdAt?: number;
  result?: string;
  message?: string | null;
  submissionId?: string;
  submissionKey?: string | null;
  studyTarget?: LearningLanguageTarget;
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
  studyTarget?: LearningLanguageTarget;
}): Promise<{ ok: boolean; cards: unknown[] }> {
  return callFunction<typeof data, { ok: boolean; cards: unknown[] }>('communityFetchPackCardsIfAccessible', data);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
