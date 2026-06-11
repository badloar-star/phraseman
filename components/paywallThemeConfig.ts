// ════════════════════════════════════════════════════════════════════════════
// paywallThemeConfig.ts — тема-адаптивные цвета пейвола
//
// Каждая ThemeMode получает свой набор цветов для:
//  - Hero акцент (заголовок, emoji glow)
//  - Plan карточки (selected border/bg, unselected bg)
//  - Savings badge ("Экономия 62%")
//  - CTA кнопка (bg, text, shadow)
//  - Benefit pills (bg, text, border)
//  - Urgency блок (bg, timer text, strikethrough)
//  - "Popular" badge на yearly карточке
//
// Compass и Gold используют свои rich-палитры из констант.
// ════════════════════════════════════════════════════════════════════════════
import type { ThemeMode } from '../constants/theme';
import { COMPASS_RICH } from '../constants/compassTheme';
import { GOLD_RICH } from '../constants/goldTheme';

export interface ThemePaywallConfig {
  // ── Hero ──────────────────────────────────────────────────────────────────
  /** Цвет акцента для заголовка / hero glow */
  heroAccent: string;

  // ── Plan карточки ─────────────────────────────────────────────────────────
  /** Рамка выбранной карточки */
  selectedCardBorder: string;
  /** Фон выбранной карточки */
  selectedCardBg: string;
  /** Фон невыбранной карточки */
  unselectedCardBg: string;
  /** Тень выбранной карточки (shadowColor) */
  selectedCardShadow: string;

  // ── Savings badge ("Экономия 62%") ────────────────────────────────────────
  savingsBadgeBg: string;
  savingsBadgeText: string;

  // ── "Popular" / "Лучший выбор" badge ─────────────────────────────────────
  popularBadgeBg: string;
  popularBadgeText: string;

  // ── CTA кнопка ────────────────────────────────────────────────────────────
  ctaBg: string;
  ctaText: string;
  ctaShadow: string;

  // ── Benefit pills ─────────────────────────────────────────────────────────
  pillBg: string;
  pillText: string;
  pillBorder: string;

  // ── Urgency блок ──────────────────────────────────────────────────────────
  urgencyBg: string;
  urgencyTimerText: string;
  urgencyLabelText: string;
  urgencyStrikethroughColor: string;
  urgencyCurrentPriceText: string;

  // ── "Ещё N преимуществ" кнопка ────────────────────────────────────────────
  expandBtnText: string;
  expandBtnBorder: string;

  // ── Social proof ──────────────────────────────────────────────────────────
  socialProofText: string;
  socialProofStarColor: string;
}

