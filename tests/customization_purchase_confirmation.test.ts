import {
  confirmPendingPurchase,
  reducePurchaseConfirmation,
} from '../app/customization_purchase_confirmation';
import type { PurchaseCustomizationInput } from '../app/customization_purchase_intent';

const purchaseInput: PurchaseCustomizationInput = {
  target: 'aura', itemId: 'aura-aurora', cost: 120,
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

it('closes the confirmation synchronously before a slow purchase finishes', async () => {
  const pending = reducePurchaseConfirmation(
    { pending: null },
    { type: 'request', input: purchaseInput },
  );
  let finishPurchase!: () => void;
  const execute = jest.fn(() => new Promise<void>((resolve) => { finishPurchase = resolve; }));
  const onAccepted = jest.fn();

  const purchase = confirmPendingPurchase(pending, execute, onAccepted);

  expect(onAccepted).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(1);
  finishPurchase();
  await purchase;
});
