import {
  confirmPendingPurchase,
  reducePurchaseConfirmation,
} from '../app/customization_purchase_confirmation';
import type { PurchaseCustomizationInput } from '../app/customization_purchase_intent';

const purchaseInput: PurchaseCustomizationInput = {
  target: 'aura', itemId: 'aura-aurora', cost: 35,
  spendReason: 'avatar_aura', mode: 'buy-only', ownedValue: true,
};

it('does not execute on request and executes only after explicit confirm', async () => {
  const execute = jest.fn().mockResolvedValue(undefined);
  const pending = reducePurchaseConfirmation(
    { pending: null },
    { type: 'request', input: purchaseInput },
  );

  expect(execute).not.toHaveBeenCalled();
  await confirmPendingPurchase(pending, execute);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(purchaseInput);
});
