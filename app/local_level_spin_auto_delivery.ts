import type { AccountGenerationToken } from './account_generation';
import { isCurrentAccountGeneration } from './account_generation';
import { DebugLogger } from './debug-logger';
import {
  markLevelSpinGiftOccurrenceClaimed,
  readLevelSpinGiftOccurrenceClaimState,
} from './level_gift_inventory';
import {
  applyGift,
  confirmDeferredLocalLevelGiftEffectReceipt,
  type ApplyGiftResult,
} from './level_gift_system';
import {
  localLevelSpinReceiptToInventory,
  type LocalLevelSpinReceipt,
} from './level_spin_local_contract';
import type { RuntimeStudyTarget } from './target_storage_keys';

type LocalSpinDeliveryInput = Readonly<{
  accountToken: AccountGenerationToken;
  userName: string;
  currentEnergy: number;
  maxEnergy: number;
  setEnergy: (nextEnergy: number) => void | Promise<void>;
  studyTarget?: RuntimeStudyTarget;
}>;

export async function applyLocalLevelSpinRewardExactlyOnce(
  receipt: LocalLevelSpinReceipt,
  input: LocalSpinDeliveryInput,
): Promise<ApplyGiftResult> {
  // зачем (владелец, 2026-09-17): выдача приза могла провалиться на любом из
  // семи ранних выходов и на общем catch — и все они молчали. Владелец видел
  // «приз выпал, а баланс тот же» без единой строки в логах. Префикс
  // [GIFT-DELIVERY] вытаскивает всю цепочку одним поиском.
  const trace = `[GIFT-DELIVERY] spin requestId=${receipt.requestId}`
    + ` giftId=${receipt.baseGiftId} kind=${receipt.kind} level=${receipt.level}`;
  if (receipt.localOnly !== true
    || receipt.stableUid !== input.accountToken.stableId
    || !isCurrentAccountGeneration(input.accountToken, receipt.stableUid)) {
    DebugLogger.warn(
      'local_level_spin_auto_delivery:receipt_rejected',
      `${trace} отказ: localOnly=${String(receipt.localOnly)}`
      + ` receiptUid=${receipt.stableUid ?? 'null'} tokenUid=${input.accountToken.stableId ?? 'null'}`
      + ` currentGeneration=${String(isCurrentAccountGeneration(input.accountToken, receipt.stableUid))}`,
    );
    return { success: false };
  }
  try {
    const occurrenceId = `level-spin:${receipt.requestId}:base`;
    const outerClaimState = await readLevelSpinGiftOccurrenceClaimState(
      receipt.requestId,
      'base',
      input.accountToken,
    );
    if (outerClaimState === 'claimed') {
      const confirmed = await confirmDeferredLocalLevelGiftEffectReceipt(input.accountToken, occurrenceId);
      DebugLogger.info(
        'local_level_spin_auto_delivery:already_claimed',
        `${trace} приз уже выдан ранее, повторного начисления нет.`
        + ` confirmReceipt=${String(confirmed)}`,
      );
      return confirmed ? { success: false, alreadyClaimed: true } : { success: false };
    }
    if (outerClaimState !== 'pending') {
      DebugLogger.warn(
        'local_level_spin_auto_delivery:claim_state_not_pending',
        `${trace} выход: состояние заявки claimState=${String(outerClaimState)} (ждали 'pending')`,
      );
      return { success: false };
    }
    const gift = localLevelSpinReceiptToInventory(receipt).gift;
    const result = await applyGift(
      gift,
      input.userName,
      input.currentEnergy,
      input.maxEnergy,
      input.setEnergy,
      {
        accountToken: input.accountToken,
        deferEffectReceiptConfirmation: true,
        occurrenceId,
        localOnly: true,
        studyTarget: input.studyTarget,
      },
    );
    if ((!result.success && !result.alreadyClaimed)
      || !isCurrentAccountGeneration(input.accountToken, receipt.stableUid)) {
      DebugLogger.warn(
        'local_level_spin_auto_delivery:apply_failed',
        `${trace} эффект НЕ применён: applySuccess=${String(result.success)}`
        + ` alreadyClaimed=${String(result.alreadyClaimed)}`
        + ` sameAccount=${String(isCurrentAccountGeneration(input.accountToken, receipt.stableUid))}`
        + ` energyBefore=${input.currentEnergy} energyMax=${input.maxEnergy}`,
      );
      return result;
    }
    const outerClaimed = await markLevelSpinGiftOccurrenceClaimed(
      receipt.requestId,
      'base',
      input.accountToken,
    );
    if (!outerClaimed) {
      DebugLogger.warn(
        'local_level_spin_auto_delivery:mark_claimed_failed',
        `${trace} эффект применён, но пометка «выдано» НЕ записалась —`
        + ' приз может быть предложен повторно. markClaimed=false',
      );
      return { success: false };
    }
    const confirmed = await confirmDeferredLocalLevelGiftEffectReceipt(input.accountToken, occurrenceId);
    if (!confirmed) {
      DebugLogger.warn(
        'local_level_spin_auto_delivery:receipt_not_confirmed',
        `${trace} расписка об эффекте НЕ подтверждена: confirmReceipt=false`,
      );
      return { success: false };
    }
    DebugLogger.info(
      'local_level_spin_auto_delivery:delivered',
      `${trace} ВЫДАН мгновенно: applySuccess=${String(result.success)} occurrenceId=${occurrenceId}`,
    );
    return result;
  } catch (e) {
    // зачем: до 2026-09-17 здесь стоял немой catch {} — падение выдачи приза
    // не оставляло ни строки, и «приз выпал, а баланса нет» было неотлаживаемо.
    DebugLogger.error(
      'local_level_spin_auto_delivery:threw',
      e instanceof Error ? e : new Error(String(e)),
      'critical',
    );
    return { success: false };
  }
}
