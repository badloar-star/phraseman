// ═══════════════════════════════════════════════════════════════════════════
// Градиентные темы 2.0 (владелец 2026-10-04, макет docs/design/v2-app/themes-gradient.html).
//
// зачем: «10 градиентных тем + как ползунок будет влиять на них». Основа — графит,
// поверх — два световых пятна цветов темы; ползунок насыщенности k (0…1) управляет
// силой пятен и тем, сколько акцента подмешано в карточки, кнопку, полоски и плитки.
// Формулы — ровно из CSS макета:
//   пятна        opacity = 0.08 + 0.62·k
//   карточка     color-mix(acc k·10 %, rgba(24,24,27,.72))
//   кромка       color-mix(acc k·30 %, rgba(255,255,255,.09))
//   кнопка       color-mix(acc k·100 %, #F2F1F6), текст — свой тёмный тон темы
//   полоска      color-mix(acc k·100 %, #FFFFFF)
//   плитка       color-mix(acc k·16 %, #2A2A2C)
// Набор тем — ОДИН список ниже: владелец может убрать любую строку, остальное подстроится.
// Светлое оформление — вариант B «Пастель» (themes-gradient-light.html, выбор владельца 04.10).
// ═══════════════════════════════════════════════════════════════════════════

import { alpha } from './liquidGlassColor';
import { liquidGlassLevelForIntensity, mixLiquidGlassColor, quantizeLiquidGlassIntensity } from './liquidGlassThemeIntensity';
import type { LiquidGlassAccentRoles, LiquidGlassBaseTokens } from './liquidGlassThemeVariants';

export type LiquidGlassGradientTheme = Readonly<{
  id: string;
  /** Первое световое пятно (верх-лево и низ). */
  glowA: string;
  /** Второе световое пятно (справа по центру). */
  glowB: string;
  /** Акцент кнопок, полосок, ссылок. */
  accent: string;
  /** Текст на акцентной кнопке. */
  onAccent: string;
}>;

/** Порядок = порядок в списке тем. Ключи с префиксом `grad_`, чтобы не задеть старые сохранённые имена. */
export const LIQUID_GLASS_GRADIENT_THEMES = [
  { id: 'grad_aurora', glowA: '#38E0AA', glowB: '#7C5CFF', accent: '#7EF0C8', onAccent: '#04261D' },
  { id: 'grad_iris', glowA: '#788CFF', glowB: '#FF78C8', accent: '#C7C9FF', onAccent: '#1B1C4A' },
  { id: 'grad_magma', glowA: '#FF5A28', glowB: '#FFAA3C', accent: '#FFB27A', onAccent: '#3A1204' },
  { id: 'grad_midnight', glowA: '#286EFF', glowB: '#00D2FF', accent: '#8CC4FF', onAccent: '#06224D' },
  { id: 'grad_champagne', glowA: '#F0BE78', glowB: '#E68296', accent: '#F3D39A', onAccent: '#3A2608' },
  { id: 'grad_jade', glowA: '#14BEA0', glowB: '#1E78C8', accent: '#7FE6D2', onAccent: '#032A24' },
  { id: 'grad_orchid', glowA: '#D246FF', glowB: '#FF3C8C', accent: '#EAA6FF', onAccent: '#3A0A4A' },
  { id: 'grad_ice', glowA: '#96DCFF', glowB: '#78A0FF', accent: '#BFE6FF', onAccent: '#0A2A44' },
  { id: 'grad_coral', glowA: '#FF645A', glowB: '#FFA046', accent: '#FFB0A0', onAccent: '#4A0F0A' },
  { id: 'grad_lilac', glowA: '#A78BFA', glowB: '#60A5FA', accent: '#D4C8FF', onAccent: '#24164A' },
  // Премиальные темы достижений. Цвет работает на всём экране через те же
  // семантические токены; уникальный арт Главной приезжает отдельным remote pack.
  { id: 'grad_full_olive', glowA: '#778624', glowB: '#151E10', accent: '#C9D880', onAccent: '#10151B' },
  { id: 'grad_full_ref_signal_lime', glowA: '#101406', glowB: '#020406', accent: '#C2FF46', onAccent: '#081017' },
  { id: 'grad_full_ref_storm_violet', glowA: '#110C14', glowB: '#020406', accent: '#D697FF', onAccent: '#081017' },
  { id: 'grad_full_titanium', glowA: '#34383D', glowB: '#0A0C0F', accent: '#FF665B', onAccent: '#10151B' },
  { id: 'grad_full_horizon', glowA: '#12385A', glowB: '#060E1A', accent: '#FFBB78', onAccent: '#10151B' },
  { id: 'grad_full_ref_gravity_blue', glowA: '#0B1214', glowB: '#020406', accent: '#86DFFF', onAccent: '#081017' },
] as const satisfies readonly LiquidGlassGradientTheme[];

