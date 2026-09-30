import type { Theme } from './theme';
import { alpha, oklchToHex } from './liquidGlassColor';
import {
  DEFAULT_LIQUID_GLASS_VARIANT,
  buildLiquidGlassVariant,
  type LiquidGlassAccentRoles,
  type LiquidGlassBaseTokens,
  type LiquidGlassVariant,
} from './liquidGlassThemeVariants';

export {
  DEFAULT_LIQUID_GLASS_VARIANT,
  LIQUID_GLASS_APPEARANCES,
  LIQUID_GLASS_COLOR_LEVELS,
  resolveLiquidGlassAppearance,
  resolveLiquidGlassColorLevel,
  type LiquidGlassAppearance,
  type LiquidGlassColorLevel,
  type LiquidGlassVariant,
} from './liquidGlassThemeVariants';

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

type BaseGlassTokens = LiquidGlassBaseTokens;
/** Neutral theme tokens + colour roles of the current level/appearance (see liquidGlassThemeVariants.ts). */
export type GlassTokens = LiquidGlassBaseTokens & LiquidGlassAccentRoles;

const GRAPHITE: BaseGlassTokens = Object.freeze({
  bg: '#0C0D10', bgTop: '#181A1F', bgBottom: '#16181D',
  opaqueCard: '#222429', opaqueSheet: '#222429', opaqueControl: '#222429',
  card: '#1D1E2161', sheet: '#16171ABD', glassEdge: '#FFFFFF24', lightTint: '#F4F5F8EB',
  cta: '#F2F1F6', ctaInk: '#0B0C0E', text: '#FFFFFF', secondary: '#B8B9BD',
  mutedText: '#B8B9BD', line: '#FFFFFF17', selected: '#B4BCCF30',
});

function tintedTokens(hue: number): BaseGlassTokens {
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

const TOKEN_REGISTRY: Readonly<Record<LiquidGlassThemeId, BaseGlassTokens>> = Object.freeze({
  graphite: GRAPHITE,
  ...Object.fromEntries(Object.entries(HUES).map(([id, hue]) => [id, tintedTokens(hue)])),
}) as Readonly<Record<LiquidGlassThemeId, BaseGlassTokens>>;

// зачем (владелец 2026-09-30, темы 2.0): уровень цвета и светлое оформление — выбор
// пользователя, который обязан мгновенно перекрасить ВСЕ ~270 экранов, читающих
// `liquidGlassTokens(liquidGlassThemeId)`. Протаскивать новый аргумент через каждый экран
// нельзя (сотни файлов, многие правят параллельные сессии), поэтому ThemeProvider
// регистрирует активный вариант здесь, а вызов без второго аргумента берёт его.
// Пока провайдер ничего не записал — «Спокойно» + тёмное, т.е. прежние токены байт-в-байт.
let activeVariant: LiquidGlassVariant = DEFAULT_LIQUID_GLASS_VARIANT;
const variantCache = new Map<string, GlassTokens>();

/** Called only by ThemeProvider: the variant that argument-less token lookups resolve to. */
export function setActiveLiquidGlassVariant(variant: LiquidGlassVariant): void {
  if (variant.level === activeVariant.level && variant.appearance === activeVariant.appearance) return;
  activeVariant = Object.freeze({ level: variant.level, appearance: variant.appearance });
}

export function getActiveLiquidGlassVariant(): LiquidGlassVariant {
  return activeVariant;
}

/** Unknown or retired names safely return graphite. Without `variant` the active one is used. */
export function liquidGlassTokens(id: unknown, variant: LiquidGlassVariant = activeVariant): GlassTokens {
  const themeId: LiquidGlassThemeId = typeof id === 'string' && Object.prototype.hasOwnProperty.call(TOKEN_REGISTRY, id)
    ? id as LiquidGlassThemeId
    : 'graphite';
  const key = `${themeId}|${variant.level}|${variant.appearance}`;
  const cached = variantCache.get(key);
  if (cached) return cached;
  const tokens = buildLiquidGlassVariant(themeId, TOKEN_REGISTRY[themeId], variant);
  variantCache.set(key, tokens);
  return tokens;
}

/**
 * зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ, БЕЗ ПЛЮСА МОЖНО МЕНЯТЬ» — все 13 тем
 * бесплатны, Plus больше ничего не решает. Неизвестное/снятое имя → graphite.
 * Второй аргумент оставлен только для совместимости старых вызовов и игнорируется.
 */
export function resolveLiquidGlassTheme(id: unknown, _hasPlus?: boolean): LiquidGlassThemeId {
  return typeof id === 'string' && LIQUID_GLASS_THEME_IDS.includes(id as LiquidGlassThemeId)
    ? id as LiquidGlassThemeId
    : 'graphite';
}

// зачем (темы 2.0): getV2Palette(theme) (Главная, Шпиль, фон экранов) получает только
// объект Theme. По нему находим токены темы с уровнем и оформлением — без правки
// сотни вызовов. WeakMap не держит старые темы в памяти.
const THEME_GLASS_SOURCE = new WeakMap<object, Readonly<{ tokens: GlassTokens; calmCta: string }>>();

/** Токены, из которых собран Theme (null — тема собрана не makeLiquidGlassTheme). */
export function liquidGlassSourceOfTheme(theme: object): Readonly<{ tokens: GlassTokens; calmCta: string }> | null {
  return THEME_GLASS_SOURCE.get(theme) ?? null;
}

/** Map neutral RN theme roles; success/error/reward and ownership remain untouched. */
export function makeLiquidGlassTheme(id: LiquidGlassThemeId, base: Theme, variant: LiquidGlassVariant = activeVariant): Theme {
  const t = liquidGlassTokens(id, variant);
  const theme: Theme = {
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
    // зачем: в «Спокойно» accent/accentBg = прежние cta/selected; в «Акценте» и «Максимуме»
    // сюда приходит цвет темы — экраны, красящие выбор и ссылки через theme.accent, получают его сами.
    accent: t.accent,
    accentBg: t.accentSoft,
    shadowDark: t.bg,
    shadowLight: t.glassEdge,
    borderHighlight: t.glassEdge,
    btnShadow: t.bgBottom,
    cardShadow: t.isLight ? t.shadowTint : 'rgba(0,0,0,0.34)',
    glow: t.level === 'calm' ? t.selected : t.accentGlow,
    cardGradient: [t.opaqueControl, t.opaqueCard],
    bgGradient: [t.bgTop, t.bgBottom],
  };
  THEME_GLASS_SOURCE.set(theme, { tokens: t, calmCta: TOKEN_REGISTRY[resolveLiquidGlassTheme(id)].cta });
  return theme;
}
