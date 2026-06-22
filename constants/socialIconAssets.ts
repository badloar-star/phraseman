import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from './theme';

const SOCIAL_FRIENDS_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/social_icons/social-friends-dark.webp'),
  gold: require('../assets/images/social_icons/social-friends-gold.webp'),
  coral: require('../assets/images/social_icons/social-friends-coral.webp'),
  minimalDark: require('../assets/images/social_icons/social-friends-minimalDark.webp'),
  midnight: require('../assets/images/social_icons/social-friends-midnight.webp'),
  ember: require('../assets/images/social_icons/social-friends-ember.webp'),
  aurora: require('../assets/images/social_icons/social-friends-aurora.webp'),
  volt: require('../assets/images/social_icons/social-friends-volt.webp'),
};

const SOCIAL_CHAT_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/social_icons/social-chat-dark.webp'),
  gold: require('../assets/images/social_icons/social-chat-gold.webp'),
  coral: require('../assets/images/social_icons/social-chat-coral.webp'),
  minimalDark: require('../assets/images/social_icons/social-chat-minimalDark.webp'),
  midnight: require('../assets/images/social_icons/social-chat-midnight.webp'),
  ember: require('../assets/images/social_icons/social-chat-ember.webp'),
  aurora: require('../assets/images/social_icons/social-chat-aurora.webp'),
  volt: require('../assets/images/social_icons/social-chat-volt.webp'),
};

export function getSocialFriendsIcon(themeMode: ThemeMode): ImageSourcePropType {
  return SOCIAL_FRIENDS_ICONS[themeMode] ?? SOCIAL_FRIENDS_ICONS.dark;
}

export function getSocialChatIcon(themeMode: ThemeMode): ImageSourcePropType {
  return SOCIAL_CHAT_ICONS[themeMode] ?? SOCIAL_CHAT_ICONS.dark;
}
