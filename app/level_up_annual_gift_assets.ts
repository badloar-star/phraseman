import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

/**
 * One bundled illustration per supported theme. Keep this literal map in sync
 * with ThemeMode so every generated image has an actual running-app slot.
 */
const LEVEL_UP_ANNUAL_GIFT_ART: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/level_up_annual_gift/dark.webp'),
  gold: require('../assets/images/level_up_annual_gift/gold.webp'),
  coral: require('../assets/images/level_up_annual_gift/coral.webp'),
  minimalDark: require('../assets/images/level_up_annual_gift/minimalDark.webp'),
  midnight: require('../assets/images/level_up_annual_gift/midnight.webp'),
  ember: require('../assets/images/level_up_annual_gift/ember.webp'),
  aurora: require('../assets/images/level_up_annual_gift/aurora.webp'),
  volt: require('../assets/images/level_up_annual_gift/volt.webp'),
  business: require('../assets/images/level_up_annual_gift/business.webp'),
  businessLight: require('../assets/images/level_up_annual_gift/businessLight.webp'),
  candyBlue: require('../assets/images/level_up_annual_gift/candyBlue.webp'),
  indigo: require('../assets/images/level_up_annual_gift/indigo.webp'),
};

export function levelUpAnnualGiftArtForTheme(themeMode: ThemeMode): ImageSourcePropType {
  return LEVEL_UP_ANNUAL_GIFT_ART[themeMode] ?? LEVEL_UP_ANNUAL_GIFT_ART.indigo;
}
