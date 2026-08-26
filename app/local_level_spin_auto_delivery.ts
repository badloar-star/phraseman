import type { AccountGenerationToken } from './account_generation';
import { isCurrentAccountGeneration } from './account_generation';
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
  if (receipt.localOnly !== true
    || receipt.stableUid !== input.accountToken.stableId
    || !isCurrentAccountGeneration(input.accountToken, receipt.stableUid)) {
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
      return confirmed ? { success: false, alreadyClaimed: true } : { success: false };
    }
    if (outerClaimState !== 'pending') return { success: false };
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
      || !isCurrentAccountGeneration(input.accountToken, receipt.stableUid)) return result;
    const outerClaimed = await markLevelSpinGiftOccurrenceClaimed(
      receipt.requestId,
      'base',
      input.accountToken,
    );
    if (!outerClaimed) return { success: false };
    const confirmed = await confirmDeferredLocalLevelGiftEffectReceipt(input.accountToken, occurrenceId);
    if (!confirmed) return { success: false };
    return result;
  } catch {
    return { success: false };
  }
}
