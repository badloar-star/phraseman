// ═══════════════════════════════════════════════════════════════════════════
// AuroraTileFrost.tsx — заливка плитки Главной в материале «Аврора»: матовое стекло БЕЗ настоящего размытия.
//
// зачем (владелец 11.11: «плитки полупрозрачные с ненастоящим блюром», «блюр сильнее, чтобы не было видно границу фона и сцены под ними»;
// макет aurora_rassvet.html утверждён «1 в 1»): вместо дорогого размытия того, что под плиткой, внутри неё рисуется уже «размытая копия» —
// один плавный переход от цвета низа сцены к тону плашки (96 % плотности, поэтому край сцены под плиткой не читается) и два мягких пятна света.
// Один статичный слой: без шейдера размытия, без анимаций и без работы после первого кадра. Касаний не ловит.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { AuroraMaterial } from '../../../constants/aurora_material';
import { LinearGradient } from '../../SafeLinearGradient';

type Props = Readonly<{ material: AuroraMaterial; radius: number; /** Уникальная приставка идентификаторов градиентов (плиток в ряду несколько). */ idPrefix: string }>;

function AuroraTileFrost({ material: m, radius, idPrefix }: Props) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      {/* макет: linear-gradient(180deg, верх 0 %, середина 46 %, низ 100 %) */}
      <LinearGradient colors={[m.frostTop, m.frostMid, m.frostBottom]} locations={[0, 0.46, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* макет: два пятна света — 120 % × 90 % у (10 %, −20 %) и у (105 %, 120 %), гаснут к 72 % радиуса */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`${idPrefix}FrostA`} cx="10%" cy="-20%" rx="120%" ry="90%" fx="10%" fy="-20%">
            <Stop offset="0" stopColor={m.frostGlow1} />
            <Stop offset="0.72" stopColor={m.frostGlow1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${idPrefix}FrostB`} cx="105%" cy="120%" rx="120%" ry="90%" fx="105%" fy="120%">
            <Stop offset="0" stopColor={m.frostGlow2} />
            <Stop offset="0.72" stopColor={m.frostGlow2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${idPrefix}FrostA)`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${idPrefix}FrostB)`} />
      </Svg>
    </View>
  );
}

export default memo(AuroraTileFrost);
