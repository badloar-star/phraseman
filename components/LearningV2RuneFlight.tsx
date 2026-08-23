import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Полёт звёзд с пройденного узла карты в чип баланса.
 *
 * зачем (владелец, 22.08, каталог движения A5 + выбор «чип в шапке V2»):
 * заработанные звёзды по дуге улетают в баланс — заметный премиальный момент
 * после сессии. Кривая и тайминги из спеки mock 08: 620мс, каскад 90мс,
 * cubic-bezier(.33,.52,.25,.99). Анимации КОНЕЧНЫЕ (без withRepeat), поэтому
 * реестр вечных циклов не затрагивается; reduce motion отсекается родителем.
 *
 * Координаты from/to приходят в оконной системе (measureInWindow); оверлей
 * измеряет собственное окно и переводит их в свою систему сам.
 */

const FLIGHT_MS = 620;
const STAGGER_MS = 90;
const STAR_COUNT = 3;
const ARC_LIFT = 46;
const STAR_SIZE = 18;
const FLIGHT_EASE = Easing.bezier(0.33, 0.52, 0.25, 0.99);

export interface LearningV2StarFlightPoint {
  readonly x: number;
  readonly y: number;
}

interface StarProps {
  index: number;
  dx: number;
  dy: number;
  color: string;
  onLastDone: () => void;
}

const FlightStar = memo(function FlightStar({
  index,
  dx,
  dy,
  color,
  onLastDone,
}: StarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, { duration: FLIGHT_MS, easing: FLIGHT_EASE }, (finished) => {
        if (finished && index === STAR_COUNT - 1) runOnJS(onLastDone)();
      }),
    );
  }, [index, onLastDone, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.08 ? p / 0.08 : p > 0.94 ? 1 - (p - 0.94) * 6 : 1,
      transform: [
        { translateX: dx * p },
        // Дуга: вертикаль поднимается синусом, как в утверждённом макете.
        { translateY: dy * p - ARC_LIFT * Math.sin(Math.PI * p) },
        { scale: 1 - 0.45 * p },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.star, style]}>
      <Ionicons name="star" size={STAR_SIZE} color={color} />
    </Animated.View>
  );
});

interface Props {
  from: LearningV2StarFlightPoint;
  to: LearningV2StarFlightPoint;
  color: string;
  onDone: () => void;
}

export const LearningV2StarFlight = memo(function LearningV2StarFlight({
  from,
  to,
  color,
  onDone,
}: Props) {
  const rootRef = useRef<View>(null);
  const [origin, setOrigin] = useState<LearningV2StarFlightPoint | null>(null);

  return (
    <View
      ref={rootRef}
      collapsable={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={() => {
        rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
      }}
    >
      {origin !== null
        ? Array.from({ length: STAR_COUNT }, (_, index) => (
            <View
              key={index} // guard-ok: фиксированные три звезды, вставок нет
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: from.x - origin.x - STAR_SIZE / 2,
                top: from.y - origin.y - STAR_SIZE / 2,
              }}
            >
              <FlightStar
                index={index}
                dx={to.x - from.x}
                dy={to.y - from.y}
                color={color}
                onLastDone={onDone}
              />
            </View>
          ))
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  star: { width: STAR_SIZE, height: STAR_SIZE },
});

export default LearningV2StarFlight;
