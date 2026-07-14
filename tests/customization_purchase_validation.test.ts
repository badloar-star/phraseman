import { getBestFrameForLevel } from '../constants/avatars';
import {
  validateCustomizationPurchase,
  validateCustomizationPurchaseApply,
} from '../app/customization_purchase_validation';
import type { CustomizationPurchaseIntent } from '../app/customization_purchase_intent';
import type { CustomizationSnapshot } from '../app/customization_snapshot';

const snapshot: CustomizationSnapshot = {
  source: 'storage', updatedAt: 1, activeAvatar: '18', storedAuraSelection: null,
  totalXp: 100, level: 18, shards: 100, ownedAvatars: {}, ownedAuras: {},
  giftedAvatarId: null, giftedAuraId: null,
};

function intent(overrides: Partial<CustomizationPurchaseIntent> = {}): CustomizationPurchaseIntent {
  return {
    v: 1,
    accountScope: 'account-a',
    opId: 'customization:test',
    phase: 'prepared',
    createdAt: 1,
    target: 'aura',
    itemId: 'aura-aurora',
    cost: 50,
    spendReason: 'avatar_aura',
    mode: 'buy-only',
    ownedValue: true,
    ...overrides,
  } as CustomizationPurchaseIntent;
}

const noPlus = { snapshot, isPremium: false, isVip: false };

describe('customization purchase validation', () => {
  it('accepts the current shard aura product and rejects a forged price', () => {
    expect(validateCustomizationPurchase(intent(), noPlus)).toBe(true);
    expect(validateCustomizationPurchase(intent({ cost: 1 }), noPlus)).toBe(false);
  });

  it.each(['aura-season', 'aura-premium'])('rejects non-purchasable aura %s', (itemId) => {
    expect(validateCustomizationPurchase(intent({ itemId }), noPlus)).toBe(false);
  });

  it('rejects an unowned gift-only avatar target', () => {
    expect(validateCustomizationPurchase(intent({
      target: 'avatar',
      itemId: 'custom-gen-01',
      cost: 35,
      spendReason: 'custom_avatar',
      ownedValue: 'violet:black',
    }), noPlus)).toBe(false);
  });

  it('does not apply a locked Plus half after access expires', () => {
    const staleApply = intent({
      target: 'avatar',
      itemId: 'custom-gen-41',
      cost: 35,
      spendReason: 'custom_avatar',
      ownedValue: 'violet:black',
      mode: 'buy-and-apply',
      applyInput: {
        avatarValue: 'custom:custom-gen-41:violet:black',
        storedAuraSelection: 'aura-premium',
        level: snapshot.level,
        frameId: getBestFrameForLevel(snapshot.level).id,
      },
    });
    expect(validateCustomizationPurchaseApply(staleApply, {
      snapshot: { ...snapshot, storedAuraSelection: 'aura-premium' },
      isPremium: false,
      isVip: false,
    })).toBe(false);
  });
});
