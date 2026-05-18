import type { Theme, ThemeMode } from './theme';
import { GOLD_RICH } from './goldTheme';

type Gradient3 = [string, string, string];
type Locations3 = [number, number, number];

export type LeagueBonusModalPalette = {
  overlay: string;
  frame: Gradient3;
  card: Gradient3;
  cardLocations: Locations3;
  wash: Gradient3;
  rail: string;
  ribbon: string;
  ribbonAlt: string;
  halo: string;
  haloBorder: string;
  crestBg: string;
  crestBorder: string;
  eyebrow: string;
  metaBg: string;
  metaBorder: string;
  primary: Gradient3;
  primaryText: string;
  rewardBg: string;
  rewardBorder: string;
  shine: string;
};

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
  modal: LeagueBonusModalPalette;
};

const PALETTES: Record<ThemeMode, LeagueBonusPalette> = {
  minimalLight: {
    card: ['rgba(255,252,246,0.98)', 'rgba(239,232,219,0.96)', 'rgba(223,211,191,0.92)'],
    cardLocations: [0, 0.54, 1],
    border: 'rgba(52,45,35,0.28)',
    accent: '#33466F',
    readyAccent: '#2F7B55',
    iconBg: 'rgba(52,56,66,0.14)',
    iconBorder: 'rgba(52,56,66,0.32)',
    textMuted: '#5D5143',
    track: 'rgba(56,52,44,0.16)',
    trackBorder: 'rgba(52,45,35,0.24)',
    fill: ['#33466F', '#52627F', '#76531F'],
    readyFill: ['#2F7B55', '#5E9677', '#76531F'],
    innerBg: 'rgba(255,252,246,0.56)',
    innerBorder: 'rgba(52,45,35,0.24)',
    modal: {
      overlay: 'rgba(31,24,14,0.50)',
      frame: ['#FFFFFF', '#33466F', '#76531F'],
      card: ['#FFFCF6', '#F1E6D4', '#DDCFB8'],
      cardLocations: [0, 0.54, 1],
      wash: ['rgba(51,70,111,0.12)', 'rgba(255,255,255,0)', 'rgba(118,83,31,0.14)'],
      rail: 'rgba(51,70,111,0.28)',
      ribbon: 'rgba(51,70,111,0.11)',
      ribbonAlt: 'rgba(118,83,31,0.13)',
      halo: 'rgba(118,83,31,0.18)',
      haloBorder: 'rgba(118,83,31,0.22)',
      crestBg: 'rgba(255,255,255,0.58)',
      crestBorder: 'rgba(118,83,31,0.30)',
      eyebrow: '#76531F',
      metaBg: 'rgba(51,70,111,0.09)',
      metaBorder: 'rgba(51,70,111,0.24)',
      primary: ['#FFF0B8', '#D7AD56', '#A8742C'],
      primaryText: '#171615',
      rewardBg: 'rgba(255,253,246,0.74)',
      rewardBorder: 'rgba(52,45,35,0.22)',
      shine: 'rgba(255,255,255,0.42)',
    },
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
    modal: {
      overlay: 'rgba(0,0,0,0.70)',
      frame: ['#E9B949', '#6EA8FF', '#53E7D4'],
      card: ['#31343B', '#23262C', '#123442'],
      cardLocations: [0, 0.55, 1],
      wash: ['rgba(110,168,255,0.16)', 'rgba(0,0,0,0)', 'rgba(83,231,212,0.13)'],
      rail: 'rgba(110,168,255,0.36)',
      ribbon: 'rgba(110,168,255,0.12)',
      ribbonAlt: 'rgba(83,231,212,0.10)',
      halo: 'rgba(110,168,255,0.16)',
      haloBorder: 'rgba(123,215,255,0.30)',
      crestBg: 'rgba(110,168,255,0.12)',
      crestBorder: 'rgba(123,215,255,0.34)',
      eyebrow: '#9FDBFF',
      metaBg: 'rgba(110,168,255,0.10)',
      metaBorder: 'rgba(123,215,255,0.22)',
      primary: ['#E9B949', '#6EA8FF', '#53E7D4'],
      primaryText: '#07111A',
      rewardBg: 'rgba(255,255,255,0.065)',
      rewardBorder: 'rgba(123,215,255,0.18)',
      shine: 'rgba(255,255,255,0.30)',
    },
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
    modal: {
      overlay: 'rgba(0,0,0,0.72)',
      frame: ['#B5F35C', '#2EE8C4', '#0A2219'],
      card: ['#10251A', '#07100A', '#00494E'],
      cardLocations: [0, 0.56, 1],
      wash: ['rgba(46,232,196,0.14)', 'rgba(0,0,0,0)', 'rgba(181,243,92,0.11)'],
      rail: 'rgba(46,232,196,0.32)',
      ribbon: 'rgba(46,232,196,0.10)',
      ribbonAlt: 'rgba(181,243,92,0.09)',
      halo: 'rgba(46,232,196,0.14)',
      haloBorder: 'rgba(46,232,196,0.28)',
      crestBg: 'rgba(46,232,196,0.12)',
      crestBorder: 'rgba(46,232,196,0.34)',
      eyebrow: '#2EE8C4',
      metaBg: 'rgba(46,232,196,0.09)',
      metaBorder: 'rgba(46,232,196,0.20)',
      primary: ['#B5F35C', '#2EE8C4', '#2DDC84'],
      primaryText: '#042010',
      rewardBg: 'rgba(255,255,255,0.052)',
      rewardBorder: 'rgba(46,232,196,0.16)',
      shine: 'rgba(255,255,255,0.26)',
    },
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
    modal: {
      overlay: 'rgba(0,0,0,0.76)',
      frame: ['#D7FF38', '#00E5FF', '#FF4FD8'],
      card: ['#111113', '#1E2706', '#2D0A38'],
      cardLocations: [0, 0.50, 1],
      wash: ['rgba(215,255,56,0.13)', 'rgba(0,0,0,0)', 'rgba(255,79,216,0.12)'],
      rail: 'rgba(215,255,56,0.38)',
      ribbon: 'rgba(0,229,255,0.11)',
      ribbonAlt: 'rgba(255,79,216,0.10)',
      halo: 'rgba(215,255,56,0.14)',
      haloBorder: 'rgba(215,255,56,0.32)',
      crestBg: 'rgba(215,255,56,0.12)',
      crestBorder: 'rgba(215,255,56,0.36)',
      eyebrow: '#D7FF38',
      metaBg: 'rgba(215,255,56,0.09)',
      metaBorder: 'rgba(215,255,56,0.22)',
      primary: ['#D7FF38', '#00E5FF', '#FF4FD8'],
      primaryText: '#111300',
      rewardBg: 'rgba(215,255,56,0.065)',
      rewardBorder: 'rgba(215,255,56,0.18)',
      shine: 'rgba(255,255,255,0.32)',
    },
  },
  coral: {
    card: ['rgba(46,35,39,0.98)', 'rgba(62,40,45,0.94)', 'rgba(25,18,20,0.88)'],
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
    modal: {
      overlay: 'rgba(10,5,8,0.76)',
      frame: ['#FFD060', '#FF8A7A', '#6AA8FF'],
      card: ['#2E2327', '#3E282D', '#191214'],
      cardLocations: [0, 0.50, 1],
      wash: ['rgba(255,138,122,0.15)', 'rgba(0,0,0,0)', 'rgba(106,168,255,0.11)'],
      rail: 'rgba(255,138,122,0.34)',
      ribbon: 'rgba(255,138,122,0.11)',
      ribbonAlt: 'rgba(106,168,255,0.10)',
      halo: 'rgba(255,138,122,0.15)',
      haloBorder: 'rgba(255,138,122,0.30)',
      crestBg: 'rgba(255,138,122,0.12)',
      crestBorder: 'rgba(255,138,122,0.36)',
      eyebrow: '#FFB15A',
      metaBg: 'rgba(255,138,122,0.09)',
      metaBorder: 'rgba(255,138,122,0.22)',
      primary: ['#FFD060', '#FF8A7A', '#6AA8FF'],
      primaryText: '#160A0D',
      rewardBg: 'rgba(255,255,255,0.060)',
      rewardBorder: 'rgba(255,138,122,0.18)',
      shine: 'rgba(255,255,255,0.28)',
    },
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
    modal: {
      overlay: 'rgba(0,0,0,0.78)',
      frame: [GOLD_RICH.champagne, GOLD_RICH.metalGold, GOLD_RICH.bronzeDark],
      card: ['#1D1A12', '#0D0C0A', '#040403'],
      cardLocations: [0, 0.62, 1],
      wash: [GOLD_RICH.washStrong, 'rgba(0,0,0,0)', GOLD_RICH.bronzeWashStrong],
      rail: GOLD_RICH.edgeLight,
      ribbon: GOLD_RICH.wash,
      ribbonAlt: GOLD_RICH.bronzeWashStrong,
      halo: GOLD_RICH.washStrong,
      haloBorder: GOLD_RICH.hairlineStrong,
      crestBg: GOLD_RICH.bronzeWash,
      crestBorder: GOLD_RICH.hairlineStrong,
      eyebrow: GOLD_RICH.champagne,
      metaBg: GOLD_RICH.wash,
      metaBorder: GOLD_RICH.hairline,
      primary: [GOLD_RICH.champagne, GOLD_RICH.metalGold, GOLD_RICH.bronze],
      primaryText: '#0A0702',
      rewardBg: GOLD_RICH.mist,
      rewardBorder: GOLD_RICH.hairlineQuiet,
      shine: 'rgba(255,245,210,0.28)',
    },
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
    modal: {
      overlay: 'rgba(0,0,0,0.72)',
      frame: [theme.gold, theme.accent, theme.bgPrimary],
      card: [theme.bgCard, theme.bgSurface, theme.bgCard],
      cardLocations: [0, 0.55, 1],
      wash: [theme.accentBg, 'rgba(0,0,0,0)', theme.goldBg],
      rail: theme.borderHighlight,
      ribbon: theme.accentBg,
      ribbonAlt: theme.goldBg,
      halo: theme.glow,
      haloBorder: theme.border,
      crestBg: theme.accentBg,
      crestBorder: theme.border,
      eyebrow: theme.gold,
      metaBg: theme.accentBg,
      metaBorder: theme.border,
      primary: [theme.gold, theme.accent, theme.correct],
      primaryText: theme.textOnGold,
      rewardBg: theme.bgSurface,
      rewardBorder: theme.border,
      shine: 'rgba(255,255,255,0.24)',
    },
  };
}
