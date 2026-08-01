import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableIdDetailed } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';
import { bumpLifetimeShardsSpent } from './lifetime_profile_stats';
import {
  replaceShardsBalanceForAccountGeneration,
  replaceShardsBalanceLocal,
} from './shards_system';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';

const FUNCTIONS_REGION = 'us-central1';
const friendGiftSendInFlight = new Map<string, Promise<FriendGiftSendResponse>>();
const friendGiftThanksInFlight = new Map<string, Promise<{ ok: boolean; idempotencyKey?: string; idempotentReplay?: boolean }>>();
const FRIEND_GIFT_IN_FLIGHT_MAX = 32;

function accountOperationKey(token: AccountGenerationToken): string | null {
  return accountScopeKey(token);
}

function isAccountOperationCurrent(token: AccountGenerationToken, expectedStableId?: string): boolean {
  return isCurrentAccountGeneration(token, expectedStableId);
}

export type FriendGiftId = 'arena_extra_5' | 'chain_shield_1' | 'xp_boost_2x_24h';

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
    id: 'arena_extra_5',
    costShards: 5,
    icon: 'ticket-outline',
    labelRu: '+5 рейтинг-игр',
    labelUk: '+5 рейтинг-ігор',
    labelEs: '+5 partidas Arena',
    labelPtBr: '+5 partidas ranqueadas',
    labelVi: '+5 trận xếp hạng',
    labelId: '+5 game peringkat',
    labelTr: '+5 sıralama oyunu',
    labelPl: '+5 gier rankingowych',
    descRu: 'Дополнительные рейтинговые матчи сегодня',
    descUk: 'Додаткові рейтингові матчі сьогодні',
    descEs: 'Partidas clasificadas extra para hoy',
    descPtBr: 'Partidas ranqueadas extras para hoje',
    descVi: 'Thêm lượt chơi xếp hạng cho hôm nay',
    descId: 'Pertandingan peringkat ekstra untuk hari ini',
    descTr: 'Bugün için ek sıralama maçları',
    descPl: 'Dodatkowe mecze rankingowe na dziś',
  },
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
  senderBalanceAfter: number;
  shardsUpdatedAtMs?: number;
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

function makeFriendGiftIdempotencyKey(prefix = 'fg'): string {
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
}): Promise<FriendGiftSendResponse> {
  if (!isFriendGiftsCloudEnabled()) {
    throw new Error('friend_gifts_unavailable');
  }
  const accountToken = captureAccountGeneration();
  if (!accountOperationKey(accountToken) || !isAccountOperationCurrent(accountToken)) {
    throw new Error('friend_gift_identity_changed');
  }
  const key = friendGiftSendRequestKey(data, accountToken);
  const existing = friendGiftSendInFlight.get(key);
  if (existing) return existing;
  if (friendGiftSendInFlight.size >= FRIEND_GIFT_IN_FLIGHT_MAX) {
    throw new Error('friend_gift_too_many_pending');
  }

  const request = (async () => {
    const senderStableId = await prepareFriendGiftSender(accountToken);
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    const idempotencyKey = makeFriendGiftIdempotencyKey();
    const fn = callable<
      { senderStableId: string; friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string; idempotencyKey: string },
      FriendGiftSendResponse
    >('friendSendGift');
    // 30с вместо ~70с дефолта; повтор после таймаута безопасен — сервер
    // дедуплицирует по idempotencyKey.
    const res = await withCallableTimeout(
      fn({
        senderStableId,
        friendStableId: data.friendStableId,
        giftId: data.giftId,
        senderDisplayName: data.senderDisplayName ?? '',
        idempotencyKey,
      }),
      'friendSendGift',
    );
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    if (Number.isFinite(res.data.senderBalanceAfter)) {
      const options = {
        updatedAtMs: res.data.shardsUpdatedAtMs,
        op: 'spend' as const,
        reason: 'friend_gift',
      };
      if (accountToken.phase === 'active' && accountToken.stableId) {
        await replaceShardsBalanceForAccountGeneration(
          res.data.senderBalanceAfter,
          accountToken,
          senderStableId,
          options,
        );
      } else {
        await replaceShardsBalanceLocal(res.data.senderBalanceAfter, options);
      }
    }
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    if (Number.isFinite(res.data.costShards) && res.data.costShards > 0) {
      // The server gift is already authoritative at this point. Local counters are
      // ancillary and must never turn that success into a UI rollback.
      await bumpLifetimeShardsSpent(res.data.costShards, accountToken).catch(() => {});
    }
    const { checkAchievements } = await import('./achievements');
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    await checkAchievements({ type: 'gift_sent' }, accountToken).catch(() => []);
    if (!isAccountOperationCurrent(accountToken, senderStableId)) {
      throw new Error('friend_gift_identity_changed');
    }
    return res.data;
  })().finally(() => {
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
  const key = friendGiftThanksRequestKey(data, accountToken);
  const existing = friendGiftThanksInFlight.get(key);
  if (existing) return existing;
  if (friendGiftThanksInFlight.size >= FRIEND_GIFT_IN_FLIGHT_MAX) {
    throw new Error('friend_gift_too_many_pending');
  }

  const request = (async () => {
    const senderStableId = await prepareFriendGiftSender(accountToken);
    if (!isAccountOperationCurrent(accountToken, accountToken.phase === 'active' ? senderStableId : undefined)) {
      throw new Error('friend_gift_identity_changed');
    }
    const idempotencyKey = makeFriendGiftIdempotencyKey('fgt');
    const fn = callable<
      { senderStableId: string; friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string; idempotencyKey: string },
      { ok: boolean; idempotencyKey?: string; idempotentReplay?: boolean }
    >('friendThankGift');
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
    if (!isAccountOperationCurrent(accountToken, senderStableId)) {
      throw new Error('friend_gift_identity_changed');
    }
    return res.data;
  })().finally(() => {
    friendGiftThanksInFlight.delete(key);
  });

  friendGiftThanksInFlight.set(key, request);
  return request;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
