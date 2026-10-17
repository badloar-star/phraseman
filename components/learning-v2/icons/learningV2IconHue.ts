// learningV2IconHue.ts — оттенки иконок и узоров карты V2 из акцента текущей темы.
//
// зачем (владелец 17.10, макет docs/design/v2-app/learning-v2-icons.html): «у каждой главы свой оттенок акцента в пределах палитры темы».
// Тон берём из accent темы и сдвигаем по номеру главы/урока (те же сдвиги, что в макете), светлоту и насыщенность — по светлой/тёмной
// теме: иконка читается на карточке (светлая L .52, тёмная L .82), плитка — мягкий тон. Чистая математика OKLCH↔sRGB, без зависимостей;
// результат кэшируется по (акцент, светлота, номер), чтобы прокрутка карты ничего не пересчитывала.

export type LearningV2IconPaint = Readonly<{ ink: string; tile: string }>;

/** Сдвиг тона главы 1…7 от акцента темы (макет: 282 → 306, 256, 328, 236, 300, 266). */
export const LEARNING_V2_CHAPTER_HUE_SHIFT: readonly number[] = [0, 24, -26, 46, -46, 18, -16];
/** Сдвиг тона урока 1…8 от акцента темы (макет LHUE). */
export const LEARNING_V2_LESSON_HUE_SHIFT: readonly number[] = [0, -26, 24, -46, 46, -16, 18, -34];

const cache = new Map<string, LearningV2IconPaint>();

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** #RRGGBB → [L, C, h°]; не-hex → null. */
export function hexToOklch(hex: string): readonly [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})/u.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = srgbToLinear(((n >> 16) & 255) / 255);
  const g = srgbToLinear(((n >> 8) & 255) / 255);
  const b = srgbToLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, C, (h + 360) % 360];
}

function oklchToRgb(L: number, C: number, h: number): readonly [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH → #RRGGBB; вне охвата sRGB насыщенность снижается, пока цвет не влезет (тон и светлота сохраняются). */
export function oklchToHex(L: number, C: number, h: number): string {
  let c = C;
  let rgb = oklchToRgb(L, c, h);
  for (let i = 0; i < 24 && rgb.some((v) => v < -0.0005 || v > 1.0005); i += 1) {
    c *= 0.9;
    rgb = oklchToRgb(L, c, h);
  }
  return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(1, linearToSrgb(Math.max(0, v)))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Краска иконки и плитки: тон акцента темы + сдвиг; светлая тема — ink L .52 C .14, плитка L .93 C .045;
 * тёмная — ink L .82 C .11, плитка L .33 C .06 (числа макета). У нейтральной темы (акцент почти серый) насыщенность урезана,
 * чтобы цвета не спорили с монохромом.
 */
export function learningV2IconPaint(accentHex: string, isLight: boolean, hueShift: number): LearningV2IconPaint {
  const key = `${accentHex}|${isLight ? 1 : 0}|${hueShift}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = hexToOklch(accentHex);
  const baseHue = base ? base[2] : 270;
  const neutral = !base || base[1] < 0.03;
  const k = neutral ? 0.35 : 1;
  const h = (baseHue + hueShift + 360) % 360;
  const paint: LearningV2IconPaint = isLight
    ? { ink: oklchToHex(0.52, 0.14 * k, h), tile: oklchToHex(0.93, 0.045 * k, h) }
    : { ink: oklchToHex(0.82, 0.11 * k, h), tile: oklchToHex(0.33, 0.06 * k, h) };
  cache.set(key, paint);
  return paint;
}
