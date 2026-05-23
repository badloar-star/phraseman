import type { ThemeMode } from '../constants/theme';
import type { MedalTier } from '../app/medal_utils';

type EarnedMedalTier = Exclude<MedalTier, 'none'>;

export interface MedalToastThemeStyle {
  signature: string;
  cardBgColors: [string, string];
  borderColor: string;
  titleColor: string;
  subtitleColor: string;
  surfaceAccent: string;
  badgeDownColor: string;
  topShineColors: [string, string, string];
  topShineOpacity: number;
  haloOpacity: number;
  auraColor: string;
  medalPlateBg: string;
  medalPlateBorder: string;
  textureColor: string;
  textureOpacity: number;
  tierAccents: Record<EarnedMedalTier, string>;
  tierGlows: Record<EarnedMedalTier, string>;
}

const DEFAULT_TIER_ACCENTS: Record<EarnedMedalTier, string> = {
  bronze: '#D08C4A',
  silver: '#72D8FF',
  gold: '#F2C44A',
};

export const MEDAL_TOAST_THEME_STYLES: Record<ThemeMode, MedalToastThemeStyle> = {
  minimalLight: {
    signature: 'sketch-parchment-graphite',
    cardBgColors: ['rgba(255,248,233,0.96)', 'rgba(230,214,187,0.94)'],
    borderColor: 'rgba(111,82,44,0.32)',
    titleColor: '#1B1712',
    subtitleColor: 'rgba(72,58,41,0.72)',
    surfaceAccent: '#504639',
    badgeDownColor: '#7A4318',
    topShineColors: ['rgba(80,70,57,0)', 'rgba(80,70,57,0.50)', 'rgba(80,70,57,0)'],
    topShineOpacity: 0.78,
    haloOpacity: 0.24,
    auraColor: 'rgba(120,91,42,0.16)',
    medalPlateBg: 'rgba(255,255,255,0.36)',
    medalPlateBorder: 'rgba(111,82,44,0.22)',
    textureColor: 'rgba(64,58,48,0.10)',
    textureOpacity: 0.85,
    tierAccents: DEFAULT_TIER_ACCENTS,
    tierGlows: {
      bronze: 'rgba(208,140,74,0.36)',
      silver: 'rgba(114,216,255,0.32)',
      gold: 'rgba(242,196,74,0.34)',
    },
  },
  minimalDark: {
    signature: 'graphite-slate-pinlight',
    cardBgColors: ['rgba(27,31,38,0.97)', 'rgba(8,10,14,0.97)'],
    borderColor: 'rgba(188,205,226,0.22)',
    titleColor: '#F6F7FB',
    subtitleColor: 'rgba(196,202,211,0.74)',
    surfaceAccent: '#9CA3AF',
    badgeDownColor: '#D08C4A',
    topShineColors: ['rgba(156,163,175,0)', 'rgba(156,163,175,0.56)', 'rgba(156,163,175,0)'],
    topShineOpacity: 0.72,
    haloOpacity: 0.24,
    auraColor: 'rgba(156,163,175,0.12)',
    medalPlateBg: 'rgba(255,255,255,0.06)',
    medalPlateBorder: 'rgba(188,205,226,0.18)',
    textureColor: 'rgba(255,255,255,0.055)',
    textureOpacity: 0.52,
    tierAccents: DEFAULT_TIER_ACCENTS,
    tierGlows: {
      bronze: 'rgba(208,140,74,0.32)',
      silver: 'rgba(114,216,255,0.34)',
      gold: 'rgba(242,196,74,0.34)',
    },
  },
  dark: {
    signature: 'forest-emerald-botanical',
    cardBgColors: ['rgba(13,45,25,0.96)', 'rgba(4,17,8,0.96)'],
    borderColor: 'rgba(71,200,112,0.28)',
    titleColor: '#F0F7F2',
    subtitleColor: 'rgba(194,226,198,0.76)',
    surfaceAccent: '#47C870',
    badgeDownColor: '#F4C28A',
    topShineColors: ['rgba(71,200,112,0)', 'rgba(71,200,112,0.64)', 'rgba(71,200,112,0)'],
    topShineOpacity: 0.86,
    haloOpacity: 0.28,
    auraColor: 'rgba(71,200,112,0.14)',
    medalPlateBg: 'rgba(71,200,112,0.08)',
    medalPlateBorder: 'rgba(71,200,112,0.22)',
    textureColor: 'rgba(71,200,112,0.11)',
    textureOpacity: 0.48,
    tierAccents: DEFAULT_TIER_ACCENTS,
    tierGlows: {
      bronze: 'rgba(208,140,74,0.34)',
      silver: 'rgba(114,216,255,0.32)',
      gold: 'rgba(242,196,74,0.36)',
    },
  },
  neon: {
    signature: 'neon-lime-scanline',
    cardBgColors: ['rgba(28,29,28,0.98)', 'rgba(3,3,3,0.98)'],
    borderColor: 'rgba(200,255,0,0.34)',
    titleColor: '#F6F6F2',
    subtitleColor: 'rgba(204,211,196,0.76)',
    surfaceAccent: '#C8FF00',
    badgeDownColor: '#F4C28A',
    topShineColors: ['rgba(200,255,0,0)', 'rgba(200,255,0,0.80)', 'rgba(200,255,0,0)'],
    topShineOpacity: 0.96,
    haloOpacity: 0.32,
    auraColor: 'rgba(200,255,0,0.16)',
    medalPlateBg: 'rgba(200,255,0,0.05)',
    medalPlateBorder: 'rgba(200,255,0,0.24)',
    textureColor: 'rgba(200,255,0,0.08)',
    textureOpacity: 0.72,
    tierAccents: {
      bronze: '#F0A45D',
      silver: '#65E5FF',
      gold: '#FFE45E',
    },
    tierGlows: {
      bronze: 'rgba(240,164,93,0.36)',
      silver: 'rgba(101,229,255,0.38)',
      gold: 'rgba(255,228,94,0.40)',
    },
  },
  coral: {
    signature: 'coral-cocoa-ember',
    cardBgColors: ['rgba(43,22,26,0.98)', 'rgba(12,5,7,0.98)'],
    borderColor: 'rgba(255,100,100,0.32)',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(244,205,198,0.76)',
    surfaceAccent: '#FF6464',
    badgeDownColor: '#F4C28A',
    topShineColors: ['rgba(255,100,100,0)', 'rgba(255,100,100,0.70)', 'rgba(255,100,100,0)'],
    topShineOpacity: 0.88,
    haloOpacity: 0.30,
    auraColor: 'rgba(255,100,100,0.15)',
    medalPlateBg: 'rgba(255,100,100,0.06)',
    medalPlateBorder: 'rgba(255,100,100,0.24)',
    textureColor: 'rgba(255,100,100,0.09)',
    textureOpacity: 0.62,
    tierAccents: {
      bronze: '#E99A62',
      silver: '#72D8FF',
      gold: '#FFD060',
    },
    tierGlows: {
      bronze: 'rgba(233,154,98,0.38)',
      silver: 'rgba(114,216,255,0.34)',
      gold: 'rgba(255,208,96,0.40)',
    },
  },
  gold: {
    signature: 'black-gold-champagne',
    cardBgColors: ['rgba(31,27,17,0.98)', 'rgba(4,4,3,0.98)'],
    borderColor: 'rgba(214,179,90,0.36)',
    titleColor: '#FFF7DF',
    subtitleColor: 'rgba(228,204,148,0.78)',
    surfaceAccent: '#D6B35A',
    badgeDownColor: '#F4C28A',
    topShineColors: ['rgba(214,179,90,0)', 'rgba(214,179,90,0.78)', 'rgba(214,179,90,0)'],
    topShineOpacity: 0.98,
    haloOpacity: 0.34,
    auraColor: 'rgba(214,179,90,0.16)',
    medalPlateBg: 'rgba(214,179,90,0.065)',
    medalPlateBorder: 'rgba(214,179,90,0.25)',
    textureColor: 'rgba(214,179,90,0.095)',
    textureOpacity: 0.64,
    tierAccents: {
      bronze: '#D99A5B',
      silver: '#72D8FF',
      gold: '#F2C44A',
    },
    tierGlows: {
      bronze: 'rgba(217,154,91,0.34)',
      silver: 'rgba(114,216,255,0.32)',
      gold: 'rgba(242,196,74,0.46)',
    },
  },
};

export function getMedalToastThemeStyle(themeMode: ThemeMode): MedalToastThemeStyle {
  return MEDAL_TOAST_THEME_STYLES[themeMode] ?? MEDAL_TOAST_THEME_STYLES.minimalDark;
}
