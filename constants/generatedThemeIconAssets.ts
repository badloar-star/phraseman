import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from './theme';

const LESSON_EXAM_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/generated_theme_icons/lesson-exam-dark.webp'),
  gold: require('../assets/images/generated_theme_icons/lesson-exam-gold.webp'),
  coral: require('../assets/images/generated_theme_icons/lesson-exam-coral.webp'),
  minimalDark: require('../assets/images/generated_theme_icons/lesson-exam-minimalDark.webp'),
  business: require('../assets/images/generated_theme_icons/lesson-exam-business.webp'),
  midnight: require('../assets/images/generated_theme_icons/lesson-exam-midnight.webp'),
  ember: require('../assets/images/generated_theme_icons/lesson-exam-ember.webp'),
  aurora: require('../assets/images/generated_theme_icons/lesson-exam-aurora.webp'),
  volt: require('../assets/images/generated_theme_icons/lesson-exam-volt.webp'),
};

export function getLessonExamIcon(themeMode: ThemeMode): ImageSourcePropType {
  return LESSON_EXAM_ICONS[themeMode] ?? LESSON_EXAM_ICONS.dark;
}
