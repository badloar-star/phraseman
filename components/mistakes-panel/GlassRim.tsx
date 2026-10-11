/**
 * Слой «круглая кнопка/плитка» панели «Мои ошибки» — теперь малая тень стиля «Тень» (владелец 12.10: контейнеры БЕЗ обводок).
 *
 * зачем: раньше слой рисовал диагональный блик 150° и кромку (`inset`, 1px кольцо + фаски). Кромка запрещена; блик заменён заливкой самой кнопки.
 * Слой остался (его кладут первым или последним ребёнком в 10 местах) и рисует только внешнюю тень вложенного элемента; он прозрачный
 * и не перехватывает нажатия. Карточки (`plate`) получают тень плашки.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';

export const GlassRim = memo(function GlassRim({ radius = 21, plate = false }: Readonly<{ radius?: number; plate?: boolean }>) {
  const g = useLv2Glass();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: plate ? plateBoxShadow(g) : nestedBoxShadow(g) }]} />;
});