export type LiquidGlassGradientThemeId = typeof LIQUID_GLASS_GRADIENT_THEMES[number]['id'];

export const LIQUID_GLASS_GRADIENT_THEME_IDS: readonly LiquidGlassGradientThemeId[] = Object.freeze(
  LIQUID_GLASS_GRADIENT_THEMES.map(t => t.id),
);

const BY_ID: ReadonlyMap<string, LiquidGlassGradientTheme> = new Map(LIQUID_GLASS_GRADIENT_THEMES.map(t => [t.id, t]));

export function liquidGlassGradientTheme(id: unknown): LiquidGlassGradientTheme | null {
  return typeof id === 'string' ? BY_ID.get(id) ?? null : null;
}

const CLEAR = '#00000000';
// Значения макета (kit.css): стекло карточки, кромка, плитка, белая кнопка.
const MOCK_CARD = '#18181BB8';
const MOCK_EDGE = '#FFFFFF17';
const MOCK_TILE = '#2A2A2C';
const MOCK_CTA = '#F2F1F6';

// ─── светлое оформление: вариант B «Пастель» (владелец 2026-10-04, themes-gradient-light.html) ───
// фон        диагональная заливка: сверху glowA·22 %·k, снизу glowB·20 %·k поверх #F6F6F8
// карточки   сплошные белые на тени, без кромки
// кнопка     от почти чёрной #1C1C1F к пастели темы по k; текст — белый или тёмный тон темы,
//            что контрастнее на текущем цвете кнопки (без серой середины)
// полоска    от #1C1C1F к глубокому тону glowA (52 % цвета + чёрный)
// плитка     acc·40 %·k поверх #F0F0F3
const LIGHT_BASE = '#F6F6F8';
const LIGHT_INK = '#1C1C1F';

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = (i: number) => channel(parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * n(1) + 0.7152 * n(3) + 0.0722 * n(5);
}
/** Контраст WCAG двух непрозрачных #RRGGBB. */
export function liquidGlassContrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
/**
 * Текст на кнопке: белый, если он даёт ≥ 4.5; иначе тёмный тон темы; иначе чёрный.
 * зачем: кнопка плавно идёт от почти чёрной к пастели и на середине проходит тон, где ни
 * белый, ни тёмный тон темы не дотягивают до 4.5 (замер 4.04–4.44). Худший случай
 * «белый или чёрный» — 4.58, поэтому чёрный — гарантированный запасной вариант.
 */
export function liquidGlassButtonInk(bg: string, themeDark: string): string {
  if (liquidGlassContrast('#FFFFFF', bg) >= 4.5) return '#FFFFFF';
  if (liquidGlassContrast(themeDark, bg) >= 4.5) return themeDark;
  return '#000000';
}
const pickInk = liquidGlassButtonInk;

