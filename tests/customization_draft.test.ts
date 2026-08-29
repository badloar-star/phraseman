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
    })).toEqual({
      kind: 'buy-and-apply',
      target: 'avatar',
      purchaseKind: 'purchase',
      currency: 'pearls',
      cost: 90,
    });
  });

  it('buys and applies a Yin rune blocker', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: 'custom:custom-gen-42:violet:black',
      avatarAvailability: { kind: 'runes', cost: 7_200 },
    })).toEqual({
      kind: 'buy-and-apply',
      target: 'avatar',
      purchaseKind: 'purchase',
      currency: 'runes',
      cost: 7_200,
    });
  });

  it('resolves two shard blockers one at a time from active tab', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      activeTab: 'auras',
      avatarAvailability: { kind: 'shards', cost: 90 },
      auraAvailability: { kind: 'shards', cost: 120 },
    })).toEqual({
      kind: 'buy-only',
      target: 'aura',
      purchaseKind: 'purchase',
      currency: 'pearls',
      cost: 120,
    });
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

  it('explains that Pro aura is a special Pro account reward', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      auraAvailability: { kind: 'pro' },
    })).toEqual({ kind: 'explain-pro-reward' });
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
    })).toEqual({
      kind: 'buy-and-apply',
      target: 'avatar',
      purchaseKind: 'restyle',
      currency: 'pearls',
      cost: 25,
    });
  });

  it('charges 25 shards for restyling a non-active owned avatar', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: 'custom:custom-gen-42:aurora:white',
      ownedAvatarStyles: { 'custom-gen-42': 'violet:black' },
      avatarAvailability: owned,
    })).toEqual({
      kind: 'buy-and-apply',
      target: 'avatar',
      purchaseKind: 'restyle',
      currency: 'pearls',
      cost: 25,
    });
  });

  it('charges 2,000 runes for a Yin restyle', () => {
    expect(resolveCustomizationAction({
      ...availableDraft,
      previewAvatarValue: 'custom:custom-gen-41:ember:black',
      avatarAvailability: owned,
    })).toEqual({
      kind: 'buy-and-apply',
      target: 'avatar',
      purchaseKind: 'restyle',
      currency: 'runes',
      cost: 2_000,
    });
  });

  it.each([
    [null, true, false, false, 'aura-plus'],
    [null, false, true, false, 'aura-plus'],
    [null, true, false, true, 'aura-pro'],
    ['none', true, true, true, null],
    ['aura-ember', true, true, false, 'aura-ember'],
    ['aura-premium', false, false, false, 'aura-plus'],
    ['aura-vip', false, false, false, 'aura-plus'],
    ['aura-pro', false, false, false, 'aura-pro'],
  ] as const)('resolves preview %s independently from apply eligibility', (stored, premium, vip, pro, effective) => {
    expect(resolveEffectivePreviewAuraId(stored, premium, vip, pro)).toBe(effective);
  });
});
