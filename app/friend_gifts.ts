import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableIdDetailed } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';
import { commitConfirmedExternalShardEvent } from './shards_system';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FUNCTIONS_REGION = 'us-central1';
const friendGiftSendInFlight = new Map<string, Promise<FriendGiftSendResponse>>();
const friendGiftSendRetryKeys = new Map<string, {
  accountScope: string;
  ambiguous: boolean;
  idempotencyKey: string;
}>();
const friendGiftThanksInFlight = new Map<string, Promise<{ ok: boolean; idempotencyKey?: string; idempotentReplay?: boolean }>>();
const friendGiftThanksRetryKeys = new Map<string, { accountScope: string; idempotencyKey: string }>();
const FRIEND_GIFT_IN_FLIGHT_MAX = 32;
const FRIEND_GIFT_PENDING_SEND_KEY_PREFIX = 'friend_gift_pending_send_v1';
const FRIEND_GIFT_PENDING_THANKS_KEY_PREFIX = 'friend_gift_pending_thanks_v1';

function accountOperationKey(token: AccountGenerationToken): string | null {
  return accountScopeKey(token);
}

function retryAccountScope(token: AccountGenerationToken): string | null {
  if (token.phase !== 'active' || !token.stableId) return null;
  return `uid:${token.stableId}`;
}

function pendingRetryCountForAccount(accountScope: string): number {
  let count = 0;
  friendGiftSendRetryKeys.forEach((entry) => {
    if (entry.accountScope === accountScope) count += 1;
  });
  return count;
}

function pendingThanksRetryCountForAccount(accountScope: string): number {
  let count = 0;
  friendGiftThanksRetryKeys.forEach((entry) => {
    if (entry.accountScope === accountScope) count += 1;
  });
  return count;
}

function isAccountOperationCurrent(token: AccountGenerationToken, expectedStableId?: string): boolean {
  return isCurrentAccountGeneration(token, expectedStableId);
}

export type FriendGiftId = 'chain_shield_1' | 'xp_boost_2x_24h';

export type FriendGiftCatalogItem = {
  id: FriendGiftId;
  costShards: number;
  icon: string;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
  descRu: string;
  descUk: string;
  descEs: string;
  descPtBr: string;
  descVi: string;
  descId: string;
  descTr: string;
  descPl: string;
};

export const FRIEND_GIFT_CATALOG: FriendGiftCatalogItem[] = [
  {
    id: 'chain_shield_1',
    costShards: 8,
    icon: 'shield-checkmark-outline',
    labelRu: 'Щит цепочки',
    labelUk: 'Щит ланцюжка',
    labelEs: 'Escudo de racha',
    labelPtBr: 'Escudo de sequência',
    labelVi: 'Khiên chuỗi ngày',
    labelId: 'Perisai rentetan',
    labelTr: 'Seri kalkanı',
    labelPl: 'Tarcza serii',
    descRu: 'Один день защиты цепочки',
    descUk: 'Один день захисту ланцюжка',
    descEs: 'Un dia de proteccion de racha',
    descPtBr: 'Um dia de proteção da sequência',
    descVi: 'Một ngày bảo vệ chuỗi',
    descId: 'Satu hari perlindungan rentetan',
    descTr: 'Bir günlük seri koruması',
    descPl: 'Jeden dzień ochrony serii',
  },
  {
    id: 'xp_boost_2x_24h',
    costShards: 30,
    icon: 'flame-outline',
    labelRu: 'x2 XP на 24 часа',
    labelUk: 'x2 XP на 24 години',
    labelEs: 'x2 XP por 24 h',
    labelPtBr: 'x2 XP por 24 h',
    labelVi: 'x2 XP trong 24 giờ',
    labelId: 'x2 XP selama 24 jam',
    labelTr: '24 saat x2 XP',
    labelPl: 'x2 XP na 24 godz.',
    descRu: 'Все занятия дают вдвое больше XP',
    descUk: 'Усі заняття дають удвічі більше XP',
    descEs: 'Todas las actividades dan el doble de XP',
    descPtBr: 'Todas as atividades dão XP em dobro',
    descVi: 'Mọi hoạt động cho gấp đôi XP',
    descId: 'Semua aktivitas memberi XP dua kali lipat',
    descTr: 'Tüm etkinlikler iki kat XP verir',
    descPl: 'Wszystkie aktywności dają podwójne XP',
  },
];

