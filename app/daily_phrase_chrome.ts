/**
 * Visual "chrome" for the Daily Phrase surface — the single source of truth for
 * how the phrase-of-the-day looks on EACH theme.
 *
 * Used by:
 *   - components/DailyPhraseCard.tsx  (the in-app card)
 *   - app/widget_bridge.ts            (the home/lock-screen widget snapshot)
 *
 * Keeping one definition means the native widget renders the exact same palette
 * as the in-app card for every theme (dark / gold / minimal* /
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
  /** Solid background for Daily Phrase action controls. */
  actionBg: string;
  /** Foreground text and icons for Daily Phrase action controls. */
  actionText: string;
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
    actionBg: '#58CC89',
    actionText: '#07110A',
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
    actionBg: '#D6B35A',
    actionText: '#1B1205',
    shadow: '#D6B35A',
  },
  // Olive Noir: matte depth with champagne reserved for deliberate actions.
  // This same palette is serialized to WidgetKit/Glance for a coherent Plus deck.
  olive: {
    colors: ['#24281A', '#11140D', '#090A08'],
    border: 'rgba(201,168,76,0.28)',
    glow: 'rgba(201,168,76,0.13)',
    title: '#E3CC88',
    phrase: '#F4ECD8',
    sub: '#C8C2AC',
    iconBg: 'rgba(201,168,76,0.14)',
    iconBorder: 'rgba(201,168,76,0.26)',
    ornament: '#C9A84C',
    actionBg: '#C9A84C',
    actionText: '#111109',
    shadow: '#000000',
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
    actionBg: '#6EA8FF',
    actionText: '#09152A',
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
    actionBg: '#0095F6',
    actionText: '#061624',
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
    actionBg: '#0095F6',
    actionText: '#061624',
    shadow: 'rgba(0,0,0,0)',
  },
  sagePorcelain: {
    colors: ['#FCFDF9', '#F0F1EC', '#E1E5DC'],
    border: '#CFD6CE',
    glow: 'rgba(49,95,80,0.10)',
    title: '#3C5A50',
    phrase: '#17201D',
    sub: '#52605A',
    iconBg: '#D9E9E1',
    iconBorder: '#BDC8BD',
    ornament: '#315F50',
    actionBg: '#315F50',
    actionText: '#FCFDF9',
    shadow: 'rgba(35,50,43,0.14)',
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
    actionBg: '#8FA0FF',
    actionText: '#0D1030',
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
    actionBg: '#FFCC55',
    actionText: '#2A1A02',
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
    actionBg: '#3DE8A6',
    actionText: '#052A1C',
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
    actionBg: '#C6FF34',
    actionText: '#182002',
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
    actionBg: '#B2D5E5',
    actionText: '#13252D',
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
    actionBg: '#C8C3FF',
    actionText: '#17162B',
    shadow: '#C8C3FF',
  },
};

export function dailyPhraseChromeFor(mode: ThemeMode): DailyPhraseChrome {
  return DAILY_PHRASE_CHROME[mode] ?? DAILY_PHRASE_CHROME.minimalDark;
}
