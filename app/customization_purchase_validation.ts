import { AVATAR_AURA_BUY_COST, NO_AVATAR_AURA_ID } from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_RESTYLE_COST,
  CUSTOM_AVATAR_RUNE_RESTYLE_COST,
  encodeCustomAvatarOwnedStyle,
  getCustomAvatarPurchaseCost,
  getCustomAvatarRuneCost,
  parseCustomAvatarOwnedStyle,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';
import { getBestFrameForLevel } from '../constants/avatars';
import { buildAuraCatalog, buildAvatarCatalog } from './customization_catalog';
import type { CustomizationPurchaseIntent } from './customization_purchase_intent';
import type { CustomizationSnapshot } from './customization_snapshot';

export interface CustomizationPurchaseValidationContext {
  snapshot: CustomizationSnapshot;
  isPremium: boolean;
  isVip: boolean;
  isPro?: boolean;
}

function intentCurrency(intent: CustomizationPurchaseIntent): 'pearls' | 'runes' {
  return intent.v === 1 ? 'pearls' : intent.currency;
}

function validAvatarValues(intent: CustomizationPurchaseIntent) {
  if (intent.target !== 'avatar'
    || typeof intent.ownedValue !== 'string'
    || typeof intent.avatarValue !== 'string') return null;
  const parsed = parseCustomAvatarValue(intent.avatarValue);
  if (!parsed
    || parsed.avatarId !== intent.itemId
    || !CUSTOM_AVATAR_GRADIENTS.some((gradient) => gradient.id === parsed.gradientId)
    || encodeCustomAvatarOwnedStyle(parsed) !== intent.ownedValue) return null;
  return parsed;
}

export function validateCustomizationPurchase(
  intent: CustomizationPurchaseIntent,
  context: CustomizationPurchaseValidationContext,
): boolean {
  const { snapshot } = context;
  if (intent.target === 'avatar') {
    if (intent.v === 1 && intent.phase !== 'prepared' && typeof intent.ownedValue === 'string') {
      const legacyStyle = parseCustomAvatarOwnedStyle(intent.itemId, intent.ownedValue);
      const legacyItem = buildAvatarCatalog({
        activeAvatar: snapshot.activeAvatar,
        ownedAvatars: snapshot.ownedAvatars,
        giftedAvatarId: snapshot.giftedAvatarId,
        side: 'yang',
      }).find((candidate) => candidate.id === intent.itemId);
      return !!legacyStyle
        && legacyItem?.kind === 'custom-avatar'
        && intent.spendReason === 'custom_avatar'
        && legacyItem.availability.kind === 'shards'
        && intent.cost === getCustomAvatarPurchaseCost(legacyItem.avatar);
    }
    const parsed = validAvatarValues(intent);
    if (!parsed) return false;
    const currency = intentCurrency(intent);
    const side = parsed.logoColor === 'black' ? 'yin' : 'yang';
    if ((side === 'yin' && currency !== 'runes') || (side === 'yang' && currency !== 'pearls')) return false;
    const item = buildAvatarCatalog({
      activeAvatar: snapshot.activeAvatar,
      ownedAvatars: snapshot.ownedAvatars,
      giftedAvatarId: snapshot.giftedAvatarId,
      side,
    }).find((candidate) => candidate.id === intent.itemId);
    if (!item || item.kind !== 'custom-avatar') return false;
    if (intent.spendReason === 'custom_avatar') {
      const canonicalCost = currency === 'runes'
        ? getCustomAvatarRuneCost(item.avatar)
        : getCustomAvatarPurchaseCost(item.avatar);
      const purchasable = currency === 'runes'
        ? item.availability.kind === 'runes'
        : item.availability.kind === 'shards';
      return (purchasable || (intent.phase === 'granted' && item.isOwned))
        && intent.cost === canonicalCost;
    }
    return intent.spendReason === 'custom_avatar_restyle'
      && item.availability.kind === 'owned'
      && intent.cost === (currency === 'runes'
        ? CUSTOM_AVATAR_RUNE_RESTYLE_COST
        : CUSTOM_AVATAR_RESTYLE_COST);
  }

  if (intentCurrency(intent) !== 'pearls'
    || intent.spendReason !== 'avatar_aura'
    || intent.ownedValue !== true) return false;
  const item = buildAuraCatalog({
    activeAvatar: snapshot.activeAvatar,
    activeAuraId: snapshot.storedAuraSelection,
    level: snapshot.level,
    ownedAuras: snapshot.ownedAuras,
    isPremium: context.isPremium,
    isVip: context.isVip,
    isPro: context.isPro,
  }).find((candidate) => candidate.id === intent.itemId);
  return item?.kind === 'aura'
    && (item.availability.kind === 'shards' || (intent.phase === 'granted' && item.isOwned))
    && intent.cost === AVATAR_AURA_BUY_COST;
}

export function validateCustomizationPurchaseApply(
  intent: CustomizationPurchaseIntent,
  context: CustomizationPurchaseValidationContext,
): boolean {
  if (intent.mode !== 'buy-and-apply') return true;
  const { snapshot } = context;
  const apply = intent.applyInput;
  if (apply.level !== snapshot.level || apply.frameId !== getBestFrameForLevel(snapshot.level).id) return false;

  const ownedAvatars = intent.target === 'avatar'
    ? { ...snapshot.ownedAvatars, [intent.itemId]: String(intent.ownedValue) }
    : snapshot.ownedAvatars;
  const ownedAuras = intent.target === 'aura'
    ? { ...snapshot.ownedAuras, [intent.itemId]: true as const }
    : snapshot.ownedAuras;

  const parsedAvatar = parseCustomAvatarValue(apply.avatarValue);
  if (parsedAvatar) {
    const avatarItem = buildAvatarCatalog({
      activeAvatar: snapshot.activeAvatar,
      ownedAvatars,
      giftedAvatarId: snapshot.giftedAvatarId,
      side: parsedAvatar.logoColor === 'black' ? 'yin' : 'yang',
    }).find((candidate) => candidate.id === parsedAvatar.avatarId);
    if (!avatarItem?.isOwned) return false;
    if (intent.target === 'avatar' && parsedAvatar.avatarId !== intent.itemId) return false;
  } else if (intent.target === 'avatar' || apply.avatarValue !== snapshot.activeAvatar) {
    return false;
  }

  if (intent.target !== 'avatar' && apply.avatarValue !== snapshot.activeAvatar) return false;
  if (intent.target === 'avatar' && apply.storedAuraSelection !== snapshot.storedAuraSelection) return false;
  if (intent.target === 'aura' && apply.storedAuraSelection !== intent.itemId) return false;
  if (apply.storedAuraSelection === null || apply.storedAuraSelection === NO_AVATAR_AURA_ID) return true;

  const auraItem = buildAuraCatalog({
    activeAvatar: apply.avatarValue,
    activeAuraId: snapshot.storedAuraSelection,
    level: snapshot.level,
    ownedAuras,
    isPremium: context.isPremium,
    isVip: context.isVip,
    isPro: context.isPro,
  }).find((candidate) => candidate.id === apply.storedAuraSelection);
  return auraItem?.isOwned === true;
}
