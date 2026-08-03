import { GOLD_RICH } from './goldTheme';
import {
  AURORA,
  BUSINESS,
  BUSINESS_LIGHT,
  CANDY_BLUE,
  CORAL,
  DARK,
  EMBER,
  GOLD,
  INDIGO,
  MIDNIGHT,
  SAGE_PORCELAIN,
  VOLT,
  type ThemeMode,
} from './theme';

export type StatsChromeTone =
  | 'streak'
  | 'freeze'
  | 'multipliers'
  | 'practiceBalance'
  | 'weekRhythm'
  | 'activity'
  | 'percentiles'
  | 'archiveMap'
  | 'wager';

type StatsAccentPalette = Record<StatsChromeTone, string>;

const STATS_CHROME_ACCENT_BY_THEME: Record<ThemeMode, string> = {
  dark: DARK.accent,
  gold: GOLD.accent,
  coral: CORAL.accent,
  minimalDark: '#6EA8FF',
  business: BUSINESS.accent,
  businessLight: BUSINESS_LIGHT.accent,
  sagePorcelain: SAGE_PORCELAIN.accent,
  midnight: MIDNIGHT.accent,
  ember: EMBER.accent,
  aurora: AURORA.accent,
  volt: VOLT.accent,
  candyBlue: CANDY_BLUE.accent,
  indigo: INDIGO.accent,
};

// Statistics deliberately uses a quieter page field than the shared app backdrop so
// borderless data cards keep a clear tonal edge without changing global theme tokens.
const STATS_PAGE_FIELD_BY_THEME: Record<ThemeMode, string> = {
  dark: '#202B22',
  gold: '#272114',
  coral: '#38252A',
  minimalDark: '#34373D',
  business: '#1C1C1C',
  businessLight: '#F0F0F0',
  sagePorcelain: '#F0F1EC',
  midnight: '#1B2032',
  ember: '#362418',
  aurora: '#162B2B',
  volt: '#20250E',
  candyBlue: '#1C323B',
  indigo: '#2A2952',
};

const STATS_ACCENTS_BY_THEME: Record<ThemeMode, StatsAccentPalette> = {
  dark: {
    streak: '#FF6B35',
    freeze: '#64B4FF',
    multipliers: '#FFD43B',
    practiceBalance: '#3BE083',
    weekRhythm: '#27D6C8',
    activity: '#47E58F',
    percentiles: '#B884FF',
    archiveMap: '#58CC89',
    wager: '#FFB13B',
  },
  gold: {
    streak: GOLD_RICH.metalGold,
    freeze: GOLD_RICH.champagne,
    multipliers: GOLD_RICH.paleGold,
    practiceBalance: GOLD_RICH.antiqueGold,
    weekRhythm: GOLD_RICH.champagne,
    activity: GOLD_RICH.paleGold,
    percentiles: GOLD_RICH.metalGold,
    archiveMap: GOLD_RICH.antiqueGold,
    wager: GOLD_RICH.champagne,
  },
  coral: {
    streak: '#FF6B6B',
    freeze: '#55B7FF',
    multipliers: '#FFD166',
    practiceBalance: '#37D68A',
    weekRhythm: '#45D6C8',
    activity: '#6BE27C',
    percentiles: '#FF8BD1',
    archiveMap: '#FF7A7A',
    wager: '#FFAA6B',
  },
  minimalDark: {
    streak: '#6EA8FF',
    freeze: '#9CA3AF',
    multipliers: '#E9B949',
    practiceBalance: '#7DD3FC',
    weekRhythm: '#93C5FD',
    activity: '#6EA8FF',
    percentiles: '#A78BFA',
    archiveMap: '#9CA3AF',
    wager: '#E9B949',
  },
  business: {
    streak: '#0095F6',
    freeze: '#737373',
    multipliers: '#E6E6E6',
    practiceBalance: '#A8A8A8',
    weekRhythm: '#737373',
    activity: '#0095F6',
    percentiles: '#A8A8A8',
    archiveMap: '#737373',
    wager: '#E6E6E6',
  },
  businessLight: {
    streak: '#0095F6',
    freeze: '#8E8E8E',
    multipliers: '#0095F6',
    practiceBalance: '#555555',
    weekRhythm: '#8E8E8E',
    activity: '#0095F6',
    percentiles: '#555555',
    archiveMap: '#8E8E8E',
    wager: '#0095F6',
  },
  sagePorcelain: {
    streak: '#A8464D',
    freeze: '#52605A',
    multipliers: '#8B6320',
    practiceBalance: '#2F6F4F',
    weekRhythm: '#3C5A50',
    activity: '#315F50',
    percentiles: '#315F50',
    archiveMap: '#52605A',
    wager: '#8B6320',
  },
  midnight: {
    streak: '#FFD27A',
    freeze: '#8FA0FF',
    multipliers: '#C9D2FF',
    practiceBalance: '#5FE0B0',
    weekRhythm: '#8FD8CF',
    activity: '#5FE0B0',
    percentiles: '#B79CFF',
    archiveMap: '#8FA0FF',
    wager: '#FFB36B',
  },
  ember: {
    streak: '#FF8A2A',
    freeze: '#7AC8E8',
    multipliers: '#FFCB5C',
    practiceBalance: '#5FE8A8',
    weekRhythm: '#FFC894',
    activity: '#5FE8A8',
    percentiles: '#FF7AA8',
    archiveMap: '#FFCC55',
    wager: '#FFB36B',
  },
  aurora: {
    streak: '#FFB36B',
    freeze: '#3FA9FF',
    multipliers: '#F2D27A',
    practiceBalance: '#3DE8A6',
    weekRhythm: '#2E9DFF',
    activity: '#3DE8A6',
    percentiles: '#9F8FFF',
    archiveMap: '#3DE8A6',
    wager: '#FFB36B',
  },
  volt: {
    streak: '#FF8A3D',
    freeze: '#6FE7DC',
    multipliers: '#FFE85C',
    practiceBalance: '#4FE8AC',
    weekRhythm: '#9FE870',
    activity: '#C6FF34',
    percentiles: '#B8A6FF',
    archiveMap: '#C6FF34',
    wager: '#FFC85C',
  },
  candyBlue: {
    streak: '#FFB36B',
    freeze: '#7AC8E8',
    multipliers: '#FFC53D',
    practiceBalance: '#B2D5E5',
    weekRhythm: '#8FD8CF',
    activity: '#B2D5E5',
    percentiles: '#B8A6FF',
    archiveMap: '#B2D5E5',
    wager: '#FFC53D',
  },
  indigo: {
    streak: '#FFB36B',
    freeze: '#7AC8E8',
    multipliers: '#FFC53D',
    practiceBalance: '#9FE8C8',
    weekRhythm: '#B7B3D9',
    activity: '#C8C3FF',
    percentiles: '#E4A6FF',
    archiveMap: '#C8C3FF',
    wager: '#FFC53D',
  },
};

