// ─── Церемония «Монетный двор» · статичная графика сцены ─────────────────────
// зачем (PM-077): всё, что в эталоне variant-b.html было CSS-градиентами, здесь —
// неподвижные SVG/градиенты. Двигаются только обёртки в LevelUpMintCeremony
// (opacity/transform на UI-потоке), сами картинки не перерисовываются ни разу.
// Размытие (blur) из HTML на телефоне дорогое — мягкость конуса собрана из трёх
// вложенных полупрозрачных слоёв вместо фильтра.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinear, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from '../SafeLinearGradient';

export const MINT_BG = '#050507'; // theme-exempt: иллюстрация сцены монетного двора
const WARM = 'rgb(255,196,140)'; // theme-exempt: иллюстрация сцены монетного двора
const WARM_GLOW = 'rgb(255,190,120)'; // theme-exempt: иллюстрация сцены монетного двора

type BackdropProps = Readonly<{ width: number; height: number; horizonY: number; coinSize: number }>;

/** Фон, конус тёплого света пресса, каменный пол и тёмная щель. */
export const MintBackdrop = memo(function MintBackdrop({ width: W, height: H, horizonY, coinSize }: BackdropProps) {
  const slitW = coinSize * 1.136;
  // Три вложенных конуса: узкий яркий внутри, широкий тусклый снаружи — край растворяется.
  const cones = [
    { top: 0.24, bottom: 1.0, alpha: 0.05 },
    { top: 0.17, bottom: 0.78, alpha: 0.05 },
    { top: 0.1, bottom: 0.56, alpha: 0.055 },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinear id="mintCone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={WARM} stopOpacity={1} />
            <Stop offset="0.5" stopColor={WARM} stopOpacity={0.4} />
            <Stop offset="1" stopColor={WARM} stopOpacity={0} />
          </SvgLinear>
          <RadialGradient id="mintTopGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="rgb(255,210,160)" stopOpacity={0.07} />{/* theme-exempt: иллюстрация сцены монетного двора */}
            <Stop offset="0.6" stopColor="rgb(255,210,160)" stopOpacity={0} />{/* theme-exempt: иллюстрация сцены монетного двора */}
          </RadialGradient>
          <RadialGradient id="mintFloorGlow" cx="50%" cy="0%" r="60%">
            <Stop offset="0" stopColor={WARM_GLOW} stopOpacity={0.16} />
            <Stop offset="0.45" stopColor={WARM_GLOW} stopOpacity={0.04} />
            <Stop offset="1" stopColor={WARM_GLOW} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={MINT_BG} />
        <Ellipse cx={W / 2} cy={H * 0.1} rx={W * 0.67} ry={W * 0.67} fill="url(#mintTopGlow)" />
        {cones.map((c) => (
          <Polygon
            key={c.top}
            points={`${W * (0.5 - c.top / 2)},${-H * 0.05} ${W * (0.5 + c.top / 2)},${-H * 0.05} ${W * (0.5 + c.bottom / 2)},${horizonY} ${W * (0.5 - c.bottom / 2)},${horizonY}`}
            fill="url(#mintCone)"
            opacity={c.alpha * 1.15}
          />
        ))}
      </Svg>
      {/* пол: тёмный камень уходит в черноту */}
      <LinearGradient
        colors={['#0e0d10', '#08080a', MINT_BG]} // theme-exempt: иллюстрация сцены монетного двора
        locations={[0, 0.5, 1]}
        style={[styles.floor, { top: horizonY, height: H - horizonY }]}
      />
      <Svg width={W} height={H - horizonY} style={[styles.floor, { top: horizonY }]}>
        <Rect x={0} y={0} width={W} height={H - horizonY} fill="url(#mintFloorGlow)" />
      </Svg>
      {/* тонкая линия горизонта: пол читается как плоскость */}
      <LinearGradient
        colors={['rgba(255,220,180,0)', 'rgba(255,220,180,0.10)', 'rgba(255,220,180,0)']} // theme-exempt: иллюстрация сцены монетного двора
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.hairline, { top: horizonY }]}
      />
      {/* щель пресса */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000', '#000', 'rgba(0,0,0,0)']} // theme-exempt: иллюстрация сцены монетного двора
        locations={[0, 0.18, 0.82, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.slit, { top: horizonY - 4, left: (W - slitW) / 2, width: slitW }]}
      />
    </View>
  );
});

