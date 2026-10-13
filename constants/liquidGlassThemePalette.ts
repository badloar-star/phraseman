import type { Theme } from './theme';
import { alpha, oklchToHex } from './liquidGlassColor';
import { deriveLiquidGlassSurfaceRoles, flattenOver, legibleOn, type LiquidGlassSurfaceRoles } from './liquidGlassSurfaceRoles';
import { deriveLiquidGlassPaletteRoles, type LiquidGlassPaletteRoles } from './liquidGlassPaletteRoles';
import {
  DEFAULT_LIQUID_GLASS_VARIANT,
  resolveLiquidGlassAppearance,
  resolveLiquidGlassColorLevel,
  type LiquidGlassAccentRoles,
  type LiquidGlassBaseTokens,
  type LiquidGlassVariant,
} from './liquidGlassThemeVariants';
import {
  buildLiquidGlassIntensityTokens,
  intensityForLiquidGlassLevel,
  liquidGlassLevelForIntensity,
  quantizeLiquidGlassIntensity,
} from './liquidGlassThemeIntensity';
import {
  LIQUID_GLASS_GRADIENT_THEME_IDS,
  buildLiquidGlassGradientLightTokens,
  buildLiquidGlassGradientTokens,
  liquidGlassGradientTheme,
  type LiquidGlassGradientThemeId,
} from './liquidGlassGradientThemes';

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

export {
  LIQUID_GLASS_INTENSITY_DETENTS,
  LIQUID_GLASS_INTENSITY_STEP,
  clampLiquidGlassIntensity,
  intensityForLiquidGlassLevel,
  liquidGlassLevelForIntensity,
  migrateStoredLiquidGlassIntensity,
  quantizeLiquidGlassIntensity,
} from './liquidGlassThemeIntensity';

/** The approved 2.0 tint family. This registry changes color only, never assets or access. */
const LIQUID_GLASS_TINT_THEME_IDS = [
  'graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose',
  'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine',
] as const;

type LiquidGlassTintThemeId = typeof LIQUID_GLASS_TINT_THEME_IDS[number];

// зачем (владелец 2026-10-04): 10 градиентных тем ДОБАВЛЕНЫ к 13 тонированным, а не вместо.
// Их набор живёт одним списком в liquidGlassGradientThemes.ts.
export type LiquidGlassThemeId = LiquidGlassTintThemeId | LiquidGlassGradientThemeId;

export const LIQUID_GLASS_THEME_IDS: readonly LiquidGlassThemeId[] = Object.freeze([
  ...LIQUID_GLASS_TINT_THEME_IDS,
  ...LIQUID_GLASS_GRADIENT_THEME_IDS,
]);

export { LIQUID_GLASS_GRADIENT_THEMES, LIQUID_GLASS_GRADIENT_THEME_IDS, type LiquidGlassGradientThemeId } from './liquidGlassGradientThemes';

const HUES: Readonly<Record<Exclude<LiquidGlassTintThemeId, 'graphite'>, number>> = {
  polar: 225, slate: 245, ink: 275, lavender: 300, iris: 320,
  rose: 350, terracotta: 40, taupe: 65, olive: 110, sage: 150,
  eucalyptus: 180, marine: 205,
};

type BaseGlassTokens = LiquidGlassBaseTokens;
/**
 * Neutral theme tokens + colour roles of the current level/appearance (see liquidGlassThemeVariants.ts).
 * `intensity` — положение ползунка (0…1, шаг 0.05), `level` — его корзина для старых ветвлений.
 */
