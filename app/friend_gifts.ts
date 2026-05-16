import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { bumpLifetimeShardsSpent } from './lifetime_profile_stats';
import { replaceShardsBalanceLocal } from './shards_system';
import { getCanonicalUserId } from './user_id_policy';

const FUNCTIONS_REGION = 'us-central1';

export type FriendGiftId = 'arena_extra_5' | 'chain_shield_1' | 'xp_boost_2x_24h';

export type FriendGiftCatalogItem = {
  id: FriendGiftId;
  costShards: number;
  icon: string;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  descRu: string;
  descUk: string;
  descEs: string;
};

export const FRIEND_GIFT_CATALOG: FriendGiftCatalogItem[] = [
  {
    id: 'arena_extra_5',
    costShards: 5,
    icon: 'ticket-outline',
    labelRu: '+5 рейтинг-игр',
    labelUk: '+5 рейтинг-ігор',
    labelEs: '+5 partidas Arena',
    descRu: 'Дополнительные рейтинговые матчи сегодня',
    descUk: 'Додаткові рейтингові матчі сьогодні',
    descEs: 'Partidas clasificadas extra para hoy',
  },
  {
    id: 'chain_shield_1',
    costShards: 8,
    icon: 'shield-checkmark-outline',
    labelRu: 'Щит цепочки',
    labelUk: 'Щит ланцюжка',
    labelEs: 'Escudo de racha',
    descRu: 'Один день защиты цепочки',
    descUk: 'Один день захисту ланцюжка',
    descEs: 'Un dia de proteccion de racha',
  },
  {
    id: 'xp_boost_2x_24h',
    costShards: 30,
    icon: 'flame-outline',
    labelRu: 'x2 XP на 24 часа',
    labelUk: 'x2 XP на 24 години',
    labelEs: 'x2 XP por 24 h',
    descRu: 'Все занятия дают вдвое больше XP',
    descUk: 'Усі заняття дають удвічі більше XP',
    descEs: 'Todas las actividades dan el doble de XP',
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
  dailyRemaining?: number;
};

export async function sendFriendGiftWithShards(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}): Promise<FriendGiftSendResponse> {
  if (!isFriendGiftsCloudEnabled()) {
    throw new Error('friend_gifts_unavailable');
  }
  const senderStableId = await getCanonicalUserId();
  if (!senderStableId) {
    throw new Error('sender_unavailable');
  }
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<
    { senderStableId: string; friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string },
    FriendGiftSendResponse
  >('friendSendGift');
  const res = await fn({
    senderStableId,
    friendStableId: data.friendStableId,
    giftId: data.giftId,
    senderDisplayName: data.senderDisplayName ?? '',
  });
  if (Number.isFinite(res.data.senderBalanceAfter)) {
    await replaceShardsBalanceLocal(res.data.senderBalanceAfter);
  }
  if (Number.isFinite(res.data.costShards) && res.data.costShards > 0) {
    void bumpLifetimeShardsSpent(res.data.costShards);
  }
  const { checkAchievements } = await import('./achievements');
  void checkAchievements({ type: 'gift_sent' });
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
