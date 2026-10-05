/**
 * Ступень тона поверх поверхности: цвет ТЕКСТА темы с малой альфой.
 *
 * зачем (координатор 05.10: «ступени тона — токены темы или хардкод hex? светлые и цветные темы не должны сломаться»): у карточки, строки и плитки макета
 * (#161618 → #1D1D1F → #28282A) в каждой теме свои значения; в тёмных темах текст светлый — ступень светлеет, в светлой теме текст тёмный —
 * ступень темнеет, в цветных — подмешивается их тон. Белый rgba хардкодом в светлой теме был бы невидим.
 * Не-hex цвет → безопасный запасной вариант (нейтральная светлая вуаль), а не сам цвет текста с полной непрозрачностью.
 */
export function glassTone(textColor: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (textColor[0] !== '#') return `rgba(255,255,255,${a})`;
  let hex = textColor.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return `rgba(255,255,255,${a})`;
  return `rgba(${r},${g},${b},${a})`;
}
