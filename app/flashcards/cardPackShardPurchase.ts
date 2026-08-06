import { emitAppEvent } from '../events';
import { logCardPackPurchasedShards } from '../firebase';
import { addShardsRaw, getShardsBalance, spendShards } from '../shards_system';
import { reconcileShardsBeforePurchase } from '../shards_purchase_reconcile';
import { trackCardPackPurchase } from '../user_stats';
import {
  addOwnedPackId,
  loadOwnedPackIds,
  primeMarketplaceBuiltCardsCacheFromOwnedStorage,
  type FlashcardMarketPack,
} from './marketplace';
import { bindPackGiftVoucherSelection, consumePackGiftTrial, getPackGiftTrial } from './pack_trial_gift';
import {
  ensureFirebaseUserSignedInForCallable,
  purchaseCommunityPackWithShards,
  redeemCommunityPackGiftVoucher,
} from '../community_packs/purchaseCommunityPack';
import { trackCardPackAcquiredAchievement } from './packAchievementTracking';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { flashcardsOfficialPacksAvailableForTarget } from '../flashcards_target_gate';
import { callFlashcardPackGiftRedeem } from '../community_packs/functionsClient';
import { getCanonicalUserId } from '../user_id_policy';
import { storageStudyTarget } from '../target_storage_keys';

export type CardPackShardPurchaseResult = 'ok' | 'insufficient' | 'spend_failed' | 'already_owned' | 'source_gated';
export type CardPackVoucherRedeemResult = 'ok' | 'no_voucher' | 'already_owned' | 'source_gated' | 'redeem_failed';

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
  // UI мог уже показать офлайн/отложенное начисление, которое ещё не дошло
  // до серверного кошелька. Сначала проигрываем очередь и перечитываем облако.
  const balance = await reconcileShardsBeforePurchase();
  if (balance < pack.priceShards) return 'insufficient';
  const ok = await spendShards(pack.priceShards, 'card_pack');
  if (!ok) {
    // spendShards сверяет локальный баланс с облачным (источник истины). Если после
    // неудачи баланс реально меньше цены — это «не хватает», а не сбой списания.
    const balanceAfter = await getShardsBalance();
    if (balanceAfter < pack.priceShards) {
      emitAppEvent('shards_balance_updated', { balance: balanceAfter });
      return 'insufficient';
    }
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Жемчужины не списались. Попробуй ещё раз.',
      messageUk: 'Не вдалося списати перлини.',
      messageEs: 'No ha sido posible gastar perlas.',
    });
    return 'spend_failed';
  }
  // зачем (НАЙДЕНО АУДИТОМ 2026-07-25): монеты уже списаны строкой выше. Если
  // выдача пака упадёт (AsyncStorage.setItem бросает при заполненном диске —
  // saveOwnedPackIds его не ловит), юзер оставался БЕЗ ДЕНЕГ И БЕЗ ПАКА, без
  // отката. Возвращаем монеты и честно говорим, что покупка не прошла.
  // Причина 'card_pack_refund' в списке исключений перка — иначе бонус
  // карточки IV+ начислил бы +5% сверх возврата, и юзер вышел бы в плюс.
  try {
    await addOwnedPackId(pack.id, studyTarget);
  } catch {
    try {
      await addShardsRaw(pack.priceShards, 'card_pack_refund');
    } catch {
      // Возврат тоже не прошёл — молчать нельзя, но и упасть нельзя.
      // Баланс сверится с облаком при следующем входе (источник истины там).
    }
    const balanceBack = await getShardsBalance().catch(() => balance);
    emitAppEvent('shards_balance_updated', { balance: balanceBack });
    emitAppEvent('action_toast', {
      type: 'error',
      // зачем: единая валюта — жемчуг; тост обещал возврат «монет», которых в приложении нет.
      messageRu: 'Набор не удалось сохранить. Жемчуг возвращён.',
      messageUk: 'Не вдалося зберегти набір. Перлини повернуто.',
      messageEs: 'No se pudo guardar el pack. Perlas devueltas.',
    });
    return 'spend_failed';
  }
  // Кэш карточек — не критичен: пак уже в «Моих», список подтянется при входе.
  await primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget).catch(() => {});
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
 * Працює для офіційних і community-наборів. Ваучер «згоряє» тільки після того,
 * як постійне володіння набором підтверджено й збережено.
 */
export async function redeemPackGiftVoucher(
  pack: FlashcardMarketPack,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardPackVoucherRedeemResult> {
  if (pack.isCommunityUgc) {
    return redeemCommunityPackGiftVoucher(pack, studyTarget);
  }
  const owned = await loadOwnedPackIds(studyTarget);
  if (owned.includes(pack.id)) return 'already_owned';
  const trial = await getPackGiftTrial(studyTarget, {
    packId: pack.id, packType: 'official', studyTarget: storageStudyTarget(studyTarget),
  });
  if (!trial) {
    emitAppEvent('action_toast', {
      type: 'info',
      messageRu: 'Срок подарка истёк.',
      messageUk: 'Термін подарунка минув.',
      messageEs: 'El regalo ha caducado.',
    });
    return 'no_voucher';
  }
  if (trial.claimBinding && (
    trial.claimBinding.packId !== pack.id
    || trial.claimBinding.packType !== 'official'
    || trial.claimBinding.studyTarget !== storageStudyTarget(studyTarget)
  )) return 'redeem_failed';
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget)) {
    emitSourceGatedPackToast();
    return 'source_gated';
  }
  const buyerStableId = await getCanonicalUserId().catch(() => null);
  if (!buyerStableId || !(await ensureFirebaseUserSignedInForCallable())) return 'redeem_failed';
  try {
    const result = await callFlashcardPackGiftRedeem({
      buyerStableId,
      packType: 'official',
      packId: pack.id,
      studyTarget: storageStudyTarget(studyTarget),
      voucherId: trial.voucherId,
      voucherOccurrenceId: trial.occurrenceId,
    });
    if (result.alreadyOwned) return 'already_owned';
    if (!result.gifted) return 'redeem_failed';
    // The server receipt binds this exact deck before local writes. A failed save or
    // consume leaves the voucher locally visible, so retry can replay only this deck.
    await bindPackGiftVoucherSelection(trial.localVoucherId, {
      packId: pack.id, packType: 'official', studyTarget: storageStudyTarget(studyTarget), confirmedAt: Date.now(),
    });
    await addOwnedPackId(pack.id, studyTarget);
    await primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget).catch(() => {});
    await consumePackGiftTrial(trial.localVoucherId);
  } catch {
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Не удалось завершить подарок. Повтори выбор этого же набора.',
      messageUk: 'Не вдалося завершити подарунок. Повтори вибір цього самого набору.',
      messageEs: 'No se pudo completar el regalo. Vuelve a elegir el mismo pack.',
    });
    return 'redeem_failed';
  }
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
