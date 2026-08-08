import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from './theme';

const SOCIAL_FRIENDS_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/social_icons/social-friends-dark.webp'),
  gold: require('../assets/images/social_icons/social-friends-gold.webp'),
  coral: require('../assets/images/social_icons/social-friends-coral.webp'),
  minimalDark: require('../assets/images/social_icons/social-friends-indigo.webp'),
  business: require('../assets/images/social_icons/social-friends-business.webp'),
  businessLight: require('../assets/images/social_icons/social-friends-businessLight.webp'),
  sagePorcelain: require('../assets/images/social_icons/social-friends-sagePorcelain.webp'),
  midnight: require('../assets/images/social_icons/social-friends-midnight.webp'),
  ember: require('../assets/images/social_icons/social-friends-ember.webp'),
  aurora: require('../assets/images/social_icons/social-friends-aurora.webp'),
  volt: require('../assets/images/social_icons/social-friends-volt.webp'),
  candyBlue: require('../assets/images/social_icons/social-friends-indigo.webp'),
  indigo: require('../assets/images/social_icons/social-friends-indigo.webp'),
};

const SOCIAL_CHAT_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/social_icons/social-chat-dark.webp'),
  gold: require('../assets/images/social_icons/social-chat-gold.webp'),
  coral: require('../assets/images/social_icons/social-chat-coral.webp'),
  minimalDark: require('../assets/images/social_icons/social-chat-indigo.webp'),
  business: require('../assets/images/social_icons/social-chat-business.webp'),
  businessLight: require('../assets/images/social_icons/social-chat-businessLight.webp'),
  sagePorcelain: require('../assets/images/social_icons/social-chat-sagePorcelain.webp'),
  midnight: require('../assets/images/social_icons/social-chat-midnight.webp'),
  ember: require('../assets/images/social_icons/social-chat-ember.webp'),
  aurora: require('../assets/images/social_icons/social-chat-aurora.webp'),
  volt: require('../assets/images/social_icons/social-chat-volt.webp'),
  candyBlue: require('../assets/images/social_icons/social-chat-indigo.webp'),
  indigo: require('../assets/images/social_icons/social-chat-indigo.webp'),
};

export function getSocialFriendsIcon(themeMode: ThemeMode): ImageSourcePropType {
  return SOCIAL_FRIENDS_ICONS[themeMode] ?? SOCIAL_FRIENDS_ICONS.dark;
}

export function getSocialChatIcon(themeMode: ThemeMode): ImageSourcePropType {
  return SOCIAL_CHAT_ICONS[themeMode] ?? SOCIAL_CHAT_ICONS.dark;
}
