import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Lv2Glass } from '../LearningV2Glass';
import { nestedBoxShadow } from '../../v2/ShadowSurface';
import { LearningV2Glyph } from './LearningV2Glyph';
import type { LearningV2IconShape } from './learningV2IconData.generated';
import { learningV2IconPaint } from './learningV2IconHue';

// зачем (владелец 17.10, макет learning-v2-icons.html): плитка урока/главы — иконка по смыслу на плитке своего оттенка.
// Состояния главы: открыта — полным цветом; пройдена — галочка в углу; закрыта — плитка нейтральная, иконка приглушена, замок в углу.
// Плитка как в коде карты: 55×55, радиус 16; маленькая (шапка урока) — 44, радиус 14. Без обводки (стиль «Тень»), значок угла — на плашке с тенью.

export type LearningV2TileState = 'open' | 'done' | 'locked';

type Props = Readonly<{
  shapes: readonly LearningV2IconShape[];
  hueShift: number;
  state: LearningV2TileState;
  g: Lv2Glass;
  size?: 'regular' | 'small';
  testID?: string;
}>;

export const LearningV2ChapterTile = memo(function LearningV2ChapterTile({ shapes, hueShift, state, g, size = 'regular', testID }: Props) {
  const paint = learningV2IconPaint(g.accent, !!g.isLight, hueShift);
  const locked = state === 'locked';
  const small = size === 'small';
  return (
    <View testID={testID} style={[small ? styles.small : styles.regular, { backgroundColor: locked ? g.opaqueControl : paint.tile }]}>
      <LearningV2Glyph shapes={shapes} size={small ? 24 : 26} color={locked ? g.secondary : paint.ink} opacity={locked ? 0.55 : 1} />
      {state !== 'open' ? (
        <View style={[styles.badge, { backgroundColor: g.plateFillFrom, boxShadow: nestedBoxShadow(g) }]} pointerEvents="none">
          <Ionicons name={locked ? 'lock-closed' : 'checkmark'} size={locked ? 11 : 13} color={locked ? g.secondary : paint.ink} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  regular: { width: 55, height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  small: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
