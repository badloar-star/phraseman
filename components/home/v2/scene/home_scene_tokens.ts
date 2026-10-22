// ═══════════════════════════════════════════════════════════════════════════
// home_scene_tokens.ts — цвета «Сцены» Главной из палитры темы.
//
// зачем (эталон home-new-concepts.html, раздел A; договорённость с 4 · ТЕМЫ 21.10: «заводи свои значения у себя —
// sceneTop, sceneBottom, sceneGlow, sceneEmber; перенесу в тему, когда сцена устоится»): сцена — глубокий градиент тона
// акцента темы со светом сверху. Белый текст лежит прямо на сцене, поэтому верх и низ затемняются, пока белый не даёт
// ≥ 4,5:1 по яркости WCAG — светлые темы автоматически получают тёмную сцену, а не «белое на светлом».
// Вечер (серия под угрозой) — свои тёплые цвета, как в эталоне (.a-stage.eve).
// homeSceneThemeTokens (ниже) — цвета Главной по утверждённому эталону home-scene-states.html из токенов темы; homeSceneTokens(accent)
// остаётся для «Сегодня» (TodaySceneView), пока тот экран не перейдёт на токены темы.
// ═══════════════════════════════════════════════════════════════════════════
import { liquidGlassTokens } from '../../../../constants/liquidGlassThemePalette';
import { alphaHex, mixHex } from '../../../../constants/v2Style';

export type HomeSceneTokens = Readonly<{
  sceneTop: string;
  sceneBottom: string;
  /** Свет в левом верхнем углу сцены (полупрозрачный). */
  sceneGlow: string;
  /** Тёплый свет вечера (полупрозрачный). */
  sceneEmber: string;
  /** Контраст белого на верхнем цвете — для журнала и стража темы. */
  whiteContrastTop: number;
}>;

