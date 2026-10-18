import { colorContrast } from './color_contrast';

const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-fA-F]{6})/u.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb: readonly number[]): string => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Сдвигает цвет к чёрному/белому шагами по 4 %, пока не набрался контраст; null — не дотянуть. */
function shiftUntil(color: [number, number, number], fill: string, target: 0 | 255, min: number): string | null {
  let cur: [number, number, number] = [...color];
  for (let step = 0; step < 25; step += 1) {
    const hex = rgbToHex(cur);
    if (colorContrast(hex, fill) >= min) return hex;
    cur = [cur[0] + (target - cur[0]) * 0.04, cur[1] + (target - cur[1]) * 0.04, cur[2] + (target - cur[2]) * 0.04];
  }
  return null;
}

/**
 * Цвет молнии «низкий заряд» на капсуле энергии в стеклянной шапке.
 *
 * зачем ([BLEND-AUDIT] 18.10, координатор: «знак должен остаться тревожным, на text не заменяй»): красный `bad` на заливке капсулы buttonFill
 * давал 1,65–2,05:1. Берём оттенок красного ИЗ ТОКЕНА ТЕМЫ и сдвигаем его в ту сторону (темнее или светлее), где ≥ 3:1 достигается меньшим
 * сдвигом — раньше сдвиг шёл только по яркости фона и на средней заливке светлых градиентных тем уходил не туда. Основной текст — лишь
 * последний запасной путь, если красным не дотянуть (на практике не срабатывает).
 */
export function lowChargeInk(bad: string, fill: string, text: string): string {
  if (colorContrast(bad, fill) >= 3) return bad;
  const rgb = hexToRgb(bad);
  if (!rgb) return text;
  const darker = shiftUntil(rgb, fill, 0, 3);
  const lighter = shiftUntil(rgb, fill, 255, 3);
  if (darker && lighter) {
    const dist = (hex: string): number => { const c = hexToRgb(hex)!; return Math.abs(c[0] - rgb[0]) + Math.abs(c[1] - rgb[1]) + Math.abs(c[2] - rgb[2]); };
    return dist(darker) <= dist(lighter) ? darker : lighter;
  }
  return darker ?? lighter ?? text;
}
