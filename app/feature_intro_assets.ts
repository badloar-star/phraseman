import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export type FeatureIntroAssetKey = 'cards_hub' | 'legacy_lessons' | 'statistics' | 'daily_phrase' | 'videos' | 'friends' | 'arena' | 'cards_swipe' | 'training_listening' | 'training_speaking' | 'training_blitz' | 'ai_dialog' | 'mistake_practice';
type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<FeatureIntroAssetKey, IconName> = {
  cards_hub: 'albums-outline',
  legacy_lessons: 'book-outline',
  statistics: 'stats-chart-outline',
  daily_phrase: 'chatbubble-ellipses-outline',
  videos: 'play-circle-outline',
  friends: 'people-outline',
  arena: 'shield-outline',
  cards_swipe: 'layers-outline',
  training_listening: 'headset-outline',
  training_speaking: 'mic-outline',
  training_blitz: 'flash-outline',
  ai_dialog: 'chatbubbles-outline',
  mistake_practice: 'refresh-circle-outline',
};

export function getFeatureIntroIcon(key: FeatureIntroAssetKey): IconName {
  return ICONS[key];
}