export const PAYWALL_THEME_CONFIG: Record<ThemeMode, ThemePaywallConfig> = {
  // ── DARK (deep forest green) ──────────────────────────────────────────────
  dark: {
    heroAccent: '#58CC89',

    selectedCardBorder: '#58CC89',
    selectedCardBg: 'rgba(88,204,137,0.13)',
    unselectedCardBg: 'rgba(21,32,25,0.86)',
    selectedCardShadow: '#47C870',

    savingsBadgeBg: '#FFC800',
    savingsBadgeText: '#07100A',

    popularBadgeBg: '#47C870',
    popularBadgeText: '#042010',

    ctaBg: '#58CC89',
    ctaText: '#042010',
    ctaShadow: '#47C870',

    pillBg: 'rgba(88,204,137,0.13)',
    pillText: '#58CC89',
    pillBorder: 'rgba(88,204,137,0.28)',

    urgencyBg: 'rgba(255,200,0,0.10)',
    urgencyTimerText: '#FFC800',
    urgencyLabelText: '#8AB49A',
    urgencyStrikethroughColor: '#506A5C',
    urgencyCurrentPriceText: '#58CC89',

    expandBtnText: '#58CC89',
    expandBtnBorder: 'rgba(88,204,137,0.28)',

    socialProofText: '#8AB49A',
    socialProofStarColor: '#FFC800',
  },

  // ── NEON (electric lime) ──────────────────────────────────────────────────
  neon: {
    heroAccent: '#C8FF00',

    selectedCardBorder: '#C8FF00',
    selectedCardBg: 'rgba(200,255,0,0.10)',
    unselectedCardBg: 'rgba(32,32,32,0.86)',
    selectedCardShadow: '#C8FF00',

    savingsBadgeBg: '#C8FF00',
    savingsBadgeText: '#0A0A00',

    popularBadgeBg: '#C8FF00',
    popularBadgeText: '#1A2400',

    ctaBg: '#C8FF00',
    ctaText: '#1A2400',
    ctaShadow: '#C8FF00',

    pillBg: 'rgba(200,255,0,0.10)',
    pillText: '#C8FF00',
    pillBorder: 'rgba(200,255,0,0.26)',

    urgencyBg: 'rgba(200,255,0,0.08)',
    urgencyTimerText: '#C8FF00',
    urgencyLabelText: '#A8A8A8',
    urgencyStrikethroughColor: '#606060',
    urgencyCurrentPriceText: '#C8FF00',

    expandBtnText: '#C8FF00',
    expandBtnBorder: 'rgba(200,255,0,0.26)',

    socialProofText: '#A8A8A8',
    socialProofStarColor: '#FFE600',
  },

  // ── GOLD (black gold luxury) ──────────────────────────────────────────────
  gold: {
    heroAccent: GOLD_RICH.paleGold,

    selectedCardBorder: GOLD_RICH.metalGold,
    selectedCardBg: GOLD_RICH.washStrong,
    unselectedCardBg: 'rgba(10,10,10,0.88)',
    selectedCardShadow: GOLD_RICH.metalGold,

    savingsBadgeBg: GOLD_RICH.metalGold,
    savingsBadgeText: '#0A0702',

    popularBadgeBg: GOLD_RICH.antiqueGold,
    popularBadgeText: '#0A0702',

    ctaBg: GOLD_RICH.paleGold,
    ctaText: '#0A0702',
    ctaShadow: GOLD_RICH.metalGold,

    pillBg: GOLD_RICH.wash,
    pillText: GOLD_RICH.champagne,
    pillBorder: GOLD_RICH.hairline,

    urgencyBg: GOLD_RICH.wash,
    urgencyTimerText: GOLD_RICH.champagne,
    urgencyLabelText: GOLD_RICH.taupe,
    urgencyStrikethroughColor: GOLD_RICH.taupeDeep,
    urgencyCurrentPriceText: GOLD_RICH.paleGold,

    expandBtnText: GOLD_RICH.champagne,
    expandBtnBorder: GOLD_RICH.hairline,

    socialProofText: GOLD_RICH.taupe,
    socialProofStarColor: GOLD_RICH.metalGold,
  },

  // ── CORAL (dark rose / finance) ───────────────────────────────────────────
  coral: {
    heroAccent: '#FF6464',

    selectedCardBorder: '#FF6464',
    selectedCardBg: 'rgba(255,100,100,0.12)',
    unselectedCardBg: 'rgba(33,24,27,0.88)',
    selectedCardShadow: '#FF6464',

    savingsBadgeBg: '#FFD060',
    savingsBadgeText: '#1A1208',

    popularBadgeBg: '#FF6464',
    popularBadgeText: '#FFFFFF',

    ctaBg: '#FF6464',
    ctaText: '#FFFFFF',
    ctaShadow: '#FF6464',

    pillBg: 'rgba(255,100,100,0.12)',
    pillText: '#FF6464',
    pillBorder: 'rgba(255,100,100,0.28)',

    urgencyBg: 'rgba(255,208,96,0.10)',
    urgencyTimerText: '#FFD060',
    urgencyLabelText: '#B9A6AE',
    urgencyStrikethroughColor: '#75656C',
    urgencyCurrentPriceText: '#FF6464',

    expandBtnText: '#FF6464',
    expandBtnBorder: 'rgba(255,100,100,0.28)',

    socialProofText: '#B9A6AE',
    socialProofStarColor: '#FFD060',
  },

  // ── MINIMAL LIGHT (warm parchment) ────────────────────────────────────────
  minimalLight: {
    heroAccent: '#273044',

    selectedCardBorder: '#273044',
    selectedCardBg: 'rgba(39,48,68,0.10)',
    unselectedCardBg: 'rgba(255,253,246,0.90)',
    selectedCardShadow: 'rgba(39,48,68,0.22)',

    savingsBadgeBg: '#273044',
    savingsBadgeText: '#F3ECDC',

    popularBadgeBg: '#273044',
    popularBadgeText: '#F3ECDC',

    ctaBg: '#273044',
    ctaText: '#FFFFFF',
    ctaShadow: 'rgba(39,48,68,0.30)',

    pillBg: 'rgba(39,48,68,0.08)',
    pillText: '#273044',
    pillBorder: 'rgba(39,48,68,0.22)',

    urgencyBg: 'rgba(118,83,31,0.10)',
    urgencyTimerText: '#76531F',
    urgencyLabelText: '#48443C',
    urgencyStrikethroughColor: '#6A6256',
    urgencyCurrentPriceText: '#273044',

    expandBtnText: '#273044',
    expandBtnBorder: 'rgba(39,48,68,0.22)',

    socialProofText: '#48443C',
    socialProofStarColor: '#76531F',
  },

  // ── MINIMAL DARK (clean dark / blue accent) ───────────────────────────────
  minimalDark: {
    heroAccent: '#6EA8FF',

    selectedCardBorder: '#6EA8FF',
    selectedCardBg: 'rgba(110,168,255,0.12)',
    unselectedCardBg: 'rgba(35,36,40,0.88)',
    selectedCardShadow: '#6EA8FF',

    savingsBadgeBg: '#E9B949',
    savingsBadgeText: '#1A1A1A',

    popularBadgeBg: '#6EA8FF',
    popularBadgeText: '#0E1A2F',

    ctaBg: '#6EA8FF',
    ctaText: '#0E1A2F',
    ctaShadow: '#6EA8FF',

    pillBg: 'rgba(110,168,255,0.12)',
    pillText: '#6EA8FF',
    pillBorder: 'rgba(110,168,255,0.28)',

    urgencyBg: 'rgba(233,185,73,0.10)',
    urgencyTimerText: '#E9B949',
    urgencyLabelText: '#A7ABB3',
    urgencyStrikethroughColor: '#747A84',
    urgencyCurrentPriceText: '#6EA8FF',

    expandBtnText: '#6EA8FF',
    expandBtnBorder: 'rgba(110,168,255,0.28)',

    socialProofText: '#A7ABB3',
    socialProofStarColor: '#E9B949',
  },

  // ── COMPASS (warm charcoal / champagne) ───────────────────────────────────
  compass: {
    heroAccent: COMPASS_RICH.cream,

    selectedCardBorder: 'rgba(255,231,182,0.46)',
    selectedCardBg: 'rgba(248,215,163,0.10)',
    unselectedCardBg: 'rgba(116,114,110,0.40)',
    selectedCardShadow: COMPASS_RICH.copper,

    savingsBadgeBg: COMPASS_RICH.champagne,
    savingsBadgeText: COMPASS_RICH.textDark,

    popularBadgeBg: COMPASS_RICH.creamSoft,
    popularBadgeText: COMPASS_RICH.textDark,

    ctaBg: COMPASS_RICH.creamSoft,
    ctaText: COMPASS_RICH.textDark,
    ctaShadow: 'transparent',

    pillBg: COMPASS_RICH.wash,
    pillText: COMPASS_RICH.champagne,
    pillBorder: COMPASS_RICH.hairlineQuiet,

    urgencyBg: COMPASS_RICH.wash,
    urgencyTimerText: COMPASS_RICH.cream,
    urgencyLabelText: COMPASS_RICH.textMuted,
    urgencyStrikethroughColor: COMPASS_RICH.copper,
    urgencyCurrentPriceText: COMPASS_RICH.champagne,

    expandBtnText: COMPASS_RICH.champagne,
    expandBtnBorder: COMPASS_RICH.hairline,

    socialProofText: COMPASS_RICH.textMuted,
    socialProofStarColor: COMPASS_RICH.champagne,
  },
  midnight: {
    heroAccent: '#C9D2FF',

    selectedCardBorder: 'rgba(143,160,255,0.46)',
    selectedCardBg: 'rgba(143,160,255,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    selectedCardShadow: '#39448F',

    savingsBadgeBg: '#8FA0FF',
    savingsBadgeText: '#0D1030',

    popularBadgeBg: '#C9D2FF',
    popularBadgeText: '#0D1030',

    ctaBg: '#8FA0FF',
    ctaText: '#0D1030',
    ctaShadow: 'transparent',

    pillBg: 'rgba(143,160,255,0.1)',
    pillText: '#8FA0FF',
    pillBorder: 'rgba(143,160,255,0.18)',

    urgencyBg: 'rgba(143,160,255,0.08)',
    urgencyTimerText: '#C9D2FF',
    urgencyLabelText: '#A9AECB',
    urgencyStrikethroughColor: '#6E7390',
    urgencyCurrentPriceText: '#8FA0FF',

    expandBtnText: '#8FA0FF',
    expandBtnBorder: 'rgba(143,160,255,0.22)',

    socialProofText: '#A9AECB',
    socialProofStarColor: '#FFD27A',
  },
  ember: {
    heroAccent: '#FFD9A8',

    selectedCardBorder: 'rgba(255,162,69,0.46)',
    selectedCardBg: 'rgba(255,162,69,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    selectedCardShadow: '#9A4E0E',

    savingsBadgeBg: '#FFA245',
    savingsBadgeText: '#2A1502',

    popularBadgeBg: '#FFD9A8',
    popularBadgeText: '#2A1502',

    ctaBg: '#FFA245',
    ctaText: '#2A1502',
    ctaShadow: 'transparent',

    pillBg: 'rgba(255,162,69,0.1)',
    pillText: '#FFA245',
    pillBorder: 'rgba(255,162,69,0.18)',

    urgencyBg: 'rgba(255,162,69,0.08)',
    urgencyTimerText: '#FFD9A8',
    urgencyLabelText: '#C9B4A4',
    urgencyStrikethroughColor: '#8A7464',
    urgencyCurrentPriceText: '#FFA245',

    expandBtnText: '#FFA245',
    expandBtnBorder: 'rgba(255,162,69,0.22)',

    socialProofText: '#C9B4A4',
    socialProofStarColor: '#FFCB5C',
  },
  aurora: {
    heroAccent: '#9FF2CF',

    selectedCardBorder: 'rgba(61,232,166,0.46)',
    selectedCardBg: 'rgba(61,232,166,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    selectedCardShadow: '#0E7A57',

    savingsBadgeBg: '#3DE8A6',
    savingsBadgeText: '#052A1C',

    popularBadgeBg: '#9FF2CF',
    popularBadgeText: '#052A1C',

    ctaBg: '#3DE8A6',
    ctaText: '#052A1C',
    ctaShadow: 'transparent',

    pillBg: 'rgba(61,232,166,0.1)',
    pillText: '#3DE8A6',
    pillBorder: 'rgba(61,232,166,0.18)',

    urgencyBg: 'rgba(61,232,166,0.08)',
    urgencyTimerText: '#9FF2CF',
    urgencyLabelText: '#A7C0B5',
    urgencyStrikethroughColor: '#6F837A',
    urgencyCurrentPriceText: '#3DE8A6',

    expandBtnText: '#3DE8A6',
    expandBtnBorder: 'rgba(61,232,166,0.22)',

    socialProofText: '#A7C0B5',
    socialProofStarColor: '#F2D27A',
  },
  volt: {
    heroAccent: '#EFFF9E',

    selectedCardBorder: 'rgba(214,255,61,0.46)',
    selectedCardBg: 'rgba(214,255,61,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    selectedCardShadow: '#5F7A0A',

    savingsBadgeBg: '#D6FF3D',
    savingsBadgeText: '#1A2002',

    popularBadgeBg: '#EFFF9E',
    popularBadgeText: '#1A2002',

    ctaBg: '#D6FF3D',
    ctaText: '#1A2002',
    ctaShadow: 'transparent',

    pillBg: 'rgba(214,255,61,0.1)',
    pillText: '#D6FF3D',
    pillBorder: 'rgba(214,255,61,0.18)',

    urgencyBg: 'rgba(214,255,61,0.08)',
    urgencyTimerText: '#EFFF9E',
    urgencyLabelText: '#BFC6A3',
    urgencyStrikethroughColor: '#7E8563',
    urgencyCurrentPriceText: '#D6FF3D',

    expandBtnText: '#D6FF3D',
    expandBtnBorder: 'rgba(214,255,61,0.22)',

    socialProofText: '#BFC6A3',
    socialProofStarColor: '#FFE85C',
  },
};

export function getPaywallThemeConfig(themeMode: ThemeMode): ThemePaywallConfig {
  return PAYWALL_THEME_CONFIG[themeMode] ?? PAYWALL_THEME_CONFIG.dark;
}
