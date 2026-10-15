// ═══════════════════════════════════════════════════════════════════════════
// onboarding_palette.ts — цвета онбординга берутся из токенов активной темы.
//
// зачем (координатор 15.10, макет «Онбординг в темах»): онбординг был нарисован «Bevel»-светлыми фиксированными
// цветами и не менялся с темой. Теперь у новичка он в цветах дефолтной темы по системе: светлая — «Сумерки» (ink),
// тёмная — «Океан» (marine). Тексты, порядок, размеры и раскладка НЕ меняются — только цвета.
// Роли: фон экрана/плитки/дорожки/подложка шторки — поверхности темы; главная кнопка и выбранный значок —
// ctaFill/ctaInk (≥ 3:1 к фону и ≥ 4,5:1 подпись); текст — text/secondary. Стили строятся один раз на тему.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';

export type OnboardingPalette = Readonly<{
  /** Ключ темы для кэша стилей (тема + вид). */
  key: string;
  isLight: boolean;
  bg: string;
  bgTop: string;
  bgBottom: string;
  /** Плитки, карточки, сейф, подложка кода. */
  card: string;
  /** Утопленная плитка (выбранный язык, поле кода, крошечные подложки). */
  soft: string;
  /** Дорожка/пустой кружок/скелет. */
  track: string;
  sheet: string;
  text: string;
  secondary: string;
  muted: string;
  line: string;
  ctaFill: string;
  ctaInk: string;
  ctaFillDisabled: string;
  ctaInkDisabled: string;
  good: string;
  /** Зелёный для подписей на карточке (≥ 4,5:1). */
  goodText: string;
  /** Тот же цвет текста с долей прозрачности (a ∈ 0…1). */
  textA: (a: number) => string;
  goodA: (a: number) => string;
  cardA: (a: number) => string;
  bgA: (a: number) => string;
  /** Низ фона темы с прозрачностью - для затухания под нижней кнопкой. */
  bottomA: (a: number) => string;
  /** Плашка варианта (макет 15.10): градиент raisedFillFrom -> raisedFillTo, мягкая тень, слой «выбрано», значок, пустой квадратик. */
  raisedFrom: string;
  raisedTo: string;
  raisedShadowSoft: string;
  selectedLayer: string;
  iconMuted: string;
  radioEmpty: string;
}>;

const hex6 = (c: string): string => (/^#[0-9A-Fa-f]{6}/.test(c) ? c.slice(0, 7).toUpperCase() : '#000000');
const parts = (c: string): readonly [number, number, number, number] => {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(c.trim());
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  const h = hex6(c).slice(1);
  const a = /^#[0-9A-Fa-f]{8}$/.test(c) ? parseInt(c.slice(7, 9), 16) / 255 : 1;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
};
export const onboardingWithAlpha = (c: string, a: number): string => {
  const [r, g, b, base] = parts(c);
  return `rgba(${r},${g},${b},${Math.round(Math.max(0, Math.min(1, a * base)) * 1000) / 1000})`;
};
const lum = (c: string): number => {
  const [r, g, b] = parts(c).slice(0, 3).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const onboardingContrast = (a: string, b: string): number => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const mix = (from: string, to: string, k: number): string => {
  const f = parts(from);
  const t = parts(to);
  const ch = (i: 0 | 1 | 2): string => Math.round(f[i] + (t[i] - f[i]) * k).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`.toUpperCase();
};
/** Сдвигает `fg` к `toward`, пока контраст с `on` не дойдёт до `min` (или цвет не станет `toward`). */
const ensure = (fg: string, on: string, toward: string, min: number): string => {
  let out = hex6(fg);
  for (let k = 0; k <= 1.0001 && onboardingContrast(out, on) < min; k += 0.1) out = mix(fg, toward, k);
  return out;
};

export function buildOnboardingPalette(g: GlassTokens, key: string): OnboardingPalette {
  const card = hex6(g.opaqueCard);
  const text = hex6(g.text);
  return {
    key,
    isLight: g.isLight,
    bg: hex6(g.bg),
    bgTop: hex6(g.bgTop),
    bgBottom: hex6(g.bgBottom),
    card,
    soft: hex6(g.opaqueControl),
    track: hex6(g.opaqueControl),
    sheet: hex6(g.opaqueSheet),
    text,
    secondary: hex6(g.secondary),
    muted: hex6(g.mutedText),
    line: hex6(g.line),
    ctaFill: hex6(g.ctaFill),
    ctaInk: hex6(g.ctaInk),
    ctaFillDisabled: hex6(g.buttonFillDisabled),
    ctaInkDisabled: hex6(g.buttonInkDisabled),
    good: hex6(g.good),
    goodText: ensure(g.good, card, text, 4.5),
    textA: (a) => onboardingWithAlpha(text, a),
    goodA: (a) => onboardingWithAlpha(g.good, a),
    cardA: (a) => onboardingWithAlpha(card, a),
    bgA: (a) => onboardingWithAlpha(g.bg, a),
    bottomA: (a) => onboardingWithAlpha(g.bgBottom, a),
    raisedFrom: g.raisedFillFrom,
    raisedTo: g.raisedFillTo,
    raisedShadowSoft: g.raisedShadowSoft,
    selectedLayer: g.selected,
    iconMuted: hex6(g.iconMuted),
    // зачем (макет Макетов 15.10): пустой квадратик - opaqueControl в светлой, buttonFill в тёмной (там opaqueControl почти не виден)
    radioEmpty: hex6(g.isLight ? g.opaqueControl : g.buttonFill),
  };
}

/** Палитра онбординга активной темы (у новичка — дефолтная по системе). */
export function useOnboardingPalette(): OnboardingPalette {
  const { liquidGlassThemeId } = useTheme();
  return useMemo(() => {
    const g = liquidGlassTokens(liquidGlassThemeId);
    return buildOnboardingPalette(g, `${String(liquidGlassThemeId)}|${g.isLight ? 'light' : 'dark'}|${g.intensity}`);
  }, [liquidGlassThemeId]);
}

/** Один набор стилей на тему: StyleSheet создаётся при первом показе и дальше берётся из кэша. */
export function memoStylesByPalette<S>(build: (p: OnboardingPalette) => S): (p: OnboardingPalette) => S {
  const cache = new Map<string, S>();
  return (p) => {
    const hit = cache.get(p.key);
    if (hit) return hit;
    const next = build(p);
    if (cache.size >= 6) cache.clear();
    cache.set(p.key, next);
    return next;
  };
}
