/**
 * Стеклянная кромка круглых кнопок «Мои ошибки» — слой `.rb::after` макета (kit.css «--lg-sheen» + «--lg-rim») плюс кромка `border: 1px var(--line)`.
 *
 * зачем (сверка mistakes-panel-007/-002, «круглые кнопки без стекла»): у «‹», «⋯», «🔍» и ✕ в макете переливающийся блик 150° и светлая/тёмная кромка,
 * а у нас были сплошные тёмные круги. Слой кладётся ПОВЕРХ заливки и не перехватывает нажатия; тексты и значки не перекрывает.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinearGradient } from '../SafeLinearGradient';
import { DIAG_150 } from './panelPaint';

const SHEEN = ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.055)'] as const;
const SHEEN_AT = [0, 0.26, 0.52, 0.78, 1] as const;
const RIM = [
  { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(255,255,255,0.22)' },
  { inset: true, offsetX: -1, offsetY: -1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(0,0,0,0.45)' },
  { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'rgba(255,255,255,0.09)' },
] as const;

export const GlassRim = memo(function GlassRim({ radius = 21 }: Readonly<{ radius?: number }>) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient colors={SHEEN} locations={SHEEN_AT} start={DIAG_150.start} end={DIAG_150.end} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: RIM }]} />
    </View>
  );
});
