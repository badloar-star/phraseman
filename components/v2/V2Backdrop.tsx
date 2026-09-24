import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useV2Palette } from './useV2Palette';

/**
 * Фон экранов 2.0: графит + несколько мягких размытых пятен света (владелец
 * 24.09: «добавить вот такую прозрачность»). Пятна видны сквозь стеклянные
 * карточки — это и даёт глубину без картинок-ассетов.
 * Один статичный SVG на экран: без анимаций и без перерисовки при скролле.
 */
function V2Backdrop() {
  const p = useV2Palette();
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: p.bg }]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="v2glowTop" cx="18%" cy="8%" r="55%">
            <Stop offset="0" stopColor={p.glowA} stopOpacity={0.3} />
            <Stop offset="1" stopColor={p.glowA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="v2glowMid" cx="88%" cy="46%" r="45%">
            <Stop offset="0" stopColor={p.glowB} stopOpacity={0.22} />
            <Stop offset="1" stopColor={p.glowB} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="v2glowLow" cx="30%" cy="86%" r="50%">
            <Stop offset="0" stopColor={p.glowA} stopOpacity={0.2} />
            <Stop offset="1" stopColor={p.glowA} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#v2glowTop)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#v2glowMid)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#v2glowLow)" />
      </Svg>
    </View>
  );
}

export default memo(V2Backdrop);
