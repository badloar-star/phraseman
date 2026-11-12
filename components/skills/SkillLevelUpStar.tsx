/**
 * Звезда первого кадра истории «Новый уровень»: кольцо-пульс, вспышка из 18 искр, звезда, переходящая от «было» к «стало»,
 * и подписи лучей с подсветкой выросшего навыка. Эталон — docs/design/v2-app/elevate-skills.js, функция `story`, и стили
 * elevate-extra.css (`.pulse`, `.burst`, `@keyframes ring` / `brst`, `.starbox .lb`). Числа движения — оттуда в точности:
 *   • пульс: круг 120, кромка 2 (50 %), 1,4 с ease-out, дважды — масштаб 1 → 2,1, прозрачность 0,7 → 0;
 *   • искры: 18 точек по 6, угол k · 20°, путь 110 + (k mod 3) · 34, 1100 мс cubic-bezier(.1,.8,.3,1), задержка k · 18 мс,
 *     масштаб 1 → 0,3, прозрачность 1 → 0;
 *   • звезда: переход 1400 мс, кубическое затухание (в истории — 1400, не 1300, как в общем SkillsStar, поэтому своя);
 *   • подпись выросшего навыка светлеет за 240 мс.
 * Всё стартует, когда родитель поднимает `go` (через 500 мс после показа кадра).
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing, cancelAnimation, interpolateColor, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path, Polygon } from 'react-native-svg';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { skillStarDisplayAxis } from './skill_star_floor';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);

const GRID = [0.34, 0.67, 1] as const;
const RADIUS_K = 0.36;
const LABEL_K = 1.28;
const LABEL_W = 96;
const LABEL_H = 18;
const STAR_MS = 1400;
const PULSE_SIZE = 120;
const PULSE_MS = 1400;
const PULSE_SCALE = 2.1;
const PULSE_FROM_OPACITY = 0.7;
const SPARKS = 18;
const SPARK_SIZE = 6;
const SPARK_MS = 1100;
const SPARK_STAGGER_MS = 18;
const SPARK_EASE = Easing.bezier(0.1, 0.8, 0.3, 1);
const LABEL_MS = 240;

type Colors = Readonly<{ grid: string; axis: string; fill: string; stroke: string; spark: string; ring: string; label: string; labelOn: string }>;

type Props = Readonly<{
  size: number;
  before: readonly number[];
  after: readonly number[];
  labels: readonly string[];
  highlight: number;
  go: boolean;
  colors: Colors;
}>;

const Spark = memo(function Spark({ index, go, color }: Readonly<{ index: number; go: boolean; color: string }>) {
  const t = useSharedValue(0);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (!go) return undefined;
    // CSS `animation-fill-mode: both`: с момента старта искра видна в центре и ждёт свою задержку
    shown.value = 1;
    t.value = withDelay(index * SPARK_STAGGER_MS, withTiming(1, { duration: SPARK_MS, easing: SPARK_EASE }));
    return () => cancelAnimation(t);
  }, [go, index, shown, t]);
  const angle = index * 20;
  const reach = 110 + (index % 3) * 34;
  const style = useAnimatedStyle(() => ({
    opacity: shown.value * (1 - t.value),
    transform: [{ rotate: `${angle}deg` }, { translateY: -reach * t.value }, { scale: 1 - 0.7 * t.value }],
  }));
  return <Reanimated.View style={[s.spark, { backgroundColor: color }, style]} />;
});

function SkillLevelUpStar({ size, before: beforeRaw, after: afterRaw, labels, highlight, go, colors }: Props) {
  // зачем (обход 12.11, «стрелка» при малых значениях): луч не короче минимального — как у всех звёзд навыков (skill_star_floor.ts)
  const before = beforeRaw.map(skillStarDisplayAxis);
  const after = afterRaw.map(skillStarDisplayAxis);
  const reduceMotion = useReduceMotion();
  const n = after.length;
  const c = size / 2;
  const r = size * RADIUS_K;
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const pulse = useSharedValue(0);
  const pulseOn = useSharedValue(0);
  const lit = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!go || reduceMotion) {
      if (go) { progress.value = 1; lit.value = 1; }
      return undefined;
    }
    progress.value = withTiming(1, { duration: STAR_MS, easing: Easing.out(Easing.cubic) });
    lit.value = withTiming(1, { duration: LABEL_MS });
    pulseOn.value = 1;
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.bezier(0, 0, 0.58, 1) }), 2, false, () => {
      pulseOn.value = 0; // CSS-анимация без fill-mode после двух кругов возвращается к невидимому кругу
    });
    return () => {
      cancelAnimation(progress);
      cancelAnimation(pulse);
      cancelAnimation(lit);
    };
  }, [go, lit, progress, pulse, pulseOn, reduceMotion]);

  const shapeProps = useAnimatedProps(() => {
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const k = before[i] + (after[i] - before[i]) * progress.value;
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      d += `${i ? 'L' : 'M'}${(c + Math.cos(a) * r * k).toFixed(1)},${(c + Math.sin(a) * r * k).toFixed(1)} `;
    }
    return { d: `${d}Z` };
  });
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOn.value * PULSE_FROM_OPACITY * (1 - pulse.value),
    transform: [{ scale: 1 + (PULSE_SCALE - 1) * pulse.value }],
  }));
  const litStyle = useAnimatedStyle(() => ({ color: interpolateColor(lit.value, [0, 1], [colors.label, colors.labelOn]) }));

  const point = (i: number, k: number): readonly [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k];
  };
  const ring = (k: number) => Array.from({ length: n }, (_, i) => point(i, k).map((v) => v.toFixed(1)).join(',')).join(' ');

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <Reanimated.View pointerEvents="none" style={[s.pulse, { borderColor: colors.ring, left: c - PULSE_SIZE / 2, top: c - PULSE_SIZE / 2 }, pulseStyle]} />{/* guard-ok: это само кольцо-пульс макета, а не рамка контейнера */}
      <View pointerEvents="none" style={[s.burst, { left: c, top: c }]}>
        {Array.from({ length: SPARKS }, (_, k) => <Spark key={k} index={k} go={go && !reduceMotion} color={colors.spark} />)}
      </View>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {GRID.map((k) => <Polygon key={k} points={ring(k)} fill="none" stroke={colors.grid} strokeWidth={1} />)}
        {after.map((_, i) => {
          const [x, y] = point(i, 1);
          return <Line key={`ray-${i}`} x1={c} y1={c} x2={x} y2={y} stroke={colors.axis} strokeWidth={1} />;
        })}
        <AnimatedPath animatedProps={shapeProps} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
      {labels.map((label, i) => {
        const [x, y] = point(i, LABEL_K);
        const style = [s.label, { left: x - LABEL_W / 2, top: y - LABEL_H / 2, color: colors.label }];
        return i === highlight
          ? <Reanimated.Text key={label} style={[style, litStyle]}>{label}</Reanimated.Text>
          : <Text key={label} style={style}>{label}</Text>;
      })}
    </View>
  );
}

const s = StyleSheet.create({
  pulse: { position: 'absolute', width: PULSE_SIZE, height: PULSE_SIZE, borderRadius: PULSE_SIZE / 2, borderWidth: 2 }, // guard-ok: кольцо-пульс из макета `.pulse` (box-shadow 0 0 0 2px), не контейнер
  burst: { position: 'absolute', width: 0, height: 0 },
  spark: { position: 'absolute', left: -SPARK_SIZE / 2, top: -SPARK_SIZE / 2, width: SPARK_SIZE, height: SPARK_SIZE, borderRadius: SPARK_SIZE / 2 },
  // макет `.starbox .lb`: 13/600, по центру точки
  label: { position: 'absolute', width: LABEL_W, height: LABEL_H, fontSize: 13, lineHeight: LABEL_H, fontWeight: '600', textAlign: 'center' },
});

export default memo(SkillLevelUpStar);
