import type { ApplyCustomizationInput } from './customization_service';
import type { PurchaseCustomizationInput } from './customization_purchase_intent';

export type AtomicEditorAvatarPurchaseInput = PurchaseCustomizationInput & Readonly<{
  target: 'avatar';
  mode: 'buy-and-apply';
  applyInput: ApplyCustomizationInput;
}>;

export function buildAtomicEditorAvatarPurchase(input: Readonly<{
  purchaseInput: PurchaseCustomizationInput;
  selectedAvatarValue: string;
  confirmedStoredAuraSelection: string | null;
  level: number;
  frameId: string;
}>): AtomicEditorAvatarPurchaseInput {
  const selectedAvatarValue = input.selectedAvatarValue.trim();
  if (input.purchaseInput.target !== 'avatar'
    || !selectedAvatarValue
    || input.purchaseInput.avatarValue !== selectedAvatarValue) {
    throw new Error('invalid_editor_avatar_purchase');
  }

  return {
    ...input.purchaseInput,
    target: 'avatar',
    mode: 'buy-and-apply',
    applyInput: {
      avatarValue: selectedAvatarValue,
      // An unpaid preview aura is deliberately excluded. The avatar grant and
      // apply stay one legal composite without silently buying a second item.
      storedAuraSelection: input.confirmedStoredAuraSelection,
      level: input.level,
      frameId: input.frameId,
      cloudSyncMode: input.purchaseInput.cost > 0 ? 'immediate' : 'deferred',
    },
  };
}
