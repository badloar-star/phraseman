import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { commitConfirmedExternalShardEvent } from './shards_system';
import { setClubGiftFreeBoostCountFromAuthority } from './club_boosts';
import { primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from './flashcards/marketplace';
import { setRandomPackGiftTrial48h } from './flashcards/pack_trial_gift';
import { WAGER_DISCOUNT_KEY } from './level_gift_system';
import { isPremiumAccessProgressActive } from './premium_progress';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { submitClientReport } from './client_reports';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { ensureStableAuthLinkForStableIdDetailed } from './cloud_sync';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken, withAccountTransitionLock } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';

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
  /** Испанский заголовок; при отсутствии в данных используется titleRu */
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
  | 'wager_discount_25'
  | 'pack_trial_48h';

type GlobalBroadcastPublicListResponse = {
  ok: boolean;
  items: Array<Record<string, unknown> & { id: string }>;
  truncated: boolean;
  sourceHealth: { state: 'ready' | 'partial' | 'error'; complete: boolean; truncated: boolean; droppedCount: number };
};

function dismissKey(id: string, token: AccountGenerationToken = captureAccountGeneration()): string {
  return `global_broadcast_modal_dismissed_${id}::${accountScopeKey(token) ?? 'inactive'}`;
}

function toSafePositiveInt(value: unknown, defaultValue = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return defaultValue;
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

// зачем: запрет владельца на эмодзи в UI — icon раньше был '💎'/'🔥'/... прямо
// в тексте. Теперь это имя иконки из набора проекта (@expo/vector-icons/Ionicons),
// GlobalBroadcastModal рендерит её через <Ionicons name={reward.icon} />.
export type GlobalBroadcastRewardIconName =
  | 'diamond'
  | 'flame'
  | 'rocket'
  | 'shield-checkmark'
  | 'people'
  | 'dice'
  | 'cube';

export function getGlobalBroadcastRewardBadge(payload: GlobalBroadcastModalPayload): {
  icon: GlobalBroadcastRewardIconName;
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
        icon: 'diamond',
        // зачем: склонение по числу — «+1 жемчужина», а не «+1 жемчужин».
        labelRu: `+${amount} ${ruKnowledgeShardsAfterNumber(amount)}`,
        labelUk: `+${amount} ${ukKnowledgeShardsAfterNumber(amount)}`,
        labelEs:
          amount === 1
            ? '+1 fragmento'
            : `+${amount} perlas`,
        labelPtBr: amount === 1 ? '+1 fragmento' : `+${amount} perlas`,
        labelVi: `+${amount} xu`,
        labelId: `+${amount} koin`,
        labelTr: `+${amount} jeton`,
        labelPl: `+${amount} monet`,
      };
    case 'xp_boost_2x_24h':
      return {
        icon: 'flame',
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
        icon: 'rocket',
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
        icon: 'shield-checkmark',
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
        icon: 'shield-checkmark',
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
        icon: 'people',
        labelRu: 'Бесплатный буст лиги',
        labelUk: 'Безкоштовний буст ліги',
        labelEs: 'Impulso de liga gratuito',
        labelPtBr: 'Impulso de liga grátis',
        labelVi: 'Tăng lực giải đấu miễn phí',
        labelId: 'Boost liga gratis',
        labelTr: 'Ücretsiz lig güçlendirmesi',
        labelPl: 'Darmowy boost ligi',
      };
    case 'wager_discount_25':
      return {
        icon: 'dice',
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
        icon: 'cube',
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

type GlobalBroadcastClaimResponse = {
  ok: boolean;
  rewardType: GlobalBroadcastRewardType;
  rewardAmount?: number;
  senderBalanceAfter?: number;
  shardsUpdatedAtMs?: number;
  chainShield?: string;
  giftXpMultiplier?: string;
  voucherId?: string;
  expiresAt?: number;
  clubGiftFreeBoostCount?: number;
  wagerDiscountUses?: number;
};

async function claimGlobalBroadcastReward(
  payload: GlobalBroadcastModalPayload,
  stableId: string,
): Promise<GlobalBroadcastClaimResponse> {
  const link = await ensureStableAuthLinkForStableIdDetailed(stableId);
  if (!link.ok || link.stableUid !== stableId) throw new Error('broadcast_identity_changed');
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<{ stableId: string; broadcastId: string }, GlobalBroadcastClaimResponse>(
    getFunctions(getApp(), 'us-central1'),
    'globalBroadcastClaim',
  );
  const result = await withCallableTimeout(fn({ stableId, broadcastId: payload.id }), 'globalBroadcastClaim');
  return result.data;
}

async function applyBroadcastReward(
  payload: GlobalBroadcastModalPayload,
  claim: GlobalBroadcastClaimResponse,
  studyTarget?: RuntimeStudyTarget,
  accountToken?: AccountGenerationToken,
  stableId?: string,
): Promise<void> {
  switch (claim.rewardType) {
    case 'none':
      return;
    case 'shards':
      if (!Number.isFinite(claim.rewardAmount) || Number(claim.rewardAmount) <= 0) {
        throw new Error('broadcast_shard_receipt_missing');
      }
      if (!accountToken || !stableId) throw new Error('broadcast_identity_missing');
      {
        const applied = await commitConfirmedExternalShardEvent({
          source: 'global_broadcast',
          eventId: payload.id,
          delta: Number(claim.rewardAmount),
          reason: 'global_broadcast_modal',
          grant: {
            kind: 'global_broadcast_reward',
            subjectId: payload.id,
            payload: { broadcastId: payload.id },
          },
        });
        if (applied.status !== 'applied' && applied.status !== 'already-applied') {
          throw new Error('broadcast_identity_changed');
        }
      }
      return;
    case 'xp_boost_2x_24h':
    case 'xp_boost_2x_48h':
      if (!claim.giftXpMultiplier) throw new Error('broadcast_xp_receipt_missing');
      await AsyncStorage.setItem('gift_xp_multiplier', claim.giftXpMultiplier);
      return;
    case 'chain_shield_1':
    case 'chain_shield_3':
      if (!claim.chainShield) throw new Error('broadcast_shield_receipt_missing');
      await AsyncStorage.setItem('chain_shield', claim.chainShield);
      return;
    case 'club_boost_free':
      if (!Number.isFinite(claim.clubGiftFreeBoostCount) || claim.clubGiftFreeBoostCount! < 0) {
        throw new Error('broadcast_club_boost_receipt_missing');
      }
      await setClubGiftFreeBoostCountFromAuthority(claim.clubGiftFreeBoostCount!);
      return;
    case 'wager_discount_25':
      if (!Number.isFinite(claim.wagerDiscountUses) || claim.wagerDiscountUses! < 0) {
        throw new Error('broadcast_wager_receipt_missing');
      }
      if (claim.wagerDiscountUses! > 0) {
        await AsyncStorage.multiSet([
          [WAGER_DISCOUNT_KEY, '0.25'],
          ['wager_discount_uses_v1', String(Math.floor(claim.wagerDiscountUses!))],
        ]);
      } else {
        await AsyncStorage.multiRemove([WAGER_DISCOUNT_KEY, 'wager_discount_uses_v1']);
      }
      return;
    case 'pack_trial_48h':
      if (!claim.voucherId || !claim.expiresAt) throw new Error('pack_gift_receipt_missing');
      if (await setRandomPackGiftTrial48h(studyTarget, claim.voucherId, claim.expiresAt)) {
        await primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget);
      }
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

export async function fetchPendingGlobalBroadcastModal(
  studyTarget?: RuntimeStudyTarget,
): Promise<GlobalBroadcastModalPayload | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  const uid = await getCanonicalUserId().catch(() => null);
  if (!uid) return null;
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, uid)) return null;

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const listActive = httpsCallable<{ limit: number }, GlobalBroadcastPublicListResponse>(
      getFunctions(getApp(), 'us-central1'),
      'globalBroadcastListActive',
    );
    const listResult = await withCallableTimeout(listActive({ limit: 20 }), 'globalBroadcastListActive');
    const listData = listResult.data;
    if (!listData || listData.ok !== true || !Array.isArray(listData.items)
      || listData.truncated === true || listData.sourceHealth?.complete !== true) {
      throw new Error('broadcast_public_source_incomplete');
    }
    if (!isCurrentAccountGeneration(accountToken, uid)) return null;
    if (listData.items.length === 0) return null;
    const activeDocs = listData.items.map((row) => ({ id:String(row.id || ''), data:row }));

    const firestoreModule = await import('@react-native-firebase/firestore');
    const db = firestoreModule.default();
    for (const doc of activeDocs) {
      const payload = normalizePayload(doc.id, doc.data);
      if (isRetiredLeagueSystemBroadcast(payload)) {
        await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(() => {});
      }
    }

    const payload = pickLatest(activeDocs);
    if (!payload) return null;
    if (isRetiredLeagueSystemBroadcast(payload)) {
      await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(() => {});
      return null;
    }
    if (payload.kind === 'review_promo') {
      await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(() => {});
      return null;
    }

    if (payload.premiumAudience !== 'all') {
      const userSnap = await db.collection('users').doc(uid).get();
      const progress = userSnap.data()?.progress ?? {};
      const isPremium = isPremiumAccessProgressActive(progress);
      if (payload.premiumAudience === 'free' && isPremium) return null;
      if (payload.premiumAudience === 'premium' && !isPremium) return null;
    }

    const dismissed = await AsyncStorage.getItem(dismissKey(payload.id, accountToken));
    if (!isCurrentAccountGeneration(accountToken, uid)) return null;
    if (dismissed === '1') return null;

    const claimId = `global_broadcast_${payload.id}`;
    const claimSnap = await db.collection('users').doc(uid).collection('reward_claims').doc(claimId).get();
    if (claimSnap.exists) {
      let receipt = claimSnap.data()?.response as GlobalBroadcastClaimResponse | undefined;
      if (receipt?.rewardType === 'club_boost_free' && !Number.isFinite(receipt.clubGiftFreeBoostCount)
        || receipt?.rewardType === 'wager_discount_25' && !Number.isFinite(receipt.wagerDiscountUses)) {
        receipt = await claimGlobalBroadcastReward(payload, uid).catch(() => undefined);
      }
      if (receipt?.rewardType) {
        try {
          await withAccountTransitionLock(async () => {
            if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
            await applyBroadcastReward(payload, receipt, studyTarget, accountToken, uid);
          });
        } catch {
          return payload;
        }
      }
      if (!isCurrentAccountGeneration(accountToken, uid)) return null;
      await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(() => {});
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
    await submitClientReport('review_promo_claim', {
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

export async function claimAndDismissGlobalBroadcastModal(
  payload: GlobalBroadcastModalPayload,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (!payload?.id) return;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('broadcast_claim_unavailable');
  const uid = await getCanonicalUserId().catch(() => null);
  if (!uid) throw new Error('broadcast_identity_unavailable');
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
  const receipt = await claimGlobalBroadcastReward(payload, uid);
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
    await applyBroadcastReward(payload, receipt, studyTarget, accountToken, uid);
    if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
    await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1');
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
