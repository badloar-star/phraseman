import type { ThemeMode } from '../constants/theme';

export type ThemeAccessTier = 'free' | 'plus' | 'reward' | 'unavailable';

export const SELECTABLE_THEME_MODES = [
  'indigo',
  'sagePorcelain',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'dark',
  'gold',
] as const satisfies readonly ThemeMode[];

export type SelectableThemeMode = typeof SELECTABLE_THEME_MODES[number];

const THEME_ACCESS_BY_MODE: Record<SelectableThemeMode, Exclude<ThemeAccessTier, 'unavailable'>> = {
  indigo: 'free',
  sagePorcelain: 'free',
  midnight: 'plus',
  ember: 'plus',
  aurora: 'plus',
  volt: 'plus',
  dark: 'plus',
  gold: 'reward',
};

export function isSelectableThemeMode(themeMode: unknown): themeMode is SelectableThemeMode {
  return typeof themeMode === 'string'
    && Object.prototype.hasOwnProperty.call(THEME_ACCESS_BY_MODE, themeMode);
}

export function themeAccessTier(themeMode: unknown): ThemeAccessTier {
  return isSelectableThemeMode(themeMode) ? THEME_ACCESS_BY_MODE[themeMode] : 'unavailable';
}

export function isThemePlusOnly(themeMode: unknown): boolean {
  return themeAccessTier(themeMode) === 'plus';
}

export function isThemeRewardOnly(themeMode: unknown): boolean {
  return themeAccessTier(themeMode) === 'reward';
}
