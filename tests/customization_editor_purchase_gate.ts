import assert from 'node:assert/strict';

type ModuleShape = typeof import('../app/customization_editor_purchase');

void (async () => {
  let editorPurchase: ModuleShape | null = null;
  try {
    editorPurchase = await import('../app/customization_editor_purchase');
  } catch {
    // Intentional RED assertion below before the atomic editor input builder exists.
  }
  assert.ok(editorPurchase, 'atomic editor avatar purchase builder must exist');

  const selectedAvatar = 'custom:custom-gen-73:aurora:white:avatar100-v1';
  const confirmedAura = 'aura-mint';
  const unpaidPreviewAura = 'aura-ember';
  const baseBuyOnly = {
    target: 'avatar' as const,
    itemId: 'custom-gen-73',
    cost: 70,
    currency: 'pearls' as const,
    spendReason: 'custom_avatar' as const,
    ownedValue: 'avatar100-v1|aurora:white',
    avatarValue: selectedAvatar,
    mode: 'buy-only' as const,
  };

  const result = editorPurchase.buildAtomicEditorAvatarPurchase({
    purchaseInput: baseBuyOnly,
    selectedAvatarValue: selectedAvatar,
    confirmedStoredAuraSelection: confirmedAura,
    level: 18,
    frameId: 'frame-18',
  });

  assert.deepEqual(result, {
    ...baseBuyOnly,
    mode: 'buy-and-apply',
    applyInput: {
      avatarValue: selectedAvatar,
      storedAuraSelection: confirmedAura,
      level: 18,
      frameId: 'frame-18',
      cloudSyncMode: 'immediate',
    },
  });
  assert.equal(result.itemId, baseBuyOnly.itemId);
  assert.equal(result.currency, baseBuyOnly.currency);
  assert.equal(result.cost, baseBuyOnly.cost);
  assert.equal(result.ownedValue, baseBuyOnly.ownedValue);
  assert.equal(JSON.stringify(result).includes(unpaidPreviewAura), false);

  const compositeOperations = [result];
  assert.equal(compositeOperations.filter((operation) => operation.target === 'avatar').length, 1);
  assert.equal(compositeOperations.filter((operation) => operation.target === 'aura').length, 0);
  assert.equal(compositeOperations.filter((operation) => operation.spendReason === 'avatar_aura').length, 0);

  console.log('customization_editor_purchase_gate: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