function alphaColor(color: string, alphaHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

export function statsAccent(themeMode: ThemeMode, _tone: StatsChromeTone): string {
  return statsThemeAccent(themeMode);
}

export function statsThemeAccent(themeMode: ThemeMode): string {
  return STATS_CHROME_ACCENT_BY_THEME[themeMode] ?? STATS_CHROME_ACCENT_BY_THEME.dark;
}

export function statsPageField(themeMode: ThemeMode): string {
  return STATS_PAGE_FIELD_BY_THEME[themeMode] ?? STATS_PAGE_FIELD_BY_THEME.dark;
}

export function statsThemeSoftBg(themeMode: ThemeMode, strength: 'quiet' | 'normal' | 'strong' = 'normal'): string {
  const alpha = strength === 'strong' ? '2E' : strength === 'quiet' ? '14' : '22';
  return alphaColor(statsThemeAccent(themeMode), alpha);
}

export function statsBorder(themeMode: ThemeMode, _tone: StatsChromeTone, strength: 'soft' | 'medium' | 'strong' = 'medium'): string {
  const alpha = strength === 'strong' ? 'B8' : strength === 'soft' ? '59' : '7A';
  return alphaColor(statsThemeAccent(themeMode), alpha);
}

export function statsHairline(themeMode: ThemeMode, _tone: StatsChromeTone): string {
  return alphaColor(statsThemeAccent(themeMode), '3D');
}

export function statsSoftBg(themeMode: ThemeMode, tone: StatsChromeTone, strength: 'quiet' | 'normal' | 'strong' = 'normal'): string {
  const alpha = strength === 'strong' ? '2E' : strength === 'quiet' ? '14' : '22';
  return alphaColor(statsAccent(themeMode, tone), alpha);
}

export function statsGlowStyle(themeMode: ThemeMode, _tone: StatsChromeTone, strength: 'soft' | 'medium' = 'soft') {
  return {
    shadowColor: statsThemeAccent(themeMode),
    shadowOpacity: strength === 'medium' ? 0.22 : 0.14,
    shadowRadius: strength === 'medium' ? 12 : 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: strength === 'medium' ? 5 : 3,
  };
}
