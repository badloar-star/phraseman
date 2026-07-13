import type { PurchaseCustomizationInput } from './customization_purchase_intent';

export interface PurchaseConfirmationState {
  pending: PurchaseCustomizationInput | null;
}

export type PurchaseConfirmationEvent =
  | { type: 'request'; input: PurchaseCustomizationInput }
  | { type: 'cancel' };

export function reducePurchaseConfirmation(
  state: PurchaseConfirmationState,
  event: PurchaseConfirmationEvent,
): PurchaseConfirmationState {
  if (event.type === 'cancel') return { pending: null };
  return state.pending === event.input ? state : { pending: event.input };
}

export async function confirmPendingPurchase<T>(
  state: PurchaseConfirmationState,
  execute: (input: PurchaseCustomizationInput) => Promise<T>,
): Promise<T | undefined> {
  if (!state.pending) return undefined;
  return execute(state.pending);
}
