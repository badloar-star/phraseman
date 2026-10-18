/**
 * Лицо плитки галереи: градиент цвета темы, блик, свечение в углу и кромка — один слой SVG на плитку.
 *
 * зачем (владелец 18.10: «красивые с градиентом»; эталон cards-gallery.html `.face`): весь фон плитки (диагональный градиент 145°, блик 150°, свечение справа сверху)
 * рисуется ОДНИМ Svg на плитку, а не тремя слоями, — на мелких шагах в окне до ~130 плиток, каждая лишняя нативная вьюха заметна. Система координат Svg — пиксели
 * плитки ЦЕЛЕВОГО шага (viewBox = w × h, градиенты userSpaceOnUse): так диагональ градиента и круг свечения в точности как у CSS (угол и пропорции считает cssGradientPoints),
 * а на время перетекания между шагами слой просто тянется вместе с плиткой (preserveAspectRatio «none»). Свечение — круг диаметром 80 % ширины в правом верхнем углу
 * (макет `.face::after`: right −30 %, top −40 %, opacity .55). Кромки-обводки и фаски нет (закон «Тень» владельца 12.10).
 * Размытие под стеклом (backdrop-filter макета) не рисуем: фон под плиткой уже градиентный.
 */
import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { cssGradientPoints } from './cardsGalleryLayout';
import { galleryFaceColors } from './galleryFaceColors';

type Props = Readonly<{ g: GlassTokens; w: number; h: number }>;

const GLOSS = '#FFFFFF'; // theme-exempt: блик по кромке — белый с прозрачностью, как в макете (.face::before), не цвет темы

function GalleryTileFaceImpl({ g, w: wIn, h: hIn }: Props) {
  const c = galleryFaceColors(g);
  const w = Math.max(1, Math.round(wIn * 10) / 10);
  const h = Math.max(1, Math.round(hIn * 10) / 10);
  const geo = useMemo(() => {
    const base = cssGradientPoints(145, w, h);
    const gloss = cssGradientPoints(150, w, h);
    const r = 0.4 * w; // диаметр 80 % ширины
    return { base, gloss, glow: { cx: w * 0.9, cy: -0.4 * h + r, r } };
  }, [h, w]);
  return (
    <>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="gb" gradientUnits="userSpaceOnUse" x1={geo.base.start.x * w} y1={geo.base.start.y * h} x2={geo.base.end.x * w} y2={geo.base.end.y * h}>
            <Stop offset="0" stopColor={c.c1} />
            <Stop offset="0.56" stopColor={c.c2} />
            <Stop offset="1" stopColor={c.c3} />
          </LinearGradient>
          <LinearGradient id="gs" gradientUnits="userSpaceOnUse" x1={geo.gloss.start.x * w} y1={geo.gloss.start.y * h} x2={geo.gloss.end.x * w} y2={geo.gloss.end.y * h}>
            <Stop offset="0" stopColor={GLOSS} stopOpacity="0.16" />
            <Stop offset="0.28" stopColor={GLOSS} stopOpacity="0.04" />
            <Stop offset="0.54" stopColor={GLOSS} stopOpacity="0" />
            <Stop offset="1" stopColor={GLOSS} stopOpacity="0.05" />
          </LinearGradient>
          <RadialGradient id="gr" gradientUnits="userSpaceOnUse" cx={geo.glow.cx} cy={geo.glow.cy} r={geo.glow.r}>
            <Stop offset="0" stopColor={c.glow} stopOpacity="0.385" />
            <Stop offset="1" stopColor={c.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#gb)" />
        <Circle cx={geo.glow.cx} cy={geo.glow.cy} r={geo.glow.r} fill="url(#gr)" />
        <Rect x="0" y="0" width={w} height={h} fill="url(#gs)" />
      </Svg>
    </>
  );
}

export const GalleryTileFace = memo(GalleryTileFaceImpl);
