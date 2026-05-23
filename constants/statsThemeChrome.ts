import { GOLD_RICH } from './goldTheme';
import type { ThemeMode } from './theme';

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
  dark: '#4EA3FF',
  neon: '#2DF4FF',
  gold: GOLD_RICH.champagne,
  coral: '#FF7A7A',
  minimalLight: '#33466F',
  minimalDark: '#6EA8FF',
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
  neon: {
    streak: '#FF48D2',
    freeze: '#2DF4FF',
    multipliers: '#D7FF2A',
    practiceBalance: '#39FF88',
    weekRhythm: '#00E5FF',
    activity: '#C8FF00',
    percentiles: '#B66DFF',
    archiveMap: '#C8FF00',
    wager: '#FF9F1C',
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
  minimalLight: {
    streak: '#D85A3D',
    freeze: '#1976D2',
    multipliers: '#B67600',
    practiceBalance: '#128A52',
    weekRhythm: '#087C8C',
    activity: '#2C6E49',
    percentiles: '#7C3FA6',
    archiveMap: '#33466F',
    wager: '#A65A22',
  },
  minimalDark: {
    streak: '#FF7A45',
    freeze: '#4DD6FF',
    multipliers: '#E9B949',
    practiceBalance: '#41D98A',
    weekRhythm: '#35D4C8',
    activity: '#6EA8FF',
    percentiles: '#B993FF',
    archiveMap: '#6EA8FF',
    wager: '#FFA64D',
  },
};

function alphaColor(color: string, alphaHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

export function statsAccent(themeMode: ThemeMode, tone: StatsChromeTone): string {
  return STATS_ACCENTS_BY_THEME[themeMode]?.[tone] ?? STATS_ACCENTS_BY_THEME.dark[tone];
}

export function statsThemeAccent(themeMode: ThemeMode): string {
  return STATS_CHROME_ACCENT_BY_THEME[themeMode] ?? STATS_CHROME_ACCENT_BY_THEME.dark;
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
