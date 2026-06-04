import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export const FIRST_LESSON_SHEET_BACKGROUNDS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/first_lesson_sheet/sheet-bg-dark.webp'),
  neon: require('../assets/images/first_lesson_sheet/sheet-bg-neon.webp'),
  gold: require('../assets/images/first_lesson_sheet/sheet-bg-gold.webp'),
  coral: require('../assets/images/first_lesson_sheet/sheet-bg-coral.webp'),
  minimalLight: require('../assets/images/first_lesson_sheet/sheet-bg-minimal-light.webp'),
  minimalDark: require('../assets/images/first_lesson_sheet/sheet-bg-minimal-dark.webp'),
  compass: require('../assets/images/first_lesson_sheet/sheet-bg-compass-premium.webp'),
};

export const FIRST_LESSON_SHEET_IMAGES: readonly ImageSourcePropType[] = [
  ...Object.values(FIRST_LESSON_SHEET_BACKGROUNDS),
];
