import { getBestFrameForLevel } from '../constants/avatars';
import {
  validateCustomizationPurchase,
  validateCustomizationPurchaseApply,
} from '../app/customization_purchase_validation';
import type { CustomizationPurchaseIntent } from '../app/customization_purchase_intent';
import type { CustomizationSnapshot } from '../app/customization_snapshot';
import { buildAtomicEditorAvatarPurchase } from '../app/customization_editor_purchase';
import { replaceCosmeticSaleOverrides } from '../constants/cosmetic_asset_availability';

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
    itemId: 'aura-ember',
    cost: 120,
    spendReason: 'avatar_aura',
    mode: 'buy-only',
    ownedValue: true,
    ...overrides,
  } as CustomizationPurchaseIntent;
}

const noPlus = { snapshot, isPremium: false, isVip: false };

describe('customization purchase validation', () => {
  afterEach(() => replaceCosmeticSaleOverrides({}, 0));

  it('accepts the current shard aura product and rejects a forged price', () => {
    expect(validateCustomizationPurchase(intent(), noPlus)).toBe(true);
    expect(validateCustomizationPurchase(intent({ cost: 1 }), noPlus)).toBe(false);
  });

  it.each([
    'aura-mint', 'aura-prism', 'aura-aurora', 'aura-violet', 'aura-coral',
    'aura-lagoon', 'aura-sunset', 'aura-rainbow-loop',
  ])('accepts approved shard aura %s at the catalog price', (itemId) => {
    expect(validateCustomizationPurchase(intent({ itemId }), noPlus)).toBe(true);
    expect(validateCustomizationPurchase(intent({ itemId, cost: 119 }), noPlus)).toBe(false);
  });

  it.each([
    'aura-flame-51',
    'aura-season',
    'aura-premium',
  ])('rejects removed or non-purchasable aura %s', (itemId) => {
    expect(validateCustomizationPurchase(intent({ itemId }), noPlus)).toBe(false);
  });

  it('accepts only the sale status currently delivered by the server catalog', () => {
    replaceCosmeticSaleOverrides({
      'aura:aura-aurora': true,
      'aura:aura-ember': false,
    }, 5);

    expect(validateCustomizationPurchase(intent({ itemId: 'aura-aurora' }), noPlus)).toBe(true);
    expect(validateCustomizationPurchase(intent({ itemId: 'aura-ember' }), noPlus)).toBe(false);
  });

  it('rejects an unowned gift-only avatar target', () => {
    expect(validateCustomizationPurchase(intent({
      target: 'avatar',
      itemId: 'custom-gen-01',
      cost: 90,
      spendReason: 'custom_avatar',
      ownedValue: 'violet:black',
    }), noPlus)).toBe(false);
  });

  // зачем: витрина = Avatar100 (73–126 без 90). Сервер обязан принимать точную
  // цену живого аватара и отклонять ЛЮБУЮ покупку снятого с продажи — включая
  // покупку по «правильной» исторической цене.
  it('accepts the exact Avatar100 price and rejects the legacy flat price', () => {
    const shopIntent = intent({
      v: 2,
      currency: 'pearls',
      target: 'avatar',
      itemId: 'custom-gen-73',
      cost: 70,
      spendReason: 'custom_avatar',
      ownedValue: 'avatar100-v1|aurora:white',
      avatarValue: 'custom:custom-gen-73:aurora:white:avatar100-v1',
    });

    expect(validateCustomizationPurchase(shopIntent, noPlus)).toBe(true);
    expect(validateCustomizationPurchase({ ...shopIntent, cost: 90 }, noPlus)).toBe(false);
  });

  it('accepts the canonical Yin rune price and rejects pearl or forged rune prices', () => {
    const yinIntent = intent({
      v: 2,
      currency: 'runes',
      target: 'avatar',
      itemId: 'custom-gen-73',
      cost: 5_600,
      spendReason: 'custom_avatar',
      ownedValue: 'avatar100-v1|aurora:black',
      avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
    });

    expect(validateCustomizationPurchase(yinIntent, noPlus)).toBe(true);
    expect(validateCustomizationPurchase(
      { ...yinIntent, currency: 'pearls' } as CustomizationPurchaseIntent,
      noPlus,
    )).toBe(false);
    expect(validateCustomizationPurchase({ ...yinIntent, cost: 5_599 }, noPlus)).toBe(false);
  });

  it('validates an editor avatar buy-and-apply against the confirmed aura only', () => {
    const avatarValue = 'custom:custom-gen-73:aurora:white:avatar100-v1';
    const confirmedSnapshot = {
      ...snapshot,
      storedAuraSelection: 'aura-mint',
      ownedAuras: { ...snapshot.ownedAuras, 'aura-mint': true as const },
    };
    const purchaseInput = buildAtomicEditorAvatarPurchase({
      purchaseInput: {
        target: 'avatar', itemId: 'custom-gen-73', cost: 70, currency: 'pearls',
        spendReason: 'custom_avatar', ownedValue: 'avatar100-v1|aurora:white',
        avatarValue, mode: 'buy-only',
      },
      selectedAvatarValue: avatarValue,
      confirmedStoredAuraSelection: confirmedSnapshot.storedAuraSelection,
      level: confirmedSnapshot.level,
      frameId: getBestFrameForLevel(confirmedSnapshot.level).id,
    });
    const purchaseIntent = {
      ...purchaseInput,
      v: 2 as const,
      currency: purchaseInput.currency ?? 'pearls',
      accountScope: 'account-a',
      opId: 'customization:editor-avatar',
      phase: 'prepared' as const,
      createdAt: 1,
    };

    const context = { ...noPlus, snapshot: confirmedSnapshot };
    expect(validateCustomizationPurchase(purchaseIntent, context)).toBe(true);
    expect(validateCustomizationPurchaseApply(purchaseIntent, context)).toBe(true);
    expect(purchaseIntent.target).toBe('avatar');
    expect(purchaseIntent.applyInput.storedAuraSelection).toBe('aura-mint');
    expect(JSON.stringify(purchaseIntent)).not.toContain('aura-ember');
  });

  it('keeps auras pearl-only', () => {
    expect(validateCustomizationPurchase(intent({ v: 2, currency: 'runes' }), noPlus)).toBe(false);
  });

  it('finishes an already charged legacy black entitlement but never starts a new pearl debit for it', () => {
    const legacy = intent({
      v: 1,
      target: 'avatar',
      itemId: 'custom-gen-73',
      cost: 70,
      spendReason: 'custom_avatar',
      ownedValue: 'avatar100-v1|aurora:black',
    });

    expect(validateCustomizationPurchase(legacy, noPlus)).toBe(false);
    expect(validateCustomizationPurchase({ ...legacy, phase: 'charged' }, noPlus)).toBe(true);
    expect(validateCustomizationPurchase({ ...legacy, phase: 'granted' }, noPlus)).toBe(true);
  });

  it.each([
    ['custom-gen-63', 50],
    ['custom-gen-41', 90],
    ['custom-gen-90', 100],
  ] as const)('refuses to sell retired avatar %s even at its historic price', (itemId, cost) => {
    expect(validateCustomizationPurchase(intent({
      target: 'avatar',
      itemId,
      cost,
      spendReason: 'custom_avatar',
      ownedValue: 'aurora:white',
      avatarValue: `custom:${itemId}:aurora:white`,
    }), noPlus)).toBe(false);
  });

  it('does not apply a locked Plus half after access expires', () => {
    const staleApply = intent({
      target: 'avatar',
      itemId: 'custom-gen-41',
      cost: 2_000,
      currency: 'runes',
      spendReason: 'custom_avatar_restyle',
      ownedValue: 'violet:black',
      avatarValue: 'custom:custom-gen-41:violet:black',
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
