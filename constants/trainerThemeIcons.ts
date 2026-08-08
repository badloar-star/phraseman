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

// Cinema themes use DALL-E object-cutout trainer foreground icons.
const THEME_ICON_PALETTES: Record<ThemeMode, TrainerThemeIconPalette> = {
  dark: {
    primary: '#2DD4BF',
    secondary: '#13A878',
    tertiary: '#7DDC8B',
    stroke: '#9DFCE8',
    muted: '#0F5B49',
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
  minimalDark: {
    primary: '#6EA8FF',
    secondary: '#4B5563',
    tertiary: '#D1D5DB',
    stroke: '#E5E7EB',
    muted: '#374151',
  },
  business: {
    primary: '#0095F6',
    secondary: '#737373',
    tertiary: '#E6E6E6',
    stroke: '#F5F5F5',
    muted: '#262626',
  },
  businessLight: {
    primary: '#0095F6',
    secondary: '#8E8E8E',
    tertiary: '#0095F6',
    stroke: '#262626',
    muted: '#DBDBDB',
  },
  sagePorcelain: {
    primary: '#315F50',
    secondary: '#8B6320',
    tertiary: '#315F50',
    stroke: '#17201D',
    muted: '#FCFDF9',
  },
  midnight: {
    primary: '#8FA0FF',
    secondary: '#B79CFF',
    tertiary: '#C9D2FF',
    stroke: '#E6EAFF',
    muted: '#3A4170',
  },
  ember: {
    primary: '#FFCC55',
    secondary: '#FF7E5C',
    tertiary: '#FFE9B8',
    stroke: '#FFF3DC',
    muted: '#7A4A1A',
  },
  aurora: {
    primary: '#3DE8A6',
    secondary: '#2E9DFF',
    tertiary: '#9FF2D4',
    stroke: '#DFFCF0',
    muted: '#1A5A44',
  },
  volt: {
    primary: '#C6FF34',
    secondary: '#2EE08C',
    tertiary: '#E2FF7A',
    stroke: '#F6FFD9',
    muted: '#56611C',
  },
  candyBlue: {
    primary: '#B2D5E5',
    secondary: '#5E8A9C',
    tertiary: '#D9EDF5',
    stroke: '#EDF7FB',
    muted: '#2E4A56',
  },
  indigo: {
    primary: '#C8C3FF',
    secondary: '#7A76C8',
    tertiary: '#E4E1FF',
    stroke: '#F1EFFF',
    muted: '#3D3A72',
  },
};

export const TRAINER_THEME_ICON_ASSET_PATHS: Record<ThemeMode, Record<TrainerThemeIconKind, string>> = {
  dark: {
    phrases: 'assets/images/trainer_theme_icons/dark/phrases.webp',
    words: 'assets/images/trainer_theme_icons/dark/words.webp',
    analytics: 'assets/images/trainer_theme_icons/dark/analytics.webp',
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
  minimalDark: {
    phrases: 'assets/images/trainer_theme_icons/indigo/phrases.webp',
    words: 'assets/images/trainer_theme_icons/indigo/words.webp',
    analytics: 'assets/images/trainer_theme_icons/indigo/analytics.webp',
  },
  business: {
    phrases: 'assets/images/trainer_theme_icons/business/phrases.webp',
    words: 'assets/images/trainer_theme_icons/business/words.webp',
    analytics: 'assets/images/trainer_theme_icons/business/analytics.webp',
  },
  businessLight: {
    phrases: 'assets/images/trainer_theme_icons/businessLight/phrases.webp',
    words: 'assets/images/trainer_theme_icons/businessLight/words.webp',
    analytics: 'assets/images/trainer_theme_icons/businessLight/analytics.webp',
  },
  sagePorcelain: {
    phrases: 'assets/images/trainer_theme_icons/sagePorcelain/phrases.webp',
    words: 'assets/images/trainer_theme_icons/sagePorcelain/words.webp',
    analytics: 'assets/images/trainer_theme_icons/sagePorcelain/analytics.webp',
  },
  midnight: {
    phrases: 'assets/images/trainer_theme_icons/midnight/phrases.webp',
    words: 'assets/images/trainer_theme_icons/midnight/words.webp',
    analytics: 'assets/images/trainer_theme_icons/midnight/analytics.webp',
  },
  ember: {
    phrases: 'assets/images/trainer_theme_icons/ember/phrases.webp',
    words: 'assets/images/trainer_theme_icons/ember/words.webp',
    analytics: 'assets/images/trainer_theme_icons/ember/analytics.webp',
  },
  aurora: {
    phrases: 'assets/images/trainer_theme_icons/aurora/phrases.webp',
    words: 'assets/images/trainer_theme_icons/aurora/words.webp',
    analytics: 'assets/images/trainer_theme_icons/aurora/analytics.webp',
  },
  volt: {
    phrases: 'assets/images/trainer_theme_icons/volt/phrases.webp',
    words: 'assets/images/trainer_theme_icons/volt/words.webp',
    analytics: 'assets/images/trainer_theme_icons/volt/analytics.webp',
  },
  candyBlue: {
    phrases: 'assets/images/trainer_theme_icons/indigo/phrases.webp',
    words: 'assets/images/trainer_theme_icons/indigo/words.webp',
    analytics: 'assets/images/trainer_theme_icons/indigo/analytics.webp',
  },
  indigo: {
    phrases: 'assets/images/trainer_theme_icons/indigo/phrases.webp',
    words: 'assets/images/trainer_theme_icons/indigo/words.webp',
    analytics: 'assets/images/trainer_theme_icons/indigo/analytics.webp',
  },
};

const TRAINER_THEME_ICON_SOURCES: Record<ThemeMode, Record<TrainerThemeIconKind, ImageSourcePropType>> = {
  dark: {
    phrases: require('../assets/images/trainer_theme_icons/dark/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/dark/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/dark/analytics.webp'),
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
  minimalDark: {
    phrases: require('../assets/images/trainer_theme_icons/indigo/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/indigo/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/indigo/analytics.webp'),
  },
  business: {
    phrases: require('../assets/images/trainer_theme_icons/business/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/business/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/business/analytics.webp'),
  },
  businessLight: {
    phrases: require('../assets/images/trainer_theme_icons/businessLight/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/businessLight/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/businessLight/analytics.webp'),
  },
  sagePorcelain: {
    phrases: require('../assets/images/trainer_theme_icons/sagePorcelain/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/sagePorcelain/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/sagePorcelain/analytics.webp'),
  },
  midnight: {
    phrases: require('../assets/images/trainer_theme_icons/midnight/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/midnight/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/midnight/analytics.webp'),
  },
  ember: {
    phrases: require('../assets/images/trainer_theme_icons/ember/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/ember/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/ember/analytics.webp'),
  },
  aurora: {
    phrases: require('../assets/images/trainer_theme_icons/aurora/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/aurora/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/aurora/analytics.webp'),
  },
  volt: {
    phrases: require('../assets/images/trainer_theme_icons/volt/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/volt/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/volt/analytics.webp'),
  },
  candyBlue: {
    phrases: require('../assets/images/trainer_theme_icons/indigo/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/indigo/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/indigo/analytics.webp'),
  },
  indigo: {
    phrases: require('../assets/images/trainer_theme_icons/indigo/phrases.webp'),
    words: require('../assets/images/trainer_theme_icons/indigo/words.webp'),
    analytics: require('../assets/images/trainer_theme_icons/indigo/analytics.webp'),
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
