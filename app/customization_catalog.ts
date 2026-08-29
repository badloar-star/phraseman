import {
  AVATAR_AURA_BUY_COST,
  AVATAR_AURAS,
  NO_AVATAR_AURA_ID,
  normalizeAvatarAuraId,
  type AvatarAuraDef,
} from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATARS,
  CUSTOM_AVATAR_SHOP,
  AVATAR100_ART_VERSION,
  getCustomAvatarPurchaseCost,
  getCustomAvatarRuneCost,
  isRetiredCustomAvatarSale,
  makeCustomAvatarValue,
  parseCustomAvatarOwnedStyle,
  parseCustomAvatarValue,
  type CustomAvatarDef,
  type CustomAvatarLogoColor,
} from '../constants/custom_avatars';
import { isCosmeticAssetForSale } from '../constants/cosmetic_asset_availability';
import type { OwnedAuras, OwnedAvatars } from './customization_snapshot';

export type CatalogAvailability =
  | { kind: 'owned' }
  | { kind: 'shards'; cost: number }
  | { kind: 'runes'; cost: number }
  | { kind: 'level'; level: number }
  | { kind: 'plus' }
  | { kind: 'pro' }
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
export type CustomizationCurrency = 'pearls' | 'runes';
export type AvatarSide = 'yin' | 'yang';

export interface BuildAvatarCatalogInput {
  ownedAvatars: OwnedAvatars;
  giftedAvatarId: string | null;
  activeAvatar: string;
  defaultGradientId?: string;
  defaultLogoColor?: CustomAvatarLogoColor;
  side?: AvatarSide;
  devUnlockAll?: boolean;
  /** UI invalidation token for the mutable, cached server catalog. */
  catalogRevision?: number;
}

export interface BuildAuraCatalogInput {
  activeAvatar: string;
  activeAuraId: string | null;
  level: number;
  ownedAuras: OwnedAuras;
  isPremium: boolean;
  isVip: boolean;
  isPro?: boolean;
  devUnlockAll?: boolean;
  /** UI invalidation token for the mutable, cached server catalog. */
  catalogRevision?: number;
}

function ownedAvatarStyle(
  avatarId: string,
  ownedAvatars: OwnedAvatars,
  defaultGradientId: string,
  defaultLogoColor: CustomAvatarLogoColor,
): { gradientId: string; logoColor: CustomAvatarLogoColor; artVersion?: 'showcase-v1' | 'avatar100-v1' } {
  const owned = parseCustomAvatarOwnedStyle(avatarId, ownedAvatars[avatarId]);
  return {
    gradientId: owned?.gradientId || defaultGradientId,
    logoColor: owned?.logoColor ?? defaultLogoColor,
    artVersion: owned?.artVersion,
  };
}

export function buildAvatarCatalog(input: BuildAvatarCatalogInput): CustomizationCatalogItem[] {
  const active = parseCustomAvatarValue(input.activeAvatar);
  const defaultGradientId = input.defaultGradientId ?? CUSTOM_AVATAR_GRADIENTS[0].id;
  // зачем: в каталоге по умолчанию показываем СВЕТЛУЮ версию существа (владелец,
  // 2026-08-27) — на новых цветных подложках она читается выразительнее тёмной.
  // Уже купленный стиль это не трогает: у владельца берётся его сохранённый
  // logoColor, дефолт применяется только к тому, что человек ещё не открывал.
  const defaultLogoColor = input.defaultLogoColor ?? 'white';
  const visibleRemoteAvatars = CUSTOM_AVATARS.filter((avatar) =>
    avatar.id.startsWith('custom-gen-')
    && !CUSTOM_AVATAR_SHOP.some((shopAvatar) => shopAvatar.id === avatar.id)
    && ((!isRetiredCustomAvatarSale(avatar.id) && isCosmeticAssetForSale('avatar', avatar.id, false))
      || avatar.id === input.giftedAvatarId
      || avatar.id === active?.avatarId
      || !!input.ownedAvatars[avatar.id]));

  const visibleShopAvatars = CUSTOM_AVATAR_SHOP.filter((avatar) =>
    input.devUnlockAll
    || isCosmeticAssetForSale('avatar', avatar.id, true)
    || avatar.id === input.giftedAvatarId
    || avatar.id === active?.avatarId
    || !!input.ownedAvatars[avatar.id])
    .sort((left, right) =>
      getCustomAvatarPurchaseCost(left) - getCustomAvatarPurchaseCost(right)
      || left.id.localeCompare(right.id, 'en', { numeric: true }));

  return [...visibleShopAvatars, ...visibleRemoteAvatars].map((avatar) => {
    const defaultForSale = CUSTOM_AVATAR_SHOP.some((shopAvatar) => shopAvatar.id === avatar.id);
    const isOwned = input.devUnlockAll === true
      || !!input.ownedAvatars[avatar.id]
      || avatar.id === input.giftedAvatarId
      || avatar.id === active?.avatarId;
    const style = input.devUnlockAll && defaultForSale
      ? { gradientId: defaultGradientId, logoColor: defaultLogoColor, artVersion: AVATAR100_ART_VERSION }
      : active?.avatarId === avatar.id
      ? { gradientId: active.gradientId, logoColor: active.logoColor, artVersion: active.artVersion }
      : ownedAvatarStyle(avatar.id, input.ownedAvatars, defaultGradientId, defaultLogoColor);
    const previewLogoColor = input.side === 'yin'
      ? 'black'
      : input.side === 'yang'
        ? 'white'
        : style.logoColor;
    return {
      id: avatar.id,
      kind: 'custom-avatar' as const,
      avatar,
      isOwned,
      isActive: active?.avatarId === avatar.id,
      availability: isOwned
        ? { kind: 'owned' as const }
        : isCosmeticAssetForSale('avatar', avatar.id, defaultForSale)
          ? input.side === 'yin'
            ? { kind: 'runes' as const, cost: getCustomAvatarRuneCost(avatar) }
            : { kind: 'shards' as const, cost: getCustomAvatarPurchaseCost(avatar) }
          : { kind: 'reward' as const },
      previewValue: makeCustomAvatarValue(
        avatar.id,
        style.gradientId,
        previewLogoColor,
        style.artVersion ?? (defaultForSale ? AVATAR100_ART_VERSION : undefined),
      ),
    };
  });
}

