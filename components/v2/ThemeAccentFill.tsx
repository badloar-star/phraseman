import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

type Props = {
  glass: Pick<GlassTokens, 'level' | 'isLight' | 'accentGradient' | 'accentGradientStart' | 'accentGradientEnd'>;
  radius: number;
};

/**
 * Фактура главной кнопки в цвете темы (темы 2.0, макет themes-v2-proposals: камень —
 * огранка, металл — перелив, природа — два оттенка, ночь — пастель). Кладётся первым
 * ребёнком кнопки поверх её сплошной заливки `accent`.
 * зачем: в тёмном «Спокойно» кнопка остаётся ровно прежней — слой не рисуется вовсе.
 */
export const ThemeAccentFill = memo(function ThemeAccentFill({ glass, radius }: Props) {
  if (glass.level === 'calm' && !glass.isLight) return null;
  if (glass.accentGradient.length < 2) return null;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={glass.accentGradient as unknown as readonly [string, string, ...string[]]}
      start={glass.accentGradientStart}
      end={glass.accentGradientEnd}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
});

