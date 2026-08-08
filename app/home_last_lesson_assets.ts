import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../constants/theme';

// Each selectable theme owns one continuation image. Removed legacy themes reuse
// the closest active visual so they do not add dead bundle assets.
const HOME_LAST_LESSON_IMAGES: Record<ThemeMode, ImageSourcePropType> = {
  indigo: require('../assets/images/home_last_lesson/home-last-lesson-indigo.webp'),
  sagePorcelain: require('../assets/images/home_last_lesson/home-last-lesson-sagePorcelain.webp'),
  midnight: require('../assets/images/home_last_lesson/home-last-lesson-midnight.webp'),
  ember: require('../assets/images/home_last_lesson/home-last-lesson-ember.webp'),
  aurora: require('../assets/images/home_last_lesson/home-last-lesson-aurora.webp'),
  volt: require('../assets/images/home_last_lesson/home-last-lesson-volt.webp'),
  dark: require('../assets/images/home_last_lesson/home-last-lesson-forest.webp'),
  gold: require('../assets/images/home_last_lesson/home-last-lesson-gold.webp'),
  minimalDark: require('../assets/images/home_last_lesson/home-last-lesson-indigo.webp'),
  candyBlue: require('../assets/images/home_last_lesson/home-last-lesson-indigo.webp'),
  business: require('../assets/images/home_last_lesson/home-last-lesson-gold.webp'),
  businessLight: require('../assets/images/home_last_lesson/home-last-lesson-sagePorcelain.webp'),
};

export function getHomeLastLessonImage(themeMode: ThemeMode): ImageSourcePropType {
  return HOME_LAST_LESSON_IMAGES[themeMode];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
