import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../ui/v2_theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

/**
 * «Дыхание сетки» — индикатор поиска соперника (владелец выбрал из пяти
 * вариантов, 2026-08-16).
 *
 * зачем именно так: на экране поиска стоял системный ActivityIndicator —
 * безликий крутящийся спиннер, одинаковый во всех приложениях мира. Ожидание
 * тут долгое (до минуты и дольше), и вращение на такой дистанции начинает
 * раздражать: у него нет ни начала, ни конца, взгляду не за что зацепиться.
 *
 * Волна по диагонали сетки читается как «система перебирает игроков» и живёт
 * циклами — глаз отдыхает на паузе между ними. Задержка каждой клетки зависит
 * от суммы её координат, поэтому волна идёт из левого верхнего угла в правый
 * нижний, а не мигает вразнобой.
 */

const SIZE = 3;
const CELL = 16;
const GAP = 9;
/** Один цикл дыхания. Медленнее спиннера намеренно: это ожидание, не загрузка. */
const BREATH_MS = 900;
/** Сдвиг соседней диагонали. Меньше — волна сливается, больше — рвётся. */
const STEP_MS = 120;

type CellProps = Readonly<{ delayMs: number; color: string; still: boolean }>;

const Cell = memo(function Cell({ delayMs, color, still }: CellProps) {
  const value = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      // Без движения клетки остаются видимыми и ровными: экран не должен
      // выглядеть погасшим только потому, что человек отключил анимацию.
      value.value = 1;
      return undefined;
    }
    value.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: BREATH_MS / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: BREATH_MS / 2, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(value);
  }, [delayMs, still, value]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.2 + value.value * 0.8,
    transform: [{ scale: 0.82 + value.value * 0.18 }],
  }));

  return <Animated.View style={[styles.cell, { backgroundColor: color }, style]} />;
});

export const ArenaSearchPulse = memo(function ArenaSearchPulse() {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();

  return (
    <View
      style={styles.grid}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Идёт поиск соперника"
    >
      {Array.from({ length: SIZE * SIZE }, (_, index) => {
        const row = Math.floor(index / SIZE);
        const column = index % SIZE;
        return (
          <Cell
            key={index} // guard-ok: сетка фиксированная, вставок и сортировки нет
            // Диагональная волна: клетки на одной диагонали дышат вместе.
            delayMs={(row + column) * STEP_MS}
            color={P.accent}
            still={reduceMotion}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    width: SIZE * CELL + (SIZE - 1) * GAP,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: { width: CELL, height: CELL, borderRadius: 5 },
});

export default ArenaSearchPulse;
