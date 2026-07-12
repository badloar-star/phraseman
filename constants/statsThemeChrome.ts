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
  gold: GOLD_RICH.champagne,
  coral: '#FF7A7A',
  minimalDark: '#6EA8FF',
  business: '#0095F6',
  businessLight: '#0095F6',
  midnight: '#8FA0FF',
  ember: '#FFA245',
  aurora: '#3DE8A6',
  volt: '#D6FF3D',
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
  midnight: '#1B2032',
  ember: '#362418',
  aurora: '#162B2B',
  volt: '#20250E',
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
    archiveMap: '#FFA245',
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
    activity: '#D6FF3D',
    percentiles: '#B8A6FF',
    archiveMap: '#D6FF3D',
    wager: '#FFC85C',
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

export function statsPageField(themeMode: ThemeMode): string {
  return STATS_PAGE_FIELD_BY_THEME[themeMode] ?? STATS_PAGE_FIELD_BY_THEME.dark;
}

export function statsThemeSoftBg(themeMode: ThemeMode, strength: 'quiet' | 'normal' | 'strong' = 'normal'): string {
  const alpha = strength === 'strong' ? '2E' : strength === 'quiet' ? '14' : '22';
  return alphaColor(statsThemeAccent(themeMode), alpha);
}

export function statsBorder(themeMode: ThemeMode, _tone: StatsChromeTone, strength: 'soft' | 'medium' | 'strong' = 'medium'): string {
  if (false) {
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
  if (false) return COMPASS_RICH.hairlineQuiet;
  return alphaColor(statsThemeAccent(themeMode), '3D');
}

export function statsSoftBg(themeMode: ThemeMode, tone: StatsChromeTone, strength: 'quiet' | 'normal' | 'strong' = 'normal'): string {
  const alpha = strength === 'strong' ? '2E' : strength === 'quiet' ? '14' : '22';
  return alphaColor(statsAccent(themeMode, tone), alpha);
}

export function statsGlowStyle(themeMode: ThemeMode, _tone: StatsChromeTone, strength: 'soft' | 'medium' = 'soft') {
  if (false) {
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
