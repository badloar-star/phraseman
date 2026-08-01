import { AVATAR_AURA_BUY_COST, NO_AVATAR_AURA_ID } from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_BUY_COST,
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_RESTYLE_COST,
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

function validAvatarOwnedValue(itemId: string, ownedValue: true | string): ownedValue is string {
  if (typeof ownedValue !== 'string') return false;
  const [gradientId, logoColor, extra] = ownedValue.split(':');
  if (extra !== undefined
    || !CUSTOM_AVATAR_GRADIENTS.some((gradient) => gradient.id === gradientId)
    || (logoColor !== 'black' && logoColor !== 'white')) return false;
  const parsed = parseCustomAvatarValue(`custom:${itemId}:${ownedValue}`);
  return parsed?.avatarId === itemId;
}

export function validateCustomizationPurchase(
  intent: CustomizationPurchaseIntent,
  context: CustomizationPurchaseValidationContext,
): boolean {
  const { snapshot } = context;
  if (intent.target === 'avatar') {
    if (!validAvatarOwnedValue(intent.itemId, intent.ownedValue)) return false;
    const item = buildAvatarCatalog({
      activeAvatar: snapshot.activeAvatar,
      ownedAvatars: snapshot.ownedAvatars,
      giftedAvatarId: snapshot.giftedAvatarId,
    }).find((candidate) => candidate.id === intent.itemId);
    if (!item || item.kind !== 'custom-avatar') return false;
    if (intent.spendReason === 'custom_avatar') {
      return (item.availability.kind === 'shards' || (intent.phase === 'granted' && item.isOwned))
        && intent.cost === CUSTOM_AVATAR_BUY_COST;
    }
    return intent.spendReason === 'custom_avatar_restyle'
      && item.availability.kind === 'owned'
      && intent.cost === CUSTOM_AVATAR_RESTYLE_COST;
  }

  if (intent.spendReason !== 'avatar_aura' || intent.ownedValue !== true) return false;
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