// зачем (замечание владельца 10.10): + токены поверхностей для экранов с зашитыми под макет цветами (liquidGlassSurfaceRoles.ts).
export type GlassTokens = LiquidGlassBaseTokens & LiquidGlassAccentRoles & LiquidGlassSurfaceRoles & LiquidGlassPaletteRoles & Readonly<{ intensity: number; /** Цвет ГРАФИКИ цвета темы (кольца, полосы, точки, кромки, значки): `accent`, а где он слился бы с фоном — глубже в сторону текста темы, ≥ 3:1 на фоне/карточке/шторке. */ accentGraphic: string; /** Текст и значки цвета темы на поверхности: в светлом `accentText` (глубокий, ≥ 4,5), в тёмном ровно `accent` (тёмный вид не меняется). */ accentTextSafe: string }>;

/** Вариант с проверенными полями: интенсивность квантована, уровень — её корзина. */
function normalizeVariant(requested: LiquidGlassVariant): Required<LiquidGlassVariant> {
  const level = resolveLiquidGlassColorLevel(requested.level);
  const raw = typeof requested.intensity === 'number' && Number.isFinite(requested.intensity)
    ? requested.intensity
    : intensityForLiquidGlassLevel(level);
  const intensity = quantizeLiquidGlassIntensity(raw);
  return { level: liquidGlassLevelForIntensity(intensity), appearance: resolveLiquidGlassAppearance(requested.appearance), intensity };
}

const GRAPHITE: BaseGlassTokens = Object.freeze({
  bg: '#0C0D10', bgTop: '#181A1F', bgBottom: '#16181D',
  // зачем (гейт «приложение = макет», паритет Learn 05.10): карточка «Затмения» = `--card #151517`
  // kit.css (макеты 2.0: learn.html, хаб «Карточки» и др.); было #222429 — светлее макета.
  // Плашки/контролы/шторки (#222429) не тронуты — их сверка отдельно.
  opaqueCard: '#151517', opaqueSheet: '#222429', opaqueControl: '#222429',
  // зачем (сверка packs-simple-001, 05.10): стекло карточки = `--card #151517` макета на 0.9 альфы — как стекло кита 2.0
  // (adaptV2PaletteToGlass) и правило «стекло непрозрачное ≥ 0.9»; было #1D1E21 на 38 % — строки каталога темнее макета.
  card: '#151517E6', sheet: '#16171ABD', glassEdge: '#FFFFFF24', lightTint: '#F4F5F8EB',
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
    // зачем (владелец 05.10 «решения — рекомендуемые»; правило «стекло 2.0 непрозрачное ≥ 0.9»): стекло карточки =
    // opaqueCard темы на 0.9 — как «Затмение» (bf4f4996d) и кит V2; было 46 % — фон просвечивал, карточки темнее макета.
    card: alpha(dark(0.15, 0.018), 0.9), sheet: alpha(dark(0.17, 0.020), 0.74),
    glassEdge: alpha(light(0.90, 0.020), 0.12), lightTint: alpha(light(0.94, 0.024), 0.92),
    cta: light(0.92, 0.028), ctaInk: dark(0.12, 0.018), text: light(0.985, 0.006),
    secondary: light(0.82, 0.016), mutedText: light(0.78, 0.016),
    line: alpha(light(0.92, 0.018), 0.10), selected: alpha(tint, 0.20),
  });
}

const TOKEN_REGISTRY: Readonly<Record<LiquidGlassTintThemeId, BaseGlassTokens>> = Object.freeze({
  graphite: GRAPHITE,
  ...Object.fromEntries(Object.entries(HUES).map(([id, hue]) => [id, tintedTokens(hue)])),
}) as Readonly<Record<LiquidGlassTintThemeId, BaseGlassTokens>>;

