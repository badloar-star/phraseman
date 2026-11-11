/**
 * Деления прогресса игры — движение из макета в точности (docs/design/v2-app/elevate-mechanics.css:65–67, `.segs i`):
 * деление заполняется слева направо за 800 мс по cubic-bezier(.2,.8,.2,1). Числа — в constants/gameMotion.ts.
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GAME_EASE, GAME_MOTION } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type SegmentProps = Readonly<{ filled: boolean; track: string; fill: string }>;

const Segment = memo(function Segment({ filled, track, fill }: SegmentProps) {
  const reduceMotion = useReduceMotion();
  const value = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    const c = GAME_EASE.progress;
    value.value = withTiming(filled ? 1 : 0, { duration: reduceMotion ? 0 : GAME_MOTION.segmentMs, easing: Easing.bezier(c[0], c[1], c[2], c[3]) });
    return () => cancelAnimation(value);
  }, [filled, reduceMotion, value]);

  // зачем: заполнение шириной, а не scaleX — у скруглённого деления края не сплющиваются; время и кривая те же
  const style = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <View style={[s.segment, { backgroundColor: track }]}>
      <Reanimated.View style={[s.fill, { backgroundColor: fill }, style]} />
    </View>
  );
});

type Props = Readonly<{
  ids: readonly string[];
  done: number;
  /** Если задан — закрашены деления, чьи id есть в списке (разминка: сыграть можно не по порядку); `done` тогда не читается. */
  doneIds?: Readonly<Record<string, unknown>>;
  track: string;
  fill: string;
  style?: StyleProp<ViewStyle>;
}>;

function GameSegments({ ids, done, doneIds, track, fill, style }: Props) {
  const isDone = (id: string, i: number) => (doneIds ? doneIds[id] !== undefined : i < done);
  const now = doneIds ? ids.filter((id) => doneIds[id] !== undefined).length : Math.min(done, ids.length);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: ids.length, now }} style={[s.row, style]}>
      {ids.map((id, i) => <Segment key={id} filled={isDone(id, i)} track={track} fill={fill} />)}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, height: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});

export default memo(GameSegments);
