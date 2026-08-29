import {
  clearCustomizationDevSandbox,
  createCustomizationDevSandbox,
  previewInCustomizationDevSandbox,
  toggleCustomizationDevSandbox,
} from '../app/customization_dev_sandbox';
import {
  CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY,
  inspectLegacyCustomizationDevGrant,
} from '../app/customization_dev_legacy_cleanup';

const baseline = Object.freeze({
  avatarValue: '18',
  storedAuraSelection: null,
});

describe('session-only customization DEV sandbox', () => {
  it('keeps apply preview-only and restores the exact baseline on the second toggle', () => {
    const disabled = createCustomizationDevSandbox();
    const enabled = toggleCustomizationDevSandbox(disabled, 'owner-a', baseline);

    expect(enabled.sandbox).toMatchObject({ active: true, ownerStableId: 'owner-a', baseline });
    const previewed = previewInCustomizationDevSandbox(enabled.sandbox, 'owner-a', {
      avatarValue: 'custom:custom-gen-73:graphite:black',
      storedAuraSelection: 'aura-ember',
    });
    expect(previewed.preview).toEqual({
      avatarValue: 'custom:custom-gen-73:graphite:black',
      storedAuraSelection: 'aura-ember',
    });

    const disabledAgain = toggleCustomizationDevSandbox(
      previewed.sandbox,
      'owner-a',
      previewed.preview,
    );
    expect(disabledAgain.sandbox).toEqual({ active: false });
    expect(disabledAgain.preview).toEqual(baseline);
  });

  it('clears on account switch and restores the captured preview without publishing it', () => {
    const enabled = toggleCustomizationDevSandbox(
      createCustomizationDevSandbox(),
      'owner-a',
      baseline,
    );
    const previewed = previewInCustomizationDevSandbox(enabled.sandbox, 'owner-a', {
      avatarValue: 'custom:custom-gen-74:forest:black',
      storedAuraSelection: 'aura-nimbus',
    });

    const cleared = clearCustomizationDevSandbox(previewed.sandbox);
    expect(cleared).toEqual({ sandbox: { active: false }, preview: baseline });
  });

  it('fails closed if a preview is attempted for another account', () => {
    const enabled = toggleCustomizationDevSandbox(
      createCustomizationDevSandbox(),
      'owner-a',
      baseline,
    );
    expect(() => previewInCustomizationDevSandbox(enabled.sandbox, 'owner-b', baseline))
      .toThrow('customization_dev_sandbox_account_mismatch');
  });
});

describe('legacy DEV grant cleanup evidence', () => {
  it('preserves unknown committed receipt IDs and performs no storage mutation', async () => {
    const values = new Map<string, string>([
      ['custom_avatar_owned_v1', JSON.stringify({ 'custom-gen-73': 'graphite:black', keep: 'gold:white' })],
      ['avatar_aura_owned_v1', JSON.stringify({ 'aura-ember': true, keepAura: true })],
      [CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY, JSON.stringify({
        v: 1,
        operationId: 'dev:customization:avatar100-and-all-auras:v1',
        state: 'committed',
        avatarIds: ['custom-gen-73'],
        auraIds: ['aura-ember'],
      })],
    ]);
    const before = Object.fromEntries(values);
    const outcome = await inspectLegacyCustomizationDevGrant({
      getItem: async (key) => values.get(key) ?? null,
    });

    expect(outcome).toEqual({
      status: 'preserved-unknown',
      receiptState: 'committed',
      removedAvatarIds: [],
      removedAuraIds: [],
      preservedAvatarIds: ['custom-gen-73'],
      preservedAuraIds: ['aura-ember'],
      reason: 'missing_dev_exclusive_provenance',
    });
    expect(Object.fromEntries(values)).toEqual(before);
  });

  it('preserves pending and malformed receipts fail-closed', async () => {
    const pending = JSON.stringify({
      v: 1,
      operationId: 'dev:customization:avatar100-and-all-auras:v1',
      state: 'pending',
      avatarIds: ['custom-gen-73'],
      auraIds: ['aura-ember'],
    });
    await expect(inspectLegacyCustomizationDevGrant({ getItem: async () => pending }))
      .resolves.toMatchObject({ status: 'preserved-unknown', receiptState: 'pending' });
    await expect(inspectLegacyCustomizationDevGrant({ getItem: async () => '{broken' }))
      .resolves.toEqual({
        status: 'invalid-preserved',
        removedAvatarIds: [],
        removedAuraIds: [],
        reason: 'invalid_legacy_receipt',
      });
  });
});
