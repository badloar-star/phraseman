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
// Только тёмное оформление: светлых градиентных тем пока нет (макет в работе, 04.10).
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
