import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { KitCtaGloss } from './KitLiquidGlass';

type Props = {
  glass: Pick<GlassTokens, 'level' | 'isLight' | 'cta' | 'accentGradient' | 'accentGradientStart' | 'accentGradientEnd'>;
  radius: number;
};

/**
 * Фактура главной кнопки в цвете темы (темы 2.0, макет themes-v2-proposals: камень —
 * огранка, металл — перелив, природа — два оттенка, ночь — пастель). Кладётся первым
 * ребёнком кнопки поверх её сплошной заливки `accent`.
 * зачем (сверка learning-v2-010, координатор 05.10, предложение Дизайна): в тёмном «Спокойно» раньше слоя не было
 * вовсе — кнопка плоская, а в макете `.cta` с глянцем (kit.css:197). Теперь здесь глянец макета от `cta` темы —
 * все главные кнопки китов получают его разом. «Акцент», «Максимум» и светлое — прежняя фактура темы.
 */
export const ThemeAccentFill = memo(function ThemeAccentFill({ glass, radius }: Props) {
  const vivid = glass.level === 'accent' || glass.level === 'max';
  if (!vivid && !glass.isLight) return <KitCtaGloss cta={glass.cta} radius={radius} />;
  if (!glass.accentGradient || glass.accentGradient.length < 2) return null;
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