export function buildLiquidGlassGradientLightTokens(
  def: LiquidGlassGradientTheme,
  intensity: number,
): LiquidGlassBaseTokens & LiquidGlassAccentRoles {
  const k = quantizeLiquidGlassIntensity(intensity);
  const deepA = mixLiquidGlassColor('#000000', def.glowA, 0.52);
  // зачем: текст цвета темы (ссылки, огонь) на самой насыщенной заливке у Авроры/Шампани/Льда
  // давал 4.29–4.42 при тоне полоски (52 %) — для текста тон на ступень глубже (42 %).
  const deepText = mixLiquidGlassColor('#000000', def.glowA, 0.42);
  const bgTop = mixLiquidGlassColor(LIGHT_BASE, def.glowA, 0.22 * k);
  const bgBottom = mixLiquidGlassColor(LIGHT_BASE, def.glowB, 0.20 * k);
  const cta = mixLiquidGlassColor(LIGHT_INK, def.accent, k);
  const ink = pickInk(cta, def.onAccent);
  const fill = mixLiquidGlassColor(LIGHT_INK, deepA, k);
  const tile = mixLiquidGlassColor('#F0F0F3', def.accent, 0.40 * k);
  const text = '#111114';
  const dir = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
  return Object.freeze({
    bg: bgBottom, bgTop, bgBottom,
    opaqueCard: '#FFFFFF', opaqueSheet: '#FFFFFF', opaqueControl: '#ECECEF',
    card: '#FFFFFF', sheet: '#FFFFFF',
    glassEdge: '#00000000',
    lightTint: alpha(text, 0.92),
    cta, ctaInk: ink,
    text, secondary: '#5C5C63', mutedText: '#6E6E75',
    line: '#00000014',
    selected: mixLiquidGlassColor('#0000000D', alpha(def.accent, 0.30), k),
    level: liquidGlassLevelForIntensity(k),
    appearance: 'light',
    isLight: true,
    accent: cta,
    accentInk: ink,
    // зачем: ссылки/огонь на светлом фоне — глубокий тон, чтобы держать контраст ≥ 4.5.
    accentText: mixLiquidGlassColor('#3A3A40', deepText, k),
    accentBright: mixLiquidGlassColor('#3A3A40', deepText, k),
    accentSoft: mixLiquidGlassColor('#0000000D', alpha(def.accent, 0.30), k),
    accentBorder: fill,
    accentCap: mixLiquidGlassColor('#0000001A', alpha(deepA, 0.18), k),
    accentTile: tile,
    accentGlow: mixLiquidGlassColor(CLEAR, alpha(def.accent, 0.40), k),
    accentGradient: Object.freeze([cta, cta]),
    accentGradientStart: dir.start,
    accentGradientEnd: dir.end,
    progressGradient: Object.freeze([fill, fill]),
    overline: '#5C5C63',
    // В «Пастели» пятен нет — цвет даёт сама заливка фона.
    bgGlow: Object.freeze([CLEAR, CLEAR, CLEAR]) as readonly [string, string, string],
    cardSmoke: Object.freeze([CLEAR, CLEAR]) as readonly [string, string],
    shadowTint: '#00000038',
  });
}

/**
 * Палитра градиентной темы на насыщенности k. `graphite` — тёмные токены Графита:
 * фон, текст и поверхности берутся у него, акцент подмешивается по формулам макета.
 */
export function buildLiquidGlassGradientTokens(
  def: LiquidGlassGradientTheme,
  graphite: LiquidGlassBaseTokens,
  intensity: number,
): LiquidGlassBaseTokens & LiquidGlassAccentRoles {
  const k = quantizeLiquidGlassIntensity(intensity);
  const mix = (base: string, share: number) => mixLiquidGlassColor(base, def.accent, share);
  const cta = mix(MOCK_CTA, k);
  const fill = mix('#FFFFFF', k);
  const glowOpacity = 0.08 + 0.62 * k;
  const dir = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
  return Object.freeze({
    ...graphite,
    card: mix(MOCK_CARD, k * 0.10),
    opaqueCard: mix(graphite.opaqueCard, k * 0.10),
    opaqueSheet: mix(graphite.opaqueSheet, k * 0.10),
    opaqueControl: mix(graphite.opaqueControl, k * 0.10),
    glassEdge: mix(MOCK_EDGE, k * 0.30),
    cta,
    ctaInk: def.onAccent,
    selected: mixLiquidGlassColor(graphite.selected, alpha(def.accent, 0.19), k),
    level: liquidGlassLevelForIntensity(k),
    appearance: 'dark',
    isLight: false,
    accent: cta,
    accentInk: def.onAccent,
    accentText: mix(graphite.cta, k),
    accentBright: mix(graphite.cta, k),
    accentSoft: mixLiquidGlassColor(graphite.selected, alpha(def.accent, 0.24), k),
    accentBorder: mix(graphite.cta, k),
    accentCap: cta,
    accentTile: mix(MOCK_TILE, k * 0.16),
    accentGlow: mixLiquidGlassColor(CLEAR, alpha(def.accent, 0.55), k),
    accentGradient: Object.freeze([cta, cta]),
    accentGradientStart: dir.start,
    accentGradientEnd: dir.end,
    progressGradient: Object.freeze([fill, fill]),
    overline: graphite.secondary,
    // Пятна фона рисует V2Backdrop (один статичный SVG-слой) — порядок как в макете: A, B, A.
    bgGlow: Object.freeze([alpha(def.glowA, glowOpacity), alpha(def.glowB, glowOpacity), alpha(def.glowA, glowOpacity)]) as readonly [string, string, string],
    cardSmoke: Object.freeze([CLEAR, CLEAR]) as readonly [string, string],
    shadowTint: '#000000',
  });
}
