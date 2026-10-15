import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import { primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from './flashcards/marketplace';
import { setRandomPackGiftTrial48h } from './flashcards/pack_trial_gift';
import { isPremiumAccessProgressActive } from './premium_progress';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { submitClientReport } from './client_reports';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { ensureStableAuthLinkForStableIdDetailed } from './cloud_sync';
import { withCallableTimeout } from './callable_timeout';
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken, type AccountTransitionLockLease, withAccountTransitionLock } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { DebugLogger } from './debug-logger';
import { noteSwallowedHandler, noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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

// зачем: D70/D104 — жемчуг ('shards') в рассылках заменён монетами ('coins').
export type GlobalBroadcastRewardType =
  | 'none'
  | 'coins'
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
    'coins',
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
  const messageRu = String(data.messageRu ?? '').trim() || 'Спасибо, что ты с нами.';
  const messageUk = String(data.messageUk ?? '').trim() || messageRu;
  const messageEs = String(data.messageEs ?? '').trim() || messageRu;
  const messagePtBr = String(data.messagePtBr ?? '').trim() || 'Obrigado por estar conosco.';
  const messageVi = String(data.messageVi ?? '').trim() || 'Cảm ơn bạn đã đồng hành cùng chúng tôi.';
  const messageId = String(data.messageId ?? '').trim() || 'Terima kasih sudah bersama kami.';
  const messageTr = String(data.messageTr ?? '').trim() || 'Bizimle olduğun için teşekkürler.';
  const messagePl = String(data.messagePl ?? '').trim() || 'Dziękujemy, że jesteś z nami.';
  // Старый жемчуг ('shards' / поле shards) нормализуется в 'none' — D70.
  const resolvedRewardType = normalizeRewardType(data.rewardType);
  const rewardAmount = resolvedRewardType === 'coins' ? toSafePositiveInt(data.rewardAmount, 0) : 0;
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
  | 'rune'
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
  /** зачем (LANG_AUDIT 13.10): английский интерфейс брал подпись из labelRu — показывал русский текст. */
  labelEn: string;
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
    case 'coins':
      if (amount <= 0) return null;
      return {
        icon: 'rune',
        labelRu: `+${amount} ${ruCoinsAfterNumber(amount)}`,
        labelUk: `+${amount} ${ukCoinsAfterNumber(amount)}`,
        labelEn: amount === 1 ? '+1 coin' : `+${amount} coins`,
        labelEs: amount === 1 ? '+1 moneda' : `+${amount} monedas`,
        labelPtBr: amount === 1 ? '+1 moeda' : `+${amount} moedas`,
        labelVi: `+${amount} xu`,
        labelId: `+${amount} koin`,
        labelTr: `+${amount} jeton`,
        labelPl: `+${amount} ${plCoinsAfterNumber(amount)}`,
      };
    case 'pack_trial_48h':
      return {
        icon: 'cube',
        labelRu: 'Пробный набор на 48 часов',
        labelUk: 'Пробний набір на 48 годин',
        labelEn: '48-hour trial pack',
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
  /** Старые квитанции могут нести 'shards' — они ничего не начисляют (D70). */
  rewardType: GlobalBroadcastRewardType | 'shards';
  rewardAmount?: number;
  /** D104: снапшот монетного кошелька после начисления (stars_ledger). */
  stars?: number;
  starsEarnedTotal?: number;
  starsSeq?: number;
  voucherId?: string;
  expiresAt?: number;
};

function ruCoinsAfterNumber(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'монета';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'монеты';
  return 'монет';
}

function ukCoinsAfterNumber(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'монета';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'монети';
  return 'монет';
}

function plCoinsAfterNumber(n: number): string {
  if (n === 1) return 'moneta';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'monety';
  return 'monet';
}

async function claimGlobalBroadcastReward(
  payload: GlobalBroadcastModalPayload,
  stableId: string,
): Promise<GlobalBroadcastClaimResponse> {
  const link = await ensureStableAuthLinkForStableIdDetailed(stableId);
  if (!link.ok || link.stableUid !== stableId) throw new Error('broadcast_identity_changed');
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
  lease?: AccountTransitionLockLease,
): Promise<void> {
  switch (claim.rewardType) {
    case 'none':
      return;
    case 'shards':
      // зачем: D70 — квитанция старой жемчужной рассылки больше ничего не начисляет.
      DebugLogger.info('BROADCAST-REWARD', `retired shards receipt id=${payload.id} amount=${claim.rewardAmount ?? 0}`);
      return;
    case 'coins': {
      // зачем: D104 — монеты уже начислены сервером (stars_ledger); телефону
      // доливаем снапшот кошелька. Применяется только более новый starsSeq,
      // поэтому повтор квитанции не удваивает монеты.
      if (!accountToken || !stableId) throw new Error('broadcast_identity_missing');
      const seq = Number(claim.starsSeq);
      if (!Number.isSafeInteger(seq) || seq < 0) {
        DebugLogger.warn('BROADCAST-REWARD', `coins receipt without starsSeq id=${payload.id} amount=${claim.rewardAmount ?? 0}`);
        return;
      }
      const stars = Number(claim.stars);
      const earned = Number(claim.starsEarnedTotal);
      const visible = await mergeLevelSpinServerStars(accountToken, {
        ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
        ...(Number.isFinite(earned) ? { starsEarnedTotal: Math.max(0, Math.trunc(earned)) } : {}),
        starsSeq: seq,
        // зачем (Q-COIN a): награда не растворяется в «большем из двух» при serverSeq 0.
        serverCreditedDelta: Number(claim.rewardAmount ?? 0),
      }, lease);
      DebugLogger.info('BROADCAST-REWARD', `coins merged id=${payload.id} amount=${claim.rewardAmount ?? 0} seq=${seq} balance=${visible.balance}`);
      return;
    }
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

// зачем (01.10): фильтр прятал ЛЮБУЮ рассылку со словами «лига» + «система/компенсация» —
// под него попало бы и сообщение владельца о 2.0 («лиги заменены Шпилем…»). Прячем только
// старые рассылки о лигах, созданные до выхода 2.0; без даты — тоже старые.
const RETIRED_LEAGUE_BROADCAST_CUTOFF_MS = Date.parse('2026-10-01T00:00:00Z');

function isRetiredLeagueSystemBroadcast(payload: GlobalBroadcastModalPayload): boolean {
  const createdMs = Date.parse(String(payload.createdAt ?? ''));
  if (Number.isFinite(createdMs) && createdMs >= RETIRED_LEAGUE_BROADCAST_CUTOFF_MS) return false;
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
  return mentionsLeague && (mentionsSystemUpdate || mentionsCompensation);
}

/**
 * зачем (смета Firebase R1, п.8): `globalBroadcastListActive` звался на КАЖДОМ старте у всех, хотя рассылок почти всегда нет.
 * Ответ «активных нет» помним 3 ч для этого uid (значение сверяет uid — чужой аккаунт кэш не использует). Есть рассылки — запись
 * снимается. Новая рассылка доходит не позже чем через 3 ч. Ключ device_only (config/phone-state-legacy-inventory.v1.json).
 */
export const GLOBAL_BROADCAST_EMPTY_TTL_MS = 3 * 60 * 60 * 1000;

async function readBroadcastEmptyAgeMs(uid: string, nowMs: number): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem('global_broadcast_empty_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: unknown; at?: unknown };
    if (parsed?.uid !== uid || typeof parsed.at !== 'number') return null;
    const age = nowMs - parsed.at;
    return age >= 0 && age < GLOBAL_BROADCAST_EMPTY_TTL_MS ? age : null;
  } catch (error) {
    console.warn(`[OVERLAY-QUEUE] broadcast:empty_cache read failed — иду в сеть: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function writeBroadcastEmptyCache(uid: string | null): void {
  const op = uid
    ? AsyncStorage.setItem('global_broadcast_empty_v1', JSON.stringify({ uid, at: Date.now() }))
    : AsyncStorage.removeItem('global_broadcast_empty_v1');
  void op.catch((error: unknown) => {
    console.warn(`[OVERLAY-QUEUE] broadcast:empty_cache write failed: ${error instanceof Error ? error.message : String(error)}`);
  });
}

export async function fetchPendingGlobalBroadcastModal(
  studyTarget?: RuntimeStudyTarget,
  options: Readonly<{ premiumAudienceAccess?: boolean | null }> = {},
): Promise<GlobalBroadcastModalPayload | null> {
  // зачем (координатор 12.10, п.70 №4, «сперва логи»): «рассылки нет» складывалось из десятка немых выходов и немого
  // catch — по журналу нельзя было понять, нет рассылки или проверка сломалась. Каждый выход называет причину.
  const skip = (reason: string): null => {
    console.log(`[OVERLAY-QUEUE] broadcast:fetch → null reason=${reason}`);
    return null;
  };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return skip(IS_EXPO_GO ? 'expo_go' : 'cloud_sync_disabled');
  const uid = await getCanonicalUserId().catch(noteSwallowedAs('global_broadcast_modal:promise_1', null));
  if (!uid) return skip('no_uid');
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, uid)) return skip('account_changed_before_list');
  const emptyAgeMs = await readBroadcastEmptyAgeMs(uid, Date.now());
  if (emptyAgeMs !== null) return skip(`empty_cached age=${Math.round(emptyAgeMs / 60_000)}m ttl=${GLOBAL_BROADCAST_EMPTY_TTL_MS / 60_000}m`);

  try {
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
    if (!isCurrentAccountGeneration(accountToken, uid)) return skip('account_changed_after_list');
    if (listData.items.length === 0) {
      writeBroadcastEmptyCache(uid);
      return skip('no_active_broadcasts');
    }
    writeBroadcastEmptyCache(null);
    const activeDocs = listData.items.map((row) => ({ id:String(row.id || ''), data:row }));

    const firestoreModule = await import('@react-native-firebase/firestore');
    const db = firestoreModule.default();
    for (const doc of activeDocs) {
      const payload = normalizePayload(doc.id, doc.data);
      if (isRetiredLeagueSystemBroadcast(payload)) {
        await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(noteSwallowedHandler('global_broadcast_modal:promise_2'));
      }
    }

    const payload = pickLatest(activeDocs);
    if (!payload) return skip(`no_valid_payload items=${activeDocs.length}`);
    if (isRetiredLeagueSystemBroadcast(payload)) {
      await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(noteSwallowedHandler('global_broadcast_modal:promise_3'));
      return skip(`retired_league id=${payload.id}`);
    }
    if (payload.kind === 'review_promo') {
      await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(noteSwallowedHandler('global_broadcast_modal:promise_4'));
      return skip(`review_promo id=${payload.id}`);
    }

    if (payload.premiumAudience !== 'all') {
      // зачем (п.70 №2): доступ из PremiumContext, если он уже разрешён, — без второго чтения users/{uid} на старте.
      let isPremium: boolean;
      if (typeof options.premiumAudienceAccess === 'boolean') {
        isPremium = options.premiumAudienceAccess;
        console.log(`[OVERLAY-QUEUE] broadcast:audience id=${payload.id} audience=${payload.premiumAudience} premium=${String(isPremium)} source=premium_context`);
      } else {
        const userSnap = await db.collection('users').doc(uid).get(); // guard-ok: один документ по id
        const progress = userSnap.data()?.progress ?? {};
        isPremium = isPremiumAccessProgressActive(progress);
        console.log(`[OVERLAY-QUEUE] broadcast:audience id=${payload.id} audience=${payload.premiumAudience} premium=${String(isPremium)} source=users_doc (контекст доступа ещё не разрешён)`);
      }
      if (payload.premiumAudience === 'free' && isPremium) return skip(`audience_free_but_premium id=${payload.id}`);
      if (payload.premiumAudience === 'premium' && !isPremium) return skip(`audience_premium_but_free id=${payload.id}`);
    }

    const dismissed = await AsyncStorage.getItem(dismissKey(payload.id, accountToken));
    if (!isCurrentAccountGeneration(accountToken, uid)) return skip('account_changed_before_claim');
    if (dismissed === '1') return skip(`dismissed id=${payload.id}`);
    // R58 #5: окно уже закрыто в этом запуске, получение идёт фоном — не всплываем повторно
    if (closedThisSession.has(`${uid}:${payload.id}`)) return skip(`closed_this_session id=${payload.id}`);

    const claimId = `global_broadcast_${payload.id}`;
    const claimSnap = await db.collection('users').doc(uid).collection('reward_claims').doc(claimId).get();
    if (claimSnap.exists) {
      let receipt = claimSnap.data()?.response as GlobalBroadcastClaimResponse | undefined;
      if (receipt?.rewardType) {
        try {
          await withAccountTransitionLock(async (lease) => {
            if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
            await applyBroadcastReward(payload, receipt, studyTarget, accountToken, uid, lease);
          });
        } catch (e) {
          DebugLogger.error('global_broadcast_modal:replayReceipt', e instanceof Error ? e : new Error(String(e)), 'warning');
          return payload;
        }
      }
      if (!isCurrentAccountGeneration(accountToken, uid)) return skip('account_changed_after_claim');
      await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1').catch(noteSwallowedHandler('global_broadcast_modal:promise_5'));
      return skip(`already_claimed id=${payload.id}`);
    }

    return payload;
  } catch (error: unknown) {
    // зачем (п.70 №4): был немой catch — сбой сервера/сети/неполный источник выглядел как «рассылки нет».
    const code = String((error as { code?: unknown })?.code ?? '');
    console.warn(`[OVERLAY-QUEUE] broadcast:fetch → null reason=failed code=${code || '-'} message=${error instanceof Error ? error.message : String(error)}`);
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
  const uid = await getCanonicalUserId().catch(noteSwallowedAs('global_broadcast_modal:promise_6', null));
  if (!uid) return;

  try {
    await submitClientReport('review_promo_claim', {
      uid,
      broadcastId: payload.id,
      platform: Platform.OS,
      clickedAt: new Date().toISOString(),
      status: 'clicked',
    });
  } catch (e) {
      // Best-effort analytics; never block the user from opening the store.
      DebugLogger.error('global_broadcast_modal:uid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * R58 #5 (аудит кнопок 15.10): закрытие окна ждало сеть (claim + начисление) — без сети окно было не закрыть.
 * Теперь окно закрывается СРАЗУ, а получение идёт фоном с повторами. Пока идёт — окно в этом запуске не всплывает;
 * если все повторы упали, отметка «закрыто» не ставится и окно вернётся при следующем запуске (награда не теряется).
 */
const closedThisSession = new Set<string>();
const BACKGROUND_CLAIM_DELAYS_MS = [0, 3_000, 15_000, 60_000] as const;

export function closeGlobalBroadcastModalAndClaimInBackground(
  payload: GlobalBroadcastModalPayload,
  studyTarget: RuntimeStudyTarget | undefined,
  onClaimed?: () => void,
): void {
  if (!payload?.id) return;
  void getCanonicalUserId()
    .then((uid) => { if (uid) closedThisSession.add(`${uid}:${payload.id}`); })
    .catch(noteSwallowedHandler('global_broadcast_modal:close_session_mark'));
  let attempt = 0;
  const run = (): void => {
    const delay = BACKGROUND_CLAIM_DELAYS_MS[attempt] ?? null;
    if (delay === null) {
      console.warn(`[GLOBAL-BROADCAST] claim:gave_up id=${payload.id} attempts=${attempt} — окно вернётся при следующем запуске`); // guard-ok: итог повторов
      return;
    }
    setTimeout(() => {
      attempt += 1;
      claimAndDismissGlobalBroadcastModal(payload, studyTarget)
        .then(() => {
          console.log(`[GLOBAL-BROADCAST] claim:ok id=${payload.id} attempt=${attempt}`); // guard-ok: итог
          onClaimed?.();
        })
        .catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          console.warn(`[GLOBAL-BROADCAST] claim:failed id=${payload.id} attempt=${attempt} reason=${reason}`); // guard-ok: причина в журнал
          if (reason === 'broadcast_identity_changed' || reason === 'broadcast_claim_unavailable') return;
          run();
        });
    }, delay);
  };
  run();
}

export async function claimAndDismissGlobalBroadcastModal(
  payload: GlobalBroadcastModalPayload,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (!payload?.id) return;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('broadcast_claim_unavailable');
  const uid = await getCanonicalUserId().catch(noteSwallowedAs('global_broadcast_modal:promise_7', null));
  if (!uid) throw new Error('broadcast_identity_unavailable');
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
  const receipt = await claimGlobalBroadcastReward(payload, uid);
  if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
  await withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
    await applyBroadcastReward(payload, receipt, studyTarget, accountToken, uid, lease);
    if (!isCurrentAccountGeneration(accountToken, uid)) throw new Error('broadcast_identity_changed');
    await AsyncStorage.setItem(dismissKey(payload.id, accountToken), '1');
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