export function isFriendGiftsCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

export type FriendGiftSendResponse = {
  ok: boolean;
  giftId: FriendGiftId;
  costShards: number;
  dailyRemaining?: number;
  idempotencyKey?: string;
  idempotentReplay?: boolean;
  questStarted?: boolean;
  questBlockedReason?: 'active' | 'weekly' | null;
  quest?: {
    questId: string;
    participantUids: string[];
    status: string;
    startedAtMs: number;
    expiresAtMs: number;
    weekKey: string;
    targetXp: number;
    rewardShards: number;
    rewardXp: number;
    progressByUid?: Record<string, number>;
    remainingXpByUid?: Record<string, number>;
    rewardClaimedByUid?: Record<string, boolean>;
  } | null;
};

export type FriendGiftErrorKind =
  | 'auth'
  | 'identity_changed'
  | 'limit'
  | 'not_enough_shards'
  | 'not_friends'
  | 'user_missing'
  | 'unsupported'
  | 'network'
  | 'unknown';

export async function consumeFriendChainShield(
  occurrenceId: string,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<{ consumed: boolean; daysLeft: number; chainShield: string | null }> {
  if (!accountOperationKey(accountToken) || !isAccountOperationCurrent(accountToken)) {
    throw new Error('friend_gift_identity_changed');
  }
  const stableId = await prepareFriendGiftSender(accountToken);
  const fn = callable<
    { stableId: string; occurrenceId: string },
    { ok: boolean; consumed: boolean; daysLeft: number; chainShield: string | null }
  >('friendConsumeChainShield');
  const response = await withCallableTimeout(fn({ stableId, occurrenceId }), 'friendConsumeChainShield');
  if (!isAccountOperationCurrent(accountToken, stableId)) throw new Error('friend_gift_identity_changed');
  return response.data;
}

function errorText(error: unknown): string {
  const err = error as { code?: unknown; message?: unknown };
  return `${String(err?.code ?? '')} ${String(err?.message ?? error ?? '')}`.toLowerCase();
}

export function classifyFriendGiftError(error: unknown): FriendGiftErrorKind {
  const text = errorText(error);
  if (text.includes('friend_gift_identity_changed') || text.includes('sender_stable_id_changed')) return 'identity_changed';
  if (
    text.includes('friend_gift_auth_unavailable') ||
    text.includes('sender_unavailable') ||
    text.includes('unauthenticated') ||
    text.includes('permission-denied') ||
    text.includes('sender does not match') ||
    text.includes('stable_id')
  ) return 'auth';
  if (text.includes('resource-exhausted') || text.includes('daily gift limit') || text.includes('limit reached')) return 'limit';
  if (text.includes('not enough shards') || text.includes('insufficient shards')) return 'not_enough_shards';
  if (text.includes('users are not friends') || text.includes('friendship')) return 'not_friends';
  if (text.includes('not-found') || text.includes('user not found')) return 'user_missing';
  if (text.includes('unsupported gift') || text.includes('unsupported gift id') || text.includes('invalid gift')) return 'unsupported';
  if (
    text.includes('network') ||
    text.includes('unavailable') ||
    text.includes('deadline-exceeded') ||
    text.includes('timeout') ||
    text.includes('timed out')
  ) return 'network';
  return 'unknown';
}

function isDefinitiveFriendGiftCallableError(error: unknown): boolean {
  const kind = classifyFriendGiftError(error);
  if (kind === 'auth'
    || kind === 'identity_changed'
    || kind === 'limit'
    || kind === 'not_enough_shards'
    || kind === 'not_friends'
    || kind === 'user_missing'
    || kind === 'unsupported') return true;
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  return code.includes('invalid-argument')
    || code.includes('failed-precondition')
    || code.includes('permission-denied')
    || code.includes('unauthenticated')
    || code.includes('not-found')
    || code.includes('resource-exhausted');
}

export function makeFriendGiftIdempotencyKey(prefix = 'fg'): string {
  const now = Date.now().toString(36);
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${a}_${b}`;
}

function friendGiftSendRequestKey(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}, accountToken: AccountGenerationToken): string {
  return JSON.stringify({
    account: accountOperationKey(accountToken),
    friendStableId: data.friendStableId,
    giftId: data.giftId,
    senderDisplayName: data.senderDisplayName ?? '',
  });
}

function friendGiftSendRetryRequestKey(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}, accountScope: string): string {
  return JSON.stringify({
    account: accountScope,
    friendStableId: data.friendStableId,
    giftId: data.giftId,
    senderDisplayName: data.senderDisplayName ?? '',
  });
}

async function prepareFriendGiftSender(accountToken: AccountGenerationToken): Promise<string> {
  if (!isAccountOperationCurrent(accountToken)) {
    throw new Error('friend_gift_identity_changed');
  }
  const senderStableId = await ensureAnonUser();
  if (!senderStableId) {
    throw new Error('sender_unavailable');
  }
  if (!isAccountOperationCurrent(accountToken, senderStableId)) {
    throw new Error('friend_gift_identity_changed');
  }
  const link = await ensureStableAuthLinkForStableIdDetailed(senderStableId)
    .catch(() => null);
  if (!isAccountOperationCurrent(accountToken, senderStableId)) {
    throw new Error('friend_gift_identity_changed');
  }
  if (!link?.ok) {
    throw new Error('friend_gift_auth_unavailable');
  }
  if (link.stableUid && link.stableUid !== senderStableId) {
    throw new Error('friend_gift_identity_changed');
  }
  if (!isAccountOperationCurrent(accountToken, senderStableId)) {
    throw new Error('friend_gift_identity_changed');
  }
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  if (!isAccountOperationCurrent(accountToken, senderStableId)) {
    throw new Error('friend_gift_identity_changed');
  }
  return senderStableId;
}

export async function sendFriendGiftWithShards(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
  idempotencyKey?: string;
}): Promise<FriendGiftSendResponse> {
  if (!isFriendGiftsCloudEnabled()) {
    throw new Error('friend_gifts_unavailable');
  }
  const accountToken = captureAccountGeneration();
  if (!accountOperationKey(accountToken) || !isAccountOperationCurrent(accountToken)) {
    throw new Error('friend_gift_identity_changed');
  }
  const retryScope = retryAccountScope(accountToken);
  if (!retryScope) throw new Error('friend_gift_identity_changed');
  const key = friendGiftSendRequestKey(data, accountToken);
  const retryKey = friendGiftSendRetryRequestKey(data, retryScope);
  const existing = friendGiftSendInFlight.get(key);
  if (existing) return existing;
  if (friendGiftSendInFlight.size >= FRIEND_GIFT_IN_FLIGHT_MAX) {
    throw new Error('friend_gift_too_many_pending');
  }
  const persistedKey = `${FRIEND_GIFT_PENDING_SEND_KEY_PREFIX}::${retryKey}`;
  let authoritativeResponse: FriendGiftSendResponse | null = null;
  let idempotencyStorageReady = friendGiftSendRetryKeys.has(retryKey);
  let callableInvoked = false;

  const request = Promise.resolve().then(async () => {
    const retryEntry = friendGiftSendRetryKeys.get(retryKey);
    let idempotencyKey = retryEntry?.idempotencyKey;
    if (!idempotencyKey) {
      idempotencyKey = await AsyncStorage.getItem(persistedKey) ?? undefined;
      idempotencyStorageReady = true;
    }
    if (!isAccountOperationCurrent(accountToken, accountToken.stableId ?? undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    if (!idempotencyKey) {
      if (pendingRetryCountForAccount(retryScope) >= FRIEND_GIFT_IN_FLIGHT_MAX) {
        throw new Error('friend_gift_too_many_pending');
      }
      const requestedKey = String(data.idempotencyKey ?? '').trim();
      if (requestedKey && !/^fg_[A-Za-z0-9_:-]{8,76}$/.test(requestedKey)) {
        throw new Error('friend_gift_idempotency_invalid');
      }
      idempotencyKey = requestedKey || makeFriendGiftIdempotencyKey();
      await AsyncStorage.setItem(persistedKey, idempotencyKey);
      if (!isAccountOperationCurrent(accountToken, accountToken.stableId ?? undefined)) {
        throw new Error('friend_gift_identity_changed');
      }
      friendGiftSendRetryKeys.set(retryKey, { accountScope: retryScope, ambiguous: false, idempotencyKey });
    } else if (!retryEntry) {
      friendGiftSendRetryKeys.set(retryKey, { accountScope: retryScope, ambiguous: true, idempotencyKey });
    }
    const stableIdempotencyKey = idempotencyKey;

    const senderStableId = await prepareFriendGiftSender(accountToken);
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    const fn = callable<
      { senderStableId: string; friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string; idempotencyKey: string },
      FriendGiftSendResponse
    >('friendSendGift');
    // 30с вместо ~70с дефолта; повтор после таймаута безопасен — сервер
    // дедуплицирует по idempotencyKey.
    callableInvoked = true;
    const res = await withCallableTimeout(
      fn({
        senderStableId,
        friendStableId: data.friendStableId,
        giftId: data.giftId,
        senderDisplayName: data.senderDisplayName ?? '',
        idempotencyKey: stableIdempotencyKey,
      }),
      'friendSendGift',
    );
    // From this point the server has confirmed the person-to-person event.
    // Local projections are ancillary: they must neither mutate a newly active
    // account nor turn this committed operation into a caller-visible failure.
    // Treat the callable as an external-fact receipt only. Rebuild the public
    // shape explicitly so an older backend cannot smuggle retired wallet
    // projection fields back into client state.
    authoritativeResponse = {
      ok: res.data.ok,
      giftId: res.data.giftId,
      costShards: res.data.costShards,
      dailyRemaining: res.data.dailyRemaining,
      idempotencyKey: res.data.idempotencyKey,
      idempotentReplay: res.data.idempotentReplay,
      questStarted: res.data.questStarted,
      questBlockedReason: res.data.questBlockedReason,
      quest: res.data.quest,
    };
    if (Number.isFinite(res.data.costShards) && res.data.costShards > 0) {
      const debit = await commitConfirmedExternalShardEvent({
        source: 'friend_gift',
        eventId: stableIdempotencyKey,
        delta: -res.data.costShards,
        reason: 'friend_gift',
        grant: {
          kind: 'person_to_person_gift',
          subjectId: data.giftId,
          payload: { giftId: data.giftId, targetUid: data.friendStableId },
        },
      });
      if (debit.status !== 'applied' && debit.status !== 'already-applied') {
        throw new Error('friend_gift_debit_event_failed');
      }
    }
    if (isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      const achievements = await import('./achievements').catch(() => null);
      if (
        achievements
        && isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)
      ) {
        await achievements.checkAchievements({ type: 'gift_sent' }, accountToken).catch(() => []);
      }
    }
    friendGiftSendRetryKeys.delete(retryKey);
    await AsyncStorage.removeItem(persistedKey).catch(() => {});
    return authoritativeResponse;
  }).catch(async (error) => {
    if (authoritativeResponse) {
      // The callable response is the commit boundary. A stale generation or a
      // failed local projection must not make callers retry an already charged
      // send. Surface the receipt and retire its durable retry key instead.
      friendGiftSendRetryKeys.delete(retryKey);
      await AsyncStorage.removeItem(persistedKey).catch(() => {});
      return authoritativeResponse;
    }
    const errorKind = classifyFriendGiftError(error);
    const retryEntry = friendGiftSendRetryKeys.get(retryKey);
    const ambiguousCallableOutcome = callableInvoked && (errorKind === 'network' || errorKind === 'unknown');
    if (ambiguousCallableOutcome && retryEntry) retryEntry.ambiguous = true;
    const preserveAmbiguousKey = ambiguousCallableOutcome || (!callableInvoked && retryEntry?.ambiguous === true);
    if (idempotencyStorageReady && !preserveAmbiguousKey) {
      friendGiftSendRetryKeys.delete(retryKey);
      await AsyncStorage.removeItem(persistedKey).catch(() => {});
    }
    throw error;
  }).finally(() => {
    friendGiftSendInFlight.delete(key);
  });

  friendGiftSendInFlight.set(key, request);
  return request;
}

function friendGiftThanksRequestKey(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}, accountToken: AccountGenerationToken): string {
  return JSON.stringify({
    account: accountOperationKey(accountToken),
    friendStableId: data.friendStableId,
    giftId: data.giftId,
    senderDisplayName: data.senderDisplayName ?? '',
  });
}

function friendGiftThanksRetryRequestKey(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}, accountScope: string): string {
  return JSON.stringify({
    account: accountScope,
    friendStableId: data.friendStableId,
    giftId: data.giftId,
    senderDisplayName: data.senderDisplayName ?? '',
  });
}

export async function sendFriendGiftThanks(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}): Promise<{ ok: boolean; idempotencyKey?: string; idempotentReplay?: boolean }> {
  if (!isFriendGiftsCloudEnabled()) {
    throw new Error('friend_gifts_unavailable');
  }
  const accountToken = captureAccountGeneration();
  if (!accountOperationKey(accountToken) || !isAccountOperationCurrent(accountToken)) {
    throw new Error('friend_gift_identity_changed');
  }
  const retryScope = retryAccountScope(accountToken);
  if (!retryScope) throw new Error('friend_gift_identity_changed');
  const key = friendGiftThanksRequestKey(data, accountToken);
  const retryKey = friendGiftThanksRetryRequestKey(data, retryScope);
  const existing = friendGiftThanksInFlight.get(key);
  if (existing) return existing;
  if (friendGiftThanksInFlight.size >= FRIEND_GIFT_IN_FLIGHT_MAX) {
    throw new Error('friend_gift_too_many_pending');
  }

  const persistedKey = `${FRIEND_GIFT_PENDING_THANKS_KEY_PREFIX}::${retryKey}`;
  let idempotencyStorageReady = friendGiftThanksRetryKeys.has(retryKey);
  let callableInvoked = false;
  const request = (async () => {
    const retryEntry = friendGiftThanksRetryKeys.get(retryKey);
    let idempotencyKey = retryEntry?.idempotencyKey;
    if (!idempotencyKey) {
      idempotencyKey = await AsyncStorage.getItem(persistedKey) ?? undefined;
      idempotencyStorageReady = true;
    }
    if (!isAccountOperationCurrent(accountToken, accountToken.stableId ?? undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    if (!idempotencyKey) {
      if (pendingThanksRetryCountForAccount(retryScope) >= FRIEND_GIFT_IN_FLIGHT_MAX) {
        throw new Error('friend_gift_too_many_pending');
      }
      idempotencyKey = makeFriendGiftIdempotencyKey('fgt');
      await AsyncStorage.setItem(persistedKey, idempotencyKey);
      idempotencyStorageReady = true;
      if (!isAccountOperationCurrent(accountToken, accountToken.stableId ?? undefined)) {
        throw new Error('friend_gift_identity_changed');
      }
      friendGiftThanksRetryKeys.set(retryKey, { accountScope: retryScope, idempotencyKey });
    } else if (!retryEntry) {
      friendGiftThanksRetryKeys.set(retryKey, { accountScope: retryScope, idempotencyKey });
    }
    const senderStableId = await prepareFriendGiftSender(accountToken);
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    const fn = callable<
      { senderStableId: string; friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string; idempotencyKey: string },
      { ok: boolean; idempotencyKey?: string; idempotentReplay?: boolean }
    >('friendThankGift');
    callableInvoked = true;
    const res = await withCallableTimeout(
      fn({
        senderStableId,
        friendStableId: data.friendStableId,
        giftId: data.giftId,
        senderDisplayName: data.senderDisplayName ?? '',
        idempotencyKey,
      }),
      'friendThankGift',
    );
    friendGiftThanksRetryKeys.delete(retryKey);
    await AsyncStorage.removeItem(persistedKey).catch(() => {});
    return res.data;
  })().catch(async (error) => {
    const preserveAmbiguousKey = callableInvoked && !isDefinitiveFriendGiftCallableError(error);
    if (idempotencyStorageReady && !preserveAmbiguousKey) {
      friendGiftThanksRetryKeys.delete(retryKey);
      await AsyncStorage.removeItem(persistedKey).catch(() => {});
    }
    throw error;
  }).finally(() => {
    friendGiftThanksInFlight.delete(key);
  });

  friendGiftThanksInFlight.set(key, request);
  return request;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
