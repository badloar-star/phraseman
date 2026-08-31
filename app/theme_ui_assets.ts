import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../constants/theme';

const SHARED = {
  energy: require('../assets/images/energy/energy-start-cost.webp'),
  rune: require('../assets/images/level-spin-rewards/stars_10.webp'),
  spinTicket: require('../assets/images/spin/spin_ticket.webp'),
  streakIce: require('../assets/images/streak_overlays/streak-freeze-ice.webp'),
  leagueCrown: require('../assets/images/league/league_crown.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type ThemeUiAssetKey = keyof typeof SHARED;

export function themeUiAsset(_themeMode: ThemeMode, key: ThemeUiAssetKey): ImageSourcePropType {
  return SHARED[key];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
