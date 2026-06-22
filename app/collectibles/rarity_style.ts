// Чистая конфигурация визуала карточек «Сокровищницы» по редкости.
// Без React/Reanimated — чтобы переиспользовать и тестировать отдельно от UI.
// «Чем реже — тем круче»: power, толщина рамки, свечение и эффекты растут.
import { COLLECTIBLE_RARITY_COLORS, type CollectibleRarity } from './catalog';

export const COLLECTIBLE_SECRET_GOLD = '#FBBF24';

/** Ярус арта = редкость карточки ИЛИ отдельный 'secret' (секретная 11-я). */
export type CollectibleArtTier = CollectibleRarity | 'secret';

export type CollectibleFrameProfile = {
  /** 1 (common) … 4 (legendary/secret). Монотонно растёт с редкостью. */
  power: 1 | 2 | 3 | 4;
  borderWidth: number;
  /** Радиус тени-свечения, px (0 = без свечения). */
  glow: number;
  glowOpacity: number;
  /** Бегущий блик по карточке. */
  sheen: boolean;
  /** Пульсация свечения. */
  pulse: boolean;
  /** Угловые искры (только самый редкий ярус). */
  sparkles: boolean;
};

export const COLLECTIBLE_FRAME_PROFILES: Record<CollectibleArtTier, CollectibleFrameProfile> = {
  common: { power: 1, borderWidth: 1, glow: 0, glowOpacity: 0, sheen: false, pulse: false, sparkles: false },
  rare: { power: 2, borderWidth: 1.5, glow: 8, glowOpacity: 0.5, sheen: true, pulse: false, sparkles: false },
  epic: { power: 3, borderWidth: 2, glow: 12, glowOpacity: 0.65, sheen: true, pulse: true, sparkles: false },
  legendary: { power: 4, borderWidth: 2.5, glow: 18, glowOpacity: 0.8, sheen: true, pulse: true, sparkles: true },
  secret: { power: 4, borderWidth: 2.5, glow: 18, glowOpacity: 0.85, sheen: true, pulse: true, sparkles: true },
};

/** Цвет яруса: секретка золотая, остальные — цвет редкости. */
export function collectibleTierColor(tier: CollectibleArtTier): string {
  if (tier === 'secret') return COLLECTIBLE_SECRET_GOLD;
  return COLLECTIBLE_RARITY_COLORS[tier];
}

export function collectibleFrameProfile(tier: CollectibleArtTier): CollectibleFrameProfile {
  return COLLECTIBLE_FRAME_PROFILES[tier] ?? COLLECTIBLE_FRAME_PROFILES.common;
}
