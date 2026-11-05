// зачем (слово владельца 05.11, «96 без свечения»): пелена под приветствием — не чёрная (чёрная Лингман пропадает), а глубокий тёмный тон
// ЦВЕТА ТЕМЫ (в превью rgb(22,16,48) для фиолетовой), непрозрачность 0,96: Главная только угадывается. Тон берём из оттенка акцента темы.
export const WELCOME_DIM_OPACITY = 0.96;
/** Тон по умолчанию — фиолетовый одобренного превью rgb(22,16,48). */
export const WELCOME_DIM_FALLBACK = '#161030';

/** Оттенок (0..360) из #rrggbb; серый/нечитаемый цвет → null. */
export function hueOfHex(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.04) return null;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

/** Глубокий тёмный тон оттенка темы: насыщенность 50 %, светлота 10 % (≈ OKLCH L 0,17). Нет оттенка — фиолетовый по умолчанию. */
export function welcomeDimColor(accentHex: string): string {
  const h = hueOfHex(accentHex);
  return h === null ? WELCOME_DIM_FALLBACK : `hsl(${h}, 50%, 10%)`;
}
