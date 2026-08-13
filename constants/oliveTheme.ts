import type { ViewStyle } from 'react-native';

/**
 * Olive Noir is deliberately matte: olive creates depth, champagne is reserved
 * for decisions and reward states, and surfaces are separated by tone/shadow —
 * never by a closed outline.
 */
export const OLIVE_RICH = {
  piano: '#050604',
  panel: '#0D0F0B',
  surface: '#14180F',
  raised: '#1C2217',
  ivory: '#F4ECD8',
  champagne: '#C9A84C',
  champagneLight: '#E3CC88',
} as const;

export const OLIVE_GRADIENTS = {
  screen: ['#1A1E12', '#0B0D08', '#030303'] as const,
  quietPanel: ['#181B12', '#0D0F0B', '#080907'] as const,
  raisedPanel: ['#24281A', '#11140D', '#090A08'] as const,
  selectedPanel: ['#2A2818', '#14130C', '#0A0A08'] as const,
  primaryButton: ['#F0DEA5', '#C9A84C', '#9C7A29'] as const,
} as const;

export function oliveShadow(level: 1 | 2 | 3 = 2): ViewStyle {
  const values = {
    1: { y: 2, opacity: 0.24, radius: 6, elevation: 3 },
    2: { y: 5, opacity: 0.34, radius: 10, elevation: 6 },
    3: { y: 8, opacity: 0.44, radius: 16, elevation: 9 },
  } as const;
  const value = values[level];
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: value.y },
    shadowOpacity: value.opacity,
    shadowRadius: value.radius,
    elevation: value.elevation,
  };
}
