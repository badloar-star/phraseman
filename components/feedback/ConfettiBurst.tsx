/**
 * ConfettiBurst — переиспользуемый конечный бурст конфетти FeedbackKit.
 *
 * Адаптация утверждённого паттерна ConfettiPiece из components/DialogVictoryCelebration
 * (seeded-детерминированность без Math.random в рендере; каждая частица —
 * Animated.View, transform на UI-треде через Reanimated; конечный прогон без
 * withRepeat). Вынесен в общий компонент, чтобы VictoryBurst/ResultsSequence
 * не дублировали механику (спек §2.1, факты разведки).
 *
 * Perf Bible §2.1: кап ≤120 частиц, длительность ≤1200мс, автостоп, полная
 * остановка анимаций на unmount; на слабых устройствах (PixelRatio<2) — count/2.
 * Никаких вечных циклов → в allowlist perf_freeze_contract НЕ попадает.
 */
import React, { useEffect, useMemo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_COLORS = ['#FFD27A', '#FFE9B8', '#36E6A0', '#FF9EC4', '#7CC8FF'];
const HARD_CAP = 120;

// Детерминированный псевдослучай (паттерн DialogVictoryCelebration) —
// стабилен при ремаунте, без Math.random в рендере.
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface PieceProps {
  index: number;
  seed: number;
  durationMs: number;
  color: string;
  spread: number;
}

function ConfettiPiece({ index, seed, durationMs, color, spread }: PieceProps) {
  const progress = useSharedValue(0);

  const s = index + seed * 131;
  const angle = seeded(s, 1) * Math.PI * 2;
  const distance = 90 + seeded(s, 2) * spread;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 50; // лёгкий апвард-байас
  const rot = (seeded(s, 3) - 0.5) * 1080;
  const size = 7 + seeded(s, 4) * 8;
  const isCircle = index % 3 === 0;

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(progress);
  }, [progress, durationMs]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, dx]) },
        { translateY: interpolate(p, [0, 0.6, 1], [0, dy, dy + 70]) },
        { rotate: `${interpolate(p, [0, 1], [0, rot])}deg` },
        { scale: interpolate(p, [0, 0.2, 1], [0.4, 1, 0.9]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: isCircle ? size : size * 0.5,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export interface ConfettiBurstProps {
  count?: number;
  durationMs?: number;
  colors?: string[];
  /** Сид детерминированной раскладки — одинаковый сид = одинаковый бурст. */
  seed?: number;
  onDone?: () => void;
}

export function ConfettiBurst({
  count = 120,
  durationMs = 1200,
  colors = DEFAULT_COLORS,
  seed = 1,
  onDone,
}: ConfettiBurstProps) {
  const { width } = useWindowDimensions();

  // Слабые устройства: половина частиц (эвристика по плотности пикселей).
  const effectiveCount = useMemo(() => {
    const capped = Math.min(HARD_CAP, Math.max(1, Math.floor(count)));
    return PixelRatio.get() < 2 ? Math.max(1, Math.floor(capped / 2)) : capped;
  }, [count]);

  const spread = width * 0.42;
  const done = useSharedValue(0);

  // Автостоп: один общий таймер сигналит onDone к концу бурста.
  const lifeMs = Math.min(1200, durationMs) + 60;
  useEffect(() => {
    done.value = withTiming(1, { duration: lifeMs }, (finished) => {
      'worklet';
      if (finished && onDone) runOnJS(onDone)();
    });
    return () => cancelAnimation(done);
  }, [done, lifeMs, onDone]);

  const pieces = useMemo(
    () => Array.from({ length: effectiveCount }, (_, i) => i),
    [effectiveCount],
  );

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((i) => (
        <ConfettiPiece
          key={`cb-${i}`}
          index={i}
          seed={seed}
          durationMs={Math.min(1200, durationMs)}
          color={colors[i % colors.length]}
          spread={spread}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ConfettiBurst;
