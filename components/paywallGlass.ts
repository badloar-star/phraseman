import type { ThemeMode } from '../constants/theme';

export type PaywallGlassRole = 'card' | 'surface' | 'soft' | 'primary' | 'chrome';

export function withColorAlpha(color: string, alphaHex: string): string {
  const alpha = alphaHex.replace('#', '').slice(0, 2).toUpperCase();
  const trimmed = color.trim();
  if (/^#[\da-fA-F]{6}$/.test(trimmed)) return `${trimmed}${alpha}`;
  if (/^#[\da-fA-F]{8}$/.test(trimmed)) return `${trimmed.slice(0, 7)}${alpha}`;

  const alphaValue = Number((parseInt(alpha, 16) / 255).toFixed(3));
  const rgba = trimmed.match(/^rgba\((.+),\s*[\d.]+\)$/);
  if (rgba) return `rgba(${rgba[1]}, ${alphaValue})`;
  const rgb = trimmed.match(/^rgb\((.+)\)$/);
  if (rgb) return `rgba(${rgb[1]}, ${alphaValue})`;

  return trimmed;
}

export function paywallGlassAlpha(themeMode: ThemeMode, role: PaywallGlassRole): string {
  const isSketch = false;
  switch (role) {
    case 'surface':
      return isSketch ? 'F0' : 'E0';
    case 'soft':
      return isSketch ? 'E2' : 'C8';
    case 'primary':
      return isSketch ? 'EA' : 'D0';
    case 'chrome':
      return isSketch ? 'E6' : 'CC';
    case 'card':
    default:
      return isSketch ? 'EC' : 'D6';
  }
}

export function paywallGlassColor(
  color: string,
  themeMode: ThemeMode,
  role: PaywallGlassRole = 'card',
): string {
  return withColorAlpha(color, paywallGlassAlpha(themeMode, role));
}