function auraAvailability(
  aura: AvatarAuraDef,
  input: BuildAuraCatalogInput,
): { isOwned: boolean; availability: CatalogAvailability } {
  if (input.devUnlockAll) return { isOwned: true, availability: { kind: 'owned' } };
  if (aura.proOnly && !input.isPro) {
    return { isOwned: false, availability: { kind: 'pro' } };
  }
  const plusAura = !aura.proOnly && (aura.premiumOnly === true || aura.vipOnly === true);
  const hasPlusAuraAccess = input.isPremium || input.isVip;
  if (plusAura && !hasPlusAuraAccess) {
    return { isOwned: false, availability: { kind: 'plus' } };
  }
  const unlockedByLevel = aura.unlockLevel !== undefined && input.level >= aura.unlockLevel;
  const normalizedActiveAuraId = normalizeAvatarAuraId(input.activeAuraId);
  const isOwned = !!input.ownedAuras[aura.id]
    || normalizedActiveAuraId === aura.id
    || (plusAura && hasPlusAuraAccess)
    || (aura.proOnly === true && input.isPro === true)
    || unlockedByLevel;
  if (isOwned) return { isOwned: true, availability: { kind: 'owned' } };
  // зачем: rewardOnly остался только у ручных наград админки («Нимб») — арена-ауры
  // владелец перевёл на уровни 52-55, старое деление по источнику стало мёртвым.
  if (aura.rewardOnly || !isCosmeticAssetForSale('aura', aura.id, !aura.retiredFromShop)) {
    return { isOwned: false, availability: { kind: 'reward' } };
  }
  if (aura.unlockLevel !== undefined) {
    return { isOwned: false, availability: { kind: 'level', level: aura.unlockLevel } };
  }
  return { isOwned: false, availability: { kind: 'shards', cost: AVATAR_AURA_BUY_COST } };
}

export function buildAuraCatalog(input: BuildAuraCatalogInput): CustomizationCatalogItem[] {
  const normalizedActiveAuraId = normalizeAvatarAuraId(input.activeAuraId);
  const noneItem: CustomizationCatalogItem = {
    id: 'none',
    kind: 'none-aura',
    previewAvatar: input.activeAvatar,
    auraId: NO_AVATAR_AURA_ID,
    isOwned: true,
    isActive: normalizedActiveAuraId === NO_AVATAR_AURA_ID,
    availability: { kind: 'none' },
  };
  const visibleAuras = AVATAR_AURAS.filter((aura) =>
    input.devUnlockAll
    || (!aura.rewardOnly && isCosmeticAssetForSale('aura', aura.id, !aura.retiredFromShop))
    || aura.premiumOnly === true
    || input.ownedAuras[aura.id] === true
    || normalizedActiveAuraId === aura.id);
  return [noneItem, ...visibleAuras.map((aura): CustomizationCatalogItem => {
    const access = auraAvailability(aura, input);
    return {
      id: aura.id,
      kind: 'aura',
      aura,
      previewAvatar: input.activeAvatar,
      auraId: aura.id,
      isActive: normalizedActiveAuraId === aura.id,
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
