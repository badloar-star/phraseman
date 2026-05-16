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

export type CardPackShardPurchaseResult = 'ok' | 'insufficient' | 'spend_failed' | 'already_owned';
export type CardPackVoucherRedeemResult = 'ok' | 'no_voucher' | 'not_eligible' | 'already_owned';

/**
 * Списати осколки й додати набір карток у «Мої».
 * Перевірка балансу всередині; toast при помилці списання.
 */
export async function purchaseCardPackWithShards(
  pack: FlashcardMarketPack,
): Promise<CardPackShardPurchaseResult> {
  if (pack.isCommunityUgc) {
    return purchaseCommunityPackWithShards(pack);
  }
  const owned = await loadOwnedPackIds();
  if (owned.includes(pack.id)) return 'already_owned';
  const balance = await getShardsBalance();
  if (balance < pack.priceShards) return 'insufficient';
  const ok = await spendShards(pack.priceShards, 'card_pack');
  if (!ok) {
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Не удалось списать осколки.',
      messageUk: 'Не вдалося списати осколки.',
      messageEs: 'No ha sido posible gastar fragmentos.',
    });
    return 'spend_failed';
  }
  await addOwnedPackId(pack.id);
  await primeMarketplaceBuiltCardsCacheFromOwnedStorage();
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
): Promise<CardPackVoucherRedeemResult> {
  if (pack.isCommunityUgc) return 'not_eligible';
  const trial = await getPackGiftTrial();
  if (!trial) return 'no_voucher';
  const owned = await loadOwnedPackIds();
  if (owned.includes(pack.id)) return 'already_owned';
  await addOwnedPackId(pack.id);
  await primeMarketplaceBuiltCardsCacheFromOwnedStorage();
  await consumePackGiftTrial();
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
  return 'ok';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
