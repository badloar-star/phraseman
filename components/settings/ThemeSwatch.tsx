import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { oklchToHex } from '../../constants/liquidGlassColor';
import { LIQUID_GLASS_VIVID } from '../../constants/liquidGlassThemeVariants';

type Stops = ReadonlyArray<readonly [number, string]>;
type Spec = Readonly<{ kind: 'linear'; stops: Stops } | { kind: 'radial'; cx: string; cy: string; stops: Stops }>;

/**
 * Кружок темы на экране «Темы» — формулы `swatch()` / `calmSwatch()` из макета
 * themes-v2-proposals.js. зачем (владелец 30.09): в «Спокойно» кружки приглушённые,
 * но узнаваемые (иначе 13 тем не различить); в «Акценте/Максимуме» — фактура семейства.
 */
export function themeSwatchSpec(id: string, vivid: boolean): Spec {
  const v = LIQUID_GLASS_VIVID[id] ?? LIQUID_GLASS_VIVID.graphite!;
  const { fam, h, h2, c } = v;
  const ok = (l: number, ch: number, hue = h) => oklchToHex(l, ch, hue);
  if (!vivid) return { kind: 'radial', cx: '35%', cy: '30%', stops: [[0, ok(0.84, c * 0.45 + 0.01)], [1, ok(0.62, c * 0.6 + 0.01)]] };
  if (fam === 'nature') return { kind: 'linear', stops: [[0, ok(0.80, c)], [1, ok(0.79, c, h2)]] };
  if (fam === 'metal') {
    return { kind: 'linear', stops: [[0, ok(0.93, c * 0.55)], [0.45, ok(0.74, c)], [0.7, ok(0.90, c * 0.6, h2)], [1, ok(0.70, c)]] };
  }
  if (fam === 'night') return { kind: 'radial', cx: '35%', cy: '30%', stops: [[0, ok(0.90, c * 0.6)], [0.7, ok(0.72, c)], [1, ok(0.72, c)]] };
  return { kind: 'radial', cx: '35%', cy: '28%', stops: [[0, ok(0.90, c * 0.7)], [0.62, ok(0.66, c)], [1, ok(0.45, c)]] };
}

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

