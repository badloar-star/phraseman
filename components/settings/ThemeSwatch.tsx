import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { themeSwatchSpec } from '../../constants/liquidGlassThemeSwatch';

type Props = { id: string; vivid: boolean; size?: number };

export const ThemeSwatch = memo(function ThemeSwatch({ id, vivid, size = 32 }: Props) {
  const spec = themeSwatchSpec(id, vivid);
  // id градиента уникален на кружок: у SVG общее пространство имён id.
  const gid = `theme-swatch-${id}-${vivid ? 'v' : 'c'}`;
  const r = size / 2;
  const stops = spec.stops.map(([offset, color]) => <Stop key={offset} offset={String(offset)} stopColor={color} stopOpacity={1} />);
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg width={size} height={size}>
        <Defs>
          {spec.kind === 'linear'
            ? <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">{stops}</LinearGradient>
            : <RadialGradient id={gid} cx={spec.cx} cy={spec.cy} r="96%" fx={spec.cx} fy={spec.cy}>{stops}</RadialGradient>}
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${gid})`} />
        {/* макет: тонкая светлая кромка кружка (.12–.35) */}
        <Circle cx={r} cy={r} r={r - 0.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.14} strokeWidth={1} />
      </Svg>
    </View>
  );
});

