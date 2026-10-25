import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { KitCtaGloss } from './KitLiquidGlass';
import { colorContrast } from '../../constants/color_contrast';

type Props = {
  glass: Pick<GlassTokens, 'level' | 'isLight' | 'cta' | 'accentGradient' | 'accentGradientStart' | 'accentGradientEnd'>;
  radius: number;
  /** Цвет подписи кнопки. Передан — фактура рисуется, только если подпись на ней читается (≥ 4,5 на каждой точке градиента). */
  ink?: string;
};

const HEX6 = /^#[0-9a-f]{6}/i;

/**
 * зачем (Темы 25.10, окно «Восстановить аккаунт?»): с 17.10 главные кнопки красятся парой ctaFill/ctaFillInk, а фактура
 * поверх них — яркий accentGradient. В 12 из 174 сочетаний (Максимум светлых градиентных тем, Титан тёмный) градиент закрывал
 * ctaFill целиком, и подпись ctaFillInk падала до 1,3–3,0. Не читается — фактуру не кладём, видна сплошная заливка кнопки.
 * Неразбираемая точка (rgba) — прежнее поведение: рисуем.
 */
export function themeAccentGradientFitsInk(stops: readonly string[], ink: string | undefined): boolean {
  if (!ink || !HEX6.test(ink)) return true;
  for (const stop of stops) {
    if (!HEX6.test(stop)) continue;
    if (colorContrast(ink.slice(0, 7), stop.slice(0, 7)) < 4.5) return false;
  }
  return true;
}

/**
 * Фактура главной кнопки в цвете темы (темы 2.0, макет themes-v2-proposals: камень —
 * огранка, металл — перелив, природа — два оттенка, ночь — пастель). Кладётся первым
 * ребёнком кнопки поверх её сплошной заливки `accent`.
 * зачем (сверка learning-v2-010, координатор 05.10, предложение Дизайна): в тёмном «Спокойно» раньше слоя не было
 * вовсе — кнопка плоская, а в макете `.cta` с глянцем (kit.css:197). Теперь здесь глянец макета от `cta` темы —
 * все главные кнопки китов получают его разом. «Акцент», «Максимум» и светлое — прежняя фактура темы.
 */
export const ThemeAccentFill = memo(function ThemeAccentFill({ glass, radius, ink }: Props) {
  const vivid = glass.level === 'accent' || glass.level === 'max';
  if (!vivid && !glass.isLight) return <KitCtaGloss cta={glass.cta} radius={radius} />;
  if (!glass.accentGradient || glass.accentGradient.length < 2) return null;
  if (!themeAccentGradientFitsInk(glass.accentGradient, ink)) return null;
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
