/**
 * Вариант брендовой кнопки Google по яркости поверхности под ней.
 *
 * зачем (координатор 18.10, [BLEND-AUTH]): кнопки входа без обводки (запрет владельца на рамки), поэтому белая кнопка Google на светлой
 * шторке/фоне и тёмная #1F1F1F на тёмном сливались с поверхностью (≈1,0–1,2:1). Google разрешает и светлый, и тёмный вариант на любом фоне —
 * берём противоположный поверхности: светлая поверхность → тёмная кнопка, тёмная → белая (как уже сделано у Apple).
 */
export type GoogleButtonVariant = 'light' | 'dark';

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0;
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** 'dark' (#1F1F1F) на светлой поверхности, 'light' (белая) на тёмной. */
export function googleButtonVariantForSurface(surfaceHex: string): GoogleButtonVariant {
  return relativeLuminance(surfaceHex) > 0.4 ? 'dark' : 'light';
}

export type GoogleButtonPaint = Readonly<{ variant: 'light'; edge: string | null }>;

/** Порог «кнопка сама отделяется заливкой» (графика ≥ 3) и цель для линии (тон ≥ 1,5 + запас на округление). */
const FILL_SEPARATES = 3;
const EDGE_TARGET = 1.6;
const EDGE_ALPHA_MIN = 0.1;
const EDGE_ALPHA_MAX = 0.6;

const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function scaledLuminance(hex: string, k: number): number {
  const h = hex.replace('#', '').slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return 0;
  const ch = [0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) * k) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/**
 * Белая кнопка Google на любой поверхности; на светлой — тонкая полупрозрачная линия (hairline), отделяющая её от шторки.
 *
 * зачем (координатор 18.10, эталон auth-states + правила бренда Google): тёмная #1F1F1F в светлой теме стояла рядом с чёрной Apple —
 * две чёрные кнопки подряд. Возвращаем белую с цветной G; границу держит линия (hairline разрешён в 2.0) и тень. Альфа линии — наименьшая,
 * при которой линия даёт ≥ 1,6:1 к ЭТОЙ поверхности (деликатно на белой шторке, плотнее на сероватой). Где белая заливка и так ≥ 3 к
 * поверхности (тёмные темы) — линии нет, вид без изменений.
 */
export function googleButtonPaintForSurface(surfaceHex: string): GoogleButtonPaint {
  const surface = relativeLuminance(surfaceHex);
  if (ratio(1, surface) >= FILL_SEPARATES) return { variant: 'light', edge: null };
  let lo = EDGE_ALPHA_MIN;
  let hi = EDGE_ALPHA_MAX;
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2;
    if (ratio(scaledLuminance(surfaceHex, 1 - mid), surface) >= EDGE_TARGET) hi = mid; else lo = mid;
  }
  return { variant: 'light', edge: `rgba(0,0,0,${Math.ceil(hi * 100) / 100})` };
}
