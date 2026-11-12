import React, { memo, useEffect } from 'react';
import Reanimated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Line, Path, Polygon } from 'react-native-svg';

import { useReduceMotion } from '../../hooks/use_reduce_motion';

/**
 * Малая звезда навыков без подписей — для блока в статистике, блока «Навыки растут» на итогах и визитки.
 * Геометрия из макета (elevate-core.js, `geo`): центр size/2, радиус 0,36 размера, сетка 0,34 / 0,67 / 1.
 * Анимация: значения переходят от `from` к `values` за 1300 мс по кубическому затуханию (`starTween`); на итоге
 * «Навыки растут» — 1500 мс (`durationMs`, elevate-core.js:89).
 */
const GRID = [0.34, 0.67, 1] as const;
const TWEEN_MS = 1300;
// зачем Path, а не Polygon (сверка визитки на эмуляторе 11.11.2026): у Polygon `points` превращается в контур на стороне JS, поэтому
// анимированный `points` до нативного слоя не доходил — фигура звезды не рисовалась вовсе, была видна только сетка. У Path
// анимируется сам нативный `d`.
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

type Props = Readonly<{
  size: number;
  /** Длины лучей 0..1. */
  values: readonly number[];
  /** С каких значений начать движение; по умолчанию — из центра. */
  from?: readonly number[];
  delayMs?: number;
  /** Длительность движения; по умолчанию 1300 мс (`starTween`), на итоге «Навыки растут» — 1500 мс. */
  durationMs?: number;
  gridColor: string;
  axisColor: string;
  shapeFill: string;
  shapeStroke: string;
}>;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function SkillsStar({ size, values, from, delayMs = 0, durationMs = TWEEN_MS, gridColor, axisColor, shapeFill, shapeStroke }: Props) {
  const n = values.length;
  const c = size / 2;
  const r = size * 0.36;
  const to = values.map(clamp01);
  const start = to.map((_, i) => clamp01(from?.[i] ?? 0));
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const key = `${start.map((v) => v.toFixed(3)).join('|')}>${to.map((v) => v.toFixed(3)).join('|')}`;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return undefined;
    }
    progress.value = 0;
    progress.value = withDelay(delayMs, withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(progress);
    // зачем: новое значение (например, прирост на итоге) запускает движение заново от прежней фигуры
  }, [key, delayMs, durationMs, reduceMotion, progress]);

  const shapeProps = useAnimatedProps(() => {
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const k = start[i] + (to[i] - start[i]) * progress.value;
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      d += `${i ? 'L' : 'M'}${(c + Math.cos(a) * r * k).toFixed(1)},${(c + Math.sin(a) * r * k).toFixed(1)} `;
    }
    return { d: `${d}Z` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n, c, r]);

  const ring = (k: number): string => Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return `${(c + Math.cos(a) * r * k).toFixed(1)},${(c + Math.sin(a) * r * k).toFixed(1)}`;
  }).join(' ');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {GRID.map((k) => <Polygon key={k} points={ring(k)} fill="none" stroke={gridColor} strokeWidth={1} />)}
      {to.map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return <Line key={`ray-${i}`} x1={c} y1={c} x2={c + Math.cos(a) * r} y2={c + Math.sin(a) * r} stroke={axisColor} strokeWidth={1} />;
      })}
      <AnimatedPath animatedProps={shapeProps} fill={shapeFill} stroke={shapeStroke} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export default memo(SkillsStar);