// зачем (владелец 2026-09-30, темы 2.0): уровень цвета и светлое оформление — выбор
// пользователя, который обязан мгновенно перекрасить ВСЕ ~270 экранов, читающих
// `liquidGlassTokens(liquidGlassThemeId)`. Протаскивать новый аргумент через каждый экран
// нельзя (сотни файлов, многие правят параллельные сессии), поэтому ThemeProvider
// регистрирует активный вариант здесь, а вызов без второго аргумента берёт его.
// Пока провайдер ничего не записал — «Спокойно» + тёмное, т.е. прежние токены байт-в-байт.
let activeVariant: Required<LiquidGlassVariant> = normalizeVariant(DEFAULT_LIQUID_GLASS_VARIANT);
// зачем: 23 темы × 2 оформления × 21 шаг ползунка = 966 палитр максимум — кэш ограничен сам.
// зачем (запрос координатора 15.10, +52 МБ на экране тем): кэш рос без предела (до ~970 записей по ~150 цветов при листании тем и ползунка).
// Теперь LRU с потолком: попадание переносит запись в конец, переполнение вытесняет самую старую. Пересчёт токена дешёвый и детерминированный.
export const VARIANT_CACHE_LIMIT = 160;
const variantCache = new Map<string, GlassTokens>();
/** Размер кэша токенов (тема × оформление × шаг ползунка) — для dev-лога [THEMES-MEM]. */
export const liquidGlassTokenCacheSize = (): number => variantCache.size;

/**
 * Освобождение при уходе с экрана тем: оставить в кэше токены только активной темы (≤ 2 оформления × 21 шаг), остальное пересчитается по требованию.
 * Возвращает, сколько записей освобождено (для лога [THEMES-MEM]).
 */
export function releaseLiquidGlassTokenCacheExcept(activeThemeId: unknown): number {
  const keep = `${resolveLiquidGlassTheme(activeThemeId)}|`;
  let freed = 0;
  for (const key of Array.from(variantCache.keys())) {
    if (!key.startsWith(keep)) { variantCache.delete(key); freed += 1; }
  }
  return freed;
}

/** Called only by ThemeProvider: the variant that argument-less token lookups resolve to. */
export function setActiveLiquidGlassVariant(variant: LiquidGlassVariant): void {
  const next = normalizeVariant(variant);
  if (next.intensity === activeVariant.intensity && next.appearance === activeVariant.appearance) return;
  activeVariant = Object.freeze(next);
}

export function getActiveLiquidGlassVariant(): Required<LiquidGlassVariant> {
  return activeVariant;
}

/** Тёмное оформление: подложка шторок/окон нейтральная при любой теме (стиль «Тень»); светлое — как есть. */
export const SHADOW_SHEET_NEUTRAL_DARK = '#28282E';
// зачем (координатор 13.10, кадры dark_sheet_r1: поле ввода и «Отмена» в диалоге удаления оставались зеленоватыми на нейтральной подложке): `opaqueControl` в ТЁМНОМ тоже нейтральный
// (#34343A — чуть светлее подложки #28282E, как плашки/поля в образцах «Тени»), а не тонированный темой (у «Авроры» #2B3839). Светлое не трогаем. Откат — git revert коммита с этой строкой.
export const SHADOW_CONTROL_NEUTRAL_DARK = '#34343A';
function withNeutralDarkSheet<T extends { isLight: boolean; opaqueSheet: string; opaqueControl: string }>(built: T): T {
  return built.isLight ? built : { ...built, opaqueSheet: SHADOW_SHEET_NEUTRAL_DARK, opaqueControl: SHADOW_CONTROL_NEUTRAL_DARK };
}

