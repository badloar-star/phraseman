import { GOLD_RICH } from './goldTheme';
import { COMPASS_RICH } from './compassTheme';
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
  compass: COMPASS_RICH.champagne,
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
  compass: {
    streak: COMPASS_RICH.champagne,
    freeze: COMPASS_RICH.creamSoft,
    multipliers: COMPASS_RICH.cream,
    practiceBalance: COMPASS_RICH.peach,
    weekRhythm: COMPASS_RICH.champagne,
    activity: COMPASS_RICH.creamSoft,
    percentiles: COMPASS_RICH.peach,
    archiveMap: COMPASS_RICH.champagne,
    wager: COMPASS_RICH.copper,
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
  if (themeMode === 'compass') {
    return strength === 'strong'
      ? COMPASS_RICH.hairlineStrong
      : strength === 'soft'
        ? COMPASS_RICH.hairlineQuiet
        : COMPASS_RICH.hairline;
  }
  const alpha = strength === 'strong' ? 'B8' : strength === 'soft' ? '59' : '7A';
  return alphaColor(statsThemeAccent(themeMode), alpha);
}

export function statsHairline(themeMode: ThemeMode, _tone: StatsChromeTone): string {
  if (themeMode === 'compass') return COMPASS_RICH.hairlineQuiet;
  return alphaColor(statsThemeAccent(themeMode), '3D');
}

export function statsSoftBg(themeMode: ThemeMode, tone: StatsChromeTone, strength: 'quiet' | 'normal' | 'strong' = 'normal'): string {
  const alpha = strength === 'strong' ? '2E' : strength === 'quiet' ? '14' : '22';
  return alphaColor(statsAccent(themeMode, tone), alpha);
}

export function statsGlowStyle(themeMode: ThemeMode, _tone: StatsChromeTone, strength: 'soft' | 'medium' = 'soft') {
  if (themeMode === 'compass') {
    return {
      shadowColor: '#000000',
      shadowOpacity: strength === 'medium' ? 0.46 : 0.34,
      shadowRadius: strength === 'medium' ? 18 : 12,
      shadowOffset: { width: 0, height: strength === 'medium' ? 7 : 5 },
      elevation: strength === 'medium' ? 9 : 6,
    };
  }
  return {
    shadowColor: statsThemeAccent(themeMode),
    shadowOpacity: strength === 'medium' ? 0.22 : 0.14,
    shadowRadius: strength === 'medium' ? 12 : 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: strength === 'medium' ? 5 : 3,
  };
}
