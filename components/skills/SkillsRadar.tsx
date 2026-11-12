import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing, cancelAnimation, useAnimatedProps, useSharedValue, withDelay, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { skillStarDisplayAxis } from './skill_star_floor';

/**
 * Звезда навыков. Геометрия — из утверждённого макета (elevate-real4.js, экран «Навыки»):
 * поле 330×300, центр 165/150, радиус 100, сетка на 0,34 / 0,67 / 1, подписи на 1,25 радиуса.
 * Анимация: пауза 350 мс, затем фигура раскрывается за 1300 мс по кубическому затуханию, лучи — лесенкой.
 */
export const RADAR_W = 330;
export const RADAR_H = 300;
const CX = 165;
const CY = 150;
const R = 100;
const GRID = [0.34, 0.67, 1] as const;
const LABEL_K = 1.25;
const OPEN_DELAY_MS = 350;
const OPEN_MS = 1300;

const AnimatedPolygon = Reanimated.createAnimatedComponent(Polygon);
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

function angle(i: number, n: number): number {
  'worklet';
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

/** Доля раскрытия луча `i` при общем прогрессе `p` — как в макете: `min(1, max(0, p*1.5 - i*0.08))`. */
function rayOpen(p: number, i: number): number {
  'worklet';
  return Math.min(1, Math.max(0, p * 1.5 - i * 0.08));
}

function staticPoints(k: number, n: number): string {
  return Array.from({ length: n }, (_, i) => `${(CX + Math.cos(angle(i, n)) * R * k).toFixed(1)},${(CY + Math.sin(angle(i, n)) * R * k).toFixed(1)}`).join(' ');
}

type DotProps = Readonly<{ index: number; count: number; value: number; progress: SharedValue<number>; active: boolean; color: string }>;

const RadarDot = memo(function RadarDot({ index, count, value, progress, active, color }: DotProps) {
  const animatedProps = useAnimatedProps(() => {
    const k = value * rayOpen(progress.value, index);
    return { cx: CX + Math.cos(angle(index, count)) * R * k, cy: CY + Math.sin(angle(index, count)) * R * k };
  });
  return <AnimatedCircle animatedProps={animatedProps} r={active ? 7 : 4.5} fill={color} />;
});

export type SkillsRadarAxis = Readonly<{ key: string; label: string; /** 0..1 — длина луча. */ value: number }>;

type Props = Readonly<{
  axes: readonly SkillsRadarAxis[];
  activeIndex: number | null;
  gridColor: string;
  axisColor: string;
  shapeFill: string;
  shapeStroke: string;
  dotColor: string;
  labelColor: string;
  labelActiveColor: string;
}>;

function SkillsRadar({ axes, activeIndex, gridColor, axisColor, shapeFill, shapeStroke, dotColor, labelColor, labelActiveColor }: Props) {
  const n = axes.length;
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  // зачем (обход 12.11, «стрелка» при малых значениях): луч не короче минимального — skill_star_floor.ts; подпись доступности — по настоящему значению
  const values = axes.map((a) => skillStarDisplayAxis(a.value));
  const valuesKey = values.map((v) => v.toFixed(3)).join('|');

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return undefined;
    }
    progress.value = withDelay(OPEN_DELAY_MS, withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(progress);
    // зачем: раскрытие — один раз при входе; смена значений перерисовывает фигуру без повторного «вырастания»
  }, [reduceMotion, progress]);

  const shapeProps = useAnimatedProps(() => {
    let points = '';
    for (let i = 0; i < n; i += 1) {
      const k = values[i] * rayOpen(progress.value, i);
      points += `${i ? ' ' : ''}${(CX + Math.cos(angle(i, n)) * R * k).toFixed(1)},${(CY + Math.sin(angle(i, n)) * R * k).toFixed(1)}`;
    }
    return { points };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey, n]);

  return (
    <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel={axes.map((a) => `${a.label} ${Math.round(a.value * 100)}%`).join(', ')}>
      <Svg width={RADAR_W} height={RADAR_H} viewBox={`0 0 ${RADAR_W} ${RADAR_H}`}>
        {GRID.map((k) => <Polygon key={k} points={staticPoints(k, n)} fill="none" stroke={gridColor} strokeWidth={1} />)}
        {axes.map((a, i) => (
          <Line key={a.key} x1={CX} y1={CY} x2={CX + Math.cos(angle(i, n)) * R} y2={CY + Math.sin(angle(i, n)) * R} stroke={axisColor} strokeWidth={1} />
        ))}
        <AnimatedPolygon animatedProps={shapeProps} fill={shapeFill} stroke={shapeStroke} strokeWidth={2} strokeLinejoin="round" />
        {axes.map((a, i) => (
          <RadarDot key={a.key} index={i} count={n} value={values[i]} progress={progress} active={activeIndex === i} color={dotColor} />
        ))}
      </Svg>
      {axes.map((a, i) => {
        const x = CX + Math.cos(angle(i, n)) * R * LABEL_K;
        const y = CY + Math.sin(angle(i, n)) * R * LABEL_K;
        return (
          <View key={a.key} pointerEvents="none" style={[styles.labelBox, { left: x - LABEL_W / 2, top: y - LABEL_H / 2 }]}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.label, { color: activeIndex === i ? labelActiveColor : labelColor }]}>{a.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const LABEL_W = 110;
const LABEL_H = 20;

const styles = StyleSheet.create({
  box: { width: RADAR_W, height: RADAR_H, alignSelf: 'center' },
  labelBox: { position: 'absolute', width: LABEL_W, height: LABEL_H, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
});

export default memo(SkillsRadar);
