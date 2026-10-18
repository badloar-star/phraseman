import { colorContrast } from './color_contrast';

const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-fA-F]{6})/u.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb: readonly number[]): string => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Худший контраст цвета ко всем поверхностям (градиент экрана — это несколько точек фона). */
const worstOn = (hex: string, fills: readonly string[]): number => Math.min(...fills.map((fill) => colorContrast(hex, fill)));

/** Сдвигает цвет к чёрному/белому шагами по 4 %, пока не набрался контраст ко ВСЕМ поверхностям; null — не дотянуть. */
function shiftUntil(color: [number, number, number], fills: readonly string[], target: 0 | 255, min: number): string | null {
  let cur: [number, number, number] = [...color];
  for (let step = 0; step < 25; step += 1) {
    const hex = rgbToHex(cur);
    if (worstOn(hex, fills) >= min) return hex;
    cur = [cur[0] + (target - cur[0]) * 0.04, cur[1] + (target - cur[1]) * 0.04, cur[2] + (target - cur[2]) * 0.04];
  }
  return null;
}

/**
 * Смысловой цвет энергии («мало», «перезаряд», красная цифра), доведённый до порога к поверхности.
 *
 * зачем ([BLEND-AUDIT] 18.10, координатор: «знак должен остаться тревожным, на text не заменяй»): красный `bad` на заливке капсулы buttonFill
 * давал 1,65–2,05:1. Берём оттенок ИЗ ТОКЕНА ТЕМЫ и сдвигаем его в ту сторону (темнее или светлее), где порог достигается меньшим
 * сдвигом — раньше сдвиг шёл только по яркости фона и на средней заливке светлых градиентных тем уходил не туда. Основной текст — лишь
 * последний запасной путь, если цветом не дотянуть (на практике не срабатывает).
 *
 * зачем (владелец 18.10, энергия без подложки): капсулы больше нет — цвет лежит прямо на фоне экрана. Фон бывает градиентом, поэтому
 * `fill` может быть списком поверхностей (bg, bgTop, bgBottom): порог держится к худшей. `min` — 3 для значка, 4,5 для цифры.
 */
export function lowChargeInk(bad: string, fill: string | readonly string[], text: string, min = 3): string {
  // зачем: неполная тема (подмена в тестах, старый снимок) не должна ронять шапку — пустой цвет или поверхность пропускаем.
  const fills = (typeof fill === 'string' ? [fill] : fill).filter((f): f is string => typeof f === 'string' && f.length > 0);
  if (typeof bad !== 'string' || bad.length === 0) return text;
  if (fills.length === 0 || worstOn(bad, fills) >= min) return bad;
  const rgb = hexToRgb(bad);
  if (!rgb) return text;
  const darker = shiftUntil(rgb, fills, 0, min);
  const lighter = shiftUntil(rgb, fills, 255, min);
  if (darker && lighter) {
    const dist = (hex: string): number => { const c = hexToRgb(hex)!; return Math.abs(c[0] - rgb[0]) + Math.abs(c[1] - rgb[1]) + Math.abs(c[2] - rgb[2]); };
    return dist(darker) <= dist(lighter) ? darker : lighter;
  }
  return darker ?? lighter ?? text;
}
