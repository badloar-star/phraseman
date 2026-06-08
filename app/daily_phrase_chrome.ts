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
  neon: {
    colors: ['#202713', '#151914', '#080909'],
    border: 'rgba(200,255,0,0.34)',
    glow: 'rgba(200,255,0,0.26)',
    title: '#F1FFC2',
    phrase: '#FFFFFF',
    sub: '#CDD7A1',
    iconBg: 'rgba(200,255,0,0.13)',
    iconBorder: 'rgba(200,255,0,0.25)',
    ornament: '#C8FF00',
    shadow: '#C8FF00',
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
    glow: 'rgba(255,100,100,0.24)',
    title: '#FFE0E0',
    phrase: '#FFFFFF',
    sub: '#E5B9C2',
    iconBg: 'rgba(255,128,128,0.14)',
    iconBorder: 'rgba(255,128,128,0.25)',
    ornament: '#FF6464',
    shadow: '#FF6464',
  },
  minimalLight: {
    colors: ['#FFFDF7', '#F5EDDE', '#E8DCC7'],
    border: 'rgba(45,39,30,0.28)',
    glow: 'rgba(118,83,31,0.18)',
    title: '#343842',
    phrase: '#171615',
    sub: '#514B42',
    iconBg: 'rgba(52,56,66,0.10)',
    iconBorder: 'rgba(45,39,30,0.18)',
    ornament: '#343842',
    shadow: 'rgba(34,28,18,0.28)',
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
  compass: {
    colors: ['#25221D', '#141311', '#060605'],
    border: 'rgba(242,196,141,0.42)',
    glow: 'rgba(242,196,141,0.15)',
    title: '#FFE7B6',
    phrase: '#FFF8E8',
    sub: '#D8C7AA',
    iconBg: 'rgba(242,196,141,0.15)',
    iconBorder: 'rgba(242,196,141,0.31)',
    ornament: '#F2C48D',
    shadow: '#F2C48D',
  },
};

export function dailyPhraseChromeFor(mode: ThemeMode): DailyPhraseChrome {
  return DAILY_PHRASE_CHROME[mode] ?? DAILY_PHRASE_CHROME.minimalDark;
}
