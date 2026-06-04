import type { ImageSourcePropType } from 'react-native';

export const LEAGUE_BONUS_GIFT_IMAGE_THEMES = [
  'coral',
  'dark',
  'gold',
  'minimalDark',
  'compass',
  'minimalLight',
  'neon',
] as const;

export type LeagueBonusGiftImageTheme = typeof LEAGUE_BONUS_GIFT_IMAGE_THEMES[number];

const DEFAULT_THEME: LeagueBonusGiftImageTheme = 'minimalDark';

const LEAGUE_BONUS_GIFT_IMAGES: Record<LeagueBonusGiftImageTheme, ImageSourcePropType> = {
  coral: require('../assets/images/league_bonus/coral-chest.webp'),
  dark: require('../assets/images/league_bonus/dark-chest.webp'),
  gold: require('../assets/images/league_bonus/gold-chest.webp'),
  minimalDark: require('../assets/images/league_bonus/minimalDark-chest.webp'),
  compass: require('../assets/images/league_bonus/compass-premium-chest.webp'),
  minimalLight: require('../assets/images/league_bonus/minimalLight-chest.webp'),
  neon: require('../assets/images/league_bonus/neon-chest.webp'),
};

const isLeagueBonusGiftImageTheme = (
  theme: string | null | undefined,
): theme is LeagueBonusGiftImageTheme =>
  LEAGUE_BONUS_GIFT_IMAGE_THEMES.includes(theme as LeagueBonusGiftImageTheme);

export function getLeagueBonusGiftImage(theme: string | null | undefined): ImageSourcePropType {
  const safeTheme = isLeagueBonusGiftImageTheme(theme) ? theme : DEFAULT_THEME;
  const image = LEAGUE_BONUS_GIFT_IMAGES[safeTheme];
  return image;
}
