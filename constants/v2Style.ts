// зачем: единый стиль PhraseMan 2.0 по референсам владельца 2026-09-24
// (D38/D41/D43 в docs/phraseman-2.0/PROGRESS.md). Все экраны выглядят одинаково:
// графитовый фон, карточки с тонкой полупрозрачной кромкой, подписи под названиями,
// крупные белые заголовки. Темы остаются, но только тёмные, и меняют лишь оттенок:
// акцент + лёгкий подкрас фона/карточек. Раскладка, размеры и отступы у всех тем одни.
//
// Цифры сняты с референсов (кадры 863×1822 = 2× от ширины ~430pt), см.
// docs/work/tasks/2026-09-24_ui_2_0_redesign.md.

import type { Theme, ThemeMode } from './theme';

type Rgb = readonly [number, number, number];

function parseHex(color: string): Rgb | null {
  if (color[0] !== '#') return null;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Смешивает base с tint в доле amount (0..1). Не-hex tint — base без изменений. */
export function mixHex(base: string, tint: string, amount: number): string {
  const a = parseHex(base);
  const b = parseHex(tint);
  if (!a || !b) return base;
  const k = Math.max(0, Math.min(1, amount));
  return toHex([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
}

export function alphaHex(color: string, alpha: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/** Нейтральная база референса (замер пикселей). */
const BASE = {
  bg: '#0B0C0E',
  bgTop: '#111317',
  card: '#191B1F',
  cardRaised: '#1F2125',
  control: '#2C2D33',
  track: '#35373B',
  tabBar: '#16171B',
  text: '#FFFFFF',
  textSecondary: '#A3A6AE',
  textMuted: '#6F727A',
  cta: '#F2F1F6',
  ctaText: '#0B0C0E',
} as const;

/**
 * Насколько тема подкрашивает графит. Меньше — ближе к референсу.
 * Акцент темы при этом всегда свой.
 */
const TINT_BY_THEME: Partial<Record<ThemeMode, number>> = {
  dark: 0.05,
  gold: 0.045,
  olive: 0.05,
  indigo: 0.06,
  midnight: 0.05,
  ember: 0.05,
  aurora: 0.05,
  volt: 0.035,
};

export type V2Palette = Readonly<{
  bg: string;
  bgTop: string;
  card: string;
  cardRaised: string;
  control: string;
  track: string;
  tabBar: string;
  /** Тонкая кромка карточек (владелец 24.09 разрешил обводку в новом стиле, D43). */
  hairline: string;
  /** Кромка вариантов ответа — заметнее, как в «Блице». */
  outline: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  progressFill: string;
  cta: string;
  ctaText: string;
  correct: string;
  wrong: string;
  gold: string;
}>;

const paletteCache = new Map<string, V2Palette>();

/** Палитра нового стиля для темы. Кэшируется — вызов в рендере бесплатный. */
export function getV2Palette(theme: Theme, themeMode: ThemeMode): V2Palette {
  const key = `${themeMode}|${theme.accent}`;
  const cached = paletteCache.get(key);
  if (cached) return cached;
  const tintColor = theme.accent;
  const tint = TINT_BY_THEME[themeMode] ?? 0.04;
  const palette: V2Palette = {
    bg: mixHex(BASE.bg, tintColor, tint * 0.6),
    bgTop: mixHex(BASE.bgTop, tintColor, tint),
    card: mixHex(BASE.card, tintColor, tint),
    cardRaised: mixHex(BASE.cardRaised, tintColor, tint),
    control: mixHex(BASE.control, tintColor, tint),
    track: mixHex(BASE.track, tintColor, tint),
    tabBar: mixHex(BASE.tabBar, tintColor, tint),
    hairline: 'rgba(255,255,255,0.09)',
    outline: 'rgba(255,255,255,0.30)',
    divider: 'rgba(255,255,255,0.07)',
    text: BASE.text,
    textSecondary: mixHex(BASE.textSecondary, tintColor, tint * 1.5),
    textMuted: mixHex(BASE.textMuted, tintColor, tint * 1.5),
    accent: tintColor,
    accentSoft: alphaHex(tintColor, 0.16),
    // На референсе заливка прогресса почти белая; тема добавляет свой оттенок.
    progressFill: mixHex('#CECDD2', tintColor, 0.35),
    cta: mixHex(BASE.cta, tintColor, 0.08),
    ctaText: BASE.ctaText,
    correct: theme.correct,
    wrong: theme.wrong,
    gold: theme.gold,
  };
  paletteCache.set(key, palette);
  return palette;
}

/** Размеры и отступы (pt). */
export const V2 = {
  /** Поле экрана у списков (Карточки, Диалоги, наборы). */
  screenPad: 20,
  /** Поле Главной — плотная «панель» по референсу. */
  homePad: 12,
  gap: 12,
  gapTight: 8,
  radius: {
    card: 18,
    tile: 16,
    row: 14,
    control: 999,
    sheet: 28,
  },
  /** Круглая иконка-кнопка (назад, +, колокольчик). */
  iconButton: 44,
  /** Квадрат с иконкой слева у строк списка. */
  rowIcon: 44,
  rowMinHeight: 64,
  cta: { height: 52, radius: 26 },
  tabBar: { height: 64, iconSize: 24, labelSize: 11 },
  progress: { height: 6 },
} as const;

/** Типографика нового стиля (Inter уже подключён в app/_layout.tsx). */
export const V2_TYPE = {
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.3 },
  section: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  subtitle: { fontSize: 14, lineHeight: 19, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  /** «ПРОДОЛЖИТЬ ОБУЧЕНИЕ», «СЕГОДНЯ», «ФРАЗА ДНЯ». */
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 1.4 },
} as const;
