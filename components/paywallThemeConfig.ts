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
  /** Borderless semantic panel tone for paywall blocks. */
  panelBg: string;
  /** Stronger borderless tone for selected/high-priority paywall blocks. */
  panelBgStrong: string;
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
    panelBg: 'rgba(17,31,23,0.74)',
    panelBgStrong: 'rgba(30,56,40,0.88)',
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

  // ── GOLD (black gold luxury) ──────────────────────────────────────────────
  gold: {
    heroAccent: GOLD_RICH.paleGold,

    selectedCardBorder: GOLD_RICH.metalGold,
    selectedCardBg: GOLD_RICH.washStrong,
    unselectedCardBg: 'rgba(10,10,10,0.88)',
    panelBg: 'rgba(18,15,9,0.78)',
    panelBgStrong: 'rgba(41,32,15,0.88)',
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
    heroAccent: '#FF7F50',

    selectedCardBorder: '#FF7F50',
    selectedCardBg: 'rgba(255,127,80,0.12)',
    unselectedCardBg: 'rgba(33,24,27,0.88)',
    panelBg: 'rgba(38,24,29,0.78)',
    panelBgStrong: 'rgba(62,32,38,0.88)',
    selectedCardShadow: '#FF7F50',

    savingsBadgeBg: '#FFD060',
    savingsBadgeText: '#1A1208',

    popularBadgeBg: '#FF7F50',
    popularBadgeText: '#FFFFFF',

    ctaBg: '#FF7F50',
    ctaText: '#FFFFFF',
    ctaShadow: '#FF7F50',

    pillBg: 'rgba(255,127,80,0.12)',
    pillText: '#FF7F50',
    pillBorder: 'rgba(255,127,80,0.28)',

    urgencyBg: 'rgba(255,208,96,0.10)',
    urgencyTimerText: '#FFD060',
    urgencyLabelText: '#B9A6AE',
    urgencyStrikethroughColor: '#75656C',
    urgencyCurrentPriceText: '#FF7F50',

    expandBtnText: '#FF7F50',
    expandBtnBorder: 'rgba(255,127,80,0.28)',

    socialProofText: '#B9A6AE',
    socialProofStarColor: '#FFD060',
  },

  // ── MINIMAL LIGHT (warm parchment) ────────────────────────────────────────

  // ── MINIMAL DARK (clean dark / blue accent) ───────────────────────────────
  minimalDark: {
    heroAccent: '#6EA8FF',

    selectedCardBorder: '#6EA8FF',
    selectedCardBg: 'rgba(110,168,255,0.12)',
    unselectedCardBg: 'rgba(35,36,40,0.88)',
    panelBg: 'rgba(34,36,41,0.78)',
    panelBgStrong: 'rgba(44,49,58,0.88)',
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

  // ── BUSINESS (graphite and champagne) ─────────────────────────────────────
  business: {
    heroAccent: '#0095F6',

    selectedCardBorder: '#0095F6',
    selectedCardBg: 'rgba(0,149,246,0.12)',
    unselectedCardBg: 'rgba(26,26,26,0.88)',
    panelBg: 'rgba(24,24,24,0.82)',
    panelBgStrong: 'rgba(24,39,56,0.88)',
    selectedCardShadow: '#000000',

    savingsBadgeBg: '#0095F6',
    savingsBadgeText: '#FFFFFF',

    popularBadgeBg: '#0095F6',
    popularBadgeText: '#FFFFFF',

    ctaBg: '#0095F6',
    ctaText: '#FFFFFF',
    ctaShadow: '#000000',

    pillBg: 'rgba(0,149,246,0.10)',
    pillText: '#E6E6E6',
    pillBorder: 'rgba(0,149,246,0.22)',

    urgencyBg: 'rgba(255,255,255,0.06)',
    urgencyTimerText: '#F5F5F5',
    urgencyLabelText: '#737373',
    urgencyStrikethroughColor: '#4D4D4D',
    urgencyCurrentPriceText: '#E6E6E6',

    expandBtnText: '#F5F5F5',
    expandBtnBorder: 'rgba(255,255,255,0.12)',

    socialProofText: '#737373',
    socialProofStarColor: '#E6E6E6',
  },

  // ── BUSINESS LIGHT (ivory and champagne) ──────────────────────────────────
  businessLight: {
    heroAccent: '#0095F6',

    selectedCardBorder: '#0095F6',
    selectedCardBg: 'rgba(0,149,246,0.10)',
    unselectedCardBg: 'rgba(255,255,255,0.92)',
    panelBg: 'rgba(18,27,35,0.78)',
    panelBgStrong: 'rgba(24,43,58,0.86)',
    selectedCardShadow: 'rgba(0,0,0,0)',

    savingsBadgeBg: '#0095F6',
    savingsBadgeText: '#FFFFFF',

    popularBadgeBg: '#0095F6',
    popularBadgeText: '#FFFFFF',

    ctaBg: '#0095F6',
    ctaText: '#FFFFFF',
    ctaShadow: 'rgba(0,0,0,0)',

    pillBg: 'rgba(0,149,246,0.10)',
    pillText: '#0095F6',
    pillBorder: 'rgba(0,149,246,0.24)',

    urgencyBg: 'rgba(0,0,0,0.05)',
    urgencyTimerText: '#262626',
    urgencyLabelText: '#8E8E8E',
    urgencyStrikethroughColor: '#C7C7C7',
    urgencyCurrentPriceText: '#0095F6',

    expandBtnText: '#262626',
    expandBtnBorder: 'rgba(0,0,0,0.12)',

    socialProofText: '#8E8E8E',
    socialProofStarColor: '#0095F6',
  },

  // ── COMPASS (warm charcoal / champagne) ───────────────────────────────────
  midnight: {
    heroAccent: '#C9D2FF',

    selectedCardBorder: 'rgba(143,160,255,0.46)',
    selectedCardBg: 'rgba(143,160,255,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    panelBg: 'rgba(17,20,42,0.78)',
    panelBgStrong: 'rgba(30,35,72,0.86)',
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
    heroAccent: '#FFE9B8',

    selectedCardBorder: 'rgba(255,204,85,0.46)',
    selectedCardBg: 'rgba(255,204,85,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    panelBg: 'rgba(36,22,14,0.78)',
    panelBgStrong: 'rgba(59,32,16,0.86)',
    selectedCardShadow: '#9A6E0E',

    savingsBadgeBg: '#FFCC55',
    savingsBadgeText: '#2A1A02',

    popularBadgeBg: '#FFE9B8',
    popularBadgeText: '#2A1A02',

    ctaBg: '#FFCC55',
    ctaText: '#2A1A02',
    ctaShadow: 'transparent',

    pillBg: 'rgba(255,204,85,0.1)',
    pillText: '#FFCC55',
    pillBorder: 'rgba(255,204,85,0.18)',

    urgencyBg: 'rgba(255,204,85,0.08)',
    urgencyTimerText: '#FFE9B8',
    urgencyLabelText: '#C9B4A4',
    urgencyStrikethroughColor: '#8A7464',
    urgencyCurrentPriceText: '#FFCC55',

    expandBtnText: '#FFCC55',
    expandBtnBorder: 'rgba(255,204,85,0.22)',

    socialProofText: '#C9B4A4',
    socialProofStarColor: '#FFCB5C',
  },
  aurora: {
    heroAccent: '#9FF2CF',

    selectedCardBorder: 'rgba(61,232,166,0.46)',
    selectedCardBg: 'rgba(61,232,166,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    panelBg: 'rgba(13,34,28,0.78)',
    panelBgStrong: 'rgba(19,58,45,0.86)',
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
    heroAccent: '#E8FF96',

    selectedCardBorder: 'rgba(198,255,52,0.46)',
    selectedCardBg: 'rgba(198,255,52,0.1)',
    unselectedCardBg: 'rgba(255,255,255,0.06)',
    panelBg: 'rgba(31,37,11,0.78)',
    panelBgStrong: 'rgba(49,61,14,0.86)',
    selectedCardShadow: '#5F7A0A',

    savingsBadgeBg: '#C6FF34',
    savingsBadgeText: '#1A2002',

    popularBadgeBg: '#E8FF96',
    popularBadgeText: '#1A2002',

    ctaBg: '#C6FF34',
    ctaText: '#1A2002',
    ctaShadow: 'transparent',

    pillBg: 'rgba(198,255,52,0.1)',
    pillText: '#C6FF34',
    pillBorder: 'rgba(198,255,52,0.18)',

    urgencyBg: 'rgba(198,255,52,0.08)',
    urgencyTimerText: '#E8FF96',
    urgencyLabelText: '#BFC6A3',
    urgencyStrikethroughColor: '#7E8563',
    urgencyCurrentPriceText: '#C6FF34',

    expandBtnText: '#C6FF34',
    expandBtnBorder: 'rgba(198,255,52,0.22)',

    socialProofText: '#BFC6A3',
    socialProofStarColor: '#FFE85C',
  },
  // ── CANDY BLUE (тёмная синева / леденцовый голубой) ───────────────────────
  candyBlue: {
    heroAccent: '#D9EDF5',

    selectedCardBorder: 'rgba(178,213,229,0.46)',
    selectedCardBg: 'rgba(178,213,229,0.10)',
    unselectedCardBg: 'rgba(28,50,59,0.88)',
    panelBg: 'rgba(22,40,47,0.78)',
    panelBgStrong: 'rgba(28,50,59,0.88)',
    selectedCardShadow: '#3A5A68',

    savingsBadgeBg: '#FFC53D',
    savingsBadgeText: '#1A1408',

    popularBadgeBg: '#B2D5E5',
    popularBadgeText: '#07110A',

    ctaBg: '#B2D5E5',
    ctaText: '#07110A',
    ctaShadow: '#3A5A68',

    pillBg: 'rgba(178,213,229,0.12)',
    pillText: '#B2D5E5',
    pillBorder: 'rgba(178,213,229,0.28)',

    urgencyBg: 'rgba(255,197,61,0.10)',
    urgencyTimerText: '#FFC53D',
    urgencyLabelText: '#9DB9C4',
    urgencyStrikethroughColor: '#4E6A76',
    urgencyCurrentPriceText: '#B2D5E5',

    expandBtnText: '#B2D5E5',
    expandBtnBorder: 'rgba(178,213,229,0.28)',

    socialProofText: '#9DB9C4',
    socialProofStarColor: '#FFC53D',
  },
  // ── INDIGO (сумрачный индиго / лавандовый акцент) ─────────────────────────
  indigo: {
    heroAccent: '#E4E1FF',

    selectedCardBorder: 'rgba(200,195,255,0.46)',
    selectedCardBg: 'rgba(200,195,255,0.10)',
    unselectedCardBg: 'rgba(42,41,82,0.88)',
    panelBg: 'rgba(34,33,64,0.78)',
    panelBgStrong: 'rgba(42,41,82,0.88)',
    selectedCardShadow: '#3D3A72',

    savingsBadgeBg: '#FFC53D',
    savingsBadgeText: '#1A1408',

    popularBadgeBg: '#C8C3FF',
    popularBadgeText: '#17162B',

    ctaBg: '#C8C3FF',
    ctaText: '#17162B',
    ctaShadow: '#3D3A72',

    pillBg: 'rgba(200,195,255,0.12)',
    pillText: '#C8C3FF',
    pillBorder: 'rgba(200,195,255,0.28)',

    urgencyBg: 'rgba(255,197,61,0.10)',
    urgencyTimerText: '#FFC53D',
    urgencyLabelText: '#B7B3D9',
    urgencyStrikethroughColor: '#605C8A',
    urgencyCurrentPriceText: '#C8C3FF',

    expandBtnText: '#C8C3FF',
    expandBtnBorder: 'rgba(200,195,255,0.28)',

    socialProofText: '#B7B3D9',
    socialProofStarColor: '#FFC53D',
  },
};

export function getPaywallThemeConfig(themeMode: ThemeMode): ThemePaywallConfig {
  return PAYWALL_THEME_CONFIG[themeMode] ?? PAYWALL_THEME_CONFIG.dark;
}
