import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../../constants/theme';

export type TournamentThemeAssetKit = Readonly<{
  backdrop: ImageSourcePropType;
  podium: ImageSourcePropType;
}>;

const SELECTABLE_KITS = {
  indigo: {
    backdrop: require('../../assets/images/tournament/themes/indigo/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/indigo/podium.webp'),
  },
  sagePorcelain: {
    backdrop: require('../../assets/images/tournament/themes/sagePorcelain/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/sagePorcelain/podium.webp'),
  },
  midnight: {
    backdrop: require('../../assets/images/tournament/themes/midnight/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/midnight/podium.webp'),
  },
  ember: {
    backdrop: require('../../assets/images/tournament/themes/ember/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/ember/podium.webp'),
  },
  aurora: {
    backdrop: require('../../assets/images/tournament/themes/aurora/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/aurora/podium.webp'),
  },
  volt: {
    backdrop: require('../../assets/images/tournament/themes/volt/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/volt/podium.webp'),
  },
  dark: {
    backdrop: require('../../assets/images/tournament/themes/dark/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/dark/podium.webp'),
  },
  coral: {
    backdrop: require('../../assets/images/tournament/themes/coral/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/coral/podium.webp'),
  },
  gold: {
    backdrop: require('../../assets/images/tournament/themes/gold/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/gold/podium.webp'),
  },
} as const satisfies Record<string, TournamentThemeAssetKit>;

const TOURNAMENT_THEME_ASSETS: Record<ThemeMode, TournamentThemeAssetKit> = {
  ...SELECTABLE_KITS,
  minimalDark: SELECTABLE_KITS.indigo,
  candyBlue: SELECTABLE_KITS.indigo,
  business: SELECTABLE_KITS.gold,
  businessLight: SELECTABLE_KITS.sagePorcelain,
};

export function getTournamentThemeAssets(themeMode: ThemeMode): TournamentThemeAssetKit {
  return TOURNAMENT_THEME_ASSETS[themeMode];
}