/** Unknown or retired names safely return graphite. Without `variant` the active one is used. */
export function liquidGlassTokens(id: unknown, requested: LiquidGlassVariant = activeVariant): GlassTokens {
  // зачем: вызов вида ids.map(liquidGlassTokens) передаёт индекс вторым аргументом —
  // всё, что не вариант, трактуем как активный вариант, а не как «неизвестный уровень».
  const variant = requested && typeof requested === 'object' ? normalizeVariant(requested) : activeVariant;
  const themeId = resolveLiquidGlassTheme(id);
  const key = `${themeId}|${variant.intensity}|${variant.appearance}`;
  const cached = variantCache.get(key);
  if (cached) {
    variantCache.delete(key);
    variantCache.set(key, cached);
    return cached;
  }
  // зачем (координатор 13.10, разбор diff Темами Г2; решение владельца 12.10 «стиль «Тень» на всё приложение»): подложка шторок и окон в ТЁМНОМ оформлении — нейтральная
  // (#28282E, shadow-skin.css `.ph .sheet`) при любой теме, а не окрашенная тоном темы (у «Авроры» было #2B3839, у «Ириса» #33353E). Все производные (плашки шторок,
  // контраст текста на подложке) считаются уже от неё. Светлое оформление не меняется. Откат — git revert коммита с этой строкой.
  const built = withNeutralDarkSheet(buildThemeTokens(themeId, variant));
  const surfaceRoles = deriveLiquidGlassSurfaceRoles(built);
  // зачем (проверка тем на новых экранах, 14.10): приглушённый текст (счётчики, номера, подписи) в светлом оформлении ≥ 4,5 на ВСЕХ
  // поверхностях — фон, карточка, шторка, плашка, низ плашки и выбранного «Тени». Тёмное оформление уже ≥ 6,3 и не трогается.
  // зачем (ночная проверка двух тем 12.10): текст на `selected` (неактивная кнопка «Применить код», нажатая строка меню, открытая пилюля) — сведённом
  // с шторкой/карточкой/фоном — давал 4,10–4,34 в тёмных тонированных темах («Максимум») и 4,48 у iris/taupe в светлых; теперь это тоже поверхность проверки.
  const selectedOver = [built.opaqueCard, built.opaqueSheet, built.bg].map((under) => flattenOver(built.selected, under));
  const mutedText = legibleOn(built.mutedText, built.text, built.isLight
    ? [
        built.bg, built.bgTop, built.bgBottom, built.opaqueCard, built.opaqueControl, built.opaqueSheet,
        surfaceRoles.plateFillFrom, surfaceRoles.plateFillTo, surfaceRoles.raisedFillFrom, surfaceRoles.raisedFillTo,
        ...selectedOver,
      ]
    : selectedOver, 4.55);
  // зачем: иерархия «приглушённый не контрастнее вторичного» (tests/theme_muted_text_aa) — вторичный текст проходит ту же проверку на `selected`, иначе после подъёма mutedText он оказался бы ярче secondary
  const secondary = legibleOn(built.secondary, built.text, selectedOver, 4.55);
  // зачем (проверка тинта плашки «Свободный разговор», Дизайн 366ae9846): значок accentText лежит на accentSoft, а тот — на карточке, подкрашенной градиентом accent·12 %;
  // в тёмных тонированных темах на «Максимум» это 4,44–4,49. Доводим accentText до ≥ 4,55 на этих слоях (оттенок сохраняется, меняется только там, где не хватало).
  const accentOnTint = [built.opaqueCard, built.opaqueSheet, built.bg].map((under) => flattenOver(built.accentSoft, under));
  const plateTint = flattenOver(`${built.accent.slice(0, 7)}1F`, built.opaqueCard);
  const accentText = legibleOn(built.accentText, built.text, [...accentOnTint, flattenOver(built.accentSoft, plateTint)], 4.55);
  // зачем (находка контраста «Авроры» 12.10): у градиентных тем в светлом оформлении сырой `accent` — пастель (1,0–1,8 на фоне/карточке с level ≈ 0,55–0,75), и кольца/полосы/точки на нём невидимы.
  // accentGraphic = accent, пока он держит ≥ 3:1 на ВСЕХ поверхностях; иначе тот же оттенок, углублённый в сторону текста темы. В тёмном оформлении и там, где accent и так виден, совпадает с accent.
  const accentGraphic = legibleOn(built.accent, built.text, [
    built.bg, built.bgTop, built.bgBottom, built.opaqueCard, built.opaqueControl, built.opaqueSheet,
  ], 3.2);
  const tokens: GlassTokens = Object.freeze({
    ...built,
    secondary,
    accentText,
    accentGraphic,
    accentTextSafe: built.isLight ? accentText : built.accent,
    mutedText,
    ...surfaceRoles,
    // зачем (релизный пол 10.10): good/bad/warn/info, скрим, плитки, достижения, медали, уровни A1–B2 — токены всех тем.
    ...(deriveLiquidGlassPaletteRoles({ ...built, intensity: variant.intensity }) as LiquidGlassPaletteRoles),
    intensity: variant.intensity,
  });
  variantCache.set(key, tokens);
  if (variantCache.size > VARIANT_CACHE_LIMIT) {
    const oldest = variantCache.keys().next().value;
    if (oldest !== undefined) variantCache.delete(oldest);
  }
  return tokens;
}

