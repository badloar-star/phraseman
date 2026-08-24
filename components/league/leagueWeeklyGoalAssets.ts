import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../../constants/theme';

const LEAGUE_WEEKLY_GOAL_ASSETS = {
  dark: require('../../assets/images/league/weekly-goal/dark.webp'),
  gold: require('../../assets/images/league/weekly-goal/gold.webp'),
  olive: require('../../assets/images/league/weekly-goal/olive.webp'),
  midnight: require('../../assets/images/league/weekly-goal/midnight.webp'),
  ember: require('../../assets/images/league/weekly-goal/ember.webp'),
  aurora: require('../../assets/images/league/weekly-goal/aurora.webp'),
  volt: require('../../assets/images/league/weekly-goal/volt.webp'),
  indigo: require('../../assets/images/league/weekly-goal/indigo.webp'),
  sagePorcelain: require('../../assets/images/league/weekly-goal/sagePorcelain.webp'),
} as const satisfies Record<ThemeMode, ImageSourcePropType>;

export function getLeagueWeeklyGoalAsset(themeMode: ThemeMode): ImageSourcePropType {
  return LEAGUE_WEEKLY_GOAL_ASSETS[themeMode];
}
