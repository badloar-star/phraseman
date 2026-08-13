import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../constants/theme';

// One full-screen source per theme. Keep every require literal so Metro can
// include exactly the active theme asset without runtime path construction.
const SEASON_PASS_THEME_BACKGROUNDS = {
  dark: require('../assets/images/season/backgrounds/dark/background.webp'),
  gold: require('../assets/images/season/backgrounds/gold/background.webp'),
  olive: require('../assets/images/season/backgrounds/olive/background.webp'),
  minimalDark: require('../assets/images/season/backgrounds/minimalDark/background.webp'),
  midnight: require('../assets/images/season/backgrounds/midnight/background.webp'),
  ember: require('../assets/images/season/backgrounds/ember/background.webp'),
  aurora: require('../assets/images/season/backgrounds/aurora/background.webp'),
  volt: require('../assets/images/season/backgrounds/volt/background.webp'),
  business: require('../assets/images/season/backgrounds/business/background.webp'),
  businessLight: require('../assets/images/season/backgrounds/businessLight/background.webp'),
  candyBlue: require('../assets/images/season/backgrounds/candyBlue/background.webp'),
  indigo: require('../assets/images/season/backgrounds/indigo/background.webp'),
  sagePorcelain: require('../assets/images/season/backgrounds/sagePorcelain/background.webp'),
} as const satisfies Record<ThemeMode, ImageSourcePropType>;

export function getSeasonPassThemeBackground(themeMode: ThemeMode): ImageSourcePropType {
  return SEASON_PASS_THEME_BACKGROUNDS[themeMode];
}
