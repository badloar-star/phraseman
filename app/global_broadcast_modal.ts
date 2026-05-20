import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { addShardsRaw, loadShardsFromCloud } from './shards_system';
import { addArenaPlaysBonusForToday } from './arena_daily_limit';
import { grantClubGiftFreeBoostFromLevel } from './club_boosts';
import { primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from './flashcards/marketplace';
import { setRandomPackGiftTrial48h } from './flashcards/pack_trial_gift';
import { WAGER_DISCOUNT_KEY } from './level_gift_system';

const COLLECTION = 'global_broadcast_modals';

export type GlobalBroadcastKind = 'general' | 'review_promo';
export type GlobalBroadcastPremiumAudience = 'all' | 'free' | 'premium';

export interface GlobalBroadcastModalPayload {
  id: string;
  kind: GlobalBroadcastKind;
  premiumAudience: GlobalBroadcastPremiumAudience;
  rewardType: GlobalBroadcastRewardType;
  rewardAmount: number;
  premiumRewardDays: number;
  titleRu: string;
  titleUk: string;
  /** Испанский заголовок; при отсутствии в данных подставляется titleRu */
  titleEs: string;
  titlePtBr: string;
  titleVi: string;
  titleId: string;
  titleTr: string;
  titlePl: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
  messagePtBr: string;
  messageVi: string;
  messageId: string;
  messageTr: string;
  messagePl: string;
  reviewUrlIos: string;
  reviewUrlAndroid: string;
  reviewCtaRu: string;
  reviewCtaUk: string;
  reviewCtaEs: string;
  reviewCtaPtBr: string;
  reviewCtaVi: string;
  reviewCtaId: string;
  reviewCtaTr: string;
  reviewCtaPl: string;
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

function normalizeKind(value: unknown): GlobalBroadcastKind {
  return String(value ?? '').trim() === 'review_promo' ? 'review_promo' : 'general';
}

function normalizePremiumAudience(value: unknown): GlobalBroadcastPremiumAudience {
  const raw = String(value ?? '').trim();
  return raw === 'free' || raw === 'premium' ? raw : 'all';
}

function normalizePayload(id: string, data: Record<string, unknown>): GlobalBroadcastModalPayload {
  const titleRu = String(data.titleRu ?? '').trim() || 'Сообщение от команды';
  const titleUk = String(data.titleUk ?? '').trim() || titleRu;
  const titleEs = String(data.titleEs ?? '').trim() || titleRu;
  const titlePtBr = String(data.titlePtBr ?? '').trim() || 'Mensagem da equipe';
  const titleVi = String(data.titleVi ?? '').trim() || 'Thông báo từ đội ngũ';
  const titleId = String(data.titleId ?? '').trim() || 'Pesan dari tim';
  const titleTr = String(data.titleTr ?? '').trim() || 'Ekipten mesaj';
  const titlePl = String(data.titlePl ?? '').trim() || 'Wiadomość od zespołu';
  const messageRu = String(data.messageRu ?? '').trim() || 'Спасибо, что вы с нами.';
  const messageUk = String(data.messageUk ?? '').trim() || messageRu;
  const messageEs = String(data.messageEs ?? '').trim() || messageRu;
  const messagePtBr = String(data.messagePtBr ?? '').trim() || 'Obrigado por estar conosco.';
  const messageVi = String(data.messageVi ?? '').trim() || 'Cảm ơn bạn đã đồng hành cùng chúng tôi.';
  const messageId = String(data.messageId ?? '').trim() || 'Terima kasih sudah bersama kami.';
  const messageTr = String(data.messageTr ?? '').trim() || 'Bizimle olduğun için teşekkürler.';
  const messagePl = String(data.messagePl ?? '').trim() || 'Dziękujemy, że jesteś z nami.';
  const rewardType = normalizeRewardType(data.rewardType);
  const legacyShards = toSafePositiveInt(data.shards, 0);
  const rewardAmount = toSafePositiveInt(data.rewardAmount, legacyShards);
  const resolvedRewardType: GlobalBroadcastRewardType = rewardType === 'none' && rewardAmount > 0 ? 'shards' : rewardType;
  const kind = normalizeKind(data.kind);
  return {
    id,
    kind,
    premiumAudience: normalizePremiumAudience(data.premiumAudience ?? (data.audience as any)?.premium),
    rewardType: resolvedRewardType,
    rewardAmount,
    premiumRewardDays: toSafePositiveInt(data.premiumRewardDays, 90),
    titleRu,
    titleUk,
    titleEs,
    titlePtBr,
    titleVi,
    titleId,
    titleTr,
    titlePl,
    messageRu,
    messageUk,
    messageEs,
    messagePtBr,
    messageVi,
    messageId,
    messageTr,
    messagePl,
    reviewUrlIos: String(data.reviewUrlIos ?? '').trim(),
    reviewUrlAndroid: String(data.reviewUrlAndroid ?? '').trim(),
    reviewCtaRu: String(data.reviewCtaRu ?? '').trim() || 'Оценить приложение',
    reviewCtaUk: String(data.reviewCtaUk ?? '').trim() || 'Оцінити застосунок',
    reviewCtaEs: String(data.reviewCtaEs ?? '').trim() || 'Valorar la app',
    reviewCtaPtBr: String(data.reviewCtaPtBr ?? '').trim() || 'Avaliar o app',
    reviewCtaVi: String(data.reviewCtaVi ?? '').trim() || 'Đánh giá ứng dụng',
    reviewCtaId: String(data.reviewCtaId ?? '').trim() || 'Nilai aplikasi',
    reviewCtaTr: String(data.reviewCtaTr ?? '').trim() || 'Uygulamayı değerlendir',
    reviewCtaPl: String(data.reviewCtaPl ?? '').trim() || 'Oceń aplikację',
    createdAt: String(data.createdAt ?? ''),
  };
}

export function getGlobalBroadcastRewardBadge(payload: GlobalBroadcastModalPayload): {
  icon: string;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
} | null {
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
        labelPtBr: amount === 1 ? '+1 fragmento' : `+${amount} fragmentos`,
        labelVi: `+${amount} mảnh`,
        labelId: `+${amount} shard`,
        labelTr: `+${amount} parça`,
        labelPl: `+${amount} odłamków`,
      };
    case 'xp_boost_2x_24h':
      return {
        icon: '🔥',
        labelRu: 'x2 XP на 24 часа',
        labelUk: 'x2 XP на 24 години',
        labelEs: 'x2 XP durante 24 horas',
        labelPtBr: 'x2 XP por 24 horas',
        labelVi: 'x2 XP trong 24 giờ',
        labelId: 'x2 XP selama 24 jam',
        labelTr: '24 saat x2 XP',
        labelPl: 'x2 XP przez 24 godz.',
      };
    case 'xp_boost_2x_48h':
      return {
        icon: '🚀',
        labelRu: 'x2 XP на 48 часов',
        labelUk: 'x2 XP на 48 годин',
        labelEs: 'x2 XP durante 48 horas',
        labelPtBr: 'x2 XP por 48 horas',
        labelVi: 'x2 XP trong 48 giờ',
        labelId: 'x2 XP selama 48 jam',
        labelTr: '48 saat x2 XP',
        labelPl: 'x2 XP przez 48 godz.',
      };
    case 'chain_shield_1':
      return {
        icon: '🛡️',
        labelRu: 'Щит цепочки на 1 день',
        labelUk: 'Щит стріку на 1 день',
        labelEs: 'Escudo de racha: 1 día',
        labelPtBr: 'Escudo de sequência: 1 dia',
        labelVi: 'Khiên chuỗi: 1 ngày',
        labelId: 'Perisai rentetan: 1 hari',
        labelTr: 'Seri kalkanı: 1 gün',
        labelPl: 'Tarcza serii: 1 dzień',
      };
    case 'chain_shield_3':
      return {
        icon: '🛡️',
        labelRu: 'Щит цепочки на 3 дня',
        labelUk: 'Щит стріку на 3 дні',
        labelEs: 'Escudo de racha: 3 días',
        labelPtBr: 'Escudo de sequência: 3 dias',
        labelVi: 'Khiên chuỗi: 3 ngày',
        labelId: 'Perisai rentetan: 3 hari',
        labelTr: 'Seri kalkanı: 3 gün',
        labelPl: 'Tarcza serii: 3 dni',
      };
    case 'club_boost_free':
      return {
        icon: '👥',
        labelRu: 'Бесплатный клубный буст',
        labelUk: 'Безкоштовний клубний буст',
        labelEs: 'Impulso de club gratuito',
        labelPtBr: 'Impulso de clube grátis',
        labelVi: 'Tăng lực câu lạc bộ miễn phí',
        labelId: 'Boost klub gratis',
        labelTr: 'Ücretsiz kulüp güçlendirmesi',
        labelPl: 'Darmowy boost klubu',
      };
    case 'arena_extra_5':
      return {
        icon: '🎟️',
        labelRu: '+5 рейтинг-игр сегодня',
        labelUk: '+5 рейтинг-ігор сьогодні',
        labelEs: '+5 partidas extra en la Arena hoy',
        labelPtBr: '+5 partidas ranqueadas hoje',
        labelVi: '+5 trận xếp hạng hôm nay',
        labelId: '+5 game peringkat hari ini',
        labelTr: 'Bugün +5 sıralama oyunu',
        labelPl: '+5 gier rankingowych dziś',
      };
    case 'wager_discount_25':
      return {
        icon: '🎲',
        labelRu: 'Скидка на пари 25%',
        labelUk: 'Знижка на парі 25%',
        labelEs: '25 % de descuento en apuestas',
        labelPtBr: '25% de desconto em apostas',
        labelVi: 'Giảm 25% cho cược',
        labelId: 'Diskon taruhan 25%',
        labelTr: 'Bahislerde %25 indirim',
        labelPl: '25% zniżki na zakłady',
      };
    case 'pack_trial_48h':
      return {
        icon: '📦',
        labelRu: 'Пробный набор на 48 часов',
        labelUk: 'Пробний набір на 48 годин',
        labelEs: 'Paquete de prueba de 48 horas',
        labelPtBr: 'Pacote de teste por 48 horas',
        labelVi: 'Gói dùng thử 48 giờ',
        labelId: 'Paket uji coba 48 jam',
        labelTr: '48 saatlik deneme paketi',
        labelPl: 'Pakiet próbny na 48 godz.',
      };
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
  const allowed = activeDocs
    .map((doc) => normalizePayload(doc.id, doc.data))
    .filter((payload) => !isRetiredLeagueSystemBroadcast(payload));

  if (!allowed.length) return null;
  const sorted = [...allowed].sort((a, b) => {
    const aTs = Date.parse(String(a.createdAt ?? ''));
    const bTs = Date.parse(String(b.createdAt ?? ''));
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  return sorted[0];
}

function isRetiredLeagueSystemBroadcast(payload: GlobalBroadcastModalPayload): boolean {
  const text = [
    payload.id,
    payload.titleRu,
    payload.titleUk,
    payload.titleEs,
    payload.titlePtBr,
    payload.titleVi,
    payload.titleId,
    payload.titleTr,
    payload.titlePl,
    payload.messageRu,
    payload.messageUk,
    payload.messageEs,
    payload.messagePtBr,
    payload.messageVi,
    payload.messageId,
    payload.messageTr,
    payload.messagePl,
  ].join(' ').toLowerCase();
  const mentionsLeague = text.includes('\u043b\u0438\u0433') || text.includes('league');
  const mentionsSystemUpdate = text.includes('\u0441\u0438\u0441\u0442\u0435\u043c') || text.includes('system');
  const mentionsCompensation = text.includes('\u043a\u043e\u043c\u043f\u0435\u043d\u0441') || text.includes('compens');
  const isShardCompensation = payload.rewardType === 'shards' && payload.rewardAmount === 30;
  return mentionsLeague && (mentionsSystemUpdate || mentionsCompensation || isShardCompensation);
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
    for (const doc of activeDocs) {
      const payload = normalizePayload(doc.id, doc.data);
      if (isRetiredLeagueSystemBroadcast(payload)) {
        await AsyncStorage.setItem(dismissKey(payload.id), '1').catch(() => {});
      }
    }

    const payload = pickLatest(activeDocs);
    if (!payload) return null;

    if (payload.premiumAudience !== 'all') {
      const userSnap = await db.collection('users').doc(uid).get();
      const progress = userSnap.data()?.progress ?? {};
      const plan = String(progress.premium_plan ?? '').trim().toLowerCase();
      const expiry = toSafePositiveInt(progress.premium_expiry, 0);
      const hasPlan = !!plan && plan !== 'null';
      const isPremium = hasPlan && !(expiry > 0 && expiry < Date.now());
      if (payload.premiumAudience === 'free' && isPremium) return null;
      if (payload.premiumAudience === 'premium' && !isPremium) return null;
    }

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

export function getReviewPromoUrl(payload: GlobalBroadcastModalPayload): string {
  if (Platform.OS === 'ios') return payload.reviewUrlIos || payload.reviewUrlAndroid;
  return payload.reviewUrlAndroid || payload.reviewUrlIos;
}

export async function recordReviewPromoClick(payload: GlobalBroadcastModalPayload): Promise<void> {
  if (!payload?.id || payload.kind !== 'review_promo') return;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  const uid = await getCanonicalUserId().catch(() => null);
  if (!uid) return;

  try {
    const firestoreModule = await import('@react-native-firebase/firestore');
    const db = firestoreModule.default();
    await db.collection('review_promo_claims').add({
      uid,
      broadcastId: payload.id,
      platform: Platform.OS,
      clickedAt: new Date().toISOString(),
      status: 'clicked',
    });
  } catch {
    // Best-effort analytics; never block the user from opening the store.
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
