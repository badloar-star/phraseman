import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const RUNE_ASSET = require('../assets/images/level-spin-rewards/stars_10.webp');

/**
 * Полёт рун с пройденного узла карты в чип баланса.
 *
 * зачем (владелец, 22.08, каталог движения A5 + выбор «чип в шапке V2»):
 * заработанная валюта по дуге улетает в баланс — заметный премиальный момент
 * после сессии. Кривая и тайминги из спеки mock 08: 620мс, каскад 90мс,
 * cubic-bezier(.33,.52,.25,.99). Анимации КОНЕЧНЫЕ (без withRepeat), поэтому
 * реестр вечных циклов не затрагивается; reduce motion отсекается родителем.
 *
 * Owner correction 26.08: the wallet currency is represented by the same
 * shipped rune asset as Home/Wallet, never by a font glyph. Count is the
 * actual 1..3 interaction award, not a decorative fixed particle count.
 *
 * Координаты from/to приходят в оконной системе (measureInWindow); оверлей
 * измеряет собственное окно и переводит их в свою систему сам.
 */

const FLIGHT_MS = 620;
const STAGGER_MS = 90;
const ARC_LIFT = 46;
const RUNE_SIZE = 18;
const FLIGHT_EASE = Easing.bezier(0.33, 0.52, 0.25, 0.99);

export interface LearningV2RuneFlightPoint {
  readonly x: number;
  readonly y: number;
}

interface RuneProps {
  index: number;
  isLast: boolean;
  dx: number;
  dy: number;
  onLastDone: () => void;
}

const FlightRune = memo(function FlightRune({
  index,
  isLast,
  dx,
  dy,
  onLastDone,
}: RuneProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, { duration: FLIGHT_MS, easing: FLIGHT_EASE }, (finished) => {
        if (finished && isLast) scheduleOnRN(onLastDone);
      }),
    );
  }, [index, isLast, onLastDone, progress]);

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
    <Animated.View pointerEvents="none" style={[styles.rune, style]}>
      <Animated.Image
        source={RUNE_ASSET}
        resizeMode="contain"
        style={styles.asset}
      />
    </Animated.View>
  );
});

interface Props {
  from: LearningV2RuneFlightPoint;
  to: LearningV2RuneFlightPoint;
  count: 1 | 2 | 3;
  onDone: () => void;
}

export const LearningV2RuneFlight = memo(function LearningV2RuneFlight({
  from,
  to,
  count,
  onDone,
}: Props) {
  const rootRef = useRef<View>(null);
  const [origin, setOrigin] = useState<LearningV2RuneFlightPoint | null>(null);
  const particles = Array.from({ length: count }, (_, index) => index);

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
        ? particles.map((index) => (
            <View
              key={index} // guard-ok: фиксированный список рун, вставок нет
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: from.x - origin.x - RUNE_SIZE / 2,
                top: from.y - origin.y - RUNE_SIZE / 2,
              }}
            >
              <FlightRune
                index={index}
                isLast={index === particles.length - 1}
                dx={to.x - from.x}
                dy={to.y - from.y}
                onLastDone={onDone}
              />
            </View>
          ))
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  rune: { width: RUNE_SIZE, height: RUNE_SIZE, alignItems: 'center', justifyContent: 'center' },
  asset: { width: RUNE_SIZE, height: RUNE_SIZE },
});

export default LearningV2RuneFlight;
