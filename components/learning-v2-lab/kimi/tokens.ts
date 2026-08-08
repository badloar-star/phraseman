// зачем: владелец забраковал первую («из головы») версию лаборатории — этот файл
// дословный перенос cinema-темы Kimi V5 (source/src/styles/tokens.css, блок
// [data-theme="cinema"]) + размеров/радиусов/таймингов из :root. Порт режимов
// красится ТОЛЬКО отсюда, чтобы экран совпадал со скриншотами поставки.
import type { TextStyle } from 'react-native';

/** Шесть канонических состояний (source/src/contracts/states.ts). */
export const CANONICAL_STATES = [
  'prompt',
  'active',
  'processing',
  'success',
  'needs_work',
  'recovery',
] as const;

export type CanonicalState = (typeof CANONICAL_STATES)[number];

export interface StateMeta {
  readonly id: CanonicalState;
  readonly label: string;
  readonly primaryIntent: string;
  readonly description: string;
}

export const STATE_META: Record<CanonicalState, StateMeta> = {
  prompt: {
    id: 'prompt',
    label: 'Prompt',
    primaryIntent: 'activity.start',
    description: 'Ready state. One clear invitation to begin.',
  },
  active: {
    id: 'active',
    label: 'Active',
    primaryIntent: 'activity.submit',
    description: 'Learner is interacting; input controls are live.',
  },
  processing: {
    id: 'processing',
    label: 'Processing',
    primaryIntent: 'activity.wait',
    description: 'Inline in-place progress. Never a full-screen centered spinner.',
  },
  success: {
    id: 'success',
    label: 'Success',
    primaryIntent: 'activity.continue',
    description: 'Pre-baked positive result rendered from the fixture.',
  },
  needs_work: {
    id: 'needs_work',
    label: 'Needs work',
    primaryIntent: 'activity.retry',
    description: 'Pre-baked negative result; context preserved, retry offered.',
  },
  recovery: {
    id: 'recovery',
    label: 'Recovery',
    primaryIntent: 'activity.resume',
    description: 'Recoverable failure. Context preserved; exactly one primary way forward.',
  },
};

/** Цвета cinema-темы (tokens.css → [data-theme="cinema"]). */
export const C = {
  bgCanvas: '#070912',
  bgSurface: '#0D101E',
  bgSubtle: '#151A31',
  fgPrimary: '#EDEFF7',
  fgSecondary: '#A7AED1',
  fgInverse: '#0B0E1D',
  borderDefault: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.20)',
  accentPrimary: '#8FA0FF',
  accentPrimaryHover: '#A3B2FF',
  accentPrimaryActive: '#7C8FF5',
  accentOnPrimary: '#0B0E1D',
  accentEdge: '#5B7CFF',
  accentSoft: '#222742',
  accentSoftStrong: '#2E3560',
  focusRing: '#B79CFF',
  gold: '#FFD27A',
  goldOn: '#241A05',
  second: '#B79CFF',
  correct: '#5FE0B0',
  correctOn: '#06231A',
  wrong: '#FF6E8A',
  wrongOn: '#2B0A13',
  bloomA: '#5B7CFF',
  bloomB: '#A95BFF',
  card2: '#151A31',
  card3: '#202641',
} as const;

/** Цвета шести состояний (bg/fg/border) — cinema. */
export const STATE_COLORS: Record<CanonicalState, { bg: string; fg: string; border: string }> = {
  prompt: { bg: '#151A31', fg: '#EDEFF7', border: '#5A6488' },
  active: { bg: '#222742', fg: '#C6D0FF', border: '#8FA0FF' },
  processing: { bg: '#192040', fg: '#B9C8FF', border: '#5B7CFF' },
  success: { bg: '#182B31', fg: '#8FEDD0', border: '#5FE0B0' },
  needs_work: { bg: '#2A2729', fg: '#FFD27A', border: '#FFD27A' },
  recovery: { bg: '#2A1B2B', fg: '#FF9DAD', border: '#FF6E8A' },
};

/** Акценты режимов (--color-mode-*). */
export type ModeAccent = 'listen' | 'missing-word' | 'phrase-build' | 'pronunciation' | 'natural-choice';

export const MODE_ACCENT: Record<ModeAccent, string> = {
  listen: '#6C8EFF',
  'missing-word': '#A78BFA',
  'phrase-build': '#34D399',
  pronunciation: '#F472B6',
  'natural-choice': '#FBBF24',
};

/** Шкала отступов (--space-*, 1rem = 16px). */
export const SPACE = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
} as const;

/** Радиусы (--radius-*). */
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Кегли (--text-*, 1rem = 16px). */
export const TEXT = {
  xs: 12,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
} as const;

/** Веса (--weight-*) в RN-нотации. */
export const WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Межстрочные множители (--leading-*). */
export const LEADING = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.55,
  relaxed: 1.7,
} as const;

/** Тайминги (--duration-*). */
export const DURATION = {
  instant: 80,
  fast: 180,
  normal: 240,
  slow: 320,
  celebrate: 420,
} as const;

/** Минимальный тач-таргет (--size-touch-min). */
export const TOUCH_MIN = 48;

/** Смешивание цвета с прозрачностью — RN-замена color-mix() из CSS. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
