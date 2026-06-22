import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export type ArenaActionIconKind = 'match' | 'friend' | 'throne';

const ARENA_ACTION_ICONS: Record<ArenaActionIconKind, Record<ThemeMode, ImageSourcePropType>> = {
  match: {
    dark: require('../assets/images/arena_actions/arena-action-match-dark.webp'),
    gold: require('../assets/images/arena_actions/arena-action-match-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-match-coral.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-match-minimalDark.webp'),
    midnight: require('../assets/images/arena_actions/arena-action-match-midnight.webp'),
    ember: require('../assets/images/arena_actions/arena-action-match-ember.webp'),
    aurora: require('../assets/images/arena_actions/arena-action-match-aurora.webp'),
    volt: require('../assets/images/arena_actions/arena-action-match-volt.webp'),
  },
  friend: {
    dark: require('../assets/images/arena_actions/arena-action-friend-dark.webp'),
    gold: require('../assets/images/arena_actions/arena-action-friend-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-friend-coral.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-friend-minimalDark.webp'),
    midnight: require('../assets/images/arena_actions/arena-action-friend-midnight.webp'),
    ember: require('../assets/images/arena_actions/arena-action-friend-ember.webp'),
    aurora: require('../assets/images/arena_actions/arena-action-friend-aurora.webp'),
    volt: require('../assets/images/arena_actions/arena-action-friend-volt.webp'),
  },
  throne: {
    dark: require('../assets/images/arena_actions/arena-action-throne-dark.webp'),
    gold: require('../assets/images/arena_actions/arena-action-throne-gold.webp'),
    coral: require('../assets/images/arena_actions/arena-action-throne-coral.webp'),
    minimalDark: require('../assets/images/arena_actions/arena-action-throne-minimalDark.webp'),
    midnight: require('../assets/images/arena_actions/arena-action-throne-midnight.webp'),
    ember: require('../assets/images/arena_actions/arena-action-throne-ember.webp'),
    aurora: require('../assets/images/arena_actions/arena-action-throne-aurora.webp'),
    volt: require('../assets/images/arena_actions/arena-action-throne-volt.webp'),
  },
};

export function arenaActionIconSource(kind: ArenaActionIconKind, themeMode: ThemeMode): ImageSourcePropType {
  return ARENA_ACTION_ICONS[kind][themeMode] ?? ARENA_ACTION_ICONS[kind].dark;
}
