const SAGE_CARD = '#FCFDF9';
const SAGE_SURFACE = '#E1E5DC';
const SAGE_SURFACE_DEEP = '#D1D9D1';

/** Convert a hex theme color to rgba while preserving non-hex colors. */
function alpha(color: string, a: number): string {
  const c = String(color).trim();
  if (c[0] !== '#') return c;
  let hex = c.slice(1);
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  if (hex.length !== 6) return c;
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return c;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Theme-aware glass fill for inline surfaces.
 *
 * Sage Porcelain semantic surfaces must stay opaque: translucent dark-theme
 * glass collapses its approved surface ladder and makes containers disappear.
 * Other themes and accent/status colors retain the original alpha behavior.
 */
export function glassFill(color: string, a: number): string {
  if (color === SAGE_CARD) return SAGE_SURFACE;
  if (color === SAGE_SURFACE || color === SAGE_SURFACE_DEEP) return color;
  return alpha(color, a);
}
