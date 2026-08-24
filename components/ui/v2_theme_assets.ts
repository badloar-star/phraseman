import type { ImageSourcePropType } from "react-native";

import type { ThemeMode } from "../../constants/theme";

export type TournamentThemeAssetKit = Readonly<{
  podium: ImageSourcePropType;
  weeklyBank: ImageSourcePropType;
  seasonRewards: ImageSourcePropType;
}>;

const SELECTABLE_KITS = {
  indigo: {
    podium: require("../../assets/images/tournament/themes/indigo/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/indigo/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/indigo/season-rewards.webp"),
  },
  sagePorcelain: {
    podium: require("../../assets/images/tournament/themes/sagePorcelain/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/sagePorcelain/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/sagePorcelain/season-rewards.webp"),
  },
  olive: {
    podium: require("../../assets/images/tournament/themes/olive/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/olive/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/olive/season-rewards.webp"),
  },
  midnight: {
    podium: require("../../assets/images/tournament/themes/midnight/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/midnight/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/midnight/season-rewards.webp"),
  },
  ember: {
    podium: require("../../assets/images/tournament/themes/ember/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/ember/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/ember/season-rewards.webp"),
  },
  aurora: {
    podium: require("../../assets/images/tournament/themes/aurora/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/aurora/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/aurora/season-rewards.webp"),
  },
  volt: {
    podium: require("../../assets/images/tournament/themes/volt/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/volt/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/volt/season-rewards.webp"),
  },
  dark: {
    podium: require("../../assets/images/tournament/themes/dark/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/dark/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/dark/season-rewards.webp"),
  },
  gold: {
    podium: require("../../assets/images/tournament/themes/gold/podium.webp"),
    weeklyBank: require("../../assets/images/tournament/themes/gold/weekly-bank.webp"),
    seasonRewards: require("../../assets/images/tournament/themes/gold/season-rewards.webp"),
  },
} as const satisfies Record<string, TournamentThemeAssetKit>;

const TOURNAMENT_THEME_ASSETS: Record<ThemeMode, TournamentThemeAssetKit> = {
  ...SELECTABLE_KITS,
};

export function getTournamentThemeAssets(
  themeMode: ThemeMode,
): TournamentThemeAssetKit {
  return TOURNAMENT_THEME_ASSETS[themeMode];
}
