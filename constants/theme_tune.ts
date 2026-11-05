// ═══════════════════════════════════════════════════════════════════════════
// theme_tune.ts — «Оформление»: тема = Светлая/Тёмная + Оттенок + Насыщенность (флаг theme_sliders_v1).
//
// зачем (слово владельца через координатора 05.11: «заменить ВСЕ темы на светлая/тёмная + ползунок оттенка + ползунок насыщенности (Plus)»,
// макет docs/work/mockups/theme_sliders_exact.html одобрен): вся палитра считается ОДНОЙ функцией из двух чисел — оттенка H (0…359°) и насыщенности S (0…100 %).
// Основа — та же формула, что у 13 тонированных тем (tintedTokens: OKLCH, оттенок H, цветность по ролям), цветность умножается на k = S / 35,
// поэтому «Стандартный» (H 250°, S 35 %) = сегодняшний тонированный вид без изменений, а S 0 даёт серую тему. Всё остальное (уровень «Максимум»,
// роли контраста, кнопки, шторки, сцена scene_palette) приложение считает как для любой темы — отдельных ветвлений под ползунки нет.
// Тема хранится строкой-идентификатором `tune:<H>:<S>` — её понимают все ~270 экранов, читающих liquidGlassTokens(liquidGlassThemeId), без правок.
// Чистый модуль без React и сети. Код старых тем НЕ удалён: пока флаг выключен, идентификатор `tune:` не принимается и всё работает как раньше.
// ═══════════════════════════════════════════════════════════════════════════
import { alpha, oklchToHex } from './liquidGlassColor';
import type { LiquidGlassBaseTokens } from './liquidGlassThemeVariants';

/** Идентификатор настроенной темы: `tune:<оттенок 0…359>:<насыщенность 0…100>`. */
export type ThemeTuneId = `tune:${number}:${number}`;
export type ThemeTune = Readonly<{ H: number; S: number }>;

/** «Стандартный»: сегодняшний вид по умолчанию (оттенок кадров эмулятора, цветность тонированной темы 1:1). */
export const THEME_TUNE_STANDARD: ThemeTune = Object.freeze({ H: 250, S: 35 });
/** Насыщенность, при которой цветность поверхностей равна цветности тонированных тем (k = 1). */
export const THEME_TUNE_S_STANDARD = 35;
/** Предел роста цветности поверхностей (k): выше фон перестаёт быть фоном. */
export const THEME_TUNE_K_MAX = 3;
/** Насыщенность 100 % = цветность акцента 0,16 (OKLCH); у стандарта 35 % ≈ 0,056. */
export const THEME_TUNE_CMAX = 0.16;
/** Минимальная насыщенность в расчёте: у S 0 оттенок не определён, а чистый серый — отдельный случай «без цвета». */
const S_FLOOR = 0;

const ID_RE = /^tune:(\d{1,3}):(\d{1,3})$/;
const clampInt = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(v)));
const wrapHue = (h: number): number => ((Math.round(h) % 360) + 360) % 360;

/** Нормализованные числа: оттенок по кругу, насыщенность в 0…100. Нечисло → стандарт. */
export function normalizeThemeTune(input: Readonly<{ H: unknown; S: unknown }>): ThemeTune {
  const h = typeof input.H === 'number' && Number.isFinite(input.H) ? wrapHue(input.H) : THEME_TUNE_STANDARD.H;
  const s = typeof input.S === 'number' && Number.isFinite(input.S) ? clampInt(input.S, 0, 100) : THEME_TUNE_STANDARD.S;
  return Object.freeze({ H: h, S: s });
}

export function themeTuneId(tune: ThemeTune): ThemeTuneId {
  const n = normalizeThemeTune(tune);
  return `tune:${n.H}:${n.S}`;
}

/** Идентификатор → числа; не наш идентификатор или значения вне диапазона → null (чужое имя не принимаем молча). */
export function parseThemeTuneId(id: unknown): ThemeTune | null {
  if (typeof id !== 'string') return null;
  const m = ID_RE.exec(id);
  if (!m) return null;
  const H = Number(m[1]);
  const S = Number(m[2]);
  if (H > 359 || S > 100) return null;
  return Object.freeze({ H, S });
}

export const isThemeTuneStandard = (tune: ThemeTune): boolean => tune.H === THEME_TUNE_STANDARD.H && tune.S === THEME_TUNE_STANDARD.S;

/** Множитель цветности поверхностей: S / 35, не выше THEME_TUNE_K_MAX. */
export const themeTuneChromaScale = (S: number): number => Math.min(THEME_TUNE_K_MAX, Math.max(S_FLOOR, S) / THEME_TUNE_S_STANDARD);

/**
 * Основа темы (тёмное «Спокойно», как у tintedTokens) из оттенка и насыщенности. При S = 35 совпадает с tintedTokens(H) байт-в-байт
 * (сторож tests/theme_tune_tokens). Оформление, уровень «Максимум» и роли контраста добавляет общий конвейер liquidGlassTokens.
 */
export function tunedBaseTokens(tune: ThemeTune): LiquidGlassBaseTokens {
  const { H, S } = normalizeThemeTune(tune);
  const k = themeTuneChromaScale(S);
  const c = (v: number): number => v * k;
  const tone = (lightness: number, chroma: number): string => oklchToHex(lightness, c(chroma), H);
  const tint = tone(0.78, 0.026);
  return Object.freeze({
    bg: tone(0.105, 0.014), bgTop: tone(0.155, 0.018), bgBottom: tone(0.14, 0.018),
    opaqueCard: tone(0.15, 0.018), opaqueSheet: tone(0.18, 0.020), opaqueControl: tone(0.24, 0.022),
    card: alpha(tone(0.15, 0.018), 0.9), sheet: alpha(tone(0.17, 0.020), 0.74),
    glassEdge: alpha(tone(0.90, 0.020), 0.12), lightTint: alpha(tone(0.94, 0.024), 0.92),
    cta: tone(0.92, 0.028), ctaInk: tone(0.12, 0.018), text: tone(0.985, 0.006),
    secondary: tone(0.82, 0.016), mutedText: tone(0.78, 0.016),
    line: alpha(tone(0.92, 0.018), 0.10), selected: alpha(tint, 0.20),
  });
}

/**
 * Миграция при включении флага: тема игрока → ближайшие оттенок и насыщенность, чтобы вид не прыгал. Вход — оттенок и цветность акцента
 * (OKLCH) уже посчитанных токенов темы; насыщенность = цветность / THEME_TUNE_CMAX. Нет акцента → стандарт.
 */
export function themeTuneFromAccentOklch(input: Readonly<{ C: number; H: number }> | null): ThemeTune {
  if (!input || !Number.isFinite(input.C) || !Number.isFinite(input.H)) return THEME_TUNE_STANDARD;
  return normalizeThemeTune({ H: input.H, S: (input.C / THEME_TUNE_CMAX) * 100 });
}
