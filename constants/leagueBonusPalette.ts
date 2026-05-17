import type { Theme, ThemeMode } from './theme';
import { GOLD_RICH } from './goldTheme';

type Gradient3 = [string, string, string];
type Locations3 = [number, number, number];

export type LeagueBonusPalette = {
  card: Gradient3;
  cardLocations: Locations3;
  border: string;
  accent: string;
  readyAccent: string;
  iconBg: string;
  iconBorder: string;
  textMuted: string;
  track: string;
  trackBorder: string;
  fill: Gradient3;
  readyFill: Gradient3;
  innerBg: string;
  innerBorder: string;
};

const PALETTES: Record<ThemeMode, LeagueBonusPalette> = {
  minimalLight: {
    card: ['rgba(255,253,248,0.98)', 'rgba(235,242,255,0.94)', 'rgba(255,226,188,0.88)'],
    cardLocations: [0, 0.54, 1],
    border: 'rgba(54,98,216,0.24)',
    accent: '#3662D8',
    readyAccent: '#2DA66E',
    iconBg: 'rgba(54,98,216,0.12)',
    iconBorder: 'rgba(54,98,216,0.30)',
    textMuted: '#7A633E',
    track: 'rgba(44,52,64,0.10)',
    trackBorder: 'rgba(54,98,216,0.18)',
    fill: ['#2F6FE4', '#19B7C7', '#F3A33B'],
    readyFill: ['#2DA66E', '#6ED39A', '#F4C24F'],
    innerBg: 'rgba(255,255,255,0.44)',
    innerBorder: 'rgba(54,98,216,0.18)',
  },
  minimalDark: {
    card: ['rgba(44,47,58,0.98)', 'rgba(24,27,37,0.96)', 'rgba(13,48,62,0.86)'],
    cardLocations: [0, 0.52, 1],
    border: 'rgba(123,215,255,0.30)',
    accent: '#7BD7FF',
    readyAccent: '#75F0A0',
    iconBg: 'rgba(123,215,255,0.14)',
    iconBorder: 'rgba(123,215,255,0.34)',
    textMuted: '#B4C9D6',
    track: 'rgba(255,255,255,0.085)',
    trackBorder: 'rgba(123,215,255,0.18)',
    fill: ['#6EA8FF', '#9D7CFF', '#53E7D4'],
    readyFill: ['#75F0A0', '#53E7D4', '#E9B949'],
    innerBg: 'rgba(255,255,255,0.055)',
    innerBorder: 'rgba(123,215,255,0.18)',
  },
  dark: {
    card: ['rgba(10,34,25,0.98)', 'rgba(7,16,10,0.96)', 'rgba(0,73,78,0.82)'],
    cardLocations: [0, 0.56, 1],
    border: 'rgba(46,232,196,0.28)',
    accent: '#2EE8C4',
    readyAccent: '#62E887',
    iconBg: 'rgba(46,232,196,0.13)',
    iconBorder: 'rgba(46,232,196,0.34)',
    textMuted: '#91D9BF',
    track: 'rgba(255,255,255,0.075)',
    trackBorder: 'rgba(46,232,196,0.16)',
    fill: ['#2DDC84', '#19D3B5', '#B5F35C'],
    readyFill: ['#62E887', '#B5F35C', '#2EE8C4'],
    innerBg: 'rgba(255,255,255,0.045)',
    innerBorder: 'rgba(46,232,196,0.16)',
  },
  neon: {
    card: ['rgba(12,12,14,0.98)', 'rgba(30,39,6,0.93)', 'rgba(45,10,56,0.88)'],
    cardLocations: [0, 0.48, 1],
    border: 'rgba(215,255,56,0.30)',
    accent: '#D7FF38',
    readyAccent: '#00F5A0',
    iconBg: 'rgba(215,255,56,0.14)',
    iconBorder: 'rgba(215,255,56,0.36)',
    textMuted: '#D7FF8A',
    track: 'rgba(255,255,255,0.09)',
    trackBorder: 'rgba(215,255,56,0.18)',
    fill: ['#D7FF38', '#00E5FF', '#FF4FD8'],
    readyFill: ['#00F5A0', '#D7FF38', '#00E5FF'],
    innerBg: 'rgba(215,255,56,0.075)',
    innerBorder: 'rgba(215,255,56,0.18)',
  },
  coral: {
    card: ['rgba(35,26,63,0.98)', 'rgba(74,27,54,0.94)', 'rgba(16,47,78,0.86)'],
    cardLocations: [0, 0.5, 1],
    border: 'rgba(255,138,122,0.32)',
    accent: '#FF8A7A',
    readyAccent: '#7CFFB2',
    iconBg: 'rgba(255,138,122,0.14)',
    iconBorder: 'rgba(255,138,122,0.36)',
    textMuted: '#FFD0C8',
    track: 'rgba(255,255,255,0.085)',
    trackBorder: 'rgba(255,138,122,0.18)',
    fill: ['#FF6B6B', '#FFB15A', '#6AA8FF'],
    readyFill: ['#7CFFB2', '#6AA8FF', '#FFB15A'],
    innerBg: 'rgba(255,255,255,0.055)',
    innerBorder: 'rgba(255,138,122,0.18)',
  },
  gold: {
    card: ['rgba(26,23,17,0.74)', 'rgba(10,10,10,0.64)', 'rgba(34,25,10,0.56)'],
    cardLocations: [0, 0.56, 1],
    border: GOLD_RICH.hairline,
    accent: GOLD_RICH.metalGold,
    readyAccent: GOLD_RICH.champagne,
    iconBg: GOLD_RICH.wash,
    iconBorder: GOLD_RICH.hairline,
    textMuted: GOLD_RICH.taupe,
    track: 'rgba(17,17,17,0.58)',
    trackBorder: GOLD_RICH.hairlineQuiet,
    fill: [GOLD_RICH.bronzeDark, GOLD_RICH.antiqueGold, GOLD_RICH.champagne],
    readyFill: [GOLD_RICH.antiqueGold, GOLD_RICH.champagne, GOLD_RICH.metalGold],
    innerBg: GOLD_RICH.bronzeWash,
    innerBorder: GOLD_RICH.hairlineQuiet,
  },
};

export function getLeagueBonusPalette(theme: Theme, themeMode: ThemeMode): LeagueBonusPalette {
  return PALETTES[themeMode] ?? {
    card: [theme.bgCard, theme.bgSurface, theme.bgCard],
    cardLocations: [0, 0.55, 1],
    border: theme.border,
    accent: theme.accent,
    readyAccent: theme.correct,
    iconBg: theme.accentBg,
    iconBorder: theme.border,
    textMuted: theme.textMuted,
    track: theme.bgSurface,
    trackBorder: theme.border,
    fill: [theme.accent, theme.correct, theme.gold],
    readyFill: [theme.correct, theme.accent, theme.gold],
    innerBg: theme.bgSurface,
    innerBorder: theme.border,
  };
}
