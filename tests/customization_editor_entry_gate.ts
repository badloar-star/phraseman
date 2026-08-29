import assert from 'node:assert/strict';

type ModuleShape = typeof import('../app/customization_editor_entry');

void (async () => {
  let editorEntry: ModuleShape | null = null;
  try {
    editorEntry = await import('../app/customization_editor_entry');
  } catch {
    // The assertion below is the intentional RED before the presentation
    // resolver exists.
  }
  assert.ok(editorEntry, 'customization editor entry resolver must exist');

  const unchanged = { kind: 'unchanged' as const };
  const activeAvatar = editorEntry.resolveCustomizationEditorEntry({
    activeTab: 'avatars',
    hasCustomAvatar: true,
    resolvedAction: unchanged,
  });
  assert.equal(activeAvatar.opensEditor, true);
  assert.equal(activeAvatar.usesEditorLabel, true);
  assert.deepEqual(
    activeAvatar.actionBarAction,
    { kind: 'apply' },
    'active unchanged Avatar100 needs a synthetic visible presentation action',
  );
  assert.equal(activeAvatar.economicAction, unchanged, 'economic semantics must remain unchanged');

  const editableActions = [
    { kind: 'apply' as const },
    {
      kind: 'buy-only' as const,
      target: 'avatar' as const,
      purchaseKind: 'purchase' as const,
      currency: 'pearls' as const,
      cost: 70,
    },
    {
      kind: 'buy-and-apply' as const,
      target: 'avatar' as const,
      purchaseKind: 'purchase' as const,
      currency: 'runes' as const,
      cost: 5_600,
    },
  ];
  for (const action of editableActions) {
    const result = editorEntry.resolveCustomizationEditorEntry({
      activeTab: 'avatars',
      hasCustomAvatar: true,
      resolvedAction: action,
    });
    assert.equal(result.opensEditor, true, `${action.kind} custom avatar should open editor`);
    assert.equal(result.usesEditorLabel, true);
    assert.equal(result.economicAction, action);
  }

  const blockers = [
    { kind: 'open-plus' as const },
    { kind: 'explain-pro-reward' as const },
    { kind: 'explain-level' as const, level: 90 },
    { kind: 'explain-reward' as const },
  ];
  for (const blocker of blockers) {
    const result = editorEntry.resolveCustomizationEditorEntry({
      activeTab: 'avatars',
      hasCustomAvatar: true,
      resolvedAction: blocker,
    });
    assert.equal(result.opensEditor, false, `${blocker.kind} must not open editor`);
    assert.equal(result.usesEditorLabel, false, `${blocker.kind} must keep its original label`);
    assert.equal(result.actionBarAction, blocker, `${blocker.kind} must keep its original action`);
    assert.equal(result.economicAction, blocker);
  }

  const auraPurchaseWhilePreviewingAvatar = {
    kind: 'buy-and-apply' as const,
    target: 'aura' as const,
    purchaseKind: 'purchase' as const,
    currency: 'pearls' as const,
    cost: 120,
  };
  const auraPurchaseResult = editorEntry.resolveCustomizationEditorEntry({
    activeTab: 'avatars',
    hasCustomAvatar: true,
    resolvedAction: auraPurchaseWhilePreviewingAvatar,
  });
  assert.equal(auraPurchaseResult.opensEditor, false);
  assert.equal(auraPurchaseResult.actionBarAction, auraPurchaseWhilePreviewingAvatar);

  const auraResult = editorEntry.resolveCustomizationEditorEntry({
    activeTab: 'auras',
    hasCustomAvatar: true,
    resolvedAction: { kind: 'apply' },
  });
  assert.equal(auraResult.opensEditor, false, 'aura action must never open avatar editor');

  console.log('customization_editor_entry_gate: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
