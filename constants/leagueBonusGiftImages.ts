import type { ImageSourcePropType } from 'react-native';

export const LEAGUE_BONUS_GIFT_IMAGE_THEMES = [
  'dark',
  'gold',
  'business',
  'businessLight',
  'sagePorcelain',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'indigo',
] as const;

export type LeagueBonusGiftImageTheme = typeof LEAGUE_BONUS_GIFT_IMAGE_THEMES[number];

const DEFAULT_THEME: LeagueBonusGiftImageTheme = 'indigo';

const LEAGUE_BONUS_GIFT_IMAGES: Record<LeagueBonusGiftImageTheme, ImageSourcePropType> = {
  dark: require('../assets/images/league_bonus/dark-chest.webp'),
  gold: require('../assets/images/league_bonus/gold-chest.webp'),
  business: require('../assets/images/league_bonus/business-chest.webp'),
  businessLight: require('../assets/images/league_bonus/businessLight-chest.webp'),
  sagePorcelain: require('../assets/images/league_bonus/sagePorcelain-chest.webp'),
  midnight: require('../assets/images/league_bonus/midnight-chest.webp'),
  ember: require('../assets/images/league_bonus/ember-chest.webp'),
  aurora: require('../assets/images/league_bonus/aurora-chest.webp'),
  volt: require('../assets/images/league_bonus/volt-chest.webp'),
  indigo: require('../assets/images/league_bonus/indigo-chest.webp'),
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