/** Свечение щели (двигается только непрозрачность обёртки). */
export const MintSlitGlow = memo(function MintSlitGlow({ width }: Readonly<{ width: number }>) {
  const glowH = 70;
  return (
    <View style={{ width: width * 1.6, height: glowH, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <Svg width={width * 1.6} height={glowH} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="mintSlitHalo" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="rgb(255,150,70)" stopOpacity={0.42} />{/* theme-exempt: иллюстрация сцены монетного двора */}
            <Stop offset="1" stopColor="rgb(255,140,60)" stopOpacity={0} />{/* theme-exempt: иллюстрация сцены монетного двора */}
          </RadialGradient>
        </Defs>
        <Ellipse cx={(width * 1.6) / 2} cy={glowH / 2} rx={(width * 1.6) / 2} ry={glowH / 2} fill="url(#mintSlitHalo)" />
      </Svg>
      <LinearGradient
        colors={['rgba(255,170,90,0)', 'rgba(255,190,110,0.95)', 'rgba(255,220,160,1)', 'rgba(255,190,110,0.95)', 'rgba(255,170,90,0)']} // theme-exempt: иллюстрация сцены монетного двора
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width, height: 6, borderRadius: 3 }}
      />
    </View>
  );
});

type SizeProps = Readonly<{ size: number }>;

/** Тёплый ореол за монетой. */
export const MintHalo = memo(function MintHalo({ size }: SizeProps) {
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id="mintHalo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={WARM_GLOW} stopOpacity={0.2} />
          <Stop offset="0.4" stopColor={WARM_GLOW} stopOpacity={0.07} />
          <Stop offset="1" stopColor={WARM_GLOW} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill="url(#mintHalo)" />
    </Svg>
  );
});

/** Ударная волна: светлое кольцо из радиального градиента (без обводки). */
export const MintRing = memo(function MintRing({ size }: SizeProps) {
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id="mintRing" cx="50%" cy="50%" r="50%">
          <Stop offset="0.58" stopColor="rgb(255,200,140)" stopOpacity={0} />{/* theme-exempt: иллюстрация сцены монетного двора */}
          <Stop offset="0.66" stopColor="rgb(255,200,140)" stopOpacity={0.3} />{/* theme-exempt: иллюстрация сцены монетного двора */}
          <Stop offset="0.74" stopColor="rgb(255,200,140)" stopOpacity={0} />{/* theme-exempt: иллюстрация сцены монетного двора */}
        </RadialGradient>
      </Defs>
      <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill="url(#mintRing)" />
    </Svg>
  );
});

/** Пятно тёплого света на полу под монетой. */
export const MintPool = memo(function MintPool({ width, height }: Readonly<{ width: number; height: number }>) {
  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient id="mintPool" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={WARM_GLOW} stopOpacity={0.24} />
          <Stop offset="1" stopColor={WARM_GLOW} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="url(#mintPool)" />
    </Svg>
  );
});

/** Тёплая вспышка чеканки на весь экран с центром в монете. */
export const MintFlash = memo(function MintFlash({ width, height, cy }: Readonly<{ width: number; height: number; cy: number }>) {
  const r = Math.max(width, height) * 0.62;
  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient id="mintFlash" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="rgb(255,214,170)" stopOpacity={0.42} />{/* theme-exempt: иллюстрация сцены монетного двора */}
          <Stop offset="0.56" stopColor="rgb(255,180,120)" stopOpacity={0.12} />{/* theme-exempt: иллюстрация сцены монетного двора */}
          <Stop offset="1" stopColor="rgb(255,180,120)" stopOpacity={0} />{/* theme-exempt: иллюстрация сцены монетного двора */}
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={cy} rx={r} ry={r} fill="url(#mintFlash)" />
    </Svg>
  );
});

const styles = StyleSheet.create({
  floor: { position: 'absolute', left: 0, right: 0 },
  hairline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  slit: { position: 'absolute', height: 8, borderRadius: 4 },
});
