import React, { memo, useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, G, LinearGradient, Mask, Pattern, Rect, Stop } from 'react-native-svg';

import type { Lv2Glass } from '../LearningV2Glass';
import { renderLearningV2Shapes } from './LearningV2Glyph';
import { learningV2IconPaint } from './learningV2IconHue';
import { learningV2ChapterPattern } from './learningV2Icons';

// зачем (владелец 17.10: «каждая плашка главы — свой узор, чтобы не все одинаковые, а было интересно»): тонкий узор по теме главы
// под содержимым карточки. Низкий контраст и маска, тающая к тексту (как в макете: 0–36 % прозрачно, 60–70 % полно, к краю 25 %),
// поэтому название и счёт читаются (≥ 4,5:1). Закрытая глава — узор ещё тише и цветом вторичного текста.
// Производительность: один Svg на карточку, Pattern повторяется на GPU, без картинок; memo по (урок, глава, закрыта, цвета) —
// при прокрутке не перерисовывается.

/** Белый маски = «видно»; это не цвет интерфейса. */
const MASK_SHOW = "#FFFFFF"; // theme-exempt: luminance-маска react-native-svg, белый = видимая часть узора

type Props = Readonly<{ lessonOrdinal: number; chapterOrdinal: number; hueShift: number; locked: boolean; g: Lv2Glass }>;

export const LearningV2ChapterPattern = memo(function LearningV2ChapterPattern({ lessonOrdinal, chapterOrdinal, hueShift, locked, g }: Props) {
  const spec = learningV2ChapterPattern(lessonOrdinal, chapterOrdinal);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!spec) return null;
  const paint = learningV2IconPaint(g.accent, !!g.isLight, hueShift);
  const color = locked ? g.secondary : paint.ink;
  const opacity = locked ? (g.isLight ? 0.09 : 0.08) : 0.22;
  const patternId = `lv2pat-${uid}`;
  const fadeId = `lv2fade-${uid}`;
  const maskId = `lv2mask-${uid}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={patternId} patternUnits="userSpaceOnUse" width={spec.w} height={spec.h}>
          <G fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
            {spec.tiles.map((tile) => (
              <G key={`tile-${tile.dx}-${tile.dy}`} transform={`translate(${tile.dx} ${tile.dy}) scale(${tile.scale})`} strokeWidth={tile.strokeWidth}>
                {renderLearningV2Shapes(tile.shapes, `p${tile.dx}`)}
              </G>
            ))}
          </G>
        </Pattern>
        <LinearGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={MASK_SHOW} stopOpacity={0} />
          <Stop offset="0.36" stopColor={MASK_SHOW} stopOpacity={0} />
          <Stop offset="0.6" stopColor={MASK_SHOW} stopOpacity={1} />
          <Stop offset="0.7" stopColor={MASK_SHOW} stopOpacity={1} />
          <Stop offset="1" stopColor={MASK_SHOW} stopOpacity={0.25} />
        </LinearGradient>
        <Mask id={maskId}>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${fadeId})`} />
        </Mask>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} mask={`url(#${maskId})`} opacity={opacity} />
    </Svg>
  );
});
