// зачем: приказ владельца 11.10 19:2x — плашки Главной имеют фон с альфой 0.5 (альфа ЦВЕТА фона, а не opacity всего элемента: текст и значки остаются 100 %).
// Помощник лежит в components/v2, потому что его нужен и значку-плитке V2IconTile, и модулю Главной (components/home/v2/homePlate.ts).

/** Любой цвет (#RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba()) → rgba(...) с заданной АБСОЛЮТНОЙ альфой. Неразборчивый цвет возвращается как есть (+ предупреждение). */
export function colorWithAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const text = color.trim();
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(text);
  if (fn) return `rgba(${Math.round(Number(fn[1]))},${Math.round(Number(fn[2]))},${Math.round(Number(fn[3]))},${a})`;
  let hex = text.startsWith('#') ? text.slice(1) : '';
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  if (hex.length === 6 || hex.length === 8) {
    const n = Number.parseInt(hex.slice(0, 6), 16);
    if (Number.isFinite(n)) return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  console.warn(`[HOME-PLATE] colorWithAlpha: не разобрал цвет «${color}» — оставляю как есть`);
  return color;
}
