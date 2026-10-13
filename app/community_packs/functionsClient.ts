import { getApp } from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    // пака могла молча падать. Пишем в локальный журнал + support-бандл.
    // Единственное «денежное» имя (погашение подарочного набора) удалено по D140.
    DebugLogger.error(
      `community:${name}`,
      error instanceof Error ? error : new Error(String(error)),
      'warning',
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
  // зачем (смета Firebase п.8): после отправки набора ящик модерации снова проверяется на следующем старте — кэш «пусто» (6 ч,
  // communityModerationAlerts.ts) не должен задержать результат модерации свежего набора.
  void AsyncStorage.removeItem('community_seller_inbox_empty_v1').catch((error: unknown) => {
    console.warn('[MOD-ALERT] empty_cache reset after submit failed:', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
  });
  return result;
}

export async function callCommunityAuthorRemovePack(data: {
  authorStableId: string;
  packId: string;
  submissionKey?: string;
}): Promise<{ ok: boolean }> {
  return callFunction<typeof data, { ok: boolean }>('communityAuthorRemovePack', data);
}

export type CommunityAuthorRemoveCardResult =
  | { ok: true; status: 'removed' | 'not_found_already_removed'; cardCount: number }
  | {
    ok: false;
    reason: 'pack_not_found' | 'not_author' | 'pack_removed' | 'update_pending' | 'not_published' | 'card_count';
    cardCount?: number;
  };

/** Удаление одной карточки из своего опубликованного набора (автор определяется сервером по входу). */
export async function callCommunityAuthorRemoveCard(data: {
  packId: string;
  cardId: string;
}): Promise<CommunityAuthorRemoveCardResult> {
  return callFunction<typeof data, CommunityAuthorRemoveCardResult>('communityAuthorRemoveCard', data);
}

// зачем: D140 (владелец 2026-10-01) — клиентские вызовы подарочных наборов
// (flashcardPackGiftRedeem, flashcardPackGiftSyncState, flashcardPackGiftGrantGlobalBroadcast,
// communityRedeemPackGiftVoucher) удалены вместе с серверными функциями.

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
