/**
 * Стеклянная кромка круглых кнопок «Мои ошибки» — слой `.rb::after` макета (kit.css «--lg-sheen» + «--lg-rim») плюс кромка `border: 1px var(--line)`.
 *
 * зачем (сверка mistakes-panel-007/-002, «круглые кнопки без стекла»): у «‹», «⋯», «🔍» и ✕ в макете переливающийся блик 150° и светлая/тёмная кромка,
 * а у нас были сплошные тёмные круги. Слой кладётся ПОВЕРХ заливки и не перехватывает нажатия; тексты и значки не перекрывает.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinearGradient } from '../SafeLinearGradient';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import { DIAG_150 } from './panelPaint';

const SHEEN_AT = [0, 0.26, 0.52, 0.78, 1] as const;

export const GlassRim = memo(function GlassRim({ radius = 21 }: Readonly<{ radius?: number }>) {
  // зачем (замечание владельца 10.10): блик и кромка — токены выбранной темы (mediaInk/bevelHi/bevelLo/hairlineSoft), а не литералы под «Аврору».
  const g = useLv2Glass();
  const sheen = [`${g.mediaInk}1A`, `${g.mediaInk}09`, `${g.mediaInk}00`, `${g.mediaInk}05`, `${g.mediaInk}0E`] as const;
  const rim = [
    { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: g.bevelHi },
    { inset: true, offsetX: -1, offsetY: -1.5, blurRadius: 0, spreadDistance: -0.2, color: g.bevelLo },
    { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: g.hairlineSoft },
  ] as const;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient colors={sheen} locations={SHEEN_AT} start={DIAG_150.start} end={DIAG_150.end} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: rim }]} />
    </View>
  );
});
