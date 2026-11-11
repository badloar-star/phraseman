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
import { useReduceMotion } from '../../hooks/use_reduce_motion'; // зачем (UX-волна 2, 04.11): один гейт Reduce Motion на все конфетти (VictoryBurst, онбординг, награды)
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import { isLowPowerEffective } from '../../app/flashcards/low_power';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_COLORS = ['#FFD27A', '#FFE9B8', '#36E6A0', '#FF9EC4', '#7CC8FF']; // theme-exempt: палитра конфетти — праздничная иллюстрация
const HARD_CAP = 120;
/** Потолок частиц на слабом устройстве: праздник остаётся, анимированных узлов втрое меньше. */
const LOW_POWER_CAP = 36;

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
  const reduceMotion = useReduceMotion();

  // Слабые устройства: половина частиц (эвристика по плотности пикселей).
  // зачем (владелец 11.11, аудит скорости): у слабых Android плотность экрана ≥2, поэтому одна эта эвристика на них не
  // срабатывала и они получали все 120 анимированных частиц (конец онбординга — первая длинная сессия). Добавлен общий
  // признак слабого устройства (память <3 ГБ или тумблер «Упрощённые эффекты») — тот же, что отключает 3D-флип карточек.
  const effectiveCount = useMemo(() => {
    const capped = Math.min(HARD_CAP, Math.max(1, Math.floor(count)));
    if (isLowPowerEffective()) return Math.min(capped, LOW_POWER_CAP);
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

  // зачем: при «Уменьшении движения» частицы не рисуем; таймер onDone выше остаётся, поэтому вызывающий код (закрытие окна, следующий шаг) не зависает
  if (reduceMotion) return null;

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
