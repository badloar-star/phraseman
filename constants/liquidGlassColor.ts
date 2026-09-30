// зачем: общие цветовые помощники тем 2.0. Вынесены из liquidGlassThemePalette.ts,
// чтобы уровни цвета и светлое оформление (liquidGlassThemeVariants.ts) считали
// оттенки ТОЙ ЖЕ формулой OKLCH, что и одобренные тонкие темы, без циклического импорта.

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const byte = (value: number) => Math.round(clamp(value) * 255).toString(16).padStart(2, '0').toUpperCase();

/** Same bounded OKLCH→sRGB conversion as the approved HTML tint registry. */
export function oklchToHex(lightness: number, chroma: number, hue: number): string {
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

/** `#RRGGBB` + opacity → `#RRGGBBAA`. */
export const alpha = (hex: string, opacity: number) => `${hex}${byte(opacity)}`;

/** OKLCH with opacity, as the mockup's `oklch(L C H / A)`. */
export const oklchA = (lightness: number, chroma: number, hue: number, opacity: number) =>
  alpha(oklchToHex(lightness, chroma, hue), opacity);
