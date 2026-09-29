import type { Theme } from './theme';

/** The approved 2.0 tint family. This registry changes color only, never assets or access. */
export const LIQUID_GLASS_THEME_IDS = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
] as const;

export type LiquidGlassThemeId = typeof LIQUID_GLASS_THEME_IDS[number];

const HUES: Readonly<Record<Exclude<LiquidGlassThemeId, 'graphite'>, number>> = {
  polar: 225, slate: 245, ink: 275, lavender: 300, iris: 320,
  rose: 350, terracotta: 40, taupe: 65, olive: 110, sage: 150,
  eucalyptus: 180, marine: 205,
};

type GlassTokens = Readonly<{
  bg: string; bgTop: string; bgBottom: string;
  opaqueCard: string; opaqueSheet: string; opaqueControl: string;
  card: string; sheet: string; glassEdge: string; lightTint: string;
  cta: string; ctaInk: string; text: string; secondary: string;
  mutedText: string; line: string; selected: string;
}>;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const byte = (value: number) => Math.round(clamp(value) * 255).toString(16).padStart(2, '0').toUpperCase();

/** Same bounded OKLCH→sRGB conversion as the approved HTML tint registry. */
function oklchToHex(lightness: number, chroma: number, hue: number): string {
  const h = hue * Math.PI / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);
  const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return `#${[
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(channel => channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055).map(byte).join('')}`;
}

const alpha = (hex: string, opacity: number) => `${hex}${byte(opacity)}`;

const GRAPHITE: GlassTokens = Object.freeze({
  bg: '#0C0D10', bgTop: '#181A1F', bgBottom: '#16181D',
  opaqueCard: '#222429', opaqueSheet: '#222429', opaqueControl: '#222429',
  card: '#1D1E2161', sheet: '#16171ABD', glassEdge: '#FFFFFF24', lightTint: '#F4F5F8EB',
  cta: '#F2F1F6', ctaInk: '#0B0C0E', text: '#FFFFFF', secondary: '#B8B9BD',
  mutedText: '#B8B9BD', line: '#FFFFFF17', selected: '#B4BCCF30',
});

function tintedTokens(hue: number): GlassTokens {
  const dark = (lightness: number, chroma = 0.018) => oklchToHex(lightness, chroma, hue);
  const light = (lightness: number, chroma = 0.018) => oklchToHex(lightness, chroma, hue);
  const tint = light(0.78, 0.026);
  return Object.freeze({
    bg: dark(0.105, 0.014), bgTop: dark(0.155, 0.018), bgBottom: dark(0.14, 0.018),
    opaqueCard: dark(0.15, 0.018), opaqueSheet: dark(0.18, 0.020), opaqueControl: dark(0.24, 0.022),
    card: alpha(dark(0.19, 0.022), 0.46), sheet: alpha(dark(0.17, 0.020), 0.74),
    glassEdge: alpha(light(0.90, 0.020), 0.12), lightTint: alpha(light(0.94, 0.024), 0.92),
    cta: light(0.92, 0.028), ctaInk: dark(0.12, 0.018), text: light(0.985, 0.006),
    secondary: light(0.82, 0.016), mutedText: light(0.78, 0.016),
    line: alpha(light(0.92, 0.018), 0.10), selected: alpha(tint, 0.20),
  });
}

const TOKEN_REGISTRY: Readonly<Record<LiquidGlassThemeId, GlassTokens>> = Object.freeze({
  graphite: GRAPHITE,
  ...Object.fromEntries(Object.entries(HUES).map(([id, hue]) => [id, tintedTokens(hue)])),
}) as Readonly<Record<LiquidGlassThemeId, GlassTokens>>;

/** Unknown or retired names safely return graphite. */
export function liquidGlassTokens(id: unknown): GlassTokens {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(TOKEN_REGISTRY, id)
    ? TOKEN_REGISTRY[id as LiquidGlassThemeId]
    : GRAPHITE;
}

/** Graphite is free; every tint requires an active Plus entitlement. */
export function resolveLiquidGlassTheme(id: unknown, hasPlus: boolean): LiquidGlassThemeId {
  if (id === 'graphite') return 'graphite';
  return hasPlus && typeof id === 'string' && LIQUID_GLASS_THEME_IDS.includes(id as LiquidGlassThemeId)
    ? id as LiquidGlassThemeId
    : 'graphite';
}

/** Map neutral RN theme roles; success/error/reward and ownership remain untouched. */
export function makeLiquidGlassTheme(id: LiquidGlassThemeId, base: Theme): Theme {
  const t = liquidGlassTokens(id);
  return {
    ...base,
    bgPrimary: t.bg,
    bgCard: t.opaqueCard,
    bgSurface: t.opaqueControl,
    bgSurface2: t.opaqueSheet,
    textPrimary: t.text,
    textOnCard: t.text,
    textSecond: t.cta,
    textMuted: t.secondary,
    textGhost: t.mutedText,
    heroTextPrimary: t.text,
    heroTextMuted: t.secondary,
    border: t.line,
    borderLight: t.opaqueControl,
    accent: t.cta,
    accentBg: t.selected,
    shadowDark: t.bg,
    shadowLight: t.glassEdge,
    borderHighlight: t.glassEdge,
    btnShadow: t.bgBottom,
    cardShadow: 'rgba(0,0,0,0.34)',
    glow: t.selected,
    cardGradient: [t.opaqueControl, t.opaqueCard],
    bgGradient: [t.bgTop, t.bgBottom],
  };
}
