/**
 * Visual "chrome" for the Daily Phrase surface — the single source of truth for
 * how the phrase-of-the-day looks on EACH theme.
 *
 * Used by:
 *   - components/DailyPhraseCard.tsx  (the in-app card)
 *   - app/widget_bridge.ts            (the home/lock-screen widget snapshot)
 *
 * Keeping one definition means the native widget renders the exact same palette
 * as the in-app card for every theme (dark / neon / gold / coral / minimal* /
 * compass), so the widget reads as a true extension of the app — not a stranger.
 */

import type { ThemeMode } from '../constants/theme';

export interface DailyPhraseChrome {
  /** 3-stop vertical gradient, top → bottom. */
  colors: [string, string, string];
  /** Hairline border tint. */
  border: string;
  /** Soft ambient glow behind the card. */
  glow: string;
  /** Kicker / label color ("PHRASE OF THE DAY"). */
  title: string;
  /** The English phrase color (primary). */
  phrase: string;
  /** Meaning / sub text color. */
  sub: string;
  /** Icon chip fill. */
  iconBg: string;
  /** Icon chip border. */
  iconBorder: string;
  /** Brand accent for ornament + play affordance. */
  ornament: string;
  /** Drop-shadow color (matches accent on dark themes). */
  shadow: string;
}

