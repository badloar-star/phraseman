// moment_glow_math.ts — чистая геометрия и яркость эталонного `.glowspot` (без React Native: считается в тестах). Причины значений — шапка moment_glow.tsx.
export const MOMENT_GLOW_LOG = '[MOMENT-GLOW]';

/** Круг эталона, px. */
export const MOMENT_GLOW_SIZE = 320;
/** farthest-corner круга 320 в единицах viewBox 0..100: половина диагонали квадрата. */
export const MOMENT_GLOW_RADIUS = 50 * Math.SQRT2;
/** Где градиент доходит до нуля (доля радиуса), как `transparent 65%`. */
export const MOMENT_GLOW_FADE_AT = 0.65;
/** Среднее по времени пульса emGlow (0,55 ↔ 1, ease-in-out). */
export const MOMENT_GLOW_PULSE_MEAN = 0.78;
/** Альфа `--acc-soft` эталона. */
export const MOMENT_GLOW_REF_ALPHA = Object.freeze({ dark: 0.24, light: 0.3 });

/** Альфа цвета: hex из 6/8 знаков или функциональная запись rgb/rgba; непонятный формат — null (тогда цвет берём как есть). */
export function colorAlpha(color: string | undefined): number | null {
  if (typeof color !== 'string') return null; // зачем: цвет темы может не прийти (заглушки, старая тема) — не роняем момент
  const c = color.trim();
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
  if (hex) return hex[2] ? parseInt(hex[2], 16) / 255 : 1;
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (rgb) {
    const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean);
    if (parts.length === 3) return 1;
    const a = parts[3]!.endsWith('%') ? parseFloat(parts[3]!) / 100 : parseFloat(parts[3]!);
    return Number.isFinite(a) ? a : null;
  }
  return null;
}

/** Непрозрачность центра поверх альфы самого цвета: итог в центре = альфа эталона × среднее пульса. */
export function momentGlowCenterOpacity(color: string, isLight: boolean): number {
  const own = colorAlpha(color);
  const target = (isLight ? MOMENT_GLOW_REF_ALPHA.light : MOMENT_GLOW_REF_ALPHA.dark) * MOMENT_GLOW_PULSE_MEAN;
  if (own === null || own <= 0) return MOMENT_GLOW_PULSE_MEAN;
  return Math.min(1, target / own);
}
