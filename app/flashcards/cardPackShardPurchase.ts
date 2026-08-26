import { DebugLogger } from '../debug-logger';
import { emitAppEvent } from '../events';
import { logCardPackPurchasedShards } from '../firebase';
import { commitShardCompositeOperation, getShardsBalance } from '../shards_system';
import { semanticShardOperationId } from '../economy/client_shard_semantic_id';
import { trackCardPackPurchase } from '../user_stats';
import {
  addOwnedPackId,
  loadOwnedPackIds,
  primeOwnedPackIdsCache,
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
import { flashcardsOwnedPacksKey, storageStudyTarget } from '../target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from '../account_generation';

export type CardPackShardPurchaseResult =
  | 'ok'
  | 'insufficient'
  | 'wallet_sync_pending'
  | 'spend_failed'
  | 'already_owned'
  | 'source_gated';
export type CardPackVoucherRedeemResult = 'ok' | 'no_voucher' | 'already_owned' | 'source_gated' | 'redeem_failed';

function emitSourceGatedPackToast(): void {
  emitAppEvent('action_toast', {
    type: 'info',
    messageRu: 'Французские наборы карточек ещё закрыты до проверки источников.',
    messageUk: 'Французькі набори карток ще закриті до перевірки джерел.',
    messageEs: 'Los packs de francés siguen bloqueados hasta la revisión de fuentes.',
  });
}

function emitAccountNotReadyToast(): void {
  emitAppEvent('action_toast', {
    type: 'info',
    messageRu: 'Аккаунт ещё загружается. Секунду — и повтори покупку.',
    messageUk: 'Акаунт ще завантажується. Секунду — і повтори покупку.',
    messageEs: 'La cuenta aún se está cargando. Espera un segundo y repite la compra.',
  });
}

/**
 * Списати осколки й додати набір карток у «Мої».
 * Перевірка балансу всередині; toast при помилці списання.
 */
export async function purchaseCardPackWithShards(
  pack: FlashcardMarketPack,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): Promise<CardPackShardPurchaseResult> {
  if (pack.isCommunityUgc) {
    return purchaseCommunityPackWithShards(pack, studyTarget);
  }
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale)) {
    emitSourceGatedPackToast();
    return 'source_gated';
  }
  // зачем: покупка раньше падала НЕМО — эти две ветки закрывали модалку без
  // единого слова, если личность аккаунта ещё не поднялась (холодный старт:
  // getStableId() запускается в _layout через void, без await). Тап по «Купить»
  // выглядел как «кнопка не работает». Теперь отказ всегда объясняется вслух.
  const operationToken = captureAccountGeneration();
  const operationOwnerStableId = operationToken.stableId;
  const isOperationCurrent = (): boolean => Boolean(
    operationOwnerStableId
    && isCurrentAccountGeneration(operationToken, operationOwnerStableId)
  );
  if (!isOperationCurrent()) {
    emitAccountNotReadyToast();
    return 'spend_failed';
  }
  const owned = await loadOwnedPackIds(studyTarget);
  if (!isOperationCurrent()) {
    emitAccountNotReadyToast();
    return 'spend_failed';
  }
  if (owned.includes(pack.id)) return 'already_owned';
  const nextOwned = [...owned, pack.id];
  const purchase = await commitShardCompositeOperation({
    amount: pack.priceShards,
    reason: 'card_pack',
    operationId: await semanticShardOperationId(
      'official_card_pack',
      `${storageStudyTarget(studyTarget)}:${pack.id}`,
    ),
    grant: {
      kind: 'official_card_pack',
      subjectId: pack.id,
      payload: { studyTarget: storageStudyTarget(studyTarget) },
    },
    localWrites: [[flashcardsOwnedPacksKey(studyTarget), JSON.stringify(nextOwned)]],
  });
  // зачем: «не хватило жемчуга» — это ФАКТ от журнала операций, а не мнение
  // токена. Раньше проверка isOperationCurrent() стояла ВЫШЕ этой ветки, и
  // если за время работы с диском генерация аккаунта успевала смениться,
  // честная нехватка превращалась в «Покупку не удалось сохранить» — владелец
  // получал ошибку вместо экрана «Недостаточно жемчуга» с кнопкой в магазин.
  if (purchase.status === 'insufficient') {
    const balanceAfter = await getShardsBalance();
    emitAppEvent('shards_balance_updated', { balance: balanceAfter });
    return 'insufficient';
  }
  return withAccountTransitionLock(async () => {
    if (!isOperationCurrent()) return 'spend_failed';
    if (purchase.status === 'failed') {
      // зачем: причина отказа раньше терялась целиком — владелец видел только
      // «Жемчуг не списан», и один и тот же класс бага ловили вслепую трижды
      // (см. историю правок покупки наборов). Теперь причина уходит в лог.
      DebugLogger.error(
        'cardPackShardPurchase.ts:purchaseCardPackWithShards',
        new Error(`card_pack_spend_failed:${purchase.reason}:${pack.id}`),
        'critical',
      );
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Покупку не удалось сохранить. Жемчуг не списан.',
        messageUk: 'Не вдалося зберегти покупку. Перлини не списані.',
        messageEs: 'No se pudo guardar la compra. No se gastaron perlas.',
      });
      return 'spend_failed';
    }
    const committedOwned = await loadOwnedPackIds(studyTarget);
    primeOwnedPackIdsCache(committedOwned, studyTarget);
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
  });
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
  sourceLocale?: unknown,
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
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale)) {
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