function isTintTheme(id: LiquidGlassThemeId): id is LiquidGlassTintThemeId {
  return Object.prototype.hasOwnProperty.call(TOKEN_REGISTRY, id);
}

function buildThemeTokens(themeId: LiquidGlassThemeId, variant: Required<LiquidGlassVariant>) {
  const gradient = liquidGlassGradientTheme(themeId);
  // зачем (владелец 2026-10-04): тёмное — themes-gradient.html, светлое — вариант B «Пастель»
  // из themes-gradient-light.html.
  if (gradient && variant.appearance === 'light') {
    return buildLiquidGlassGradientLightTokens(gradient, variant.intensity);
  }
  if (gradient) {
    const graphiteDark = buildLiquidGlassIntensityTokens('graphite', TOKEN_REGISTRY.graphite, 'dark', 0);
    return buildLiquidGlassGradientTokens(gradient, graphiteDark, variant.intensity);
  }
  const tintId: LiquidGlassTintThemeId = isTintTheme(themeId) ? themeId : 'graphite';
  // зачем (ползунок 2026-10-04): на опорных точках 0 / 0.5 / 1 — прежние формулы байт-в-байт,
  // между ними — смешивание соседних (liquidGlassThemeIntensity.ts).
  return buildLiquidGlassIntensityTokens(tintId, TOKEN_REGISTRY[tintId], variant.appearance, variant.intensity);
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
    // зачем (координатор 11.10): текст/значок цветом акцента на карточке — токен accentText (≥ 4.5:1 в светлой), а не cta/accent (заливка).
    accentText: t.accentText,
    // зачем (координатор 14.10): текст/значок на заливке accent — accentInk; correctText остаётся для зелёной заливки correct.
    accentInk: t.accentInk,
    // зачем (находка контраста «Авроры» 12.10): цвет графики темы — см. accentGraphic в liquidGlassTokens
    accentGraphic: t.accentGraphic,
    accentTextSafe: t.accentTextSafe,
    // зачем (владелец 01.10, «ни одного элемента не по макету»; аудит MOCKUP_GAP_AUDIT):
    // gold/goldBg/textOnGold протекали из старой базы (#FFC800) — ~112 мест красились жёлтым
    // в любой теме (звёзды оценки, кольцо серии…). В 2.0 жёлтого нет: «золото» = акцент темы
    // (в «Спокойно» — нейтральный светлый, как белые звёзды макета).
    gold: t.accentBright,
    goldBg: t.accentSoft,
    textOnGold: t.accentInk,
    shadowDark: t.bg,
    shadowLight: t.glassEdge,
    borderHighlight: t.glassEdge,
    btnShadow: t.bgBottom,
    cardShadow: t.isLight ? t.shadowTint : 'rgba(0,0,0,0.34)',
    glow: t.level === 'calm' ? t.selected : t.accentGlow,
    cardGradient: [t.opaqueControl, t.opaqueCard],
    bgGradient: [t.bgTop, t.bgBottom],
  };
  const resolvedId = resolveLiquidGlassTheme(id);
  THEME_GLASS_SOURCE.set(theme, { tokens: t, calmCta: TOKEN_REGISTRY[isTintTheme(resolvedId) ? resolvedId : 'graphite'].cta });
  return theme;
}
