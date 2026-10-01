import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../constants/theme';

const SHARED = {
  rune: require('../assets/images/coins/coin_rank_00.webp'),
  streakIce: require('../assets/images/streak_overlays/streak-freeze-ice.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type ThemeUiAssetKey = keyof typeof SHARED;

export function themeUiAsset(_themeMode: ThemeMode, key: ThemeUiAssetKey): ImageSourcePropType {
  return SHARED[key];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
