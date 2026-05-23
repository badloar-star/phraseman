import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from './theme';

export type TrainerThemeIconKind = 'phrases' | 'words' | 'analytics';

export interface TrainerThemeIconPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  stroke: string;
  muted: string;
}

const THEME_ICON_PALETTES: Record<ThemeMode, TrainerThemeIconPalette> = {
  dark: {
    primary: '#2DD4BF',
    secondary: '#13A878',
    tertiary: '#7DDC8B',
    stroke: '#9DFCE8',
    muted: '#0F5B49',
  },
  neon: {
    primary: '#22D3EE',
    secondary: '#EC4899',
    tertiary: '#8B5CF6',
    stroke: '#D7FBFF',
    muted: '#3155B7',
  },
  gold: {
    primary: '#FACC15',
    secondary: '#B98925',
    tertiary: '#FFF1A8',
    stroke: '#FFF6C7',
    muted: '#5E4319',
  },
  coral: {
    primary: '#FF7A59',
    secondary: '#6EE7DC',
    tertiary: '#FFD0A8',
    stroke: '#FFF0E7',
    muted: '#8A3D35',
  },
  minimalLight: {
    primary: '#8BB9AC',
    secondary: '#F2A488',
    tertiary: '#F8F3E8',
    stroke: '#40514F',
    muted: '#8B9692',
  },
  minimalDark: {
    primary: '#78B7FF',
    secondary: '#2E5F97',
    tertiary: '#BBD9FF',
    stroke: '#D9ECFF',
    muted: '#294563',
  },
};

export const TRAINER_THEME_ICON_ASSET_PATHS: Record<ThemeMode, Record<TrainerThemeIconKind, string>> = {
  dark: {
    phrases: 'assets/images/trainer_theme_icons/dark/phrases.webp',
    words: 'assets/images/trainer_theme_icons/dark/words.webp',
    analytics: 'assets/images/trainer_theme_icons/dark/analytics.webp',
  },
  neon: {
    phrases: 'assets/images/trainer_theme_icons/neon/phrases.webp',
    words: 'assets/images/trainer_theme_icons/neon/words.webp',
    analytics: 'assets/images/trainer_theme_icons/neon/analytics.webp',
  },
  gold: {
    phrases: 'assets/images/trainer_theme_icons/gold/phrases.webp',
    words: 'assets/images/trainer_theme_icons/gold/words.webp',
    analytics: 'assets/images/trainer_theme_icons/gold/analytics.webp',
  },
  coral: {
    phrases: 'assets/images/trainer_theme_icons/coral/phrases.webp',
    words: 'assets/images/trainer_theme_icons/coral/words.webp',
    analytics: 'assets/images/trainer_theme_icons/coral/analytics.webp',
  },
  minimalLight: {
    phrases: 'assets/images/trainer_theme_icons/minimalLight/phrases.webp',
    words: 'assets/images/trainer_theme_icons/minimalLight/words.webp',
    analytics: 'assets/images/trainer_theme_icons/minimalLight/analytics.webp',
  },
  minimalDark: {
    phrases: 'assets/images/trainer_theme_icons/minimalDark/phrases.webp',
    words: 'assets/images/trainer_theme_icons/minimalDark/words.webp',
    analytics: 'assets/images/trainer_theme_icons/minimalDark/analytics.webp',
  },
};

const TRAINER_THEME_ICON_SOURCES: Record<ThemeMode, Record<TrainerThemeIconKind, ImageSourcePropType>> = {
  dark: {
    phrases: require('../assets/images/trainer_theme_icons/dark/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/dark/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/dark/analytics.webp'),
  },
  neon: {
    phrases: require('../assets/images/trainer_theme_icons/neon/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/neon/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/neon/analytics.webp'),
  },
  gold: {
    phrases: require('../assets/images/trainer_theme_icons/gold/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/gold/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/gold/analytics.webp'),
  },
  coral: {
    phrases: require('../assets/images/trainer_theme_icons/coral/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/coral/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/coral/analytics.webp'),
  },
  minimalLight: {
    phrases: require('../assets/images/trainer_theme_icons/minimalLight/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/minimalLight/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/minimalLight/analytics.webp'),
  },
  minimalDark: {
    phrases: require('../assets/images/trainer_theme_icons/minimalDark/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/minimalDark/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/minimalDark/analytics.webp'),
  },
};

export function trainerThemeIconPalette(
  themeMode: ThemeMode,
): TrainerThemeIconPalette {
  const selectedPalette = THEME_ICON_PALETTES[themeMode];
  const darkPalette = THEME_ICON_PALETTES.dark;
  return selectedPalette ?? darkPalette;
}

export function trainerThemeIconSource(
  themeMode: ThemeMode,
  kind: TrainerThemeIconKind,
): ImageSourcePropType {
  const selectedTheme = TRAINER_THEME_ICON_SOURCES[themeMode] ?? TRAINER_THEME_ICON_SOURCES.dark;
  return selectedTheme[kind] ?? selectedTheme.phrases;
}
