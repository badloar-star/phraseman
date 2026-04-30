import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { addShardsRaw, loadShardsFromCloud } from './shards_system';
import { addArenaPlaysBonusForToday } from './arena_daily_limit';
import { grantClubGiftFreeBoostFromLevel } from './club_boosts';
import { primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from './flashcards/marketplace';
import { setRandomPackGiftTrial48h } from './flashcards/pack_trial_gift';
import { WAGER_DISCOUNT_KEY } from './level_gift_system';

const COLLECTION = 'global_broadcast_modals';

export interface GlobalBroadcastModalPayload {
  id: string;
  rewardType: GlobalBroadcastRewardType;
  rewardAmount: number;
  titleRu: string;
  titleUk: string;
  /** Испанский заголовок; при отсутствии в данных подставляется titleRu */
  titleEs: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
  createdAt: string;
}

export type GlobalBroadcastRewardType =
  | 'none'
  | 'shards'
  | 'xp_boost_2x_24h'
  | 'xp_boost_2x_48h'
  | 'chain_shield_1'
  | 'chain_shield_3'
  | 'club_boost_free'
  | 'arena_extra_5'
  | 'wager_discount_25'
  | 'pack_trial_48h';

function dismissKey(id: string): string {
  return `global_broadcast_modal_dismissed_${id}`;
}

function toSafePositiveInt(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function normalizeRewardType(value: unknown): GlobalBroadcastRewardType {
  const raw = String(value ?? '').trim() as GlobalBroadcastRewardType;
  const allowed: GlobalBroadcastRewardType[] = [
    'none',
    'shards',
    'xp_boost_2x_24h',
    'xp_boost_2x_48h',
    'chain_shield_1',
    'chain_shield_3',
    'club_boost_free',
    'arena_extra_5',
    'wager_discount_25',
    'pack_trial_48h',
  ];
  return allowed.includes(raw) ? raw : 'none';
}

function normalizePayload(id: string, data: Record<string, unknown>): GlobalBroadcastModalPayload {
  const titleRu = String(data.titleRu ?? '').trim() || 'Сообщение от команды';
  const titleUk = String(data.titleUk ?? '').trim() || titleRu;
  const titleEs = String(data.titleEs ?? '').trim() || titleRu;
  const messageRu = String(data.messageRu ?? '').trim() || 'Спасибо, что вы с нами.';
  const messageUk = String(data.messageUk ?? '').trim() || messageRu;
  const messageEs = String(data.messageEs ?? '').trim() || messageRu;
  const rewardType = normalizeRewardType(data.rewardType);
  const legacyShards = toSafePositiveInt(data.shards, 0);
  const rewardAmount = toSafePositiveInt(data.rewardAmount, legacyShards);
  const resolvedRewardType: GlobalBroadcastRewardType = rewardType === 'none' && rewardAmount > 0 ? 'shards' : rewardType;
  return {
    id,
    rewardType: resolvedRewardType,
    rewardAmount,
    titleRu,
    titleUk,
    titleEs,
    messageRu,
    messageUk,
    messageEs,
    createdAt: String(data.createdAt ?? ''),
  };
}

export function getGlobalBroadcastRewardBadge(payload: GlobalBroadcastModalPayload): { icon: string; labelRu: string; labelUk: string; labelEs: string } | null {
  const amount = toSafePositiveInt(payload.rewardAmount, 0);
  switch (payload.rewardType) {
    case 'none':
      return null;
    case 'shards':
      return {
        icon: '💎',
        labelRu: `+${amount} осколков знаний`,
        labelUk: `+${amount} осколків знань`,
        labelEs:
          amount === 1
            ? '+1 fragmento'
            : `+${amount} fragmentos`,
      };
    case 'xp_boost_2x_24h':
      return { icon: '🔥', labelRu: 'x2 XP на 24 часа', labelUk: 'x2 XP на 24 години', labelEs: 'x2 XP durante 24 horas' };
    case 'xp_boost_2x_48h':
      return { icon: '🚀', labelRu: 'x2 XP на 48 часов', labelUk: 'x2 XP на 48 годин', labelEs: 'x2 XP durante 48 horas' };
    case 'chain_shield_1':
      return { icon: '🛡️', labelRu: 'Щит стрика на 1 день', labelUk: 'Щит стріку на 1 день', labelEs: 'Escudo de racha: 1 día' };
    case 'chain_shield_3':
      return { icon: '🛡️', labelRu: 'Щит стрика на 3 дня', labelUk: 'Щит стріку на 3 дні', labelEs: 'Escudo de racha: 3 días' };
    case 'club_boost_free':
      return { icon: '👥', labelRu: 'Бесплатный клубный буст', labelUk: 'Безкоштовний клубний буст', labelEs: 'Impulso de club gratuito' };
    case 'arena_extra_5':
      return { icon: '🎟️', labelRu: '+5 рейтинг-игр сегодня', labelUk: '+5 рейтинг-ігор сьогодні', labelEs: '+5 partidas extra en la Arena hoy' };
    case 'wager_discount_25':
      return { icon: '🎲', labelRu: 'Скидка на пари 25%', labelUk: 'Знижка на парі 25%', labelEs: '25 % de descuento en apuestas' };
    case 'pack_trial_48h':
      return { icon: '📦', labelRu: 'Пробный набор на 48 часов', labelUk: 'Пробний набір на 48 годин', labelEs: 'Paquete de prueba de 48 horas' };
    default:
      return null;
  }
}

async function applyBroadcastReward(payload: GlobalBroadcastModalPayload): Promise<void> {
  const amount = toSafePositiveInt(payload.rewardAmount, 0);
  const today = new Date().toISOString().split('T')[0];
  switch (payload.rewardType) {
    case 'none':
      return;
    case 'shards':
      if (amount > 0) {
        await addShardsRaw(amount, 'global_broadcast_modal');
        await loadShardsFromCloud().catch(() => {});
      }
      return;
    case 'xp_boost_2x_24h':
    case 'xp_boost_2x_48h': {
      const hours = payload.rewardType === 'xp_boost_2x_24h' ? 24 : 48;
      await AsyncStorage.setItem('gift_xp_multiplier', JSON.stringify({ multiplier: 2, expiresAt: Date.now() + hours * 3600 * 1000 }));
      return;
    }
    case 'chain_shield_1':
    case 'chain_shield_3': {
      const days = payload.rewardType === 'chain_shield_1' ? 1 : 3;
      const raw = await AsyncStorage.getItem('chain_shield');
      const ex = raw ? (JSON.parse(raw) as { daysLeft?: number }) : null;
      const daysLeft = (typeof ex?.daysLeft === 'number' ? ex.daysLeft : 0) + days;
      await AsyncStorage.setItem('chain_shield', JSON.stringify({ daysLeft, grantedAt: today }));
      return;
    }
    case 'club_boost_free':
      await grantClubGiftFreeBoostFromLevel();
      return;
    case 'arena_extra_5':
      await addArenaPlaysBonusForToday(5);
      return;
    case 'wager_discount_25':
      await AsyncStorage.setItem(WAGER_DISCOUNT_KEY, '0.25');
      return;
    case 'pack_trial_48h':
      await setRandomPackGiftTrial48h();
      await primeMarketplaceBuiltCardsCacheFromAccessibleStorage();
      return;
  }
}

function pickLatest(activeDocs: Array<{ id: string; data: Record<string, unknown> }>): GlobalBroadcastModalPayload | null {
  if (!activeDocs.length) return null;
  const sorted = [...activeDocs].sort((a, b) => {
    const aTs = Date.parse(String(a.data.createdAt ?? ''));
    const bTs = Date.parse(String(b.data.createdAt ?? ''));
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  const top = sorted[0];
  return normalizePayload(top.id, top.data);
}

export async function fetchPendingGlobalBroadcastModal(): Promise<GlobalBroadcastModalPayload | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  const uid = await getCanonicalUserId().catch(() => null);
  if (!uid) return null;

  try {
    const firestoreModule = await import('@react-native-firebase/firestore');
    const db = firestoreModule.default();
    const activeSnap = await db.collection(COLLECTION).where('active', '==', true).limit(20).get();
    if (activeSnap.empty) return null;

    const activeDocs = activeSnap.docs.map((d: any) => ({
      id: d.id,
      data: d.data() ?? {},
    }));
    const payload = pickLatest(activeDocs);
    if (!payload) return null;

    const dismissed = await AsyncStorage.getItem(dismissKey(payload.id));
    if (dismissed === '1') return null;

    const claimId = `global_broadcast_${payload.id}`;
    const claimSnap = await db.collection('users').doc(uid).collection('reward_claims').doc(claimId).get();
    if (claimSnap.exists) {
      await AsyncStorage.setItem(dismissKey(payload.id), '1').catch(() => {});
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function claimAndDismissGlobalBroadcastModal(payload: GlobalBroadcastModalPayload): Promise<void> {
  if (!payload?.id) return;
  await AsyncStorage.setItem(dismissKey(payload.id), '1').catch(() => {});

  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  const uid = await getCanonicalUserId().catch(() => null);
  if (!uid) return;

  // Always try local reward application first (works for offline-safe gifts too).
  await applyBroadcastReward(payload).catch(() => {});

  try {
    const firestoreModule = await import('@react-native-firebase/firestore');
    const db = firestoreModule.default();
    const claimRef = db.collection('users').doc(uid).collection('reward_claims').doc(`global_broadcast_${payload.id}`);
    const nowIso = new Date().toISOString();

    await db.runTransaction(async (tx: any) => {
      const claimSnap = await tx.get(claimRef);
      if (claimSnap.exists) return;
      tx.set(claimRef, {
        source: 'global_broadcast_modal',
        broadcastId: payload.id,
        rewardType: payload.rewardType,
        rewardAmount: payload.rewardAmount,
        createdAt: nowIso,
      });
    });
  } catch {
    // Best-effort: modal stays one-time even if network failed.
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
