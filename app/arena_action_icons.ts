import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export type ArenaActionIconKind = 'match' | 'friend' | 'throne';

const ARENA_ACTION_ICONS: Record<ArenaActionIconKind, Record<ThemeMode, ImageSourcePropType>> = {
  match: {
    dark: require('../assets/images/arena_actions/arena-action-match-dark.webp'),
    neon: require('../assets/images/arena_actions/arena-action-match-neon.webp'),
    gold: require('../assets/images/arena_actions/arena-action-match-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-match-coral.webp'),
    minimalLight: require('../assets/images/arena_actions/arena-action-match-minimalLight.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
  },
  friend: {
    dark: require('../assets/images/arena_actions/arena-action-friend-dark.webp'),
    neon: require('../assets/images/arena_actions/arena-action-friend-neon.webp'),
    gold: require('../assets/images/arena_actions/arena-action-friend-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-friend-coral.webp'),
    minimalLight: require('../assets/images/arena_actions/arena-action-friend-minimalLight.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
  },
  throne: {
    dark: require('../assets/images/arena_actions/arena-action-throne-dark.webp'),
    neon: require('../assets/images/arena_actions/arena-action-throne-neon.webp'),
    gold: require('../assets/images/arena_actions/arena-action-throne-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-throne-coral.webp'),
    minimalLight: require('../assets/images/arena_actions/arena-action-throne-minimalLight.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
  },
};

export function arenaActionIconSource(kind: ArenaActionIconKind, themeMode: ThemeMode): ImageSourcePropType {
  return ARENA_ACTION_ICONS[kind][themeMode] ?? ARENA_ACTION_ICONS[kind].dark;
}
