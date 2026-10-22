// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_tokens.ts — цвета «Сцены» «Диалогов» из токенов темы.
//
// зачем (владелец 21.10 после первого показа: «цвета из каждой темы… ничего не обрезано»; эталон docs/design/v2-app/dialogs-scene-states.html, `.sc .light`):
// сцена не берёт один акцент и не красится в белое — она собирается из токенов выбранной темы: свет bgGlow, основа bgTop → bg, в тёмном оформлении к ней
// подмешано 30 % градиента акцента (иначе стык сцены и панели сливался: контраст 1,01–1,05 → ≥ 1,34), текст — text/secondary темы, а не белый, поэтому
// читается и в светлых темах. Решение «зачем» из макета (владелец 22.10 ночью): «в тёмном сливается и некрасиво».
// Чистый модуль без React: вход — любой объект с нужными полями токенов (useLv2Glass() / liquidGlassTokens()), выход — готовые строки цветов и контраст
// текста на сцене (страж: tests/dialogs_scene_tokens.test.ts проходит все темы × оформления). Яркость считает relativeLuminance из блока 3 · МАКЕТЫ
// (components/home/v2/scene/home_scene_tokens.ts) — не копия.
// ═══════════════════════════════════════════════════════════════════════════
import { liquidGlassTokens, type GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { alphaHex, mixHex } from '../../../constants/v2Style';
import { relativeLuminance } from '../../home/v2/scene/home_scene_tokens';

/** Поля токенов темы, которые читает сцена (подмножество GlassTokens). */
export type DialogsSceneThemeTokens = Readonly<{
  isLight: boolean;
  bg: string;
  bgTop: string;
  bgBottom: string;
  bgGlow: readonly [string, string, string];
  accentGradient: readonly string[];
  accentGlow: string;
  accentText: string;
  text: string;
  secondary: string;
  opaqueCard: string;
  cta: string;
  ctaInk: string;
}>;

export type DialogsSceneColors = Readonly<{
  /** Основа сцены сверху и снизу (линейный градиент 170°). */
  top: string;
  bottom: string;
  /** Свет: правый верх, левый верх; третий (низ) — только в светлом оформлении, в тёмном null. */
  glowRight: string;
  glowLeft: string;
  glowBottom: string | null;
  /** Затемнение низа под текстом (только светлое оформление); в тёмном null — основы достаточно. */
  scrim: string | null;
  /** Ореол за героем. */
  halo: string;
  text: string;
  secondary: string;
  accent: string;
  /** Главная кнопка сцены и текст на ней (cta/ctaInk темы). */
  cta: string;
  ctaInk: string;
  /** «Стекло» на сцене — тоном текста темы, а не белым (`.gl` эталона): читается и в светлых темах. */
  glass: string;
  /** Дорожка полоски прогресса и пустые деления шкалы. */
  track: string;
  /** Цвет под текстом внизу сцены — для расчёта контраста (в светлом — основа со скримом). */
  textZone: string;
  isLight: boolean;
}>;

/**
 * Уровень темы, токенами которого рисуется сцена «Диалогов» (эталон dialogs-scene-states.html снят на нём).
 * зачем (владелец 22.10: «Сцена всегда как в макете»): сцена берёт этот уровень при любом положении ползунка яркости; ползунок меняет остальной фон.
 */
export const DIALOGS_SCENE_THEME_LEVEL = 'max' as const;

/** Токены выбранной темы и оформления для сцены — всегда уровня DIALOGS_SCENE_THEME_LEVEL (как homeSceneTokensForTheme у Главной). */
export function dialogsSceneTokensForTheme(themeId: string, appearance: 'dark' | 'light'): GlassTokens {
  return liquidGlassTokens(themeId, { level: DIALOGS_SCENE_THEME_LEVEL, appearance });
}

/** Минимальный контраст обычного текста (WCAG AA). */
export const DIALOGS_SCENE_MIN_TEXT_CONTRAST = 4.5;

const HEX6 = /^#[0-9a-f]{6}$/i;
/** Доля акцента, подмешанная к основе в тёмном оформлении (`color-mix(g1 30%, top)` эталона). */
const DARK_ACCENT_MIX = 0.3;
/** Доля нижнего цвета фона в затемнении светлой сцены (`color-mix(bot 62%, transparent)`). */
const LIGHT_SCRIM_MIX = 0.62;

function hex6(value: string, fallback: string): string {
  return HEX6.test(value) ? value : fallback;
}

/**
 * Вторичный текст подтягивается к основному, пока не даст нужный контраст на сцене.
 * зачем (прогон 22.10): в шести тёмных градиентных темах (aurora, iris, champagne, ice, coral, lilac) подмешанный к основе акцент делал вторичный текст
 * 4,46 вместо 4,5 — чуть выше порога; остальные темы не меняются (шаг не нужен), вид эталона сохраняется.
 */
function legibleOn(color: string, text: string, under: string, min: number): string {
  let out = hex6(color, text);
  for (let i = 0; i < 10 && contrastRatio(out, under) < min; i += 1) out = mixHex(out, text, 0.1);
  return out;
}

export function dialogsSceneColors(t: DialogsSceneThemeTokens): DialogsSceneColors {
  const gradFirst = hex6(t.accentGradient[0] ?? t.accentText, t.accentText);
  const gradLast = hex6(t.accentGradient[t.accentGradient.length - 1] ?? t.accentText, t.accentText);
  const bgTop = hex6(t.bgTop, t.bg);
  const bgBottom = hex6(t.bgBottom, t.bg);
  const dark = !t.isLight;
  // тёмное: к основе подмешан акцент темы, скрима нет; светлое: основа bgTop → bg и затемнение низа тоном bgBottom
  const top = dark ? mixHex(bgTop, gradFirst, DARK_ACCENT_MIX) : bgTop;
  const bottom = dark ? mixHex(t.bg, gradLast, DARK_ACCENT_MIX) : t.bg;
  const textZone = dark ? bottom : mixHex(bottom, bgBottom, LIGHT_SCRIM_MIX);
  return Object.freeze({
    top,
    bottom,
    glowRight: t.bgGlow[0],
    glowLeft: t.bgGlow[1],
    glowBottom: dark ? null : t.bgGlow[2],
    scrim: dark ? null : bgBottom,
    halo: t.accentGlow,
    text: t.text,
    secondary: legibleOn(t.secondary, t.text, textZone, DIALOGS_SCENE_MIN_TEXT_CONTRAST),
    accent: t.accentText,
    cta: t.cta,
    ctaInk: t.ctaInk,
    glass: alphaHex(hex6(t.text, '#FFFFFF'), 0.12),
    track: alphaHex(hex6(t.text, '#FFFFFF'), 0.18),
    textZone,
    isLight: t.isLight,
  });
}

/** Контраст двух #rrggbb (WCAG); не hex — 1 (худший случай). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export type DialogsSceneContrast = Readonly<{
  text: number;
  secondary: number;
  accent: number;
  /** Стык основы сцены и панели «Диалоги» под ней. */
  seam: number;
}>;

/** Контраст текста сцены на цвете под ним и стыка сцены с панелью (opaqueCard) — для журнала и стража. */
export function dialogsSceneContrast(t: DialogsSceneThemeTokens, colors: DialogsSceneColors = dialogsSceneColors(t)): DialogsSceneContrast {
  return Object.freeze({
    text: contrastRatio(colors.text, colors.textZone),
    secondary: contrastRatio(colors.secondary, colors.textZone),
    accent: contrastRatio(colors.accent, colors.textZone),
    seam: contrastRatio(colors.textZone, t.opaqueCard),
  });
}
