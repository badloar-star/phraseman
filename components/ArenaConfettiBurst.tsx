// Лёгкий конфетти-взрыв на Reanimated — без сторонних зависимостей.
// Используется на победном финальном экране матча и на экране результатов.
//
// Каждая частица — независимый кусочек с собственной задержкой, разлётом и вращением.
// Анимация одноразовая (играет один раз и затухает), монтируется только когда нужна.

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface ArenaConfettiBurstProps {
  /** Запускать ли анимацию. Когда false — ничего не рендерится. */
  active: boolean;
  /** Сколько частиц. По умолчанию 28 — достаточно для «вау», но дёшево. */
  count?: number;
  /** Палитра. По умолчанию — праздничная. */
  colors?: string[];
}

const DEFAULT_COLORS = ['#FFD54A', '#39F27A', '#5BE2CD', '#FF8A5B', '#C792FF', '#FF5B8A'];
const FALL_MS = 2200;

interface PieceSpec {
  key: string;
  color: string;
  startXRatio: number; // 0..1 относительно ширины
  driftX: number;      // горизонтальный снос, px
  delay: number;       // мс
  size: number;        // px
  rotateTo: number;    // финальный угол, deg
}

function Piece({ spec, height }: { spec: PieceSpec; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: FALL_MS, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, spec.delay]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: p * (height * 0.9) },
        { translateX: p * spec.driftX },
        { rotate: `${p * spec.rotateTo}deg` },
      ],
      // Появляется быстро, к концу падения мягко гаснет.
      opacity: p < 0.12 ? p / 0.12 : p > 0.8 ? Math.max(0, (1 - p) / 0.2) : 1,
    };
  });

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -16,
          left: `${spec.startXRatio * 100}%`,
          width: spec.size,
          height: spec.size * 0.55,
          borderRadius: 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

function ArenaConfettiBurst({ active, count = 28, colors = DEFAULT_COLORS }: ArenaConfettiBurstProps) {
  const { height } = useWindowDimensions();

  const pieces = useMemo<PieceSpec[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      // Детерминированный псевдо-рандом по индексу (без Math.random — стабильно при ремаунте).
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const r2 = ((i * 4673 + 7919) % 104729) / 104729;
      return {
        key: `confetti_${i}`,
        color: colors[i % colors.length],
        startXRatio: r,
        driftX: (r2 - 0.5) * 160,
        delay: Math.floor(r2 * 380),
        size: 7 + Math.floor(r * 7),
        rotateTo: (i % 2 === 0 ? 1 : -1) * (220 + Math.floor(r * 300)),
      };
    });
  }, [count, colors]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((spec) => (
        <Piece key={spec.key} spec={spec} height={height} />
      ))}
    </View>
  );
}

export default React.memo(ArenaConfettiBurst);
