import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../../constants/theme';

export type TournamentThemeAssetKit = Readonly<{
  backdrop: ImageSourcePropType;
  podium: ImageSourcePropType;
  weeklyBank: ImageSourcePropType;
  seasonRewards: ImageSourcePropType;
}>;

const SELECTABLE_KITS = {
  indigo: {
    backdrop: require('../../assets/images/tournament/themes/indigo/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/indigo/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/indigo/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/indigo/season-rewards.webp'),
  },
  sagePorcelain: {
    backdrop: require('../../assets/images/tournament/themes/sagePorcelain/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/sagePorcelain/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/sagePorcelain/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/sagePorcelain/season-rewards.webp'),
  },
  midnight: {
    backdrop: require('../../assets/images/tournament/themes/midnight/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/midnight/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/midnight/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/midnight/season-rewards.webp'),
  },
  ember: {
    backdrop: require('../../assets/images/tournament/themes/ember/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/ember/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/ember/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/ember/season-rewards.webp'),
  },
  aurora: {
    backdrop: require('../../assets/images/tournament/themes/aurora/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/aurora/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/aurora/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/aurora/season-rewards.webp'),
  },
  volt: {
    backdrop: require('../../assets/images/tournament/themes/volt/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/volt/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/volt/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/volt/season-rewards.webp'),
  },
  dark: {
    backdrop: require('../../assets/images/tournament/themes/dark/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/dark/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/dark/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/dark/season-rewards.webp'),
  },
  gold: {
    backdrop: require('../../assets/images/tournament/themes/gold/backdrop.webp'),
    podium: require('../../assets/images/tournament/themes/gold/podium.webp'),
    weeklyBank: require('../../assets/images/tournament/themes/gold/weekly-bank.webp'),
    seasonRewards: require('../../assets/images/tournament/themes/gold/season-rewards.webp'),
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
