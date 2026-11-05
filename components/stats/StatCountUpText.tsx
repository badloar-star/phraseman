import React, { useEffect } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import {
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  withTiming,
  withDelay,
  runOnJS,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type StatCountUpTextProps = {
  /** Конечное значение, до которого «добегает» счётчик от 0. */
  value: number;
  style?: StyleProp<TextStyle>;
  durationMs?: number;
  delayMs?: number;
  /** Префикс/суффикс (например «×» или « legacy reward»). */
  prefix?: string;
  suffix?: string;
  /** Знаков после запятой (для множителей вида ×1.85). */
  decimals?: number;
  numberOfLines?: number;
};

/**
 * Число, которое анимированно «добегает» 0→value при появлении.
 * Идиома проекта — Reanimated useAnimatedReaction + runOnJS (как в StatScoreRing).
 * Однократный прогон при монтировании/смене value, с отменой на unmount.
 */
export function StatCountUpText({
  value,
  style,
  durationMs = 900,
  delayMs = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  numberOfLines,
}: StatCountUpTextProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  // зачем (Reduce Motion, ТОП-20 доступности, 05.11): при системном «Уменьшить движение» число сразу итоговое, без бега 0→N
  const reduceMotion = useReduceMotion();
  const counter = useSharedValue(0);
  const [display, setDisplay] = React.useState(0);

  // зачем (UX-приятности 04.11): число при обновлении растёт от прежнего (41 → 42), а не «перезапускается» с нуля; с нуля — только первый показ
  const startedRef = React.useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      counter.value = 0;
    }
    if (reduceMotion) { counter.value = safeValue; return () => cancelAnimation(counter); }
    counter.value = withDelay(delayMs, withTiming(safeValue, { duration: durationMs, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(counter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeValue, durationMs, delayMs, reduceMotion]);

  const factor = Math.pow(10, decimals);
  const quantized = useDerivedValue(() => Math.round(counter.value * factor) / factor);
  useAnimatedReaction(
    () => quantized.value,
    (v, prev) => {
      if (v !== prev) runOnJS(setDisplay)(v);
    },
  );

  const shown = decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines ?? 1}
    >
      {prefix}{shown}{suffix}
    </Text>
  );
}

export default StatCountUpText;
