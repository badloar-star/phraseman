// StreakGlowSpot.tsx — ореол за огнём рубежа (образец streak-milestones.html: `.glowspot`, радиальное свечение цвета стадии за огнём).
// зачем (гейт паритета, круг 1, 14.10): «огонь с зелёным ореолом, без тёмного круга»: мягкое радиальное пятно цвета огня, от 55 % в центре до нуля; рисуется под содержимым, не принимает касания.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type StreakGlowSpotProps = Readonly<{ color: string; size?: number; top?: number }>;

function StreakGlowSpot({ color, size = 460, top = 60 }: StreakGlowSpotProps) {
  return (
    <View pointerEvents="none" accessible={false} style={[s.wrap, { top, width: size, height: size, marginLeft: -size / 2 }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="streakGlow" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#streakGlow)" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({ wrap: { position: 'absolute', left: '50%' } });

export default memo(StreakGlowSpot);
