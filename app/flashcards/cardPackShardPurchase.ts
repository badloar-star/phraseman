import { emitAppEvent } from '../events';
import { logCardPackPurchasedShards } from '../firebase';
import { getShardsBalance, spendShards } from '../shards_system';
import { trackCardPackPurchase } from '../user_stats';
import {
  addOwnedPackId,
  loadOwnedPackIds,
  primeMarketplaceBuiltCardsCacheFromOwnedStorage,
  type FlashcardMarketPack,
} from './marketplace';
import { consumePackGiftTrial, getPackGiftTrial } from './pack_trial_gift';
import { purchaseCommunityPackWithShards } from '../community_packs/purchaseCommunityPack';
import { trackCardPackAcquiredAchievement } from './packAchievementTracking';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { flashcardsOfficialPacksAvailableForTarget } from '../flashcards_target_gate';

export type CardPackShardPurchaseResult = 'ok' | 'insufficient' | 'spend_failed' | 'already_owned' | 'source_gated';
export type CardPackVoucherRedeemResult = 'ok' | 'no_voucher' | 'not_eligible' | 'already_owned' | 'source_gated';

function emitSourceGatedPackToast(): void {
  emitAppEvent('action_toast', {
    type: 'info',
    messageRu: 'Французские наборы карточек ещё закрыты до проверки источников.',
    messageUk: 'Французькі набори карток ще закриті до перевірки джерел.',
    messageEs: 'Los packs de francés siguen bloqueados hasta la revisión de fuentes.',
  });
}

/**
 * Списати осколки й додати набір карток у «Мої».
 * Перевірка балансу всередині; toast при помилці списання.
 */
export async function purchaseCardPackWithShards(
  pack: FlashcardMarketPack,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardPackShardPurchaseResult> {
  if (pack.isCommunityUgc) {
    return purchaseCommunityPackWithShards(pack, studyTarget);
  }
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) {
    emitSourceGatedPackToast();
    return 'source_gated';
  }
  const owned = await loadOwnedPackIds(studyTarget);
  if (owned.includes(pack.id)) return 'already_owned';
  const balance = await getShardsBalance();
  if (balance < pack.priceShards) return 'insufficient';
  const ok = await spendShards(pack.priceShards, 'card_pack');
  if (!ok) {
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Осколки не списались. Попробуй ещё раз.',
      messageUk: 'Не вдалося списати осколки.',
      messageEs: 'No ha sido posible gastar fragmentos.',
    });
    return 'spend_failed';
  }
  await addOwnedPackId(pack.id, studyTarget);
  await primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget);
  const nb = await getShardsBalance();
  emitAppEvent('shards_balance_updated', { balance: nb });
  const toastTitleEs =
    pack.titleEs.trim() || pack.titleUk.trim() || pack.titleRu.trim() || pack.id;
  emitAppEvent('action_toast', {
    type: 'success',
    messageRu: `Набор «${pack.titleRu}» доступен в разделе «Карточки».`,
    messageUk: `Набір «${pack.titleUk}» доступний у розділі «Картки».`,
    messageEs: `El pack «${toastTitleEs}» está disponible en Tarjetas.`,
  });
  logCardPackPurchasedShards(pack.id, pack.priceShards);
  void trackCardPackPurchase(pack.id);
  void trackCardPackAcquiredAchievement(studyTarget);
  return 'ok';
}

/**
 * Активувати 48-год ваучер для безкоштовного отримання набору.
 *
 * Працює тільки для офіційних паків (не community UGC). Ваучер «згоряє» одразу
 * незалежно від ціни паку. Викликається з voucher-modal у paywall флоу.
 */
export async function redeemPackGiftVoucher(
  pack: FlashcardMarketPack,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardPackVoucherRedeemResult> {
  if (pack.isCommunityUgc) return 'not_eligible';
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) {
    emitSourceGatedPackToast();
    return 'source_gated';
  }
  const trial = await getPackGiftTrial(studyTarget);
  if (!trial) return 'no_voucher';
  const owned = await loadOwnedPackIds(studyTarget);
  if (owned.includes(pack.id)) return 'already_owned';
  await addOwnedPackId(pack.id, studyTarget);
  await primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget);
  await consumePackGiftTrial(studyTarget);
  const voucherTitleEs =
    pack.titleEs.trim() || pack.titleUk.trim() || pack.titleRu.trim() || pack.id;
  emitAppEvent('action_toast', {
    type: 'success',
    messageRu: `Набор «${pack.titleRu}» добавлен в «Карточки» (использован подарок).`,
    messageUk: `Набір «${pack.titleUk}» додано в «Картки» (використано подарунок).`,
    messageEs: `El pack «${voucherTitleEs}» se ha añadido en Tarjetas (regalo usado).`,
  });
  logCardPackPurchasedShards(pack.id, 0);
  void trackCardPackPurchase(pack.id);
  void trackCardPackAcquiredAchievement(studyTarget);
  return 'ok';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
