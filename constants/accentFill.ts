import { colorContrast } from './color_contrast';
import type { GlassTokens } from './liquidGlassThemePalette';

// зачем (Дизайн 12.10 → задача «Тем»): в светлых градиентных темах (aurora, iris, magma, midnight, champagne, jade, orchid, ice, coral, lilac;
// уровни accent/max) `accentBright` — глубокий тон для ссылок и значков, а не заливка: текст `accentInk` на нём держит всего 1,2–2,3:1.
// Заливка под `accentInk`/белым текстом берётся ТОЛЬКО отсюда: яркий конец градиента допускается лишь если контраст ≥ 4,5, иначе обе
// половины — `accent` (пара accent/accentInk задана токенами и проверяется тестом по всем темам × оттенкам).
export const ACCENT_FILL_MIN_CONTRAST = 4.5;

/** Яркий конец заливки: accentBright, если на нём читается accentInk, иначе accent. */
export function accentFillBright(t: Pick<GlassTokens, 'accent' | 'accentBright' | 'accentInk'>): string {
  return colorContrast(t.accentInk, t.accentBright) >= ACCENT_FILL_MIN_CONTRAST ? t.accentBright : t.accent;
}

/** Градиент заливки кнопки/плашки под accentInk: [верх, низ]. */
export function accentFillGradient(t: Pick<GlassTokens, 'accent' | 'accentBright' | 'accentInk'>): readonly [string, string] {
  return [accentFillBright(t), t.accent];
}

/**
 * зачем (владелец 13.10, №35 «никакие кнопки чтобы не сливались»): заливка главной кнопки с градиентом. Если ctaFill (токены кнопок) совпал с accent — прежний градиент accentFillGradient;
 * если ctaFill углублён (пастельный accent слился бы с фоном светлой градиентной темы) — сплошная глубокая заливка ctaFill без светлого верха, который снова слился бы с фоном.
 */
export function ctaFillGradient(t: Pick<GlassTokens, 'accent' | 'accentBright' | 'accentInk' | 'ctaFill'>): readonly [string, string] {
  return t.ctaFill.toUpperCase() === t.accent.toUpperCase() ? accentFillGradient(t) : [t.ctaFill, t.ctaFill];
}