export const DAILY_PHRASE_CHROME: Record<ThemeMode, DailyPhraseChrome> = {
  dark: {
    colors: ['#193025', '#13241C', '#09110D'],
    border: 'rgba(116,232,156,0.28)',
    glow: 'rgba(71,200,112,0.22)',
    title: '#D9FFE5',
    phrase: '#FFFFFF',
    sub: '#B8D9C2',
    iconBg: 'rgba(116,232,156,0.13)',
    iconBorder: 'rgba(116,232,156,0.22)',
    ornament: '#58CC89',
    shadow: '#47C870',
  },
  gold: {
    colors: ['#242424', '#151515', '#070707'],
    border: 'rgba(230,190,103,0.42)',
    glow: 'rgba(214,179,90,0.15)',
    title: '#FFF0BF',
    phrase: '#FFF8E8',
    sub: '#D2BE91',
    iconBg: 'rgba(230,190,103,0.14)',
    iconBorder: 'rgba(230,190,103,0.34)',
    ornament: '#D6B35A',
    shadow: '#D6B35A',
  },
  coral: {
    colors: ['#302026', '#1D171A', '#0D0A0B'],
    border: 'rgba(255,128,128,0.34)',
    glow: 'rgba(255,127,80,0.24)',
    title: '#FFE0E0',
    phrase: '#FFFFFF',
    sub: '#E5B9C2',
    iconBg: 'rgba(255,128,128,0.14)',
    iconBorder: 'rgba(255,128,128,0.25)',
    ornament: '#FF7F50',
    shadow: '#FF7F50',
  },
  minimalDark: {
    colors: ['#26303E', '#20242C', '#121419'],
    border: 'rgba(110,168,255,0.34)',
    glow: 'rgba(110,168,255,0.22)',
    title: '#DCEAFF',
    phrase: '#FFFFFF',
    sub: '#B8C1CF',
    iconBg: 'rgba(110,168,255,0.13)',
    iconBorder: 'rgba(110,168,255,0.24)',
    ornament: '#6EA8FF',
    shadow: '#6EA8FF',
  },
  business: {
    colors: ['#1A1A1A', '#121212', '#000000'],
    border: 'rgba(255,255,255,0.12)',
    glow: 'rgba(0,149,246,0.10)',
    title: '#F5F5F5',
    phrase: '#FFFFFF',
    sub: '#737373',
    iconBg: 'rgba(0,149,246,0.12)',
    iconBorder: 'rgba(0,149,246,0.24)',
    ornament: '#0095F6',
    shadow: '#000000',
  },
  businessLight: {
    colors: ['#FFFFFF', '#FFFFFF', '#FAFAFA'],
    border: 'rgba(0,0,0,0.10)',
    glow: 'rgba(0,149,246,0.10)',
    title: '#262626',
    phrase: '#262626',
    sub: '#8E8E8E',
    iconBg: 'rgba(0,149,246,0.12)',
    iconBorder: 'rgba(0,149,246,0.26)',
    ornament: '#0095F6',
    shadow: 'rgba(0,0,0,0)',
  },
  midnight: {
    colors: ['#1A1D2C', '#0D0E16', '#050506'],
    border: 'rgba(143,160,255,0.42)',
    glow: 'rgba(91,124,255,0.16)',
    title: '#C9D2FF',
    phrase: '#FFFFFF',
    sub: '#A9AECB',
    iconBg: 'rgba(143,160,255,0.15)',
    iconBorder: 'rgba(143,160,255,0.31)',
    ornament: '#8FA0FF',
    shadow: '#8FA0FF',
  },
  ember: {
    colors: ['#231A12', '#0F0B07', '#050506'],
    border: 'rgba(255,204,85,0.42)',
    glow: 'rgba(255,138,42,0.16)',
    title: '#FFE9B8',
    phrase: '#FFFFFF',
    sub: '#C9B4A4',
    iconBg: 'rgba(255,204,85,0.15)',
    iconBorder: 'rgba(255,204,85,0.31)',
    ornament: '#FFCC55',
    shadow: '#FFCC55',
  },
  aurora: {
    colors: ['#15211B', '#090F0C', '#050506'],
    border: 'rgba(61,232,166,0.42)',
    glow: 'rgba(46,230,160,0.16)',
    title: '#9FF2CF',
    phrase: '#FFFFFF',
    sub: '#A7C0B5',
    iconBg: 'rgba(61,232,166,0.15)',
    iconBorder: 'rgba(61,232,166,0.31)',
    ornament: '#3DE8A6',
    shadow: '#3DE8A6',
  },
  volt: {
    colors: ['#1C2010', '#0C0E06', '#050506'],
    border: 'rgba(198,255,52,0.42)',
    glow: 'rgba(168,232,30,0.16)',
    title: '#E8FF96',
    phrase: '#FFFFFF',
    sub: '#BFC6A3',
    iconBg: 'rgba(198,255,52,0.15)',
    iconBorder: 'rgba(198,255,52,0.31)',
    ornament: '#C6FF34',
    shadow: '#C6FF34',
  },
  candyBlue: {
    colors: ['#16282F', '#101E24', '#070D10'],
    border: 'rgba(178,213,229,0.34)',
    glow: 'rgba(178,213,229,0.20)',
    title: '#D9EDF5',
    phrase: '#FFFFFF',
    sub: '#9DB9C4',
    iconBg: 'rgba(178,213,229,0.13)',
    iconBorder: 'rgba(178,213,229,0.24)',
    ornament: '#B2D5E5',
    shadow: '#B2D5E5',
  },
  indigo: {
    colors: ['#222140', '#17162B', '#0A0912'],
    border: 'rgba(200,195,255,0.34)',
    glow: 'rgba(200,195,255,0.20)',
    title: '#E4E1FF',
    phrase: '#FFFFFF',
    sub: '#B7B3D9',
    iconBg: 'rgba(200,195,255,0.13)',
    iconBorder: 'rgba(200,195,255,0.24)',
    ornament: '#C8C3FF',
    shadow: '#C8C3FF',
  },
  vanilla: {
    colors: ['#FFFDF4', '#F6EEDA', '#EDE1C6'],
    border: 'rgba(61,78,143,0.30)',
    glow: 'rgba(61,78,143,0.10)',
    title: '#3D4E8F',
    phrase: '#2A2118',
    sub: '#6F6350',
    iconBg: 'rgba(61,78,143,0.10)',
    iconBorder: 'rgba(61,78,143,0.22)',
    ornament: '#3D4E8F',
    shadow: 'rgba(58,44,8,0.25)',
  },
};

export function dailyPhraseChromeFor(mode: ThemeMode): DailyPhraseChrome {
  return DAILY_PHRASE_CHROME[mode] ?? DAILY_PHRASE_CHROME.minimalDark;
}
