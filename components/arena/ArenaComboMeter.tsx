import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticLightImpact, hapticSuccess } from '../../hooks/use-haptics';

/**
 * Индикатор серии правильных ответов.
 *
 * Владелец (2026-08-12): комбо начинается с трёх подряд и даёт +1 звезду за
 * каждое следующее задание. Значит игрок обязан видеть три разных состояния:
 *   — серия копится, но бонуса ещё нет (1–2);
 *   — бонус включился (ровно 3) — это событие, его празднуем;
 *   — бонус идёт (4+) — накал растёт вместе с длиной серии.
 *
 * Цвет уходит от акцентного к золоту по мере роста, при активном бонусе плашка
 * дышит, на каждом приросте — подскок и хаптик. Обрыв серии — сжатие и уход.
 */

const ACTIVATION_AT = 3;
const SPRING = { damping: 13, stiffness: 220, mass: 0.7 } as const;

function ArenaComboMeterBase({
  streak,
  bonusLabel,
  size = 'normal',
}: {
  /** Текущая длина серии правильных ответов подряд. */
  streak: number;
  /** Подпись бонуса, например «+1★ за задание». */
  bonusLabel: string;
  size?: 'normal' | 'compact';
}) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const previous = useRef(streak);

  const active = streak >= ACTIVATION_AT;
  const shown = streak >= 2;
  /** Насыщенность: от нуля на двойке до единицы на серии в семь. */
  const heat = Math.max(0, Math.min(1, (streak - 2) / 5));

  const enter = useSharedValue(shown ? 1 : 0);
  const bump = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    enter.value = reduceMotion ? (shown ? 1 : 0) : withSpring(shown ? 1 : 0, SPRING);
  }, [enter, reduceMotion, shown]);

  useEffect(() => {
    const grew = streak > previous.current;
    const broke = streak < previous.current;
    previous.current = streak;
    if (reduceMotion) return;
    if (grew) {
      // Момент включения бонуса отмечаем сильнее, чем обычный прирост.
      const justActivated = streak === ACTIVATION_AT;
      void (justActivated ? hapticSuccess() : hapticLightImpact());
      bump.value = withSequence(
        withSpring(justActivated ? 1 : 0.6, { damping: 8, stiffness: 300 }),
        withSpring(0, SPRING),
      );
    }
    if (broke && streak === 0) {
      bump.value = withSequence(
        withTiming(-0.5, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 160 }),
      );
    }
  }, [bump, reduceMotion, streak]);

  useEffect(() => {
    cancelAnimation(breathe);
    breathe.value = 0;
    if (!active || reduceMotion) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 720, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 720, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [active, breathe, reduceMotion]);

  const plateStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { scale: (0.9 + enter.value * 0.1) * (1 + bump.value * 0.14 + breathe.value * 0.03) },
      { translateY: (1 - enter.value) * 8 },
    ],
    backgroundColor: interpolateColor(heat, [0, 1], [P.accentSoft, P.goldSoft]),
    borderColor: interpolateColor(heat, [0, 1], [P.accent, P.gold]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.16 + breathe.value * 0.18 : 0,
    transform: [{ scale: 1 + breathe.value * 0.12 }],
  }));

  if (!shown) return <View style={size === 'compact' ? styles.holderCompact : styles.holder} />;

  const tint = heat > 0.5 ? P.gold : P.accent;
  return (
    <View style={size === 'compact' ? styles.holderCompact : styles.holder}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle, { backgroundColor: tint }]} />
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityLabel={active ? `${streak}. ${bonusLabel}` : String(streak)}
        style={[styles.plate, plateStyle, size === 'compact' ? styles.plateCompact : null]}
      >
        <Ionicons name={active ? 'flame' : 'flash-outline'} size={size === 'compact' ? 14 : 16} color={tint} />
        <Text style={[styles.streak, { color: tint }, size === 'compact' ? styles.streakCompact : null]}>
          {streak}
        </Text>
        {active && size !== 'compact' ? (
          <Text numberOfLines={1} style={[styles.bonus, { color: tint }]}>{bonusLabel}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

export const ArenaComboMeter = memo(ArenaComboMeterBase);

const styles = StyleSheet.create({
  holder: { minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  holderCompact: { minHeight: 26, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 120, height: 34, borderRadius: 17 },
  plate: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plateCompact: { minHeight: 24, borderRadius: 12, paddingHorizontal: 8, gap: 4 },
  streak: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  streakCompact: { fontSize: 12.5 },
  bonus: { fontSize: 11.5, fontWeight: '800' },
});
