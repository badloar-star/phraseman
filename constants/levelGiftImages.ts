import type { ImageSourcePropType } from 'react-native';

export const LEVEL_GIFT_IMAGE_THEMES = [
  'coral',
  'dark',
  'gold',
  'minimalDark',
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
    common: require('../assets/images/level_gifts/coral-common.webp'),
    rare: require('../assets/images/level_gifts/coral-rare.webp'),
    epic: require('../assets/images/level_gifts/coral-epic.webp'),
    premium: require('../assets/images/level_gifts/coral-premium.webp'),
  },
  dark: {
    common: require('../assets/images/level_gifts/dark-common.webp'),
    rare: require('../assets/images/level_gifts/dark-rare.webp'),
    epic: require('../assets/images/level_gifts/dark-epic.webp'),
    premium: require('../assets/images/level_gifts/dark-premium.webp'),
  },
  gold: {
    common: require('../assets/images/level_gifts/gold-common.webp'),
    rare: require('../assets/images/level_gifts/gold-rare.webp'),
    epic: require('../assets/images/level_gifts/gold-epic.webp'),
    premium: require('../assets/images/level_gifts/gold-premium.webp'),
  },
  minimalDark: {
    common: require('../assets/images/level_gifts/minimalDark-common.webp'),
    rare: require('../assets/images/level_gifts/minimalDark-rare.webp'),
    epic: require('../assets/images/level_gifts/minimalDark-epic.webp'),
    premium: require('../assets/images/level_gifts/minimalDark-premium.webp'),
  },
  minimalLight: {
    common: require('../assets/images/level_gifts/minimalLight-common.webp'),
    rare: require('../assets/images/level_gifts/minimalLight-rare.webp'),
    epic: require('../assets/images/level_gifts/minimalLight-epic.webp'),
    premium: require('../assets/images/level_gifts/minimalLight-premium.webp'),
  },
  neon: {
    common: require('../assets/images/level_gifts/neon-common.webp'),
    rare: require('../assets/images/level_gifts/neon-rare.webp'),
    epic: require('../assets/images/level_gifts/neon-epic.webp'),
    premium: require('../assets/images/level_gifts/neon-premium.webp'),
  },
};

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

  return LEVEL_GIFT_IMAGES[safeTheme][safeVariant];
}
