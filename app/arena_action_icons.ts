import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export type ArenaActionIconKind = 'match' | 'friend' | 'throne';

const ARENA_ACTION_ICONS: Record<ArenaActionIconKind, Record<ThemeMode, ImageSourcePropType>> = {
  match: {
    dark: require('../assets/images/arena_actions/arena-action-match-dark.webp'),
    gold: require('../assets/images/arena_actions/arena-action-match-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-match-coral.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
    midnight: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
    ember: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
    aurora: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
    volt: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
  },
  friend: {
    dark: require('../assets/images/arena_actions/arena-action-friend-dark.webp'),
    gold: require('../assets/images/arena_actions/arena-action-friend-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-friend-coral.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
    midnight: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
    ember: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
    aurora: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
    volt: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
  },
  throne: {
    dark: require('../assets/images/arena_actions/arena-action-throne-dark.webp'),
    gold: require('../assets/images/arena_actions/arena-action-throne-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-throne-coral.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
    midnight: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
    ember: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
    aurora: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
    volt: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
  },
};

export function arenaActionIconSource(kind: ArenaActionIconKind, themeMode: ThemeMode): ImageSourcePropType {
  return ARENA_ACTION_ICONS[kind][themeMode] ?? ARENA_ACTION_ICONS[kind].dark;
}