/** Минимальный контраст белого текста на сцене (обычный текст по WCAG AA). */
export const HOME_SCENE_MIN_WHITE_CONTRAST = 4.5;
const FALLBACK_ACCENT = '#5B49D6';
const HEX = /^#([0-9a-f]{6})$/i;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Относительная яркость WCAG для #rrggbb; не hex — null. */
export function relativeLuminance(hex: string): number | null {
  const m = HEX.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Контраст белого текста на цвете; не hex — 1 (худший случай). */
export function whiteContrastOn(hex: string): number {
  const l = relativeLuminance(hex);
  return l === null ? 1 : 1.05 / (l + 0.05);
}

/** Затемняет цвет шагами, пока белый не даст нужный контраст (не больше 16 шагов). */
export function darkenForWhite(hex: string, min = HOME_SCENE_MIN_WHITE_CONTRAST): string {
  let out = HEX.test(hex) ? hex : FALLBACK_ACCENT;
  for (let i = 0; i < 16 && whiteContrastOn(out) < min; i += 1) out = mixHex(out, '#000000', 0.12);
  return out;
}

const EVENING = Object.freeze({ top: '#2E2648', bottom: '#0F0C1C', glow: 'rgba(214,92,70,0.62)' });

export function homeSceneTokens(accent: string, evening = false): HomeSceneTokens {
  const base = HEX.test(accent) ? accent : FALLBACK_ACCENT;
  if (evening) {
    return Object.freeze({ sceneTop: EVENING.top, sceneBottom: EVENING.bottom, sceneGlow: EVENING.glow, sceneEmber: 'rgba(229,94,70,0.5)', whiteContrastTop: whiteContrastOn(EVENING.top) });
  }
  const top = darkenForWhite(mixHex(base, '#000000', 0.32));
  const bottom = darkenForWhite(mixHex(base, '#05060A', 0.7));
  return Object.freeze({
    sceneTop: top,
    sceneBottom: bottom,
    sceneGlow: alphaHex(mixHex(base, '#FFFFFF', 0.3), 0.7),
    sceneEmber: 'rgba(229,94,70,0.5)',
    whiteContrastTop: whiteContrastOn(top),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Цвета Главной по эталону home-scene-states.html (под замком f2e478486; владелец 22.10 после ползунков «сцена темнее»:
// «всё-таки твой вариант самый лучший, мне нравится по яркости сцены»). Формула — та же, что у эталона (функция sceneTok страницы):
//   тёмное — основа сцены = 30 % градиента акцента темы поверх фона (верх: accentGradient[0] над bgTop, низ: последний цвет над bg),
//   свет — bgGlow[0] темы (нет — accentGlow), без чёрного затемнения низа; вечер — те же цвета, тёплый свет справа и угли снизу слева;
//   светлое «Сумерки» (ink) — числа home-new-concepts.html A как есть; остальные светлые — та же глубина OKLCH (L .47 → .28),
//   оттенок и насыщенность — от акцента темы. Шов сцены с карточкой (контраст низа и opaqueCard) — для журнала и стража (≥ 1,34).
// Эталон снят на «Максимуме»: снимок тем страницы = liquidGlassTokens(id, { level: 'max' }) без расхождений (сверка 22.10); сцена всегда
// берёт этот уровень — homeSceneTokensForTheme. Чистый модуль без React — сторож tests/home_scene_theme_tokens.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

/** Поля токенов темы, из которых эталон собирает сцену (подмножество GlassTokens). */
export type HomeSceneThemeTokens = Readonly<{
  accent: string;
  accentGradient: readonly string[];
  accentGlow: string;
  bgGlow: readonly string[];
  bg: string;
  bgTop: string;
  opaqueCard: string;
}>;

export type HomeSceneStageTokens = HomeSceneTokens & Readonly<{
  /** Тёплый свет вечера справа сверху (радиальный). */
  eveningGlow: string;
  /** Затемнение низа сцены: в светлом есть, в тёмном нет (эталон: у тёмной сцены .a-scrim скрыт). */
  scrim: boolean;
  /** Шов: контраст низа сцены с карточкой под ней (эталон: в тёмном ≥ 1,34). */
  seam: number;
}>;

/** Доля акцента над фоном в тёмном оформлении (эталон: «30 % акцента поверх фона»). */
export const HOME_SCENE_DARK_ACCENT_MIX = 0.3;
/** Шов сцены с карточкой в тёмном оформлении — не меньше (эталон, замер под каждой парой экранов). */
export const HOME_SCENE_SEAM_MIN = 1.34;
/** «Сумерки» — тема, чей светлый вид владелец утвердил числами home-new-concepts.html A. */
export const HOME_SCENE_TWILIGHT_THEME_ID = 'ink';
const EVENING_GLOW = 'rgba(214,92,70,0.62)';
/** Под светлой сценой «Сумерек» в эталоне — карточка #FCFCFF. */
const TWILIGHT_CARD = '#FCFCFF';

type Rgb = readonly [number, number, number];
const HEX6_OR_8 = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;
const rgbOf = (hex: string): Rgb | null => {
  const m = HEX6_OR_8.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const alphaOf = (hex: string): number => { const m = HEX6_OR_8.exec(hex); return m && m[2] ? parseInt(m[2], 16) / 255 : 1; };
const clamp255 = (v: number): number => Math.max(0, Math.min(255, v));
const hexOf = (c: Rgb): string => `#${c.map((v) => Math.round(clamp255(v)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const rgbaOf = (c: Rgb, a: number): string => `rgba(${c.map((v) => Math.round(clamp255(v))).join(',')},${a})`;
/** Как mixc эталона: a·w + b·(1 − w). */
const mixRgb = (a: Rgb, b: Rgb, w: number): Rgb => [a[0] * w + b[0] * (1 - w), a[1] * w + b[1] * (1 - w), a[2] * w + b[2] * (1 - w)];
const lumRgb = (c: Rgb): number => {
  const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const ratioRgb = (a: Rgb, b: Rgb): number => {
  const x = lumRgb(a);
  const y = lumRgb(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const toLin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = (v: number): number => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

/** sRGB → OKLCH [L, C, H°] (Björn Ottosson), как oklchOf эталона. */
export function homeSceneOklchOf(c: Rgb): readonly [number, number, number] {
  const [r, g, b] = c.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}

/** OKLCH → sRGB 0…255 (каналы обрезаются в линейном виде), как fromOklch эталона. */
export function homeSceneFromOklch(L: number, C: number, H: number): Rgb {
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  return lin.map((v) => clamp255(toSrgb(Math.max(0, Math.min(1, v))))) as unknown as Rgb;
}

/** Угли вечера снизу слева (эталон .a-ember: oklch(.66 .19 28 / .55)). */
const EMBER = rgbaOf(homeSceneFromOklch(0.66, 0.19, 28), 0.55);

export type HomeSceneThemeInput = Readonly<{
  themeId: string;
  appearance: 'dark' | 'light';
  theme: HomeSceneThemeTokens;
}>;

/** Цвета «Сцены» Главной по эталону home-scene-states.html (формула sceneTok страницы) из токенов выбранной темы. */
export function homeSceneThemeTokens(input: HomeSceneThemeInput, evening = false): HomeSceneStageTokens {
  const t = input.theme;
  const accent = rgbOf(t.accent) ?? (rgbOf(FALLBACK_ACCENT) as Rgb);
  const done = (top: Rgb, bot: Rgb, glow: string, eveTop: Rgb, eveBot: Rgb, eveningGlow: string, scrim: boolean, seam: number): HomeSceneStageTokens => {
    const sceneTop = hexOf(evening ? eveTop : top);
    return Object.freeze({
      sceneTop,
      sceneBottom: hexOf(evening ? eveBot : bot),
      sceneGlow: glow,
      sceneEmber: EMBER,
      whiteContrastTop: whiteContrastOn(sceneTop),
      eveningGlow,
      scrim,
      seam,
    });
  };
  if (input.appearance === 'dark') {
    const grad = t.accentGradient.length > 0 ? t.accentGradient : [t.accent, t.accent];
    const first = rgbOf(grad[0]) ?? accent;
    const last = rgbOf(grad[grad.length - 1]) ?? accent;
    const top = mixRgb(first, rgbOf(t.bgTop) ?? [0, 0, 0], HOME_SCENE_DARK_ACCENT_MIX);
    const bot = mixRgb(last, rgbOf(t.bg) ?? [0, 0, 0], HOME_SCENE_DARK_ACCENT_MIX);
    // как в эталоне: первый свет фона темы, если он есть строкой (прозрачный тоже), иначе свет акцента
    const glowHex = (t.bgGlow.length > 0 && t.bgGlow[0]) || t.accentGlow;
    const glowRgb = rgbOf(glowHex);
    const glow = glowRgb ? rgbaOf(glowRgb, alphaOf(glowHex)) : glowHex;
    return done(top, bot, glow, top, bot, EVENING_GLOW, false, ratioRgb(bot, rgbOf(t.opaqueCard) ?? [0, 0, 0]));
  }
  if (input.themeId === HOME_SCENE_TWILIGHT_THEME_ID) {
    // утверждённый владельцем светлый вид — числа эталона home-new-concepts.html A без изменений (и его вечер — .a-stage.eve)
    const top = homeSceneFromOklch(0.47, 0.14, 282);
    const bot = homeSceneFromOklch(0.28, 0.10, 276);
    return done(top, bot, rgbaOf(homeSceneFromOklch(0.66, 0.13, 300), 0.9), homeSceneFromOklch(0.30, 0.09, 285), homeSceneFromOklch(0.14, 0.05, 280),
      rgbaOf(homeSceneFromOklch(0.58, 0.17, 25), 0.75), true, ratioRgb(bot, rgbOf(TWILIGHT_CARD) as Rgb));
  }
  const [, C, H] = homeSceneOklchOf(accent);
  const top = homeSceneFromOklch(0.47, Math.min(C, 0.16), H);
  const bot = homeSceneFromOklch(0.28, Math.min(C, 0.11), (H + 354) % 360);
  return done(top, bot, rgbaOf(homeSceneFromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), 0.9),
    homeSceneFromOklch(0.30, Math.min(C, 0.09), H), homeSceneFromOklch(0.14, Math.min(C, 0.05), H), EVENING_GLOW, true,
    ratioRgb(bot, rgbOf(t.opaqueCard) ?? [255, 255, 255]));
}

/** Уровень темы, токенами которого рисуется сцена (эталон снят на нём). */
export const HOME_SCENE_THEME_LEVEL = 'max' as const;

/**
 * Цвета «Сцены» выбранной темы и оформления — всегда токенами уровня «Максимум».
 * зачем: владелец 22.10 — сцена всегда как утверждённый эталон; ползунок «Спокойно/Акцент/Максимум» меняет только остальной фон и карточки.
 */
export function homeSceneTokensForTheme(themeId: string, appearance: 'dark' | 'light', evening = false): HomeSceneStageTokens {
  return homeSceneThemeTokens({ themeId, appearance, theme: liquidGlassTokens(themeId, { level: HOME_SCENE_THEME_LEVEL, appearance }) }, evening);
}
