import type { ImageSourcePropType } from 'react-native';

export const LEVEL_GIFT_IMAGE_THEMES = [
  'coral',
  'dark',
  'gold',
  'minimalDark',
  'compass',
  'minimalLight',
  'neon',
] as const;

export const LEVEL_GIFT_IMAGE_VARIANTS = [
  'common',
  'rare',
  'epic',
  'premium',
] as const;

export type LevelGiftImageTheme = typeof LEVEL_GIFT_IMAGE_THEMES[number];
export type LevelGiftImageVariant = typeof LEVEL_GIFT_IMAGE_VARIANTS[number];

const DEFAULT_THEME: LevelGiftImageTheme = 'minimalDark';
const DEFAULT_VARIANT: LevelGiftImageVariant = 'common';

const LEVEL_GIFT_IMAGES: Record<
  LevelGiftImageTheme,
  Record<LevelGiftImageVariant, ImageSourcePropType>
> = {
  coral: {
    common: require('../assets/images/level_gifts_v2/coral-common.webp'),
    rare: require('../assets/images/level_gifts_v2/coral-rare.webp'),
    epic: require('../assets/images/level_gifts_v2/coral-epic.webp'),
    premium: require('../assets/images/level_gifts_v2/coral-premium.webp'),
  },
  dark: {
    common: require('../assets/images/level_gifts_v2/dark-common.webp'),
    rare: require('../assets/images/level_gifts_v2/dark-rare.webp'),
    epic: require('../assets/images/level_gifts_v2/dark-epic.webp'),
    premium: require('../assets/images/level_gifts_v2/dark-premium.webp'),
  },
  gold: {
    common: require('../assets/images/level_gifts_v2/gold-common.webp'),
    rare: require('../assets/images/level_gifts_v2/gold-rare.webp'),
    epic: require('../assets/images/level_gifts_v2/gold-epic.webp'),
    premium: require('../assets/images/level_gifts_v2/gold-premium.webp'),
  },
  minimalDark: {
    common: require('../assets/images/level_gifts_v2/minimalDark-common.webp'),
    rare: require('../assets/images/level_gifts_v2/minimalDark-rare.webp'),
    epic: require('../assets/images/level_gifts_v2/minimalDark-epic.webp'),
    premium: require('../assets/images/level_gifts_v2/minimalDark-premium.webp'),
  },
  compass: {
    common: require('../assets/images/level_gifts_v2/compass-premium-common-session.webp'),
    rare: require('../assets/images/level_gifts_v2/compass-premium-rare-session.webp'),
    epic: require('../assets/images/level_gifts_v2/compass-premium-epic-session.webp'),
    premium: require('../assets/images/level_gifts_v2/compass-premium-premium-session.webp'),
  },
  minimalLight: {
    common: require('../assets/images/level_gifts_v2/minimalLight-common.webp'),
    rare: require('../assets/images/level_gifts_v2/minimalLight-rare.webp'),
    epic: require('../assets/images/level_gifts_v2/minimalLight-epic.webp'),
    premium: require('../assets/images/level_gifts_v2/minimalLight-premium.webp'),
  },
  neon: {
    common: require('../assets/images/level_gifts_v2/neon-common.webp'),
    rare: require('../assets/images/level_gifts_v2/neon-rare.webp'),
    epic: require('../assets/images/level_gifts_v2/neon-epic.webp'),
    premium: require('../assets/images/level_gifts_v2/neon-premium.webp'),
  },
};

export const LEVEL_GIFT_IMAGE_SOURCES: readonly ImageSourcePropType[] = Object.values(LEVEL_GIFT_IMAGES)
  .flatMap(themeImages => Object.values(themeImages));

const isLevelGiftImageTheme = (theme: string | null | undefined): theme is LevelGiftImageTheme =>
  LEVEL_GIFT_IMAGE_THEMES.includes(theme as LevelGiftImageTheme);

const isLevelGiftImageVariant = (variant: string | null | undefined): variant is LevelGiftImageVariant =>
  LEVEL_GIFT_IMAGE_VARIANTS.includes(variant as LevelGiftImageVariant);

export function getLevelGiftImage(
  theme: string | null | undefined,
  variant: string | null | undefined,
): ImageSourcePropType {
  const safeTheme = isLevelGiftImageTheme(theme) ? theme : DEFAULT_THEME;
  const safeVariant = isLevelGiftImageVariant(variant) ? variant : DEFAULT_VARIANT;

  const image = LEVEL_GIFT_IMAGES[safeTheme][safeVariant];
  return image;
}
