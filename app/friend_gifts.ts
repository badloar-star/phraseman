import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { bumpLifetimeShardsSpent } from './lifetime_profile_stats';
import { replaceShardsBalanceLocal } from './shards_system';

const FUNCTIONS_REGION = 'us-central1';

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
  dailyRemaining?: number;
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

export async function sendFriendGiftWithShards(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}): Promise<FriendGiftSendResponse> {
  if (!isFriendGiftsCloudEnabled()) {
    throw new Error('friend_gifts_unavailable');
  }
  const senderStableId = await ensureAnonUser();
  if (!senderStableId) {
    throw new Error('sender_unavailable');
  }
  await ensureStableAuthLinkForStableId(senderStableId).catch(() => false);
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

export async function sendFriendGiftThanks(data: {
  friendStableId: string;
  giftId: FriendGiftId;
  senderDisplayName?: string;
}): Promise<{ ok: boolean }> {
  if (!isFriendGiftsCloudEnabled()) {
    throw new Error('friend_gifts_unavailable');
  }
  const senderStableId = await ensureAnonUser();
  if (!senderStableId) {
    throw new Error('sender_unavailable');
  }
  await ensureStableAuthLinkForStableId(senderStableId).catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<
    { senderStableId: string; friendStableId: string; giftId: FriendGiftId; senderDisplayName?: string },
    { ok: boolean }
  >('friendThankGift');
  const res = await fn({
    senderStableId,
    friendStableId: data.friendStableId,
    giftId: data.giftId,
    senderDisplayName: data.senderDisplayName ?? '',
  });
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
