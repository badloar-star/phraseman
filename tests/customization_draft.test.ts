import {
  resolveCustomizationAction,
  resolveEffectivePreviewAuraId,
  type CustomizationDraft,
} from '../app/customization_draft';

const owned = { kind: 'owned' } as const;
const availableDraft: CustomizationDraft = {
  confirmed: {
    avatarValue: 'custom:custom-gen-41:violet:black',
    storedAuraSelection: null,
  },
  previewAvatarValue: 'custom:custom-gen-42:violet:black',
  previewStoredAuraSelection: 'none',
  effectivePreviewAuraId: null,
  activeTab: 'avatars',
  avatarAvailability: owned,
  auraAvailability: { kind: 'none' },
  ownedAvatarStyles: {},
};

describe('resolveCustomizationAction', () => {
  it('applies an entirely available draft', () => {
    expect(resolveCustomizationAction(availableDraft)).toEqual({ kind: 'apply' });
  });

  it('buys and applies one shard blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      avatarAvailability: { kind: 'shards', cost: 90 },
    })).toEqual({ kind: 'buy-and-apply', target: 'avatar', purchaseKind: 'purchase', cost: 90 });
  });

  it('resolves two shard blockers one at a time from active tab', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      activeTab: 'auras',
      avatarAvailability: { kind: 'shards', cost: 90 },
      auraAvailability: { kind: 'shards', cost: 120 },
    })).toEqual({ kind: 'buy-only', target: 'aura', purchaseKind: 'purchase', cost: 120 });
  });

  it('does not partially apply a level blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'level', level: 51 },
    })).toEqual({ kind: 'explain-level', level: 51 });
  });

  it('opens Plus for a Plus blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'plus' },
    })).toEqual({ kind: 'open-plus' });
  });

  it('explains a special reward without applying the avatar half', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'reward' },
    })).toEqual({ kind: 'explain-reward' });
  });

  it('returns unchanged when stored selections equal confirmed state', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: availableDraft.confirmed.avatarValue,
      previewStoredAuraSelection: null,
      effectivePreviewAuraId: 'aura-premium',
      auraAvailability: owned,
    })).toEqual({ kind: 'unchanged' });
  });

  it('charges 25 shards for a style delta on the same owned avatar', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: 'custom:custom-gen-41:aurora:white',
      avatarAvailability: owned,
    })).toEqual({ kind: 'buy-and-apply', target: 'avatar', purchaseKind: 'restyle', cost: 25 });
  });

  it('charges 25 shards for restyling a non-active owned avatar', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: 'custom:custom-gen-42:aurora:white',
      ownedAvatarStyles: { 'custom-gen-42': 'violet:black' },
      avatarAvailability: owned,
    })).toEqual({ kind: 'buy-and-apply', target: 'avatar', purchaseKind: 'restyle', cost: 25 });
  });

  it.each([
    [null, true, false, 'aura-premium'],
    [null, false, true, 'aura-vip'],
    ['none', true, true, null],
    ['aura-aurora', true, true, 'aura-aurora'],
    ['aura-premium', false, false, null],
    ['aura-vip', false, false, null],
  ] as const)('keeps stored %s distinct from effective fallback', (stored, premium, vip, effective) => {
    expect(resolveEffectivePreviewAuraId(stored, premium, vip)).toBe(effective);
  });
});
