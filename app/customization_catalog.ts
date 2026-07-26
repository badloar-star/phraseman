import {
  AVATAR_AURA_BUY_COST,
  AVATAR_AURAS,
  NO_AVATAR_AURA_ID,
  type AvatarAuraDef,
} from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_BUY_COST,
  CUSTOM_AVATAR_GIFT_ONLY,
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_SHOP,
  makeCustomAvatarValue,
  parseCustomAvatarValue,
  type CustomAvatarDef,
  type CustomAvatarLogoColor,
} from '../constants/custom_avatars';
import type { OwnedAuras, OwnedAvatars } from './customization_snapshot';

export type CatalogAvailability =
  | { kind: 'owned' }
  | { kind: 'shards'; cost: number }
  | { kind: 'level'; level: number }
  | { kind: 'plus' }
  | { kind: 'reward' }
  | { kind: 'none' };

type CatalogBase = {
  id: string;
  isOwned: boolean;
  isActive: boolean;
  availability: CatalogAvailability;
};

export type CustomizationCatalogItem =
  | (CatalogBase & {
      kind: 'custom-avatar';
      previewValue: string;
      avatar: CustomAvatarDef;
    })
  | (CatalogBase & {
      kind: 'aura';
      previewAvatar: string;
      auraId: string;
      aura: AvatarAuraDef;
    })
  | (CatalogBase & {
      kind: 'none-aura';
      previewAvatar: string;
      auraId: typeof NO_AVATAR_AURA_ID;
    });

export type CatalogFilter = 'all' | 'mine';

export interface BuildAvatarCatalogInput {
  ownedAvatars: OwnedAvatars;
  giftedAvatarId: string | null;
  activeAvatar: string;
  defaultGradientId?: string;
  defaultLogoColor?: CustomAvatarLogoColor;
}

export interface BuildAuraCatalogInput {
  activeAvatar: string;
  activeAuraId: string | null;
  level: number;
  ownedAuras: OwnedAuras;
  isPremium: boolean;
  isVip: boolean;
}

function ownedAvatarStyle(
  avatarId: string,
  ownedAvatars: OwnedAvatars,
  defaultGradientId: string,
  defaultLogoColor: CustomAvatarLogoColor,
): { gradientId: string; logoColor: CustomAvatarLogoColor } {
  const [gradientId, logoColor] = String(ownedAvatars[avatarId] ?? '').split(':');
  return {
    gradientId: gradientId || defaultGradientId,
    logoColor: logoColor === 'white' ? 'white' : defaultLogoColor,
  };
}

export function buildAvatarCatalog(input: BuildAvatarCatalogInput): CustomizationCatalogItem[] {
  const active = parseCustomAvatarValue(input.activeAvatar);
  const defaultGradientId = input.defaultGradientId ?? CUSTOM_AVATAR_GRADIENTS[0].id;
  const defaultLogoColor = input.defaultLogoColor ?? 'black';
  const visibleGiftAvatars = CUSTOM_AVATAR_GIFT_ONLY.filter((avatar) =>
    avatar.id === input.giftedAvatarId || avatar.id === active?.avatarId || !!input.ownedAvatars[avatar.id]);

  return [...CUSTOM_AVATAR_SHOP, ...visibleGiftAvatars].map((avatar) => {
    const isOwned = !!input.ownedAvatars[avatar.id] || avatar.id === input.giftedAvatarId || avatar.id === active?.avatarId;
    const style = active?.avatarId === avatar.id
      ? { gradientId: active.gradientId, logoColor: active.logoColor }
      : ownedAvatarStyle(avatar.id, input.ownedAvatars, defaultGradientId, defaultLogoColor);
    return {
      id: avatar.id,
      kind: 'custom-avatar' as const,
      avatar,
      isOwned,
      isActive: active?.avatarId === avatar.id,
      availability: isOwned
        ? { kind: 'owned' as const }
        : { kind: 'shards' as const, cost: CUSTOM_AVATAR_BUY_COST },
      previewValue: makeCustomAvatarValue(avatar.id, style.gradientId, style.logoColor),
    };
  });
}

function auraAvailability(
  aura: AvatarAuraDef,
  input: BuildAuraCatalogInput,
): { isOwned: boolean; availability: CatalogAvailability } {
  const plusAura = aura.premiumOnly === true || aura.vipOnly === true;
  const hasPlusAuraAccess = input.isPremium || input.isVip;
  if (plusAura && !hasPlusAuraAccess) {
    return { isOwned: false, availability: { kind: 'plus' } };
  }
  const unlockedByLevel = aura.unlockLevel !== undefined && input.level >= aura.unlockLevel;
  const isOwned = !!input.ownedAuras[aura.id]
    || input.activeAuraId === aura.id
    || (plusAura && hasPlusAuraAccess)
    || unlockedByLevel;
  if (isOwned) return { isOwned: true, availability: { kind: 'owned' } };
  // зачем: rewardOnly остался только у ручных наград админки («Нимб») — арена-ауры
  // владелец перевёл на уровни 52-55, деление source arena/gift стало мёртвым.
  if (aura.rewardOnly) {
    return { isOwned: false, availability: { kind: 'reward' } };
  }
  if (aura.unlockLevel !== undefined) {
    return { isOwned: false, availability: { kind: 'level', level: aura.unlockLevel } };
  }
  return { isOwned: false, availability: { kind: 'shards', cost: AVATAR_AURA_BUY_COST } };
}

export function buildAuraCatalog(input: BuildAuraCatalogInput): CustomizationCatalogItem[] {
  const noneItem: CustomizationCatalogItem = {
    id: 'none',
    kind: 'none-aura',
    previewAvatar: input.activeAvatar,
    auraId: NO_AVATAR_AURA_ID,
    isOwned: true,
    isActive: input.activeAuraId === NO_AVATAR_AURA_ID,
    availability: { kind: 'none' },
  };
  return [noneItem, ...AVATAR_AURAS.map((aura): CustomizationCatalogItem => {
    const access = auraAvailability(aura, input);
    return {
      id: aura.id,
      kind: 'aura',
      aura,
      previewAvatar: input.activeAvatar,
      auraId: aura.id,
      isActive: input.activeAuraId === aura.id,
      ...access,
    };
  })];
}

export function filterCatalog(
  items: readonly CustomizationCatalogItem[],
  filter: CatalogFilter,
): CustomizationCatalogItem[] {
  return filter === 'mine'
    ? items.filter((item) => item.isOwned || item.kind === 'none-aura')
    : [...items];
}
