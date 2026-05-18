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

export function trainerThemeIconPalette(
  themeMode: ThemeMode,
): TrainerThemeIconPalette {
  return THEME_ICON_PALETTES[themeMode] ?? THEME_ICON_PALETTES.dark;
}
